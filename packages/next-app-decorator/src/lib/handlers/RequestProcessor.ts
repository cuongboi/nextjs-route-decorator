import type { InjectionToken } from "tsyringe";
import { Metadata } from "../metadata";
import { RouteHandler, RouteMiddleware } from "../types";
import { NextRequest, NextResponse } from "next/server";
import { match } from "path-to-regexp";
import { BaseError, MethodNotAllowedError } from "../error";
import { z } from "zod";
import { RouteMatcher } from "./RouteMatcher";
import { deepMergeObjects } from "../utils";
import { RouterFactory } from "./RouterFactory";
import { HttpStatusCode } from "../http-status";

export class RequestProcessor {
  constructor(private factory: RouterFactory) {}

  async resolveArgs(
    request: NextRequest,
    params: Record<string, string | string[]>,
    route: RouteHandler
  ): Promise<any[]> {
    const paramsKeys =
      Metadata.get("param", route.target as Function, route.methodName) ?? [];

    const paramsObject = await paramsKeys.reduce(
      async (acc, [index, loader]) => {
        const param = await loader(request, route.hook, params);
        return { ...acc, [index]: param };
      },
      {}
    );

    return Object.values(paramsObject);
  }

  async resolveRouteMiddleware(
    request: NextRequest,
    target: Object | Function,
    methodName: string | symbol
  ): Promise<ResponseInit> {
    const middlewares: RouteMiddleware[] = [
      ...(Metadata.get("controllerMiddleware", target as Function) ?? []),
      ...(Metadata.get("methodMiddleware", target as Function, methodName) ??
        []),
    ];

    return this.resolveMiddleware(request, middlewares);
  }

  async processRequest(request: NextRequest): Promise<Response> {
    let responseInit: ResponseInit = this.factory.config.responseInit ?? {};

    if (this.factory.config.middlewares) {
      responseInit = await this.resolveMiddleware(
        request,
        this.factory.config.middlewares
      );
    }

    try {
      const routes = RouteMatcher.findRoute(
        this.factory.routes,
        request.nextUrl.pathname
      );

      const route = routes[request.method] as RouteHandler;

      if (!route) {
        throw new MethodNotAllowedError(request.method);
      }

      if (!route.target) {
        const response = await Promise.resolve(route.handler(request));
        if (response instanceof Response) return response;
        return NextResponse.json(await Promise.resolve(route.handler(request)));
      }

      responseInit = deepMergeObjects(
        responseInit,
        await this.resolveRouteMiddleware(
          request,
          route.target,
          route.methodName
        ));

      const { params } = match(String(route.matchPath))(
        request.nextUrl.pathname
      ) as {
        params: Record<string, string | string[]>;
      };

      const args = await this.resolveArgs(request, params, route);

      const beforeResult = route.hook?.before
        ? await route.hook.before(request, NextResponse.next)
        : null;
      if (beforeResult instanceof Response) return beforeResult;

      const instance = this.factory.container.resolve(
        route.target as InjectionToken<typeof route.target>
      );

      const result = await Promise.resolve(
        instance[route.methodName].apply(instance, args)
      );

      const afterResult = route.hook?.after
        ? await route.hook.after(request, result)
        : null;
      if (afterResult instanceof Response) return afterResult;

      const statusCode: number =
        Metadata.get("statusCode", route.target, route.methodName) ?? 200;


      return result instanceof Response
        ? result
        : NextResponse.json(
            result,
            deepMergeObjects(responseInit, {
              status: statusCode,
              headers: {
                "content-type":
                  route.hook.info?.produces?.at(0) ?? "application/json",
              },
            })
          );
    } catch (err) {
      return this.handleError(err, responseInit);
    }
  }

  private handleError(err: unknown, init: ResponseInit): NextResponse {
    if (process.env.NODE_ENV === "development") console.log(err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues },
        deepMergeObjects(init, { status: HttpStatusCode.BadRequest })
      );
    }

    if (err instanceof BaseError) {
      return NextResponse.json(
        { error: err.message },
        deepMergeObjects(init, { status: err.code })
      );
    }

    return NextResponse.json(
      { error: (err as Error).message },
      deepMergeObjects(init, { status: HttpStatusCode.InternalServerError })
    );
  }

  private async resolveMiddleware(
    request: NextRequest,
    middlewares: RouteMiddleware[],
    init?: ResponseInit
  ): Promise<ResponseInit> {
    let responseInit: ResponseInit =
      init ?? this.factory.config.responseInit ?? {};

    for (const middleware of middlewares) {
      const middlewareResolved = await Promise.resolve(
        middleware(request, responseInit)
      );

      responseInit = deepMergeObjects(
        responseInit,
        middlewareResolved ?? {}
      );
    }

    return responseInit;
  }
}

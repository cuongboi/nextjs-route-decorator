import type { DependencyContainer, InjectionToken } from "tsyringe";
import { Metadata } from "../metadata";
import { AppRoute, RouteHandler, RouteMiddleware } from "../types";
import { NextRequest, NextResponse } from "next/server";
import { match } from "path-to-regexp";
import { BaseError, MethodNotAllowedError } from "../error";
import { z } from "zod";
import { RouteMatcher } from "./Matcher";

export class RequestProcessor {
  constructor(
    private routes: AppRoute,
    private container: DependencyContainer
  ) {}

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

  async resolveMiddleware(
    request: NextRequest,
    target: Object | Function,
    methodName: string | symbol
  ): Promise<void> {
    const middlewares: RouteMiddleware[] = [
      ...(Metadata.get("controllerMiddleware", target as Function) ?? []),
      ...(Metadata.get("methodMiddleware", target as Function, methodName) ??
        []),
    ];

    for (const middleware of middlewares) {
      await middleware(request, NextResponse.next);
    }
  }

  async processRequest(request: NextRequest): Promise<Response> {
    try {
      const routes = RouteMatcher.findRoute(
        this.routes,
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

      await this.resolveMiddleware(request, route.target, route.methodName);

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

      const instance = this.container.resolve(
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
        : NextResponse.json(result, {
            status: statusCode,
            headers: {
              "content-type":
                route.hook.info?.produces?.at(0) ?? "application/json",
            },
          });
    } catch (err) {
      return this.handleError(err);
    }
  }

  private handleError(err: unknown): NextResponse {
    if (process.env.NODE_ENV === "development") console.log(err);

    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }

    if (err instanceof BaseError) {
      return NextResponse.json({ error: err.message }, { status: err.code });
    }

    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

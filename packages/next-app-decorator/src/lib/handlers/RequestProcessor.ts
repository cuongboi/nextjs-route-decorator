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
  private readonly defaultResponseInit: ResponseInit;

  constructor(private readonly factory: RouterFactory) {
    this.defaultResponseInit = factory.config.responseInit ?? {};
  }

  private async resolveArgs(
    request: NextRequest,
    params: Record<string, string | string[]>,
    route: RouteHandler
  ): Promise<unknown[]> {
    const paramLoaders =
      Metadata.get("param", route.target as Function, route.methodName) ?? [];

    const paramsObject = await paramLoaders.reduce(
      async (accPromise, [index, loader]) => {
        const acc = await accPromise;
        acc[index] = await loader(request, route.hook, params);
        return acc;
      },
      {} as Promise<Record<number, unknown>>
    );

    return Object.values(paramsObject);
  }

  private async resolveMiddleware(
    request: NextRequest,
    middlewares: RouteMiddleware[],
    initialInit: ResponseInit = {}
  ): Promise<ResponseInit> {
    return middlewares.reduce(async (accPromise, middleware) => {
      const acc = await accPromise;
      const result = await middleware(request, acc);
      return deepMergeObjects(acc, result ?? {});
    }, Promise.resolve(initialInit));
  }

  private async resolveRouteMiddleware(
    request: NextRequest,
    target: Object | Function,
    methodName: string | symbol
  ): Promise<ResponseInit> {
    const middlewares = [
      ...(Metadata.get("controllerMiddleware", target as Function) ?? []),
      ...(Metadata.get("methodMiddleware", target as Function, methodName) ??
        []),
    ];

    return this.resolveMiddleware(request, middlewares);
  }

  private handleError(err: unknown, init: ResponseInit): NextResponse {
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

    console.error(`\x1b[31m[${this.constructor.name}]\x1b[0m`, err);

    return NextResponse.json(
      { error: (err as Error).message },
      deepMergeObjects(init, { status: HttpStatusCode.InternalServerError })
    );
  }

  public async processRequest(request: NextRequest): Promise<Response> {
    let responseInit = this.defaultResponseInit;

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
        const response = await route.handler(request);
        return response instanceof Response
          ? response
          : NextResponse.json(response);
      }

      responseInit = deepMergeObjects(
        responseInit,
        await this.resolveRouteMiddleware(
          request,
          route.target,
          route.methodName
        )
      );

      const { params } = match(String(route.matchPath))(
        request.nextUrl.pathname
      ) as {
        params: Record<string, string | string[]>;
      };

      for await (const registry of route.requestRegistry ?? []) {
        try {
          if (!this.factory.container.isRegistered(registry.token, true)) {
            const useValue = await registry.loader(request);
            this.factory.container.register(registry.token, { useValue });
          }
        } catch {
          console.warn(
            `\x1b[33m[${this.constructor.name}]\x1b[0m`,
            `Error loading registry ${String(registry.token)}`
          );
        }
      }

      const instance = this.factory.container.resolve(
        route.target as InjectionToken<typeof route.target>
      );
      const args = await this.resolveArgs(request, params, route);

      // Handle before hook
      if (route.hook?.before) {
        const beforeResult = await route.hook.before.apply(instance, [
          request,
          responseInit,
        ]);
        if (beforeResult instanceof Response) return beforeResult;
        if (beforeResult)
          responseInit = deepMergeObjects(responseInit, beforeResult);
      }

      // Execute route handler
      const result = await instance[route.methodName].apply(instance, args);

      // Handle after hook
      if (route.hook?.after) {
        const afterResult = await route.hook.after.apply(instance, [
          request,
          result,
          responseInit,
        ]);
        if (afterResult instanceof Response) return afterResult;
        if (afterResult)
          responseInit = deepMergeObjects(responseInit, afterResult);
      }

      const statusCode =
        Metadata.get("statusCode", route.target, route.methodName) ??
        route.hook?.status ??
        HttpStatusCode.Ok;

      return result instanceof Response
        ? result
        : NextResponse.json(result, {
            ...responseInit,
            status: statusCode,
            headers: {
              ...responseInit.headers,
              "content-type":
                route.hook.info?.produces?.[0] ?? "application/json",
            },
          });
    } catch (err) {
      return this.handleError(err, responseInit);
    }
  }
}

import { HTTP_METHOD } from "next/dist/server/web/http";
import { Metadata } from "../metadata";
import {
  AnyFunction,
  AppRoute,
  ConvertHookResponse,
  Hook,
  HookResponse,
  MaybePromise,
  ParamLoader,
  RouteMiddleware,
} from "../types";
import type { NextResponse } from "next/server";

export const createRouteDecorator = <const Method extends HTTP_METHOD>(
  method: Method
) => {
  return <
      const Path extends `/${string}`,
      RouteHook extends Hook,
      Handle extends (
        ...args: any[]
      ) => MaybePromise<
        RouteHook["response"] extends HookResponse
          ?
              | ConvertHookResponse<RouteHook["response"]>
              | NextResponse<ConvertHookResponse<RouteHook["response"]>>
          : unknown
      >,
    >(
      path: Path,
      hook?: RouteHook
    ) =>
    (target, methodName, descriptor): TypedPropertyDescriptor<Handle> => {
      const route = {
        [path]: {
          [method]: {
            handler: descriptor.value as AnyFunction,
            hook: hook || {},
            target: target.constructor,
            methodName,
          },
        },
      } as AppRoute;

      Metadata.mergeRoute(target.constructor, route);

      return descriptor;
    };
};

export const createParamDecorator =
  (loader: ParamLoader): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    Metadata.add(
      "param",
      target?.constructor ?? {},
      [parameterIndex, loader],
      propertyKey
    );
  };

export const createControllerMiddlewareDecorator =
  (middleware: RouteMiddleware): ClassDecorator =>
  (target) =>
    Metadata.add("controllerMiddleware", target, middleware);

export const createMethodMiddlewareDecorator =
  (middleware: RouteMiddleware): MethodDecorator =>
  (target, propertyKey) =>
    Metadata.add(
      "methodMiddleware",
      target.constructor,
      middleware,
      propertyKey
    );

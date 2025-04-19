import type { RegistrationOptions } from "tsyringe/dist/typings/types";
import type { HttpStatusValue } from "./http-status";
import type { NextRequest, NextResponse } from "next/server";
import { METADATA_KEYS } from "./metadata";
import type { HTTP_METHOD } from "next/dist/server/web/http";
import type { InjectionToken, Provider } from "tsyringe";
import type { TypeOf, ZodTypeAny } from "zod";
import type {
  TagObject,
  OpenAPIObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas30";

type ResultType = string | object | number | void;

export type AnyFunction = (...args: any[]) => ResultType | Promise<ResultType>;

export type ModuleRegistry = {
  token: InjectionToken;
  options?: RegistrationOptions;
} & Provider<any>;

export type MaybePromise<T> = T | Promise<T>;

export type MetadataKey = keyof typeof METADATA_KEYS;

export type MetadataValue<T extends MetadataKey> = T extends "module"
  ? ModuleOption
  : T extends "prefix"
    ? [`/${string}`, TagObject?]
    : T extends "route"
      ? AppRoute
      : T extends "param"
        ? Array<[number, ParamLoader]>
        : T extends "controllerMiddleware" | "methodMiddleware"
          ? RouteMiddleware[]
          : any | any[];

export type RequestRegistry = {
  token: InjectionToken;
  loader: (request: NextRequest) => MaybePromise<unknown>;
};

export interface ModuleOption {
  controllers?: Array<Function>;
  imports?: Array<Function>;
  registry?: ModuleRegistry[];
  prefix?: `/${string}`;
  requestRegistry?: RequestRegistry[];
}

export type BaseConfig = {
  swagger?: SwaggerConfig;
  responseInit?: ResponseInit;
  middlewares?: RouteMiddleware[];
};

export type SwaggerConfig = {
  info?: OpenAPIObject["info"];
  path: `/${string}`;
  openapi?: "3.0.0";
  security?: {
    [key: string]: SecuritySchemeObject;
  };
} & Omit<OpenAPIObject, "info" | "openapi" | "paths" | "security">;

// Route Hook Configuration

export type HookResponse =
  | ZodTypeAny
  | Record<
      number,
      | ZodTypeAny
      | ({
          description: string;
        } & (
          | { schema: ZodTypeAny }
          | {
              content: {
                [key: string]: {
                  schema: ZodTypeAny;
                  example?: unknown;
                };
              };
            }
        ))
    >;

type ConvertHookResponseDetail<V> = V extends ZodTypeAny
  ? TypeOf<V>
  : V extends { schema: infer S }
    ? S extends ZodTypeAny
      ? TypeOf<S>
      : unknown
    : V extends { content: infer C }
      ? C extends Record<string, { schema: infer S }>
        ? S extends ZodTypeAny
          ? TypeOf<S>
          : unknown
        : unknown
      : unknown;

export type ConvertHookResponse<T extends HookResponse> = T extends ZodTypeAny
  ? TypeOf<T>
  : T extends Record<number, infer V>
    ? ConvertHookResponseDetail<V>
    : unknown;

type HookBody =
  | {
      body?: ZodTypeAny;
      formData?: never;
    }
  | {
      formData?: ZodTypeAny;
      body?: never;
    };

export type Hook = HookBody & {
  status?: HttpStatusValue;
  contentType?: string;
  path?: ZodTypeAny;
  query?: ZodTypeAny;
  headers?: ZodTypeAny;
  cookies?: ZodTypeAny;
  response?: HookResponse;
  before?: (
    request: NextRequest,
    init?: ResponseInit
  ) => MaybePromise<NextResponse<unknown> | ResponseInit>;
  after?: (
    request: NextRequest,
    responseData?: ResultType,
    init?: ResponseInit
  ) => MaybePromise<NextResponse<unknown> | ResponseInit>;
  info?: {
    id: string;
    summary: string;
    description: string;
    tags?: string[];
    consumes?: string[];
    produces?: string[];
    deprecated?: boolean;
  };
  security?: {
    [key: string]: string[];
  };
};

export type AppRoute = Record<`/${string}`, MethodRoute>;

export type MethodRoute = {
  [method in HTTP_METHOD]: RouteHandler;
};

export type RouteHandler = {
  handler: AnyFunction;
  hook: Hook;
  target: Object;
  methodName: string | symbol;
  matchPath?: `/${string}`;
  requestRegistry?: RequestRegistry[];
};

export type RouteResult = {
  [method in HTTP_METHOD]: (req: NextRequest) => Promise<Response>;
};

export type ParamLoader = (
  request: NextRequest,
  hook?: Hook,
  params?: Record<string, string | string[]>
) => MaybePromise<unknown | undefined>;

export type RouteMiddleware = (
  request: NextRequest,
  init: ResponseInit
) => MaybePromise<ResponseInit | void>;

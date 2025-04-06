import type { constructor } from "tsyringe/dist/typings/types";
import type { HttpStatus, HttpStatusValue } from "./http-status";
import type { NextRequest, NextResponse } from "next/server";
import { METADATA_KEYS } from "./metadata";
import type { HTTP_METHOD } from "next/dist/server/web/http";
import type { registry } from "tsyringe";
import type { ZodTypeAny } from "zod";
import type { ZodOpenApiObject } from "zod-openapi";
import { TagObject } from "openapi3-ts/oas30";

type ResultType = string | object | number | void;

export type AnyFunction = (...args: any[]) => ResultType | Promise<ResultType>;

export type ModuleRegistry = Parameters<typeof registry>[0];

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

export type ModuleOptionRegistry = ModuleRegistry | constructor<unknown>;

export interface ModuleOption {
  controllers?: Array<Function>;
  imports?: Array<Function>;
  registry?: Array<ModuleOptionRegistry>;
  prefix?: `/${string}`;
}

export type BaseConfig = {
  swagger?: SwaggerConfig;
};

export type SwaggerConfig = {
  info?: ZodOpenApiObject["info"];
  path: `/${string}`;
  openapi?: "3.0.0";
} & Omit<ZodOpenApiObject, "info" | "openapi">;

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

export type Hook = {
  status?: HttpStatusValue;
  contentType?: string;
  path?: ZodTypeAny;
  query?: ZodTypeAny;
  headers?: ZodTypeAny;
  cookies?: ZodTypeAny;
  response?: HookResponse;
  body?: ZodTypeAny;
  formData?: ZodTypeAny;
  before?: (
    request: NextRequest,
    next?: typeof NextResponse.next
  ) => MaybePromise<unknown>;
  after?: (
    request: NextRequest,
    responseData?: ResultType
  ) => MaybePromise<NextResponse<unknown>>;
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
} & (
  | { body?: ZodTypeAny; formData?: never }
  | { formData?: ZodTypeAny; body?: never }
);

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
};

export type RouteResult = {
  [method in HTTP_METHOD]: (req: NextRequest) => Promise<Response>;
};

export type ParamLoader = (
  request: NextRequest,
  hook?: Hook,
  params?: Record<string, string | string[]>
) => MaybePromise<unknown | void>;

export type RouteMiddleware = (
  request: NextRequest,
  next: typeof NextResponse.next
) => MaybePromise<void>;

export type FactoryConfig = {
  prefix: `/${string}`;
  registry: ModuleRegistry[];
};

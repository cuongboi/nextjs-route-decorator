import { container as RootContainer, registry } from "tsyringe";
import { Metadata } from "../metadata";
import {
  AppRoute,
  BaseConfig,
  ModuleRegistry,
  RequestRegistry,
  RouteResult,
} from "../types";
import { deepMergeObjects, joinPath } from "../utils";
import { HTTP_METHODS } from "next/dist/server/web/http";

import { RequestProcessor } from "./RequestProcessor";
import { OpenAPIFactory } from "./OpenApiGenerator.ts";

export class RouterFactory {
  public routes: AppRoute = {};
  private requestProcessor: RequestProcessor;

  constructor(
    public module: Function,
    public config: BaseConfig = {},
    public container = RootContainer.createChildContainer()
  ) {
    this.requestProcessor = new RequestProcessor(this);
  }

  static create(module: Function, config: BaseConfig = {}) {
    const factory = new RouterFactory(module, config);
    factory.loadModule();

    if (factory.config.swagger) {
      OpenAPIFactory.create(factory, factory.config.swagger);
    }

    return factory.applyRoute();
  }

  private loadRoutes(
    target: Function,
    prefix: `/${string}` = "/",
    moduleRegistry: ModuleRegistry[] = [],
    requestRegistry: RequestRegistry[] = []
  ) {
    const routesMeta = Metadata.get("route", target);
    if (!routesMeta) return;

    registry(moduleRegistry)(this.container);
    prefix = joinPath(prefix, Metadata.get("prefix", target)?.[0] ?? "/");

    for (const [path, methods] of Object.entries(routesMeta)) {
      for (const [method, config] of Object.entries(methods)) {
        const matchPath = joinPath(prefix, path);
        this.routes = deepMergeObjects(this.routes, {
          [matchPath]: {
            [method]: {
              ...config,
              matchPath,
              requestRegistry,
            },
          },
        } as AppRoute);
      }
    }
  }

  private loadModule(
    module?: Function,
    prefix: `/${string}` = "/",
    registry: ModuleRegistry[] = [],
    requestRegistry: RequestRegistry[] = []
  ) {
    const moduleMeta = Metadata.get("module", module ?? this.module);
    if (!moduleMeta) return;

    prefix = joinPath(prefix, moduleMeta.prefix ?? "/");
    registry = registry.concat(moduleMeta.registry ?? []);
    requestRegistry = requestRegistry.concat(moduleMeta.requestRegistry ?? []);

    [...(moduleMeta.imports ?? []), ...(moduleMeta.controllers ?? [])].forEach(
      (cur) => {
        this.loadModule(cur, prefix, registry, requestRegistry);
        this.loadRoutes(cur, prefix, registry, requestRegistry);
      }
    );
  }

  public applyRoute = <Result extends RouteResult>(): Result => {
    return HTTP_METHODS.reduce((acc, method) => {
      acc[method] = this.requestProcessor.processRequest.bind(
        this.requestProcessor
      );

      return acc;
    }, {} as Result);
  };
}

export const routerHandler = <T extends Function>(
  module: T,
  config: BaseConfig = {}
): RouteResult => {
  return RouterFactory.create(module, config);
};

import { container, DependencyContainer, registry } from "tsyringe";
import { Metadata } from "../metadata";
import {
  AppRoute,
  BaseConfig,
  ModuleOptionRegistry,
  ModuleRegistry,
  RouteResult,
} from "../types";
import { deepMergeObjects, joinPath } from "../utils";
import { HTTP_METHODS } from "next/dist/server/web/http";

import { RequestProcessor } from "./RequestProcessor";
import { OpenAPIFactory } from "./OpenApiGenerator.ts";

export class RouterFactory {
  public routes: AppRoute = {};
  private container: DependencyContainer;
  private requestProcessor: RequestProcessor;

  constructor(
    private module: Function,
    private config: BaseConfig = {}
  ) {
    this.container = container.createChildContainer();
    this.requestProcessor = new RequestProcessor(this.routes, this.container);
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
    moduleRegistry: ModuleOptionRegistry[] = []
  ) {
    const routesMeta = Metadata.get("route", target);
    if (!routesMeta) return;

    const registries = moduleRegistry.map((provider) =>
      Object.getOwnPropertyDescriptor(provider, "constructor")
        ? { token: Symbol(String(provider)), useClass: provider }
        : provider
    ) as ModuleRegistry;

    registry(registries)(this.container);
    prefix = joinPath(prefix, Metadata.get("prefix", target)?.[0] ?? "/");

    for (const [path, methods] of Object.entries(routesMeta)) {
      for (const [method, config] of Object.entries(methods)) {
        const matchPath = joinPath(prefix, path);
        this.routes = deepMergeObjects(this.routes, {
          [matchPath]: {
            [method]: {
              ...config,
              matchPath,
            },
          },
        } as AppRoute);
      }
    }
  }

  private loadModule(
    module?: Function,
    prefix: `/${string}` = "/",
    registry: ModuleOptionRegistry[] = []
  ) {
    const moduleMeta = Metadata.get("module", module ?? this.module);
    if (!moduleMeta) return;

    prefix = joinPath(prefix, moduleMeta.prefix ?? "/");
    registry = registry.concat(
      moduleMeta.registry ?? []
    ) as ModuleOptionRegistry[];

    [...(moduleMeta.imports ?? []), ...(moduleMeta.controllers ?? [])].forEach(
      (cur) => {
        this.loadModule(cur, prefix, registry);
        this.loadRoutes(cur, prefix, registry);
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

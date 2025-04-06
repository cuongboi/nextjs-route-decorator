import { MetadataKey, MetadataValue } from "./types";
import { deepMergeObjects } from "./utils";

export const METADATA_KEYS = {
  module: Symbol("next:decorator:module"),
  prefix: Symbol("next:decorator:prefix"),
  route: Symbol("next:decorator:routes"),
  param: Symbol("next:decorator:param"),
  controllerMiddleware: Symbol("next:decorator:controllerMiddleware"),
  methodMiddleware: Symbol("next:decorator:methodMiddleware"),
  statusCode: Symbol("next:decorator:statusCode"),
};

export class Metadata {
  /**
   * Retrieves metadata from a target object.
   */
  static get<K extends MetadataKey>(
    key: K,
    target: any,
    propertyKey?: string | symbol
  ): MetadataValue<K> | undefined {
    return propertyKey
      ? Reflect.getMetadata(METADATA_KEYS[key], target, propertyKey)
      : Reflect.getMetadata(METADATA_KEYS[key], target);
  }

  /**
   * Sets metadata on a target object.
   */
  static set<K extends MetadataKey, V extends MetadataValue<K>>(
    key: K,
    value: V,
    target: any,
    propertyKey?: string | symbol
  ) {
    if (propertyKey) {
      Reflect.defineMetadata(METADATA_KEYS[key], value, target, propertyKey);
    } else {
      Reflect.defineMetadata(METADATA_KEYS[key], value, target);
    }
  }

  /**
   * Adds a value to an array-type metadata key.
   */
  static add<
    K extends Exclude<MetadataKey, "module" | "prefix" | "route">,
    V extends MetadataValue<K>,
    T extends V[number],
  >(key: K, target: any, value: T, propertyKey?: string | symbol): void {
    const collection =
      Metadata.get<K>(key, target, propertyKey) ?? ([] as unknown as V);

    collection.push(value);

    Metadata.set(key, collection, target, propertyKey);
  }

  static mergeRoute<const V extends MetadataValue<"route">>(
    target: any,
    value: V
  ): void {
    const collection = Metadata.get("route", target) ?? {};

    Metadata.set("route", deepMergeObjects(collection, value), target);
  }
}

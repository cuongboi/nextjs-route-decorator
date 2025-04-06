import { injectable } from "tsyringe";

import { Metadata } from "../metadata";
import { TagObject } from "openapi3-ts/oas30";

export const Controller = (
  prefix: `/${string}` = "/",
  config?: TagObject
): ClassDecorator => {
  return (target: Function) => {
    injectable()(target as any);
    Metadata.set("prefix", [prefix, config], target);
  };
};

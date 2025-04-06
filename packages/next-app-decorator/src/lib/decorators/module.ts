import { Metadata } from "../metadata";
import type { ModuleOption } from "../types";

export function Module(module: ModuleOption): ClassDecorator {
  return function (target: Function) {
    Metadata.set("module", module, target);
  };
}

import { Metadata } from "../metadata";
import { createRouteDecorator } from "./generator";

export const Get = createRouteDecorator("GET");
export const Post = createRouteDecorator("POST");
export const Put = createRouteDecorator("PUT");
export const Patch = createRouteDecorator("PATCH");
export const Delete = createRouteDecorator("DELETE");
export const Head = createRouteDecorator("HEAD");
export const Options = createRouteDecorator("OPTIONS");

export const StatusCode = (statusCode: number) => {
  return (target: any, methodName: string) => {
    Metadata.set("statusCode", statusCode, target.constructor, methodName);
  };
};

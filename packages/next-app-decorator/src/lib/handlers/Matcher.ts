import { AppRoute, MethodRoute } from "../types";
import { match } from "path-to-regexp";
import { NotFoundError } from "../error";

export class RouteMatcher {
  static findRoute(routes: AppRoute, path: string): MethodRoute {
    const matches = Object.keys(routes)
      .map((matchPath) => ({
        matchPath,
        matchIndex: path === matchPath ? 2 : match(matchPath)(path) ? 1 : 0,
      }))
      .sort((a, b) => b.matchIndex - a.matchIndex);
    if (matches[0]?.matchIndex > 0) {
      return routes[matches[0].matchPath];
    }

    throw new NotFoundError(`${path} not found!`);
  }
}

import { purify } from "../utils";
import { createParamDecorator } from "./generator";

export const Req = createParamDecorator((req) => req);

export const Body = createParamDecorator(async (request, hook) => {
  let body: any;

  if (!["GET", "HEAD"].includes(request.method)) {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = await request.json();
      if (hook?.body) {
        body = hook.body.parse(body);
      }
    }

    if (
      request.headers
        .get("content-type")
        ?.includes("application/x-www-form-urlencoded") ||
      request.headers.get("content-type")?.includes("multipart/form-data")
    ) {
      const formData = await request.formData();

      body = Object.fromEntries(
        [...formData.entries()].map(([key, value]) => [key, purify(value)])
      );

      if (hook?.formData) {
        body = hook.formData.parse(body);
      }
    }
  }

  return body;
});

export const Query = createParamDecorator((req, hook) => {
  const query = Object.fromEntries(req.nextUrl.searchParams);

  if (hook?.query) {
    return hook.query.parse(query);
  }

  return query;
});

export const Param = (key: string) =>
  createParamDecorator((_, hook, params) => {
    if (hook?.path) {
      params = hook.path.parse(params);
    }

    return params?.[key];
  });

export const Params = createParamDecorator((_, hook, params) => {
  if (hook?.path) {
    params = hook.path.parse(params);
  }

  return params;
});

export const Headers = createParamDecorator((req, hook) => {
  const headers = Object.fromEntries(req.headers);

  if (hook?.headers) {
    return hook.headers.parse(headers);
  }

  return headers;
});

export const Cookies = createParamDecorator((req, hook) => {
  const cookies = Object.fromEntries(req.cookies.getAll().map(Object.values));

  if (hook?.cookies) {
    return hook.cookies.parse(cookies);
  }

  return cookies;
});

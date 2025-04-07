// @ts-nocheck

import {
  injectable,
  inject,
  Controller,
  Throttle,
  Get,
  Module,
  Post,
  Logger,
  RouterFactory,
  Param,
  Query,
  Body,
  Req,
  Params,
  Headers,
} from "../src";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { RouteResult } from "../src/lib/types";
import { LogLevel } from "../src/lib/logger";

const apiUrl = "http://test-api.com";

interface AnyService {
  getHello(): string;
}

@injectable()
class TestService {
  public getHello() {
    return "Hello, World!";
  }
}

@Controller("/")
class TestController {
  constructor(@inject(TestService) private testService: AnyService) {}

  // Add more decorators to test
  @Get("/")
  public getIndex() {
    return this.testService.getHello();
  }

  @Get("/query", {
    query: z.object({
      name: z.string().min(1).default("John Doe"),
    }),
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public getQuery(@Query query: { name: string }) {
    return {
      message: `Query: ${query.name}`,
    };
  }

  @Get("/headers", {
    headers: z.object({
      "x-api-key": z.string().min(1),
    }),
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public getHeaders(@Headers headers: any) {
    return {
      message: `API Key: ${JSON.stringify(headers)}`,
    };
  }

  @Get("/params/:param", {
    path: z.object({
      param: z.string().min(1),
    }),
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public getParams(@Param("param") param: string) {
    return {
      message: `Param: ${param}`,
    };
  }

  @Post("/", {
    body: z.object({
      name: z.string().min(1).default("John Doe"),
    }),
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public index() {
    return this.testService.test();
  }

  @Get("/users", {
    response: {
      200: z.object({
          id: z.string(),
          name: z.string(),
        }).array()
      
    },
  })
  public getUsers() {
    return [];
  }
}

@Module({
  controllers: [TestController],
  prefix: "/api",
})
class AppModule {}

describe("AppModule", () => {
  let app: RouteResult;

  beforeAll(async () => {
    app = await RouterFactory.create(AppModule, {
      swagger: {
        path: "/api/api-docs",
        servers: [
          {
            url: apiUrl,
          },
        ],
        security: [
          {
            apiKey: {
              type: "apiKey",
              in: "header",
              name: "x-api-key",
            },
            jwt: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
          },
        ],
      },
    });
  });

  test("should return 200 when access documentation", async () => {
    const request = new NextRequest(`${apiUrl}/api/api-docs`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
  });

  test("should return 200 when access users", async () => {
    const request = new NextRequest(`${apiUrl}/api/users`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
  })
});

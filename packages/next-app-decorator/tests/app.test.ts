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
  Cors,
} from "../src";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import toSource from "tosource";
import { RouteResult } from "../src/lib/types";
import { LogLevel } from "../src/lib/logger";

const apiUrl = "http://test-api.com";

interface AnyService {
  getHello(): string;
}

@injectable()
class AppService {
  public getHello() {
    return "Hello, World!";
  }
}

@Controller("/test")
@Throttle(60)
class AppController {
  constructor(@inject(AppService) private appService: AnyService) {}

  @Get("/")
  public index() {
    return this.appService.getHello();
  }

  @Get("/:param", {
    path: z.object({
      param: z.coerce.number().transform(Number),
    }),
  })
  public indexParam(@Param("param") param: number) {
    return NextResponse.json(`Hello, World ${param}!`);
  }

  @Get("/query", {
    query: z.object({
      name: z.string().min(1),
    }),
  })
  withQuery(@Query query: { name: string }) {
    return query;
  }

  @Logger(LogLevel.DEBUG)
  @Post("/post-json", {
    body: z.object({
      name: z.string().min(1).default("John Doe"),
      age: z.number().default(18),
      isActive: z.boolean().default(false),
    }),
  })
  public indexPost(@Body body: { name: string }) {
    return body;
  }

  @Post("/post-formdata", {
    formData: z.object({
      name: z.string().min(1),
    }),
  })
  public indexPostFormData(@Body body: { name: string }) {
    return body;
  }
}

@injectable()
class TestService {
  public test() {
    return "test";
  }
}

@Controller("/test2")
class Test2Controller {
  constructor(@inject(TestService) private testService: TestService) {}

  @Get("/", {
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public index() {
    return this.testService.test();
  }
}

@Module({
  controllers: [AppController],
  prefix: "/app",
  registry: [TestService],
})
class ControllerAppModule {}

@Module({
  imports: [ControllerAppModule],
  controllers: [Test2Controller],
  prefix: "/api",
})
class AppModule {}

describe("AppModule", () => {
  let app: RouteResult;

  beforeAll(async () => {
    app = await RouterFactory.create(AppModule, {
      middlewares: [
        Cors({
          allowedOrigins: ["http://localhost:3000", [apiUrl]],
        }),
      ],
    });
  });

  test("should be error 404", async () => {
    const request = new NextRequest(`${apiUrl}/api/error404`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(404);
  });

  test("should return Hello, World with param", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toBe("Hello, World!");
  });

  test("should return Hello, World with param", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
  });

  test("should be error 404", async () => {
    const request = new NextRequest(`${apiUrl}/api/error404`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(404);
  });

  test("should be error 400", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/abc`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json).toHaveProperty("error");
  });

  test("should be response 200 for POST method", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/post-json`, {
      method: "POST",
      body: JSON.stringify({ name: "John Doe" }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await app.POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty("name", "John Doe");
  });
  test("should return query parameters correctly", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/query?name=John`, {
      method: "GET",
    });

    const response = await app.GET(request);

    expect(response.status).toBe(200);
  });

  test("should return as NextResponse", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/1`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
  });

  test("should return error 400 for missing query parameter", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/query`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(400);
  });

  test("should return error 400 for invalid query parameter", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/query?name=`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(400);
  });

  test("should return success when using form data", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test/post-formdata`, {
      method: "POST",
      headers: {
        "Content-Type":
          "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
      },
      body: '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="name"\r\n\r\nJohn\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--',
    });

    const response = await app.POST(request);
    expect(response.status).toBe(200);
  });

  test("should return error 405 for unsupported method", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test`, {
      method: "PUT",
    });

    process.env.ENV = "development";

    const response = await app.PUT(request);
    expect(response.status).toBe(405);
  });

  test("should return error 429 for too many requests", async () => {
    const request = new NextRequest(`${apiUrl}/api/app/test`, {
      method: "GET",
    });

    for (let i = 0; i < 60; i++) {
      await app.GET(request);
    }

    const response = await app.GET(request);
    expect(response.status).toBe(429);
  });

  test("should return 200 when using level 1 module classes", async () => {
    const request = new NextRequest(`${apiUrl}/api/test2`, {
      method: "GET",
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toBe("test");
  });

  // Test cors response header
  test("should return CORS headers", async () => {
    const request = new NextRequest(`${apiUrl}/api/test2`, {
      method: "GET",
      headers: {
        Origin: "http://localhost:3000",
      },
    });

    const response = await app.GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS"
    );
  });
});

# Next.js Route App API Decorator

A TypeScript decorator-based library for creating Next.js App Router API routes with dependency injection, validation, routing features, and Swagger documentation.

## Features

- Class-based controllers with dependency injection
- Route decorators for HTTP methods (GET, POST, etc.)
- Built-in request validation using Zod schemas
- Automatic route generation for Next.js App Router
- Throttling/rate limiting support
- Request logging capabilities
- Support for params, query, body, and headers
- Modular architecture for organizing routes

## Installation

```
npm install zod nextjs-route-decorator
```

## Usage

Basic Setup with Dependency Injection
Create an API module with controllers using tsyringe for dependency injection:

```

import {
  Module,
  Controller,
  Get,
  Post,
  injectable,
  inject,
  RouterFactory,
} from "nextjs-route-decorator";
import { z } from "zod";

// Service with dependency injection
@injectable()
class TestService {
  public getHello() {
    return {
      message: "Hello, World!",
    };
  }
}

// Controller with routes
@Controller("/", {
  name: "Hello World API",
  description: "Hello World API Description",
})
class TestController {
  constructor(@inject(TestService) private testService: TestService) {}

  @Get("/hello", {
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  })
  public getIndex() {
    return this.testService.getHello();
  }

  @Post("/hello", {
    body: z.object({
      name: z.string(),
    }),
    response: {
      200: z.object({
        message: z.string().default("Hello, World!"),
      }),
    },
  })
  postTest() {
    return { message: "Hello, World!" };
  }
}

// Root module
@Module({
  controllers: [TestController],
  prefix: "/api",
})
class AppModule {}

```

Code in NextJs dynamic routes with Swagger documentation with custom configuration:

```
// src/app/api/[...params]/route.ts
export const { GET, POST } = RouterFactory.create(AppModule, {
  swagger: {
    path: "/api/swagger",
    info: {
      title: "NextJS App Router API Documentation",
      version: "1.0.0",
    },
  },
});

```

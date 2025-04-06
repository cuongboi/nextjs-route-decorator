import {
  Module,
  Controller,
  Get,
  Post,
  injectable,
  inject,
  routerHandler,
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

export const { GET, POST } = routerHandler(AppModule, {
  swagger: {
    path: "/api/swagger",
    info: {
      title: "NextJS App Router API Documentation",
      version: "1.0.0",
    },
  },
});

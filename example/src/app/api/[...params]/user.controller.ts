import {
  Controller,
  Post,
  Body,
  StatusCode,
  Get,
  inject,
  Param,
  Put,
  Delete,
} from "nextjs-route-decorator";
import { z } from "zod";
import { RegisterUser, User, Users } from "./user.schema";
import { UserService } from "./user.service";
import { NextResponse } from "next/server";

@Controller("/user", {
  name: "User Api Documentation",
  description: "User management API",
})
export class UserController {
  constructor(@inject(UserService) private userService: UserService) {}

  @Get("/", {
    response: {
      200: Users,
    },
    info: {
      id: "list-users",
      summary: "Get all users",
      description: "Get a list of all registered users",
    },
  })
  async getUsers() {
    const users = await this.userService.getUsers();
    return users;
  }

  @Get("/:id", {
    response: {
      200: User,
    },
  })
  async getUserById(@Param("id") id: string) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return user;
  }

  @Post("/", {
    body: RegisterUser,
    response: {
      201: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    },
  })
  @StatusCode(201)
  async register(@Body body: RegisterUser) {
    this.userService.registerUser(body);

    return {
      success: true,
      message: `User ${body.username}  registered successfully!`,
    };
  }

  @Put("/:id", {
    path: User.pick({ id: true }),
    body: RegisterUser,
    response: {
      200: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    },
  })
  async updateUser(@Param("id") id: string, @Body body: RegisterUser) {
    await this.userService.updateUser(id, body);

    return {
      success: true,
      message: `User ${id} updated successfully!`,
    };
  }

  @Delete("/:id", {
    path: User.pick({ id: true }),
    response: {
      200: z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    },
  })
  async deleteUser(@Param("id") id: string) {
    const deleted = await this.userService.deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return {
      success: true,
      message: `User ${id} deleted successfully!`,
    };
  }
}

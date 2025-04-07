import { injectable } from "nextjs-route-decorator";
import type { RegisterUser, Users, User } from "./user.schema";

@injectable()
export class UserService {
  async getUsers(): Promise<Users> {
    return [
      {
        id: "1",
        username: "user1",
        email: "user1@example.com",
      },
      {
        id: "2",
        username: "user2",
        email: "user2@example.com",
      },
    ];
  }

  async registerUser(user: RegisterUser): Promise<User> {
    return {
      id: Math.random().toString(36).substring(2, 15),
      username: user.username,
      email: user.email,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find((user) => user.id === id) || null;
  }

  async updateUser(
    id: string,
    user: Partial<RegisterUser>
  ): Promise<User | null> {
    const users = await this.getUsers();
    const existingUser = users.find((u) => u.id === id);
    if (existingUser) {
      return { ...existingUser, ...user };
    }
    return null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) {
      users.splice(index, 1);
      return true;
    }
    return false;
  }
}

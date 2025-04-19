import { Module } from "nextjs-route-decorator";
import { UserController } from "./user.controller";

@Module({
  controllers: [UserController],
  prefix: "/api",
  requestRegistry: [
    {
      token: "user",
      loader: async () => {
        return {
          name: "John Doe",
          age: 30,
        };
      },
    },
  ],
})
export default class UserModule {}

import { Module } from "nextjs-route-decorator";
import { UserController } from "./user.controller";

@Module({
  controllers: [UserController],
  prefix: "/api",
})
export default class UserModule {}

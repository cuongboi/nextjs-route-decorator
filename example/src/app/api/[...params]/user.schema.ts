import { z } from "zod";

export const UserObject = z.object({
  id: z.string().default("1").describe("User ID"),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const RegisterUser = UserObject.omit({
  id: true,
});

export const User = UserObject.omit({ password: true });
export const Users = z.array(User);

export type RegisterUser = z.infer<typeof RegisterUser>;
export type User = z.infer<typeof User>;
export type Users = z.infer<typeof Users>;

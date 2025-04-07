import { RouterFactory } from "nextjs-route-decorator";
import UserModule from "./user.module";

export const { GET, POST, PUT, DELETE } = RouterFactory.create(UserModule, {
  swagger: {
    path: "/api/swagger",
    info: {
      title: "NextJS App Router API Documentation",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
      ...(process.env.APP_URL
        ? [
            {
              url: `https://${process.env.APP_URL}`,
              description: "Vercel server",
            },
          ]
        : []),
    ],
  },
});

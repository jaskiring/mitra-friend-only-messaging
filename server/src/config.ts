import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  COMETCHAT_APP_ID: z.string().min(1),
  COMETCHAT_REGION: z.enum(["us", "eu", "in"]),
  COMETCHAT_REST_API_KEY: z.string().min(1),
  COMETCHAT_AUTH_KEY: z.string().min(1),
  MODERATION_WEBHOOK_USER: z.string().min(1),
  MODERATION_WEBHOOK_PASSWORD: z.string().min(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { db } from "../server/index";
import * as schema from "../server/db/schema";
import * as authSchema from "../server/db/auth-schema";
import * as relations from "../server/db/relations";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema, ...authSchema, ...relations },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
});

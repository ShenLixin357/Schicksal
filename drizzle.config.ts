// Historical generation metadata only. Use db:new/db:seal/db:check for ordered SQL.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "sqlite",
});

// Drizzle Kit config that reads the connection string from the environment (used by docker-compose / CI).
export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL },
};

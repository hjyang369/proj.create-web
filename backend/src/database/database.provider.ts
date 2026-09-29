import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";

export const DATABASE_TOKEN = "DATABASE";

export const databaseProvider = {
  provide: DATABASE_TOKEN,
  useFactory: async () => {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    return drizzle(connection, { schema, mode: "default" });
  },
};

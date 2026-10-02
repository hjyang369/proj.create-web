import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool, type PoolOptions } from "mysql2/promise";
import * as schema from "./schema/index.js";

export type AppDatabase = MySql2Database<typeof schema>;

export const DATABASE_TOKEN = "DATABASE";

type CreatePool = (options: PoolOptions) => Pool;

export function createMysqlPool(
  createPool: CreatePool,
  env: NodeJS.ProcessEnv,
): Pool {
  return createPool({
    host: env.DB_HOST ?? "localhost",
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });
}

export const databaseProvider = {
  provide: DATABASE_TOKEN,
  useFactory: () => {
    const pool = createMysqlPool(mysql.createPool, process.env);

    return drizzle(pool, { schema, mode: "default" });
  },
};

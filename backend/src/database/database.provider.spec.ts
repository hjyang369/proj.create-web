import { createMysqlPool } from "./database.provider.js";

describe("createMysqlPool", () => {
  it("끊긴 연결을 다시 만들 수 있는 풀을 연다", () => {
    const createPool = vi.fn().mockReturnValue({ end: vi.fn() });

    createMysqlPool(createPool, {
      DB_HOST: "127.0.0.1",
      DB_PORT: "3306",
      DB_USER: "app",
      DB_PASSWORD: "secret",
      DB_NAME: "crep",
    });

    expect(createPool).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 3306,
      user: "app",
      password: "secret",
      database: "crep",
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  });
});

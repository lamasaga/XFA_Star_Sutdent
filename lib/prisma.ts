import { PrismaClient } from "@prisma/client";

// Prisma 客户端全局单例（防止热重载时创建多个实例）
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 连接池配置（适配轻量级服务器）
// 参考: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
const PRISMA_CONNECTION_LIMIT = parseInt(
  process.env.PRISMA_CONNECTION_LIMIT || "10",
  10
);
const PRISMA_POOL_TIMEOUT = parseInt(
  process.env.PRISMA_POOL_TIMEOUT || "10",
  10
);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // 连接池配置
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 应用关闭时优雅断开连接
// 这在 Docker/服务器环境中很重要
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// 健康检查：测试数据库连接
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  latency: number;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: Date.now() - start };
  }
}

// 批量操作包装器：自动分批处理大量数据
export async function batchCreate<T>(
  items: T[],
  batchSize: number = 100,
  createFn: (batch: T[]) => Promise<unknown>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await createFn(batch);
  }
}

// 查询超时包装器（防止慢查询阻塞）
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  label: string = "query"
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`查询超时: ${label} (${timeoutMs}ms)`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]);
}

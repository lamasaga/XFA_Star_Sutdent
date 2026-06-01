/**
 * 通用分页工具
 * 为所有列表 API 提供统一的分页参数解析和响应格式
 */

export interface PaginationParams {
  page: number;      // 当前页码（从1开始）
  pageSize: number;  // 每页条数
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// 默认分页配置
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * 从 URL 搜索参数解析分页参数
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10))
  );
  return { page, pageSize };
}

/**
 * 构建分页查询的 skip/take 参数
 */
export function getPaginationQuery({ page, pageSize }: PaginationParams): {
  skip: number;
  take: number;
} {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * 构建分页响应
 */
export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  { page, pageSize }: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Prisma 分页查询辅助：同时获取数据和总数
 */
export async function paginateQuery<T, W, O, I>({
  prismaModel,
  where,
  orderBy,
  include,
  select,
  pagination,
}: {
  prismaModel: {
    findMany: (args: { where?: W; orderBy?: O; include?: I; select?: unknown; skip: number; take: number }) => Promise<T[]>;
    count: (args: { where?: W }) => Promise<number>;
  };
  where?: W;
  orderBy?: O;
  include?: I;
  select?: unknown;
  pagination: PaginationParams;
}): Promise<PaginatedResult<T>> {
  const { skip, take } = getPaginationQuery(pagination);

  const [data, total] = await Promise.all([
    prismaModel.findMany({
      where,
      orderBy,
      include,
      select,
      skip,
      take,
    }),
    prismaModel.count({ where }),
  ]);

  return buildPaginatedResponse(data, total, pagination);
}

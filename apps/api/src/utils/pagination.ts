export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePagination(query: any, defaultLimit = 12): PaginationParams {
  const page = Math.max(1, parseInt(String(query?.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query?.limit ?? String(defaultLimit)), 10) || defaultLimit));
  return { page, limit };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function prismaSkipTake(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

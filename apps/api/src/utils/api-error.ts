export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type AsyncHandler = (req: any, res: any, next: any) => Promise<any>;

export const asyncHandler =
  (fn: AsyncHandler) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

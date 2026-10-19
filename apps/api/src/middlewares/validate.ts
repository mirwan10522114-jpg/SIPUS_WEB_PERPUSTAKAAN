import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/api-error';

interface Schemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        // salin hasil parse (coercion angka) kembali ke req.query
        Object.assign(req.query, parsed);
      }
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err: any) {
      const first = err?.issues?.[0];
      const msg = first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Data tidak valid';
      next(new ApiError(400, msg));
    }
  };

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Request payload failed schema validation.',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 2. Multer File Upload Errors
  if (err.name === 'MulterError') {
    res.status(400).json({
      error: 'Upload Error',
      message: err.message,
    });
    return;
  }

  // 3. Known Application Errors
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${status} - ${message}`);

  res.status(status).json({
    error: err.name || 'Application Error',
    message,
  });
};

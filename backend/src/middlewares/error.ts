import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || 'unknown';
  const status = (error as any).status || (error as any).statusCode || 500;

  // Log estruturado de erro
  const errorLog = {
    ts: new Date().toISOString(),
    level: 'error',
    requestId,
    method: req.method,
    path: req.path,
    status,
    error: error.message,
    stack: error.stack
  };
  console.error(JSON.stringify(errorLog));

  res.status(status).json({
    success: false,
    error: status === 500 ? 'Erro interno do servidor' : error.message,
    requestId
  });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
  });
};

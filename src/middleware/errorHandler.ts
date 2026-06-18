import { Request, Response, NextFunction } from "express"

export interface AppError extends Error {
    statusCode?: number
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({
        message: err.message || 'Internal server error',
    })
}
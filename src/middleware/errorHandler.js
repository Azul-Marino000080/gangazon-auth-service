const logger = require('../utils/logger');

/**
 * Middleware global de manejo de errores
 */
const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error('Error capturado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Determinar código de estado
  const statusCode = err.statusCode || 500;

  // Determinar mensaje de error
  let errorMessage = err.message || 'Error interno del servidor';
  
  // En producción, no exponer detalles internos
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorMessage = 'Error interno del servidor';
  }

  // Respuesta de error
  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
};

/**
 * Clase para errores personalizados
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wrapper para funciones async para capturar errores
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  catchAsync
};

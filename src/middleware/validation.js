const { AppError } = require('./errorHandler');

/**
 * Middleware de validación usando schemas de Joi
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Retorna todos los errores, no solo el primero
      stripUnknown: true // Elimina campos no definidos en el schema
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      return next(new AppError(
        `Validación fallida: ${errorMessages.join(', ')}`,
        400
      ));
    }

    // Reemplazar req.body con el valor validado y limpio
    req.body = value;
    next();
  };
}

module.exports = { validate };

/**
 * Middleware genérico para validación con Joi
 * @param {Object} schema - Schema de Joi
 * @param {string} property - Propiedad a validar ('body', 'query', 'params')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property]);
    
    if (error) {
      error.isJoi = true;
      return next(error);
    }
    
    // Reemplazar con valores validados
    req[property] = value;
    next();
  };
}

/**
 * Middleware para validar parámetros de paginación
 */
function validatePagination(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  
  if (page < 1) {
    return res.status(400).json({
      error: 'Parámetro inválido',
      message: 'El parámetro "page" debe ser mayor o igual a 1'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      error: 'Parámetro inválido',
      message: 'El parámetro "limit" debe estar entre 1 y 100'
    });
  }
  
  req.pagination = { page, limit };
  next();
}

/**
 * Middleware para validar UUIDs en parámetros
 * @param {string[]} paramNames - Nombres de parámetros a validar
 */
function validateUUIDs(...paramNames) {
  return (req, res, next) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value && !uuidRegex.test(value)) {
        return res.status(400).json({
          error: 'Parámetro inválido',
          message: `El parámetro "${paramName}" debe ser un UUID válido`
        });
      }
    }
    
    next();
  };
}

module.exports = {
  validate,
  validatePagination,
  validateUUIDs
};

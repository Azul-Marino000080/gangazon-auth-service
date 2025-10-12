const Joi = require('joi');

// Validación para registro de usuario
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email debe tener un formato válido',
    'any.required': 'Email es requerido'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    'any.required': 'Contraseña es requerida'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'Nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 50 caracteres',
    'any.required': 'Apellido es requerido'
  }),
  role: Joi.string().valid(
    'admin',        // Administrador Gangazon (casa matriz)
    'franchisee',   // Dueño de franquicia
    'manager',      // Gerente de local
    'supervisor',   // Supervisor de local
    'employee',     // Empleado
    'viewer'        // Solo lectura
  ).default('employee')
});

// Validación para crear usuario (via POST /api/users)
// Requiere franchiseId excepto para admin
const createUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email debe tener un formato válido',
    'any.required': 'Email es requerido'
  }),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    'any.required': 'Contraseña es requerida'
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 50 caracteres',
    'any.required': 'Nombre es requerido'
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El apellido debe tener al menos 2 caracteres',
    'string.max': 'El apellido no puede exceder 50 caracteres',
    'any.required': 'Apellido es requerido'
  }),
  role: Joi.string().valid(
    'admin',        // Administrador Gangazon (casa matriz)
    'franchisee',   // Dueño de franquicia
    'manager',      // Gerente de local
    'supervisor',   // Supervisor de local
    'employee',     // Empleado
    'viewer'        // Solo lectura
  ).default('employee'),
  franchiseId: Joi.string().uuid().when('role', {
    is: 'admin',
    then: Joi.optional(),
    otherwise: Joi.required().messages({
      'any.required': 'FranchiseId es requerido para usuarios no-admin',
      'string.uuid': 'FranchiseId debe ser un UUID válido'
    })
  }),
  phone: Joi.string().max(20).optional()
});

// Validación para login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email debe tener un formato válido',
    'any.required': 'Email es requerido'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Contraseña es requerida'
  })
});

// Validación para refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token es requerido'
  })
});

// Validación para cambio de contraseña
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Contraseña actual es requerida'
  }),
  newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required().messages({
    'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
    'string.pattern.base': 'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial',
    'any.required': 'Nueva contraseña es requerida'
  })
});

// Organizations eliminado - Gangazon es una única franquicia

// Validación para crear franquicia (franquiciado)
const createFranchiseSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre de la franquicia debe tener al menos 2 caracteres',
    'string.max': 'El nombre de la franquicia no puede exceder 100 caracteres',
    'any.required': 'Nombre de la franquicia es requerido'
  }),
  franchiseeName: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre del franquiciado debe tener al menos 2 caracteres',
    'string.max': 'El nombre del franquiciado no puede exceder 100 caracteres',
    'any.required': 'Nombre del franquiciado es requerido'
  }),
  franchiseeEmail: Joi.string().email().required().messages({
    'string.email': 'Email del franquiciado debe tener un formato válido',
    'any.required': 'Email del franquiciado es requerido'
  }),
  franchiseePhone: Joi.string().max(20).optional(),
  contractStartDate: Joi.date().iso().required().messages({
    'any.required': 'Fecha de inicio del contrato es requerida',
    'date.iso': 'Fecha debe estar en formato ISO'
  }),
  contractEndDate: Joi.date().iso().greater(Joi.ref('contractStartDate')).optional().messages({
    'date.greater': 'Fecha de fin debe ser posterior a la fecha de inicio'
  }),
  maxLocations: Joi.number().integer().min(1).max(100).default(1),
  maxEmployees: Joi.number().integer().min(1).max(1000).default(10),
  billingTier: Joi.string().valid('basic', 'standard', 'premium').default('basic')
});

// Validación para actualizar franquicia
const updateFranchiseSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  franchiseeName: Joi.string().min(2).max(100).optional(),
  franchiseeEmail: Joi.string().email().optional(),
  franchiseePhone: Joi.string().max(20).optional(),
  contractEndDate: Joi.date().iso().optional(),
  maxLocations: Joi.number().integer().min(1).max(100).optional(),
  maxEmployees: Joi.number().integer().min(1).max(1000).optional(),
  billingTier: Joi.string().valid('basic', 'standard', 'premium').optional(),
  status: Joi.string().valid('active', 'suspended', 'terminated', 'pending').optional(),
  settings: Joi.object().optional()
});

// Validación para crear local
const createLocationSchema = Joi.object({
  franchiseId: Joi.string().uuid().required().messages({
    'any.required': 'ID de franquicia es requerido',
    'string.uuid': 'ID de franquicia debe ser un UUID válido'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre del local debe tener al menos 2 caracteres',
    'string.max': 'El nombre del local no puede exceder 100 caracteres',
    'any.required': 'Nombre del local es requerido'
  }),
  address: Joi.string().min(5).max(200).required().messages({
    'string.min': 'La dirección debe tener al menos 5 caracteres',
    'string.max': 'La dirección no puede exceder 200 caracteres',
    'any.required': 'Dirección es requerida'
  }),
  city: Joi.string().min(2).max(100).required().messages({
    'string.min': 'La ciudad debe tener al menos 2 caracteres',
    'string.max': 'La ciudad no puede exceder 100 caracteres',
    'any.required': 'Ciudad es requerida'
  }),
  postalCode: Joi.string().max(10).optional(),
  country: Joi.string().max(50).default('España'),
  phone: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  managerId: Joi.string().uuid().optional(),
  maxEmployees: Joi.number().integer().min(1).max(50).default(5),
  operatingHours: Joi.object().optional(),
  timezone: Joi.string().default('Europe/Madrid'),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional()
});

// Validación para actualizar local
const updateLocationSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  address: Joi.string().min(5).max(200).optional(),
  city: Joi.string().min(2).max(100).optional(),
  postalCode: Joi.string().max(10).optional(),
  country: Joi.string().max(50).optional(),
  phone: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  managerId: Joi.string().uuid().allow(null).optional(),
  maxEmployees: Joi.number().integer().min(1).max(50).optional(),
  operatingHours: Joi.object().optional(),
  timezone: Joi.string().optional(),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional(),
  isActive: Joi.boolean().optional(),
  settings: Joi.object().optional()
});

// Validación para crear asignación de empleado
const createAssignmentSchema = Joi.object({
  user_id: Joi.string().uuid().required().messages({
    'any.required': 'ID de usuario es requerido',
    'string.uuid': 'ID de usuario debe ser un UUID válido'
  }),
  location_id: Joi.string().uuid().required().messages({
    'any.required': 'ID de local es requerido',
    'string.uuid': 'ID de local debe ser un UUID válido'
  }),
  role_at_location: Joi.string().valid('manager', 'supervisor', 'employee').default('employee'),
  start_date: Joi.date().iso().required().messages({
    'any.required': 'Fecha de inicio es requerida',
    'date.iso': 'Fecha debe estar en formato ISO'
  }),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional().messages({
    'date.greater': 'Fecha de fin debe ser posterior a la fecha de inicio'
  }),
  shift_type: Joi.string().valid('full_time', 'part_time', 'temporary', 'cover').default('full_time'),
  notes: Joi.string().max(500).optional()
});

// Validación para actualizar asignación
const updateAssignmentSchema = Joi.object({
  role_at_location: Joi.string().valid('manager', 'supervisor', 'employee').optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  shift_type: Joi.string().valid('full_time', 'part_time', 'temporary', 'cover').optional(),
  is_active: Joi.boolean().optional(),
  notes: Joi.string().max(500).optional()
});

// Validación para check-in
const checkinSchema = Joi.object({
  locationId: Joi.string().uuid().required().messages({
    'any.required': 'ID de local es requerido',
    'string.uuid': 'ID de local debe ser un UUID válido'
  }),
  checkInMethod: Joi.string().valid('manual', 'gps', 'qr_code', 'nfc').default('manual'),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }).optional(),
  notes: Joi.string().max(500).optional()
});

// Validación para check-out
const checkoutSchema = Joi.object({
  checkinId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID de check-in debe ser un UUID válido'
  }),
  breakDuration: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Duración de descanso debe ser un número',
    'number.integer': 'Duración de descanso debe ser un número entero (minutos)',
    'number.min': 'Duración de descanso no puede ser negativa'
  }),
  notes: Joi.string().max(500).optional()
});

// Validación para actualizar usuario
const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  role: Joi.string().valid(
    'admin',        // Administrador Gangazon
    'franchisee',   // Dueño de franquicia
    'manager',      // Gerente de local
    'supervisor',   // Supervisor de local
    'employee',     // Empleado
    'viewer'        // Solo lectura
  ).optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  registerSchema,
  createUserSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateUserSchema,
  createFranchiseSchema,
  updateFranchiseSchema,
  createLocationSchema,
  updateLocationSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  checkinSchema,
  checkoutSchema
};
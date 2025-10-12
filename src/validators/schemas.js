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
  organizationId: Joi.string().uuid().optional(),
  role: Joi.string().valid(
    'user', 
    'admin', 
    'super_admin', 
    'franchisor_admin', 
    'franchisor_ceo',
    'franchisee_admin',
    'franchisee_owner',
    'location_manager',
    'location_supervisor'
  ).default('user')
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

// Validación para crear organización
const createOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre de la organización debe tener al menos 2 caracteres',
    'string.max': 'El nombre de la organización no puede exceder 100 caracteres',
    'any.required': 'Nombre de la organización es requerido'
  }),
  description: Joi.string().max(500).optional(),
  website: Joi.string().uri().optional(),
  industry: Joi.string().max(100).optional(),
  size: Joi.string().valid('startup', 'small', 'medium', 'large', 'enterprise').optional()
});

// Validación para crear franquicia
const createFranchiseSchema = Joi.object({
  organizationId: Joi.string().uuid().required().messages({
    'any.required': 'ID de organización es requerido',
    'string.uuid': 'ID de organización debe ser un UUID válido'
  }),
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
  userId: Joi.string().uuid().required().messages({
    'any.required': 'ID de usuario es requerido',
    'string.uuid': 'ID de usuario debe ser un UUID válido'
  }),
  locationId: Joi.string().uuid().required().messages({
    'any.required': 'ID de local es requerido',
    'string.uuid': 'ID de local debe ser un UUID válido'
  }),
  roleAtLocation: Joi.string().valid('location_manager', 'location_supervisor', 'location_employee', 'location_temp').default('location_employee'),
  startDate: Joi.date().iso().required().messages({
    'any.required': 'Fecha de inicio es requerida',
    'date.iso': 'Fecha debe estar en formato ISO'
  }),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional().messages({
    'date.greater': 'Fecha de fin debe ser posterior a la fecha de inicio'
  }),
  shiftType: Joi.string().valid('full_time', 'part_time', 'temporary', 'cover').default('full_time'),
  notes: Joi.string().max(500).optional()
});

// Validación para actualizar asignación
const updateAssignmentSchema = Joi.object({
  roleAtLocation: Joi.string().valid('location_manager', 'location_supervisor', 'location_employee', 'location_temp').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  shiftType: Joi.string().valid('full_time', 'part_time', 'temporary', 'cover').optional(),
  isActive: Joi.boolean().optional(),
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
  role: Joi.string().valid(
    'user', 
    'admin', 
    'super_admin', 
    'franchisor_admin', 
    'franchisor_ceo',
    'franchisee_admin',
    'franchisee_owner',
    'location_manager',
    'location_supervisor'
  ).optional(),
  isActive: Joi.boolean().optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  createOrganizationSchema,
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
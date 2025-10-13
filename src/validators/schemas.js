const Joi = require('joi');

// Schema para login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email es requerido'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'Contraseña es requerida'
  }),
  applicationCode: Joi.string().required().messages({
    'any.required': 'Código de aplicación es requerido'
  })
});

// Schema para refresh token
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token es requerido'
  })
});

// Schema para crear usuario
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(100).required(),
  lastName: Joi.string().min(2).max(100).required(),
  phone: Joi.string().optional().allow('', null),
  franchiseId: Joi.string().uuid().optional().allow(null)
});

// Schema para actualizar usuario
const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().optional().allow('', null),
  isActive: Joi.boolean().optional()
}).min(1); // Al menos un campo debe estar presente

// Schema para asignar permiso
const assignPermissionSchema = Joi.object({
  applicationId: Joi.string().uuid().required(),
  permissionId: Joi.string().uuid().required(),
  expiresAt: Joi.date().iso().optional().allow(null)
});

// Schema para revocar permiso
const revokePermissionSchema = Joi.object({
  applicationId: Joi.string().uuid().required(),
  permissionId: Joi.string().uuid().required()
});

// Schema para crear aplicación
const createApplicationSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  code: Joi.string().min(2).max(50).uppercase().required(),
  description: Joi.string().max(500).optional().allow('', null),
  redirectUrl: Joi.string().uri().required(),
  allowedOrigins: Joi.array().items(Joi.string().uri()).optional()
});

// Schema para actualizar aplicación
const updateApplicationSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  redirectUrl: Joi.string().uri().optional(),
  allowedOrigins: Joi.array().items(Joi.string().uri()).optional(),
  isActive: Joi.boolean().optional()
}).min(1);

// Schema para crear permiso
const createPermissionSchema = Joi.object({
  applicationId: Joi.string().uuid().required(),
  code: Joi.string().min(3).max(100).required(),
  displayName: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(500).optional().allow('', null),
  category: Joi.string().max(100).optional().allow('', null)
});

// Schema para actualizar permiso
const updatePermissionSchema = Joi.object({
  displayName: Joi.string().min(3).max(200).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  isActive: Joi.boolean().optional()
}).min(1);

// Schema para crear franquicia
const createFranchiseSchema = Joi.object({
  name: Joi.string().min(3).max(200).required(),
  code: Joi.string().min(2).max(50).uppercase().required(),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().optional().allow('', null),
  address: Joi.string().max(255).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  contactPerson: Joi.string().max(200).optional().allow('', null)
});

// Schema para actualizar franquicia
const updateFranchiseSchema = Joi.object({
  name: Joi.string().min(3).max(200).optional(),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().optional().allow('', null),
  address: Joi.string().max(255).optional().allow('', null),
  city: Joi.string().max(100).optional().allow('', null),
  state: Joi.string().max(100).optional().allow('', null),
  postalCode: Joi.string().max(20).optional().allow('', null),
  country: Joi.string().max(100).optional().allow('', null),
  contactPerson: Joi.string().max(200).optional().allow('', null),
  isActive: Joi.boolean().optional()
}).min(1);

module.exports = {
  loginSchema,
  refreshTokenSchema,
  createUserSchema,
  updateUserSchema,
  assignPermissionSchema,
  revokePermissionSchema,
  createApplicationSchema,
  updateApplicationSchema,
  createPermissionSchema,
  updatePermissionSchema,
  createFranchiseSchema,
  updateFranchiseSchema
};

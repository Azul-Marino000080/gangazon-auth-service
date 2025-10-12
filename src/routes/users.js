const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole, requireOrgAccess } = require('../middleware/auth');
const { updateUserSchema } = require('../validators/schemas');

// Obtener perfil del usuario actual
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const { data: user, error } = await db.getClient()
      .from('users')
      .select(`
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name, description)
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar perfil del usuario actual
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const updateData = {};
    if (value.firstName) updateData.first_name = value.firstName;
    if (value.lastName) updateData.last_name = value.lastName;
    if (value.email) updateData.email = value.email;
    
    updateData.updated_at = new Date().toISOString();

    const { data: user, error: updateError } = await db.getClient()
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, email, first_name, last_name, role, organization_id')
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando usuario',
        message: 'No se pudo actualizar el usuario'
      });
    }

    logger.info(`Usuario actualizado: ${user.email}`);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      }
    });

  } catch (error) {
    next(error);
  }
});

// Listar usuarios (solo para admins)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const organizationId = req.query.organizationId || req.user.organizationId;

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name)
      `, { count: 'exact' });

    // Filtros - admin siempre ve solo su organización
    query = query.eq('organization_id', req.user.organizationId);

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      query = query.eq('role', role);
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo usuarios',
        message: 'No se pudieron obtener los usuarios'
      });
    }

    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      })),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

// Obtener usuario por ID (solo para admins)
router.get('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, async (req, res, next) => {
  try {
    const { userId } = req.params;

    let query = db.getClient()
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        organization_id,
        is_active,
        email_verified,
        created_at,
        last_login_at,
        organizations(name, description)
      `)
      .eq('id', userId);

    // Admin solo puede ver usuarios de su organización
    query = query.eq('organization_id', req.user.organizationId);

    const { data: user, error } = await query.single();

    if (error || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        organization: user.organizations,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar usuario (solo para admins)
router.put('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { error, value } = updateUserSchema.validate(req.body);
    
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // Verificar que el usuario existe y pertenece a la organización correcta
    let userQuery = db.getClient()
      .from('users')
      .select('id, organization_id, role')
      .eq('id', userId)
      .eq('organization_id', req.user.organizationId);

    const { data: existingUser, error: userError } = await userQuery.single();

    if (userError || !existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    // Validaciones de permisos para cambio de rol
    if (value.role && value.role !== existingUser.role) {
      // Admin no puede modificar otros admins
      if (existingUser.role === 'admin') {
        return res.status(403).json({
          error: 'Permisos insuficientes',
          message: 'No puedes modificar usuarios con rol de admin'
        });
      }
    }

    const updateData = {};
    if (value.firstName) updateData.first_name = value.firstName;
    if (value.lastName) updateData.last_name = value.lastName;
    if (value.email) updateData.email = value.email;
    if (value.role) updateData.role = value.role;
    if (value.isActive !== undefined) updateData.is_active = value.isActive;
    
    updateData.updated_at = new Date().toISOString();

    const { data: user, error: updateError } = await db.getClient()
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, first_name, last_name, role, organization_id, is_active')
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando usuario',
        message: 'No se pudo actualizar el usuario'
      });
    }

    logger.info(`Usuario ${userId} actualizado por ${req.user.email}`);

    res.json({
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id,
        isActive: user.is_active
      }
    });

  } catch (error) {
    next(error);
  }
});

// Desactivar usuario (solo para admins)
router.delete('/:userId', authenticateToken, requireRole(['admin']), requireOrgAccess, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verificar que el usuario existe
    let userQuery = db.getClient()
      .from('users')
      .select('id, organization_id, role, email')
      .eq('id', userId)
      .eq('organization_id', req.user.organizationId);

    const { data: existingUser, error: userError } = await userQuery.single();

    if (userError || !existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario'
      });
    }

    // No permitir que se desactive a sí mismo
    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        error: 'Operación no permitida',
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Admin no puede desactivar otros admins
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No puedes desactivar usuarios con rol de admin'
      });
    }

    // Desactivar usuario en lugar de eliminarlo
    const { error: updateError } = await db.getClient()
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return res.status(500).json({
        error: 'Error desactivando usuario',
        message: 'No se pudo desactivar el usuario'
      });
    }

    // Eliminar todos los refresh tokens del usuario
    await db.getClient()
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);

    logger.info(`Usuario ${existingUser.email} desactivado por ${req.user.email}`);

    res.json({
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
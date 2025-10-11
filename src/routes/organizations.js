const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const authUtils = require('../utils/auth');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createOrganizationSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');

// Crear organización (solo super_admin)
router.post('/', authenticateToken, requireRole(['super_admin']), async (req, res, next) => {
  try {
    const { error, value } = createOrganizationSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { name, description, website, industry, size } = value;

    // Verificar que no existe una organización con el mismo nombre
    const { data: existingOrg } = await db.getClient()
      .from('organizations')
      .select('id')
      .eq('name', name)
      .single();

    if (existingOrg) {
      return res.status(409).json({
        error: 'Organización ya existe',
        message: 'Ya existe una organización con este nombre'
      });
    }

    // Crear organización
    const { data: organization, error: orgError } = await db.getClient()
      .from('organizations')
      .insert({
        id: uuidv4(),
        name,
        description,
        website,
        industry,
        size,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError) {
      logger.error('Error creando organización:', orgError);
      return res.status(500).json({
        error: 'Error creando organización',
        message: 'No se pudo crear la organización'
      });
    }

    logger.info(`Organización creada: ${name} por ${req.user.email}`);

    res.status(201).json({
      message: 'Organización creada exitosamente',
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        website: organization.website,
        industry: organization.industry,
        size: organization.size,
        isActive: organization.is_active,
        createdAt: organization.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Listar organizaciones
router.get('/', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('organizations')
      .select('*', { count: 'exact' });

    // Si no es super_admin, solo puede ver su organización
    if (req.user.role !== 'super_admin') {
      query = query.eq('id', req.user.organizationId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: organizations, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo organizaciones',
        message: 'No se pudieron obtener las organizaciones'
      });
    }

    res.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        description: org.description,
        website: org.website,
        industry: org.industry,
        size: org.size,
        isActive: org.is_active,
        createdAt: org.created_at,
        updatedAt: org.updated_at
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

// Obtener organización por ID
router.get('/:organizationId', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Verificar permisos
    if (req.user.role !== 'super_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a esta organización'
      });
    }

    const { data: organization, error } = await db.getClient()
      .from('organizations')
      .select(`
        *,
        users(count)
      `)
      .eq('id', organizationId)
      .single();

    if (error || !organization) {
      return res.status(404).json({
        error: 'Organización no encontrada',
        message: 'No se pudo encontrar la organización'
      });
    }

    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        website: organization.website,
        industry: organization.industry,
        size: organization.size,
        isActive: organization.is_active,
        createdAt: organization.created_at,
        updatedAt: organization.updated_at,
        userCount: organization.users?.[0]?.count || 0
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar organización
router.put('/:organizationId', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Verificar permisos
    if (req.user.role !== 'super_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para modificar esta organización'
      });
    }

    const { error, value } = createOrganizationSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { name, description, website, industry, size } = value;

    // Verificar que la organización existe
    const { data: existingOrg, error: orgError } = await db.getClient()
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !existingOrg) {
      return res.status(404).json({
        error: 'Organización no encontrada',
        message: 'No se pudo encontrar la organización'
      });
    }

    // Verificar que no existe otra organización con el mismo nombre
    if (name !== existingOrg.name) {
      const { data: nameCheck } = await db.getClient()
        .from('organizations')
        .select('id')
        .eq('name', name)
        .neq('id', organizationId)
        .single();

      if (nameCheck) {
        return res.status(409).json({
          error: 'Nombre ya existe',
          message: 'Ya existe otra organización con este nombre'
        });
      }
    }

    // Actualizar organización
    const { data: organization, error: updateError } = await db.getClient()
      .from('organizations')
      .update({
        name,
        description,
        website,
        industry,
        size,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando organización',
        message: 'No se pudo actualizar la organización'
      });
    }

    logger.info(`Organización ${organizationId} actualizada por ${req.user.email}`);

    res.json({
      message: 'Organización actualizada exitosamente',
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        website: organization.website,
        industry: organization.industry,
        size: organization.size,
        isActive: organization.is_active,
        createdAt: organization.created_at,
        updatedAt: organization.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Desactivar organización (solo super_admin)
router.delete('/:organizationId', authenticateToken, requireRole(['super_admin']), async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Verificar que la organización existe
    const { data: organization, error: orgError } = await db.getClient()
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({
        error: 'Organización no encontrada',
        message: 'No se pudo encontrar la organización'
      });
    }

    // Desactivar organización y todos sus usuarios
    const { error: updateError } = await db.getClient()
      .from('organizations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      return res.status(500).json({
        error: 'Error desactivando organización',
        message: 'No se pudo desactivar la organización'
      });
    }

    // Desactivar todos los usuarios de la organización
    await db.getClient()
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId);

    // Eliminar todos los refresh tokens de los usuarios de la organización
    const { data: users } = await db.getClient()
      .from('users')
      .select('id')
      .eq('organization_id', organizationId);

    if (users && users.length > 0) {
      const userIds = users.map(user => user.id);
      await db.getClient()
        .from('refresh_tokens')
        .delete()
        .in('user_id', userIds);
    }

    logger.info(`Organización ${organization.name} desactivada por ${req.user.email}`);

    res.json({
      message: 'Organización desactivada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener estadísticas de la organización
router.get('/:organizationId/stats', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res, next) => {
  try {
    const { organizationId } = req.params;

    // Verificar permisos
    if (req.user.role !== 'super_admin' && req.user.organizationId !== organizationId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a esta organización'
      });
    }

    // Obtener estadísticas
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: adminUsers }
    ] = await Promise.all([
      db.getClient().from('users').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      db.getClient().from('users').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      db.getClient().from('users').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('role', 'admin')
    ]);

    // Usuarios creados en los últimos 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsers } = await db.getClient()
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', thirtyDaysAgo);

    res.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        adminUsers: adminUsers || 0,
        newUsers: newUsers || 0
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
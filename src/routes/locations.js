const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createLocationSchema, updateLocationSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');

// Crear local (franquiciado o casa matriz)
router.post('/', authenticateToken, requireRole(['admin', 'franchisee']), async (req, res, next) => {
  try {
    const { error, value } = createLocationSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { 
      franchiseId, 
      name, 
      address, 
      city, 
      postalCode,
      country,
      phone,
      email,
      managerId,
      maxEmployees,
      operatingHours,
      timezone,
      coordinates
    } = value;

    // Verificar que la franquicia existe y permisos
    let franchiseQuery = db.getClient()
      .from('franchises')
      .select('id, organization_id, max_locations, name')
      .eq('id', franchiseId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      franchiseQuery = franchiseQuery.eq('organization_id', req.user.organizationId);
    }

    const { data: franchise, error: franchiseError } = await franchiseQuery.single();

    if (franchiseError || !franchise) {
      return res.status(404).json({
        error: 'Franquicia no encontrada',
        message: 'No se pudo encontrar la franquicia o no tienes permisos'
      });
    }

    // Verificar límite de locales
    const { count: currentLocations } = await db.getClient()
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('franchise_id', franchiseId)
      .eq('is_active', true);

    if (currentLocations >= franchise.max_locations) {
      return res.status(400).json({
        error: 'Límite de locales alcanzado',
        message: `La franquicia ya tiene el máximo de ${franchise.max_locations} locales permitidos`
      });
    }

    // Verificar que no existe un local con el mismo nombre en la franquicia
    const { data: existingLocation } = await db.getClient()
      .from('locations')
      .select('id')
      .eq('franchise_id', franchiseId)
      .eq('name', name)
      .single();

    if (existingLocation) {
      return res.status(409).json({
        error: 'Local ya existe',
        message: 'Ya existe un local con este nombre en la franquicia'
      });
    }

    // Verificar manager si se especifica
    if (managerId) {
      const { data: manager } = await db.getClient()
        .from('users')
        .select('id, organization_id')
        .eq('id', managerId)
        .eq('organization_id', franchise.organization_id)
        .single();

      if (!manager) {
        return res.status(400).json({
          error: 'Manager inválido',
          message: 'El manager especificado no existe o no pertenece a la organización'
        });
      }
    }

    // Crear local
    const { data: location, error: locationError } = await db.getClient()
      .from('locations')
      .insert({
        id: uuidv4(),
        franchise_id: franchiseId,
        name,
        address,
        city,
        postal_code: postalCode,
        country: country || 'España',
        phone,
        email,
        manager_id: managerId,
        max_employees: maxEmployees || 5,
        operating_hours: operatingHours || {},
        timezone: timezone || 'Europe/Madrid',
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (locationError) {
      logger.error('Error creando local:', locationError);
      return res.status(500).json({
        error: 'Error creando local',
        message: 'No se pudo crear el local'
      });
    }

    logger.info(`Local creado: ${name} en franquicia ${franchise.name} por ${req.user.email}`);

    res.status(201).json({
      message: 'Local creado exitosamente',
      location: {
        id: location.id,
        franchiseId: location.franchise_id,
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postal_code,
        country: location.country,
        phone: location.phone,
        email: location.email,
        managerId: location.manager_id,
        maxEmployees: location.max_employees,
        operatingHours: location.operating_hours,
        timezone: location.timezone,
        coordinates: location.latitude && location.longitude ? {
          lat: location.latitude,
          lng: location.longitude
        } : null,
        isActive: location.is_active,
        createdAt: location.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Listar locales (por franquicia o todos según permisos)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const franchiseId = req.query.franchiseId;
    const city = req.query.city || '';

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('locations')
      .select(`
        id,
        franchise_id,
        name,
        address,
        city,
        postal_code,
        country,
        phone,
        email,
        manager_id,
        max_employees,
        operating_hours,
        timezone,
        latitude,
        longitude,
        is_active,
        created_at,
        updated_at,
        franchises(name, organization_id),
        users(first_name, last_name, email)
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Casa matriz puede ver todos los locales
      if (franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }
    } else if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
      // Franquiciados solo pueden ver locales de su organización
      query = query.in('franchise_id', 
        db.getClient()
          .from('franchises')
          .select('id')
          .eq('organization_id', req.user.organizationId)
      );
      if (franchiseId) {
        query = query.eq('franchise_id', franchiseId);
      }
    } else if (['location_manager', 'location_supervisor'].includes(req.user.role)) {
      // Managers solo ven sus locales asignados
      query = query.eq('manager_id', req.user.id);
    } else {
      // Empleados ven locales donde están asignados
      query = query.in('id',
        db.getClient()
          .from('employee_assignments')
          .select('location_id')
          .eq('user_id', req.user.id)
          .eq('is_active', true)
      );
    }

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data: locations, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo locales',
        message: 'No se pudieron obtener los locales'
      });
    }

    res.json({
      locations: locations.map(location => ({
        id: location.id,
        franchiseId: location.franchise_id,
        franchise: location.franchises,
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postal_code,
        country: location.country,
        phone: location.phone,
        email: location.email,
        managerId: location.manager_id,
        manager: location.users,
        maxEmployees: location.max_employees,
        operatingHours: location.operating_hours,
        timezone: location.timezone,
        coordinates: location.latitude && location.longitude ? {
          lat: location.latitude,
          lng: location.longitude
        } : null,
        isActive: location.is_active,
        createdAt: location.created_at,
        updatedAt: location.updated_at
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

// Obtener local por ID
router.get('/:locationId', authenticateToken, async (req, res, next) => {
  try {
    const { locationId } = req.params;

    let query = db.getClient()
      .from('locations')
      .select(`
        id,
        franchise_id,
        name,
        address,
        city,
        postal_code,
        country,
        phone,
        email,
        manager_id,
        max_employees,
        operating_hours,
        timezone,
        latitude,
        longitude,
        is_active,
        settings,
        created_at,
        updated_at,
        franchises(name, organization_id, franchisee_name),
        users(first_name, last_name, email)
      `)
      .eq('id', locationId);

    // Verificar permisos según rol
    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
        // Solo locales de su organización
        query = query.in('franchise_id',
          db.getClient()
            .from('franchises')
            .select('id')
            .eq('organization_id', req.user.organizationId)
        );
      } else if (['location_manager', 'location_supervisor'].includes(req.user.role)) {
        // Solo sus locales asignados
        query = query.eq('manager_id', req.user.id);
      } else {
        // Solo locales donde está asignado
        query = query.in('id',
          db.getClient()
            .from('employee_assignments')
            .select('location_id')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
        );
      }
    }

    const { data: location, error } = await query.single();

    if (error || !location) {
      return res.status(404).json({
        error: 'Local no encontrado',
        message: 'No se pudo encontrar el local'
      });
    }

    // Obtener estadísticas del local
    const [
      { count: totalEmployees },
      { count: activeEmployees },
      { count: todayCheckins }
    ] = await Promise.all([
      db.getClient().from('employee_assignments').select('*', { count: 'exact', head: true }).eq('location_id', locationId),
      db.getClient().from('employee_assignments').select('*', { count: 'exact', head: true }).eq('location_id', locationId).eq('is_active', true),
      db.getClient().from('employee_checkins').select('*', { count: 'exact', head: true }).eq('location_id', locationId).gte('check_in_time', new Date().toISOString().split('T')[0])
    ]);

    res.json({
      location: {
        id: location.id,
        franchiseId: location.franchise_id,
        franchise: location.franchises,
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postal_code,
        country: location.country,
        phone: location.phone,
        email: location.email,
        managerId: location.manager_id,
        manager: location.users,
        maxEmployees: location.max_employees,
        operatingHours: location.operating_hours,
        timezone: location.timezone,
        coordinates: location.latitude && location.longitude ? {
          lat: location.latitude,
          lng: location.longitude
        } : null,
        isActive: location.is_active,
        settings: location.settings,
        createdAt: location.created_at,
        updatedAt: location.updated_at,
        stats: {
          totalEmployees: totalEmployees || 0,
          activeEmployees: activeEmployees || 0,
          todayCheckins: todayCheckins || 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar local
router.put('/:locationId', authenticateToken, requireRole(['admin', 'franchisee', 'manager']), async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const { error, value } = updateLocationSchema.validate(req.body);
    
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // Verificar que el local existe y permisos
    let locationQuery = db.getClient()
      .from('locations')
      .select('id, franchise_id, name, manager_id')
      .eq('id', locationId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
        locationQuery = locationQuery.in('franchise_id',
          db.getClient()
            .from('franchises')
            .select('id')
            .eq('organization_id', req.user.organizationId)
        );
      } else if (['location_manager'].includes(req.user.role)) {
        locationQuery = locationQuery.eq('manager_id', req.user.id);
      }
    }

    const { data: existingLocation, error: locationError } = await locationQuery.single();

    if (locationError || !existingLocation) {
      return res.status(404).json({
        error: 'Local no encontrado',
        message: 'No se pudo encontrar el local'
      });
    }

    const updateData = {};
    if (value.name) updateData.name = value.name;
    if (value.address) updateData.address = value.address;
    if (value.city) updateData.city = value.city;
    if (value.postalCode) updateData.postal_code = value.postalCode;
    if (value.country) updateData.country = value.country;
    if (value.phone) updateData.phone = value.phone;
    if (value.email) updateData.email = value.email;
    if (value.managerId) updateData.manager_id = value.managerId;
    if (value.maxEmployees) updateData.max_employees = value.maxEmployees;
    if (value.operatingHours) updateData.operating_hours = value.operatingHours;
    if (value.timezone) updateData.timezone = value.timezone;
    if (value.coordinates) {
      updateData.latitude = value.coordinates.lat;
      updateData.longitude = value.coordinates.lng;
    }
    if (value.isActive !== undefined) updateData.is_active = value.isActive;
    if (value.settings) updateData.settings = value.settings;
    
    updateData.updated_at = new Date().toISOString();

    const { data: location, error: updateError } = await db.getClient()
      .from('locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando local',
        message: 'No se pudo actualizar el local'
      });
    }

    logger.info(`Local ${locationId} actualizado por ${req.user.email}`);

    res.json({
      message: 'Local actualizado exitosamente',
      location: {
        id: location.id,
        franchiseId: location.franchise_id,
        name: location.name,
        address: location.address,
        city: location.city,
        postalCode: location.postal_code,
        country: location.country,
        phone: location.phone,
        email: location.email,
        managerId: location.manager_id,
        maxEmployees: location.max_employees,
        operatingHours: location.operating_hours,
        timezone: location.timezone,
        coordinates: location.latitude && location.longitude ? {
          lat: location.latitude,
          lng: location.longitude
        } : null,
        isActive: location.is_active,
        settings: location.settings,
        updatedAt: location.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Desactivar local
router.delete('/:locationId', authenticateToken, requireRole(['admin', 'franchisee']), async (req, res, next) => {
  try {
    const { locationId } = req.params;

    // Verificar que el local existe
    let locationQuery = db.getClient()
      .from('locations')
      .select('id, franchise_id, name')
      .eq('id', locationId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      locationQuery = locationQuery.in('franchise_id',
        db.getClient()
          .from('franchises')
          .select('id')
          .eq('organization_id', req.user.organizationId)
      );
    }

    const { data: location, error: locationError } = await locationQuery.single();

    if (locationError || !location) {
      return res.status(404).json({
        error: 'Local no encontrado',
        message: 'No se pudo encontrar el local'
      });
    }

    // Desactivar local
    const { error: updateError } = await db.getClient()
      .from('locations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId);

    if (updateError) {
      return res.status(500).json({
        error: 'Error desactivando local',
        message: 'No se pudo desactivar el local'
      });
    }

    // Desactivar todas las asignaciones del local
    await db.getClient()
      .from('employee_assignments')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('location_id', locationId);

    logger.info(`Local ${location.name} desactivado por ${req.user.email}`);

    res.json({
      message: 'Local desactivado exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener empleados activos en un local
router.get('/:locationId/employees', authenticateToken, async (req, res, next) => {
  try {
    const { locationId } = req.params;

    // Verificar permisos para ver el local
    const canAccess = await canUserAccessLocation(req.user, locationId);
    if (!canAccess) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para ver este local'
      });
    }

    // Obtener empleados activos usando la función de base de datos
    const { data: employees, error } = await db.getClient()
      .rpc('get_location_active_employees', { p_location_id: locationId });

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo empleados',
        message: 'No se pudieron obtener los empleados del local'
      });
    }

    res.json({
      locationId,
      employees: employees || []
    });

  } catch (error) {
    next(error);
  }
});

// Función auxiliar para verificar acceso a local
async function canUserAccessLocation(user, locationId) {
  if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(user.role)) {
    return true;
  }

  if (['franchisee_owner', 'franchisee_admin'].includes(user.role)) {
    const { data } = await db.getClient()
      .from('locations')
      .select('franchise_id')
      .eq('id', locationId)
      .in('franchise_id',
        db.getClient()
          .from('franchises')
          .select('id')
          .eq('organization_id', user.organizationId)
      )
      .single();
    return !!data;
  }

  if (['location_manager', 'location_supervisor'].includes(user.role)) {
    const { data } = await db.getClient()
      .from('locations')
      .select('id')
      .eq('id', locationId)
      .eq('manager_id', user.id)
      .single();
    return !!data;
  }

  // Empleados pueden ver locales donde están asignados
  const { data } = await db.getClient()
    .from('employee_assignments')
    .select('id')
    .eq('user_id', user.id)
    .eq('location_id', locationId)
    .eq('is_active', true)
    .single();
  return !!data;
}

module.exports = router;
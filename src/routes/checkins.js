const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkinSchema, checkoutSchema } = require('../validators/schemas');
const { canUserAccessLocation, canUserAccessCheckin, validateGPSProximity } = require('../utils/permissions');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict, sendForbidden, sendPaginated } = require('../utils/responseHelpers');
const { validate, validatePagination } = require('../middleware/validation');
const { CHECKIN_METHODS, GPS } = require('../utils/constants');

// Check-in de empleado
router.post('/checkin', authenticateToken, validate(checkinSchema), async (req, res, next) => {
  try {
    const { 
      locationId, 
      checkInMethod,
      coordinates,
      notes
    } = req.body;

    // Verificar que el empleado tiene acceso al local
    const hasAccess = await canUserAccessLocation(req.user, locationId);
    if (!hasAccess) {
      return sendForbidden(res, 'No tienes asignación activa para trabajar en este local');
    }

    // Verificar que no hay un check-in activo
    const { data: activeCheckin } = await db.getClient()
      .from('employee_checkins')
      .select('id, location_id')
      .eq('user_id', req.user.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (activeCheckin) {
      return sendConflict(res, 'Ya tienes un check-in activo. Debes hacer check-out primero', {
        activeCheckin: {
          id: activeCheckin.id,
          locationId: activeCheckin.location_id
        }
      });
    }

    // Validar GPS
    if (checkInMethod === CHECKIN_METHODS.GPS && !coordinates) {
      return sendError(res, 'Coordenadas requeridas', 'Se requieren coordenadas GPS para el método de check-in GPS', 400);
    }
    
    if (coordinates) {
      const gpsValidation = await validateGPSProximity(coordinates, locationId);
      
      if (!gpsValidation.valid) {
        return sendError(res, 'Ubicación inválida', gpsValidation.message, 400, {
          distance: gpsValidation.distance,
          maxDistance: GPS.TOLERANCE_METERS
        });
      }
    }

    // Obtener la asignación activa para este local
    const { data: assignment } = await db.getClient()
      .from('employee_assignments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .single();

    // Crear check-in
    const { data: checkin, error: checkinError } = await db.getClient()
      .from('employee_checkins')
      .insert({
        id: uuidv4(),
        user_id: req.user.id,
        location_id: locationId,
        assignment_id: assignment?.id,
        check_in_time: new Date().toISOString(),
        check_in_method: checkInMethod || 'manual',
        check_in_latitude: coordinates?.lat || null,
        check_in_longitude: coordinates?.lng || null,
        notes,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        user_id,
        location_id,
        check_in_time,
        check_in_method,
        check_in_latitude,
        check_in_longitude,
        notes,
        locations(name, address)
      `)
      .single();

    if (checkinError) {
      logger.error('Error en check-in:', checkinError);
      return sendError(res, 'Error en check-in', 'No se pudo registrar el check-in', 500);
    }

    logger.info(`Check-in registrado: ${req.user.email} en ${checkin.locations.name}`);

    return sendCreated(res, {
      checkin: {
        id: checkin.id,
        userId: checkin.user_id,
        locationId: checkin.location_id,
        location: checkin.locations,
        checkInTime: checkin.check_in_time,
        checkInMethod: checkin.check_in_method,
        coordinates: checkin.check_in_latitude && checkin.check_in_longitude ? {
          lat: checkin.check_in_latitude,
          lng: checkin.check_in_longitude
        } : null,
        notes: checkin.notes
      }
    }, 'Check-in registrado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Check-out de empleado
router.post('/checkout', authenticateToken, validate(checkoutSchema), async (req, res, next) => {
  try {
    const { 
      checkinId,
      breakDuration,
      notes
    } = req.body;

    // Buscar el check-in activo del usuario
    let checkinQuery = db.getClient()
      .from('employee_checkins')
      .select('id, location_id, check_in_time')
      .eq('user_id', req.user.id)
      .is('check_out_time', null);

    if (checkinId) {
      checkinQuery = checkinQuery.eq('id', checkinId);
    }

    const { data: activeCheckin, error: checkinError } = await checkinQuery
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (checkinError || !activeCheckin) {
      return sendNotFound(res, 'Check-in activo');
    }

    const checkOutTime = new Date().toISOString();

    // Calcular horas trabajadas
    const checkInTime = new Date(activeCheckin.check_in_time);
    const checkOutTimeObj = new Date(checkOutTime);
    const hoursWorked = Math.round((checkOutTimeObj - checkInTime) / (1000 * 60 * 60) * 100) / 100;

    // Actualizar el check-in con el check-out
    const { data: checkin, error: updateError } = await db.getClient()
      .from('employee_checkins')
      .update({
        check_out_time: checkOutTime,
        break_duration: breakDuration || 0,
        notes: notes || activeCheckin.notes
      })
      .eq('id', activeCheckin.id)
      .select(`
        id,
        user_id,
        location_id,
        check_in_time,
        check_out_time,
        break_duration,
        notes,
        locations(name, address)
      `)
      .single();

    if (updateError) {
      logger.error('Error en check-out:', updateError);
      return sendError(res, 'Error en check-out', 'No se pudo registrar el check-out', 500);
    }

    logger.info(`Check-out registrado: ${req.user.email} en ${checkin.locations.name}`);

    return sendSuccess(res, {
      checkin: {
        id: checkin.id,
        userId: checkin.user_id,
        locationId: checkin.location_id,
        location: checkin.locations,
        checkInTime: checkin.check_in_time,
        checkOutTime: checkin.check_out_time,
        hoursWorked: hoursWorked,
        breakDuration: checkin.break_duration,
        notes: checkin.notes
      }
    }, 'Check-out registrado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Obtener estado actual del empleado (si está en check-in)
router.get('/status', authenticateToken, async (req, res, next) => {
  try {
    // Buscar check-in activo del usuario
    const { data: activeCheckin, error } = await db.getClient()
      .from('employee_checkins')
      .select(`
        id,
        location_id,
        check_in_time,
        check_in_method,
        notes,
        locations(name, address, franchise_id, franchises(name))
      `)
      .eq('user_id', req.user.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (error || !activeCheckin) {
      return sendSuccess(res, {
        isCheckedIn: false
      }, 'No tienes check-in activo');
    }

    const checkInTime = new Date(activeCheckin.check_in_time);
    const currentTime = new Date();
    const hoursWorked = Math.round((currentTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;

    return sendSuccess(res, {
      isCheckedIn: true,
      checkin: {
        id: activeCheckin.id,
        locationId: activeCheckin.location_id,
        location: activeCheckin.locations,
        checkInTime: activeCheckin.check_in_time,
        checkInMethod: activeCheckin.check_in_method,
        notes: activeCheckin.notes,
        hoursWorkedSoFar: hoursWorked
      }
    });

  } catch (error) {
    next(error);
  }
});

// Listar check-ins (historial)
router.get('/', authenticateToken, validatePagination, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const userId = req.query.userId;
    const locationId = req.query.locationId;
    const date = req.query.date;

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('employee_checkins')
      .select(`
        id,
        user_id,
        location_id,
        assignment_id,
        check_in_time,
        check_out_time,
        check_in_method,
        break_duration,
        notes,
        created_at,
        locations(name, address, franchise_id, franchises(name))
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (req.user.role === 'admin') {
      // Admin puede ver todos los check-ins
    } else if (req.user.role === 'franchisee') {
      // Franquiciados solo ven check-ins de sus franquicias
      query = query.in('location_id',
        db.getClient()
          .from('locations')
          .select('id')
          .in('franchise_id',
            db.getClient()
              .from('franchises')
              .select('id')
              .eq('organization_id', req.user.organizationId)
          )
      );
    } else if (['manager', 'supervisor'].includes(req.user.role)) {
      // Managers solo ven check-ins de sus locales
      query = query.in('location_id',
        db.getClient()
          .from('locations')
          .select('id')
          .eq('manager_id', req.user.id)
      );
    } else {
      // Empleados solo ven sus propios check-ins
      query = query.eq('user_id', req.user.id);
    }

    // Aplicar filtros
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (date) {
      query = query.gte('check_in_time', `${date}T00:00:00`)
                  .lt('check_in_time', `${date}T23:59:59`);
    }

    const { data: checkins, error, count } = await query
      .order('check_in_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return sendError(res, 'Error obteniendo check-ins', 'No se pudieron obtener los registros', 500);
    }

    return sendPaginated(res,
      checkins.map(checkin => {
        let hoursWorked = null;
        if (checkin.check_out_time) {
          const checkIn = new Date(checkin.check_in_time);
          const checkOut = new Date(checkin.check_out_time);
          hoursWorked = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;
        }
        return {
          id: checkin.id,
          userId: checkin.user_id,
          user: checkin.users,
          locationId: checkin.location_id,
          location: checkin.locations,
          assignmentId: checkin.assignment_id,
          checkInTime: checkin.check_in_time,
          checkOutTime: checkin.check_out_time,
          checkInMethod: checkin.check_in_method,
          hoursWorked: hoursWorked,
          breakDuration: checkin.break_duration,
          notes: checkin.notes,
          createdAt: checkin.created_at
        };
      }),
      count,
      page,
      limit,
      'checkins'
    );

  } catch (error) {
    next(error);
  }
});

// Obtener check-in por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    let query = db.getClient()
      .from('employee_checkins')
      .select(`
        id,
        user_id,
        location_id,
        assignment_id,
        check_in_time,
        check_out_time,
        check_in_method,
        break_duration,
        notes,
        created_at,
        locations(name, address, franchise_id, franchises(name))
      `)
      .eq('id', id);

    // Filtrar según permisos
    if (req.user.role === 'admin') {
      // Admin puede ver todo
    } else if (req.user.role === 'franchisee') {
      query = query.in('location_id',
        db.getClient()
          .from('locations')
          .select('id')
          .in('franchise_id',
            db.getClient()
              .from('franchises')
              .select('id')
              .eq('organization_id', req.user.organizationId)
          )
      );
    } else if (['manager', 'supervisor'].includes(req.user.role)) {
      query = query.in('location_id',
        db.getClient()
          .from('employee_assignments')
          .select('location_id')
          .eq('user_id', req.user.id)
          .eq('is_active', true)
      );
    } else {
      // Employee solo ve sus propios checkins
      query = query.eq('user_id', req.user.id);
    }

    const { data: checkin, error } = await query.single();

    if (error || !checkin) {
      return sendNotFound(res, 'Check-in');
    }

    let hoursWorked = null;
    if (checkin.check_out_time) {
      const checkInTime = new Date(checkin.check_in_time);
      const checkOutTime = new Date(checkin.check_out_time);
      hoursWorked = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;
    }

    return sendSuccess(res, {
      checkin: {
        id: checkin.id,
        userId: checkin.user_id,
        locationId: checkin.location_id,
        location: checkin.locations,
        assignmentId: checkin.assignment_id,
        checkInTime: checkin.check_in_time,
        checkOutTime: checkin.check_out_time,
        checkInMethod: checkin.check_in_method,
        hoursWorked: hoursWorked,
        breakDuration: checkin.break_duration,
        notes: checkin.notes,
        createdAt: checkin.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Aprobar/modificar check-in (solo managers)
router.patch('/:checkinId', authenticateToken, requireRole(['admin', 'franchisee', 'manager', 'supervisor']), async (req, res, next) => {
  try {
    const { checkinId } = req.params;
    const { checkInTime, checkOutTime, breakDuration, notes, verifiedBy } = req.body;

    const hasAccess = await canUserAccessCheckin(req.user, checkinId);
    if (!hasAccess) {
      return sendForbidden(res, 'No tienes permisos para modificar este check-in');
    }

    const { data: existingCheckin, error: checkinError } = await db.getClient()
      .from('employee_checkins')
      .select('id, location_id, user_id, check_in_time, check_out_time')
      .eq('id', checkinId)
      .single();

    if (checkinError || !existingCheckin) {
      return sendNotFound(res, 'Check-in');
    }

    let finalCheckInTime = existingCheckin.check_in_time;
    let finalCheckOutTime = existingCheckin.check_out_time;
    
    if (checkInTime) finalCheckInTime = checkInTime;
    if (checkOutTime) finalCheckOutTime = checkOutTime;
    
    if (finalCheckInTime && finalCheckOutTime) {
      const checkIn = new Date(finalCheckInTime);
      const checkOut = new Date(finalCheckOutTime);
      if (checkOut <= checkIn) {
        return sendError(res, 'Fechas inválidas', 'La hora de check-out debe ser posterior a la de check-in', 400);
      }
    }

    const updateData = {};
    if (checkInTime) updateData.check_in_time = checkInTime;
    if (checkOutTime) updateData.check_out_time = checkOutTime;
    if (breakDuration) updateData.break_duration = breakDuration;
    if (notes !== undefined) updateData.notes = notes;
    if (verifiedBy !== undefined) updateData.verified_by = req.user.id;

    const { data: checkin, error: updateError } = await db.getClient()
      .from('employee_checkins')
      .update(updateData)
      .eq('id', checkinId)
      .select()
      .single();

    if (updateError) {
      return sendError(res, 'Error actualizando check-in', 'No se pudo actualizar el registro', 500);
    }

    let hoursWorked = null;
    if (checkin.check_out_time) {
      const checkIn = new Date(checkin.check_in_time);
      const checkOut = new Date(checkin.check_out_time);
      hoursWorked = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;
    }

    logger.info(`Check-in ${checkinId} modificado por ${req.user.email}`);

    return sendSuccess(res, {
      checkin: {
        id: checkin.id,
        userId: checkin.user_id,
        locationId: checkin.location_id,
        checkInTime: checkin.check_in_time,
        checkOutTime: checkin.check_out_time,
        hoursWorked: hoursWorked,
        breakDuration: checkin.break_duration,
        notes: checkin.notes,
        verifiedBy: checkin.verified_by
      }
    }, 'Check-in actualizado exitosamente');

  } catch (error) {
    next(error);
  }
});

// Obtener empleados actualmente en un local
router.get('/location/:locationId/active', authenticateToken, async (req, res, next) => {
  try {
    const { locationId } = req.params;

    const canAccess = await canUserAccessLocation(req.user, locationId);
    if (!canAccess) {
      return sendForbidden(res, 'No tienes permisos para ver este local');
    }

    const { data: employees, error } = await db.getClient()
      .rpc('get_location_active_employees', { p_location_id: locationId });

    if (error) {
      return sendError(res, 'Error obteniendo empleados', 'No se pudieron obtener los empleados activos', 500);
    }

    return sendSuccess(res, {
      locationId,
      activeEmployees: employees || []
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
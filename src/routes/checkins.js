const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkinSchema, checkoutSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');

// Check-in de empleado
router.post('/checkin', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = checkinSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { 
      locationId, 
      checkInMethod,
      coordinates,
      notes
    } = value;

    // Verificar que el empleado puede trabajar en ese local
    const canWork = await db.getClient()
      .rpc('can_employee_work_at_location', { 
        p_user_id: req.user.id, 
        p_location_id: locationId 
      });

    if (!canWork.data) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes asignación activa para trabajar en este local'
      });
    }

    // Verificar que no hay un check-in activo (sin check-out)
    const { data: activeCheckin } = await db.getClient()
      .from('employee_checkins')
      .select('id, location_id')
      .eq('user_id', req.user.id)
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .single();

    if (activeCheckin) {
      return res.status(409).json({
        error: 'Check-in activo',
        message: 'Ya tienes un check-in activo. Debes hacer check-out primero',
        activeCheckin: {
          id: activeCheckin.id,
          locationId: activeCheckin.location_id
        }
      });
    }

    // Obtener la asignación activa para este local
    const { data: assignment } = await db.getClient()
      .from('employee_assignments')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('location_id', locationId)
      .eq('is_active', true)
      .gte('start_date', new Date().toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
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
      return res.status(500).json({
        error: 'Error en check-in',
        message: 'No se pudo registrar el check-in'
      });
    }

    logger.info(`Check-in registrado: ${req.user.email} en ${checkin.locations.name}`);

    res.status(201).json({
      message: 'Check-in registrado exitosamente',
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
    });

  } catch (error) {
    next(error);
  }
});

// Check-out de empleado
router.post('/checkout', authenticateToken, async (req, res, next) => {
  try {
    const { error, value } = checkoutSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { 
      checkinId,
      breakDuration,
      notes
    } = value;

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
      return res.status(404).json({
        error: 'Check-in no encontrado',
        message: 'No tienes un check-in activo o el ID especificado no es válido'
      });
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
      return res.status(500).json({
        error: 'Error en check-out',
        message: 'No se pudo registrar el check-out'
      });
    }

    logger.info(`Check-out registrado: ${req.user.email} en ${checkin.locations.name}`);

    res.json({
      message: 'Check-out registrado exitosamente',
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
    });

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
      return res.json({
        isCheckedIn: false,
        message: 'No tienes check-in activo'
      });
    }

    // Calcular tiempo trabajado hasta ahora
    const checkInTime = new Date(activeCheckin.check_in_time);
    const currentTime = new Date();
    const hoursWorked = Math.round((currentTime - checkInTime) / (1000 * 60 * 60) * 100) / 100;

    res.json({
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
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
        users(first_name, last_name, email),
        locations(name, address, franchise_id, franchises(name))
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Casa matriz puede ver todos los check-ins
    } else if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
      // Franquiciados solo ven check-ins de su organización
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
    } else if (['location_manager', 'location_supervisor'].includes(req.user.role)) {
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
      return res.status(500).json({
        error: 'Error obteniendo check-ins',
        message: 'No se pudieron obtener los registros'
      });
    }

    res.json({
      checkins: checkins.map(checkin => {
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

// Aprobar/modificar check-in (solo managers)
router.patch('/:checkinId', authenticateToken, requireRole(['location_manager', 'location_supervisor', 'franchisee_admin', 'franchisee_owner', 'franchisor_admin', 'franchisor_ceo', 'super_admin']), async (req, res, next) => {
  try {
    const { checkinId } = req.params;
    const { checkInTime, checkOutTime, breakDuration, notes, verifiedBy } = req.body;

    // Verificar que el check-in existe y permisos
    let checkinQuery = db.getClient()
      .from('employee_checkins')
      .select('id, location_id, user_id')
      .eq('id', checkinId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
        checkinQuery = checkinQuery.in('location_id',
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
      } else if (['location_manager', 'location_supervisor'].includes(req.user.role)) {
        checkinQuery = checkinQuery.in('location_id',
          db.getClient()
            .from('locations')
            .select('id')
            .eq('manager_id', req.user.id)
        );
      }
    }

    const { data: existingCheckin, error: checkinError } = await checkinQuery.single();

    if (checkinError || !existingCheckin) {
      return res.status(404).json({
        error: 'Check-in no encontrado',
        message: 'No se pudo encontrar el check-in'
      });
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
      return res.status(500).json({
        error: 'Error actualizando check-in',
        message: 'No se pudo actualizar el registro'
      });
    }

    // Calcular horas trabajadas si existe check-out
    let hoursWorked = null;
    if (checkin.check_out_time) {
      const checkIn = new Date(checkin.check_in_time);
      const checkOut = new Date(checkin.check_out_time);
      hoursWorked = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;
    }

    logger.info(`Check-in ${checkinId} modificado por ${req.user.email}`);

    res.json({
      message: 'Check-in actualizado exitosamente',
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
    });

  } catch (error) {
    next(error);
  }
});

// Obtener empleados actualmente en un local
router.get('/location/:locationId/active', authenticateToken, async (req, res, next) => {
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
        message: 'No se pudieron obtener los empleados activos'
      });
    }

    res.json({
      locationId,
      activeEmployees: employees || []
    });

  } catch (error) {
    next(error);
  }
});

// Función auxiliar para verificar acceso a local (reutilizada de locations.js)
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
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createAssignmentSchema, updateAssignmentSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');

// Crear asignación de empleado a local
router.post('/', authenticateToken, requireRole(['franchisee_owner', 'franchisee_admin', 'location_manager', 'franchisor_admin', 'franchisor_ceo', 'super_admin']), async (req, res, next) => {
  try {
    const { error, value } = createAssignmentSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    const { 
      user_id, 
      location_id, 
      role_at_location,
      start_date,
      end_date,
      shift_type,
      notes
    } = value;

    // Verificar que el usuario existe y permisos sobre él
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, organization_id, email, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario especificado no existe'
      });
    }

    // Verificar que el local existe y permisos sobre él
    let locationQuery = db.getClient()
      .from('locations')
      .select('id, franchise_id, name, max_employees')
      .eq('id', location_id);

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

    const { data: location, error: locationError } = await locationQuery.single();

    if (locationError || !location) {
      return res.status(404).json({
        error: 'Local no encontrado',
        message: 'No se pudo encontrar el local o no tienes permisos'
      });
    }

    // Verificar que el usuario pertenece a la misma organización que la franquicia
    const { data: franchise } = await db.getClient()
      .from('franchises')
      .select('organization_id')
      .eq('id', location.franchise_id)
      .single();

    if (user.organization_id !== franchise.organization_id) {
      return res.status(400).json({
        error: 'Usuario inválido',
        message: 'El usuario no pertenece a la organización de la franquicia'
      });
    }

    // Verificar límite de empleados en el local
    const { count: currentEmployees } = await db.getClient()
      .from('employee_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', location_id)
      .eq('is_active', true);

    if (currentEmployees >= location.max_employees) {
      return res.status(400).json({
        error: 'Límite de empleados alcanzado',
        message: `El local ya tiene el máximo de ${location.max_employees} empleados asignados`
      });
    }

    // Verificar que no hay conflicto de fechas para el mismo usuario en el mismo local
    let conflictQuery = db.getClient()
      .from('employee_assignments')
      .select('id')
      .eq('user_id', user_id)
      .eq('location_id', location_id)
      .eq('is_active', true)
      .gte('start_date', start_date);

    if (end_date) {
      conflictQuery = conflictQuery.lte('start_date', end_date);
    }

    const { data: conflictingAssignment } = await conflictQuery.single();

    if (conflictingAssignment) {
      return res.status(409).json({
        error: 'Conflicto de asignación',
        message: 'El empleado ya está asignado a este local en el período especificado'
      });
    }

    // Crear asignación
    const { data: assignment, error: assignmentError } = await db.getClient()
      .from('employee_assignments')
      .insert({
        id: uuidv4(),
        user_id: user_id,
        location_id: location_id,
        role_at_location: role_at_location || 'location_employee',
        start_date: start_date,
        end_date: end_date,
        shift_type: shift_type || 'full_time',
        assigned_by: req.user.id,
        is_active: true,
        notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignmentError) {
      logger.error('Error creando asignación:', assignmentError);
      return res.status(500).json({
        error: 'Error creando asignación',
        message: 'No se pudo crear la asignación'
      });
    }

    logger.info(`Empleado ${user.email} asignado a local ${location.name} por ${req.user.email}`);

    res.status(201).json({
      message: 'Asignación creada exitosamente',
      assignment: {
        id: assignment.id,
        userId: assignment.user_id,
        user: {
          email: user.email,
          name: `${user.first_name} ${user.last_name}`
        },
        locationId: assignment.location_id,
        location: {
          name: location.name
        },
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type,
        assignedBy: assignment.assigned_by,
        isActive: assignment.is_active,
        notes: assignment.notes,
        createdAt: assignment.created_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Listar asignaciones
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId;
    const locationId = req.query.locationId;
    const franchiseId = req.query.franchiseId;
    const isActive = req.query.isActive;

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('employee_assignments')
      .select(`
        id,
        user_id,
        location_id,
        role_at_location,
        start_date,
        end_date,
        shift_type,
        assigned_by,
        is_active,
        notes,
        created_at,
        updated_at,
        users!employee_assignments_user_id_fkey(first_name, last_name, email),
        locations(name, franchise_id, franchises(name)),
        users!employee_assignments_assigned_by_fkey(first_name, last_name, email)
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Casa matriz puede ver todas las asignaciones
    } else if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
      // Franquiciados solo ven asignaciones de su organización
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
      // Managers solo ven asignaciones de sus locales
      query = query.in('location_id',
        db.getClient()
          .from('locations')
          .select('id')
          .eq('manager_id', req.user.id)
      );
    } else {
      // Empleados solo ven sus propias asignaciones
      query = query.eq('user_id', req.user.id);
    }

    // Aplicar filtros
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    if (franchiseId) {
      query = query.in('location_id',
        db.getClient()
          .from('locations')
          .select('id')
          .eq('franchise_id', franchiseId)
      );
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: assignments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo asignaciones',
        message: 'No se pudieron obtener las asignaciones'
      });
    }

    res.json({
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        userId: assignment.user_id,
        user: assignment.users,
        locationId: assignment.location_id,
        location: assignment.locations,
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type,
        assignedBy: assignment.assigned_by,
        assignedByUser: assignment.users,
        isActive: assignment.is_active,
        notes: assignment.notes,
        createdAt: assignment.created_at,
        updatedAt: assignment.updated_at
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

// Obtener asignación por ID
router.get('/:assignmentId', authenticateToken, async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    let query = db.getClient()
      .from('employee_assignments')
      .select(`
        id,
        user_id,
        location_id,
        role_at_location,
        start_date,
        end_date,
        shift_type,
        assigned_by,
        is_active,
        notes,
        created_at,
        updated_at,
        users!employee_assignments_user_id_fkey(first_name, last_name, email),
        locations(name, address, franchise_id, franchises(name, organization_id)),
        users!employee_assignments_assigned_by_fkey(first_name, last_name, email)
      `)
      .eq('id', assignmentId);

    // Verificar permisos según rol
    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
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
        query = query.in('location_id',
          db.getClient()
            .from('locations')
            .select('id')
            .eq('manager_id', req.user.id)
        );
      } else {
        query = query.eq('user_id', req.user.id);
      }
    }

    const { data: assignment, error } = await query.single();

    if (error || !assignment) {
      return res.status(404).json({
        error: 'Asignación no encontrada',
        message: 'No se pudo encontrar la asignación'
      });
    }

    res.json({
      assignment: {
        id: assignment.id,
        userId: assignment.user_id,
        user: assignment.users,
        locationId: assignment.location_id,
        location: assignment.locations,
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type,
        assignedBy: assignment.assigned_by,
        assignedByUser: assignment.users,
        isActive: assignment.is_active,
        notes: assignment.notes,
        createdAt: assignment.created_at,
        updatedAt: assignment.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar asignación
router.put('/:assignmentId', authenticateToken, requireRole(['franchisee_owner', 'franchisee_admin', 'location_manager', 'franchisor_admin', 'franchisor_ceo', 'super_admin']), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { error, value } = updateAssignmentSchema.validate(req.body);
    
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // Verificar que la asignación existe y permisos
    let assignmentQuery = db.getClient()
      .from('employee_assignments')
      .select('id, location_id, user_id')
      .eq('id', assignmentId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
        assignmentQuery = assignmentQuery.in('location_id',
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
      } else if (['location_manager'].includes(req.user.role)) {
        assignmentQuery = assignmentQuery.in('location_id',
          db.getClient()
            .from('locations')
            .select('id')
            .eq('manager_id', req.user.id)
        );
      }
    }

    const { data: existingAssignment, error: assignmentError } = await assignmentQuery.single();

    if (assignmentError || !existingAssignment) {
      return res.status(404).json({
        error: 'Asignación no encontrada',
        message: 'No se pudo encontrar la asignación'
      });
    }

    const updateData = {};
    if (value.role_at_location) updateData.role_at_location = value.role_at_location;
    if (value.start_date) updateData.start_date = value.start_date;
    if (value.end_date !== undefined) updateData.end_date = value.end_date;
    if (value.shift_type) updateData.shift_type = value.shift_type;
    if (value.is_active !== undefined) updateData.is_active = value.is_active;
    if (value.notes !== undefined) updateData.notes = value.notes;
    
    updateData.updated_at = new Date().toISOString();

    const { data: assignment, error: updateError } = await db.getClient()
      .from('employee_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando asignación',
        message: 'No se pudo actualizar la asignación'
      });
    }

    logger.info(`Asignación ${assignmentId} actualizada por ${req.user.email}`);

    res.json({
      message: 'Asignación actualizada exitosamente',
      assignment: {
        id: assignment.id,
        userId: assignment.user_id,
        locationId: assignment.location_id,
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type,
        isActive: assignment.is_active,
        notes: assignment.notes,
        updatedAt: assignment.updated_at
      }
    });

  } catch (error) {
    next(error);
  }
});

// Finalizar asignación (desactivar)
router.delete('/:assignmentId', authenticateToken, requireRole(['franchisee_owner', 'franchisee_admin', 'location_manager', 'franchisor_admin', 'franchisor_ceo', 'super_admin']), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    // Verificar que la asignación existe y permisos
    let assignmentQuery = db.getClient()
      .from('employee_assignments')
      .select('id, location_id, user_id')
      .eq('id', assignmentId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
        assignmentQuery = assignmentQuery.in('location_id',
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
      } else if (['location_manager'].includes(req.user.role)) {
        assignmentQuery = assignmentQuery.in('location_id',
          db.getClient()
            .from('locations')
            .select('id')
            .eq('manager_id', req.user.id)
        );
      }
    }

    const { data: assignment, error: assignmentError } = await assignmentQuery.single();

    if (assignmentError || !assignment) {
      return res.status(404).json({
        error: 'Asignación no encontrada',
        message: 'No se pudo encontrar la asignación'
      });
    }

    // Finalizar asignación
    const { error: updateError } = await db.getClient()
      .from('employee_assignments')
      .update({ 
        is_active: false,
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) {
      return res.status(500).json({
        error: 'Error finalizando asignación',
        message: 'No se pudo finalizar la asignación'
      });
    }

    logger.info(`Asignación ${assignmentId} finalizada por ${req.user.email}`);

    res.json({
      message: 'Asignación finalizada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener asignaciones activas de un usuario
router.get('/user/:userId/active', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verificar permisos para ver asignaciones del usuario
    if (req.user.id !== userId && !['franchisee_owner', 'franchisee_admin', 'location_manager', 'franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para ver las asignaciones de este usuario'
      });
    }

    const { data: assignments, error } = await db.getClient()
      .from('employee_assignments')
      .select(`
        id,
        location_id,
        role_at_location,
        start_date,
        end_date,
        shift_type,
        locations(name, address, franchise_id, franchises(name))
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) {
      return res.status(500).json({
        error: 'Error obteniendo asignaciones',
        message: 'No se pudieron obtener las asignaciones del usuario'
      });
    }

    res.json({
      userId,
      assignments: assignments.map(assignment => ({
        id: assignment.id,
        locationId: assignment.location_id,
        location: assignment.locations,
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type
      }))
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
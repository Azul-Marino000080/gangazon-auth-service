const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createAssignmentSchema, updateAssignmentSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict, sendForbidden, sendPaginated } = require('../utils/responseHelpers');
const { validate, validatePagination } = require('../middleware/validation');
const { getLocationWithFranchise, recordExists } = require('../utils/queryHelpers');
const { canAccessLocation } = require('../utils/accessControl');

// Crear asignación de empleado a local
router.post('/', authenticateToken, requireRole(['admin', 'franchisee', 'manager', 'supervisor']), validate(createAssignmentSchema), async (req, res, next) => {
  try {
    const { 
      user_id, 
      location_id, 
      role_at_location,
      start_date,
      end_date,
      shift_type,
      notes
    } = req.body;

    // Verificar que el usuario existe
    const { data: user, error: userError } = await db.getClient()
      .from('users')
      .select('id, organization_id, email, first_name, last_name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return sendNotFound(res, 'Usuario');
    }

    // Verificar permisos sobre el local
    if (req.user.role !== 'admin') {
      const hasAccess = await canAccessLocation(req.user, location_id);
      if (!hasAccess) {
        return sendForbidden(res, 'No tienes acceso a este local');
      }
    }

    // Obtener datos del local
    const location = await getLocationWithFranchise(location_id);
    if (!location) {
      return sendNotFound(res, 'Local');
    }

    // Verificar que el usuario pertenece a la misma organización que la franquicia
    const { data: franchise } = await db.getClient()
      .from('franchises')
      .select('organization_id')
      .eq('id', location.franchise_id)
      .single();

    if (user.organization_id !== franchise.organization_id) {
      return sendError(res, 'Usuario inválido', 'El usuario no pertenece a la organización de la franquicia', 400);
    }

    // Verificar límite de empleados en el local
    const { count: currentEmployees } = await db.getClient()
      .from('employee_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', location_id)
      .eq('is_active', true);

    if (currentEmployees >= location.max_employees) {
      return sendError(res, 'Límite de empleados alcanzado', `El local ya tiene el máximo de ${location.max_employees} empleados asignados`, 400);
    }

    // Verificar que no hay conflicto de fechas
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
      return sendConflict(res, 'El empleado ya está asignado a este local en el período especificado');
    }

    // Crear asignación
    const { data: assignment, error: assignmentError } = await db.getClient()
      .from('employee_assignments')
      .insert({
        id: uuidv4(),
        user_id: user_id,
        location_id: location_id,
        role_at_location: role_at_location || 'employee',
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
      return sendError(res, 'Error creando asignación', 'No se pudo crear la asignación', 500);
    }

    logger.info(`Empleado ${user.email} asignado a local ${location.name} por ${req.user.email}`);

    return sendCreated(res, {
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
    }, 'Asignación creada exitosamente');

  } catch (error) {
    next(error);
  }
});

// Listar asignaciones
router.get('/', authenticateToken, validatePagination, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
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
        locations(name, franchise_id, franchises(name))
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (req.user.role === 'admin') {
      // Admin puede ver todas las asignaciones
    } else if (req.user.role === 'franchisee') {
      // Franquiciados solo ven asignaciones de sus franquicias
      const { data: franchises } = await db.getClient()
        .from('franchises')
        .select('id')
        .eq('organization_id', req.user.organizationId);
      
      const franchiseIds = (franchises || []).map(f => f.id);
      
      if (franchiseIds.length > 0) {
        const { data: locations } = await db.getClient()
          .from('locations')
          .select('id')
          .in('franchise_id', franchiseIds);
        
        const locationIds = (locations || []).map(l => l.id);
        if (locationIds.length > 0) {
          query = query.in('location_id', locationIds);
        } else {
          return res.json({ assignments: [], pagination: { page, limit, total: 0, pages: 0 } });
        }
      } else {
        return res.json({ assignments: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
    } else if (['manager', 'supervisor'].includes(req.user.role)) {
      // Managers y supervisors ven asignaciones de locales donde están asignados
      const { data: userAssignments } = await db.getClient()
        .from('employee_assignments')
        .select('location_id')
        .eq('user_id', req.user.id)
        .eq('is_active', true);
      
      const locationIds = (userAssignments || []).map(a => a.location_id);
      if (locationIds.length > 0) {
        query = query.in('location_id', locationIds);
      } else {
        return res.json({ assignments: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
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
      const { data: franchiseLocations } = await db.getClient()
        .from('locations')
        .select('id')
        .eq('franchise_id', franchiseId);
      
      const franchiseLocationIds = (franchiseLocations || []).map(l => l.id);
      if (franchiseLocationIds.length > 0) {
        query = query.in('location_id', franchiseLocationIds);
      } else {
        return res.json({ assignments: [], pagination: { page, limit, total: 0, pages: 0 } });
      }
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: assignments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return sendError(res, 'Error obteniendo asignaciones', 'No se pudieron obtener las asignaciones', 500);
    }

    return sendPaginated(res,
      assignments.map(assignment => ({
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
      count,
      page,
      limit,
      'assignments'
    );

  } catch (error) {
    next(error);
  }
});

// Obtener asignaciones activas de un usuario (DEBE IR ANTES DE /:id)
router.get('/user/:userId/active', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verificar permisos
    if (req.user.id !== userId && !['admin', 'franchisee', 'manager'].includes(req.user.role)) {
      return sendForbidden(res, 'No tienes permisos para ver las asignaciones de este usuario');
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
      return sendError(res, 'Error obteniendo asignaciones', 'No se pudieron obtener las asignaciones del usuario', 500);
    }

    return sendSuccess(res, {
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

// Obtener asignación por ID
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id: assignmentId } = req.params;

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
        locations(name, address, franchise_id, franchises(name, organization_id))
      `)
      .eq('id', assignmentId);

    // Verificar permisos según rol
    if (req.user.role !== 'admin') {
      if (req.user.role === 'franchisee') {
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
        query = query.eq('user_id', req.user.id);
      }
    }

    const { data: assignment, error } = await query.single();

    if (error || !assignment) {
      return sendNotFound(res, 'Asignación');
    }

    return sendSuccess(res, {
      assignment: {
        id: assignment.id,
        userId: assignment.user_id,
        locationId: assignment.location_id,
        location: assignment.locations,
        roleAtLocation: assignment.role_at_location,
        startDate: assignment.start_date,
        endDate: assignment.end_date,
        shiftType: assignment.shift_type,
        assignedBy: assignment.assigned_by,
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
router.put('/:assignmentId', authenticateToken, requireRole(['admin', 'franchisee', 'manager', 'supervisor']), validate(updateAssignmentSchema), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    // Verificar que la asignación existe y permisos
    let assignmentQuery = db.getClient()
      .from('employee_assignments')
      .select('id, location_id, user_id')
      .eq('id', assignmentId);

    if (req.user.role !== 'admin') {
      if (req.user.role === 'franchisee') {
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
      } else if (['manager', 'supervisor'].includes(req.user.role)) {
        // Manager/supervisor deben tener asignación activa en el local
        const { data: userAssignments } = await db.getClient()
          .from('employee_assignments')
          .select('location_id')
          .eq('user_id', req.user.id)
          .eq('is_active', true);
        
        const locationIds = (userAssignments || []).map(a => a.location_id);
        if (locationIds.length === 0) {
          return sendForbidden(res, 'No tienes asignaciones activas');
        }
        
        const { data: assignmentCheck } = await db.getClient()
          .from('employee_assignments')
          .select('location_id')
          .eq('id', assignmentId)
          .single();
        
        if (!assignmentCheck || !locationIds.includes(assignmentCheck.location_id)) {
          return sendForbidden(res, 'No tienes permisos para actualizar esta asignación');
        }
      }
    }

    const { data: existingAssignment, error: assignmentError } = await assignmentQuery.single();

    if (assignmentError || !existingAssignment) {
      return sendNotFound(res, 'Asignación');
    }

    const updateData = {};
    if (req.body.role_at_location) updateData.role_at_location = req.body.role_at_location;
    if (req.body.start_date) updateData.start_date = req.body.start_date;
    if (req.body.end_date !== undefined) updateData.end_date = req.body.end_date;
    if (req.body.shift_type) updateData.shift_type = req.body.shift_type;
    if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    
    updateData.updated_at = new Date().toISOString();

    const { data: assignment, error: updateError } = await db.getClient()
      .from('employee_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (updateError) {
      return sendError(res, 'Error actualizando asignación', 'No se pudo actualizar la asignación', 500);
    }

    logger.info(`Asignación ${assignmentId} actualizada por ${req.user.email}`);

    return sendSuccess(res, {
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
    }, 'Asignación actualizada exitosamente');

  } catch (error) {
    next(error);
  }
});

// Finalizar asignación (desactivar)
router.delete('/:assignmentId', authenticateToken, requireRole(['admin', 'franchisee', 'manager']), async (req, res, next) => {
  try {
    const { assignmentId } = req.params;

    // Verificar que la asignación existe y permisos
    let assignmentQuery = db.getClient()
      .from('employee_assignments')
      .select('id, location_id, user_id')
      .eq('id', assignmentId);

    if (req.user.role !== 'admin') {
      if (req.user.role === 'franchisee') {
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
      } else if (req.user.role === 'manager') {
        assignmentQuery = assignmentQuery.in('location_id',
          db.getClient()
            .from('employee_assignments')
            .select('location_id')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
        );
      }
    }

    const { data: assignment, error: assignmentError } = await assignmentQuery.single();

    if (assignmentError || !assignment) {
      return sendNotFound(res, 'Asignación');
    }

    const { error: updateError } = await db.getClient()
      .from('employee_assignments')
      .update({ 
        is_active: false,
        end_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    if (updateError) {
      return sendError(res, 'Error finalizando asignación', 'No se pudo finalizar la asignación', 500);
    }

    logger.info(`Asignación ${assignmentId} finalizada por ${req.user.email}`);

    return sendSuccess(res, {}, 'Asignación finalizada exitosamente');

  } catch (error) {
    next(error);
  }
});

module.exports = router;
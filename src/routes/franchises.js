const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createFranchiseSchema, updateFranchiseSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');
const { sendSuccess, sendError, sendNotFound, sendCreated, sendConflict, sendForbidden, sendPaginated } = require('../utils/responseHelpers');
const { validate, validatePagination } = require('../middleware/validation');
const { recordExists, countRecords } = require('../utils/queryHelpers');
const { FRANCHISE_STATUS } = require('../utils/constants');

// Crear franquicia (solo casa matriz)
router.post('/', authenticateToken, requireRole(['admin']), validate(createFranchiseSchema), async (req, res, next) => {
  try {
    const { 
      name, 
      franchiseeName, 
      franchiseeEmail, 
      franchiseePhone,
      contractStartDate,
      contractEndDate,
      maxLocations,
      maxEmployees,
      billingTier
    } = req.body;

    const organizationId = req.user.organizationId;

    // Verificar que la organización existe
    const orgExists = await recordExists('organizations', { id: organizationId });
    if (!orgExists) {
      return sendNotFound(res, 'Organización');
    }

    // Verificar que no existe una franquicia con el mismo nombre
    const franchiseExists = await recordExists('franchises', { organization_id: organizationId, name });
    if (franchiseExists) {
      return sendConflict(res, 'Ya existe una franquicia con este nombre en la organización');
    }

    // Crear franquicia
    const { data: franchise, error: franchiseError } = await db.getClient()
      .from('franchises')
      .insert({
        id: uuidv4(),
        organization_id: organizationId,
        name,
        franchisee_name: franchiseeName,
        franchisee_email: franchiseeEmail,
        franchisee_phone: franchiseePhone,
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        max_locations: maxLocations || 1,
        max_employees: maxEmployees || 10,
        billing_tier: billingTier || 'basic',
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (franchiseError) {
      logger.error('Error creando franquicia:', franchiseError);
      return sendError(res, 'Error creando franquicia', 'No se pudo crear la franquicia', 500);
    }

    logger.info(`Franquicia creada: ${name} por ${req.user.email}`);

    return sendCreated(res, {
      franchise: {
        id: franchise.id,
        organizationId: franchise.organization_id,
        name: franchise.name,
        franchiseeName: franchise.franchisee_name,
        franchiseeEmail: franchise.franchisee_email,
        franchiseePhone: franchise.franchisee_phone,
        contractStartDate: franchise.contract_start_date,
        contractEndDate: franchise.contract_end_date,
        maxLocations: franchise.max_locations,
        maxEmployees: franchise.max_employees,
        billingTier: franchise.billing_tier,
        status: franchise.status,
        createdAt: franchise.created_at
      }
    }, 'Franquicia creada exitosamente');

  } catch (error) {
    next(error);
  }
});

// Listar franquicias
router.get('/', authenticateToken, validatePagination, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const status = req.query.status || '';

    const offset = (page - 1) * limit;

    let query = db.getClient()
      .from('franchises')
      .select(`
        id,
        organization_id,
        name,
        franchisee_name,
        franchisee_email,
        franchisee_phone,
        contract_start_date,
        contract_end_date,
        max_locations,
        max_employees,
        billing_tier,
        status,
        created_at,
        updated_at,
        organizations(name)
      `, { count: 'exact' });

    // Filtros según rol del usuario
    if (req.user.role === 'admin') {
      query = query.eq('organization_id', req.user.organizationId);
    } else if (req.user.role === 'franchisee') {
      query = query.eq('organization_id', req.user.organizationId);
    } else {
      return sendForbidden(res, 'No tienes permisos para ver franquicias');
    }

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,franchisee_name.ilike.%${search}%,franchisee_email.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: franchises, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return sendError(res, 'Error obteniendo franquicias', 'No se pudieron obtener las franquicias', 500);
    }

    return sendPaginated(res,
      franchises.map(franchise => ({
        id: franchise.id,
        organizationId: franchise.organization_id,
        organization: franchise.organizations,
        name: franchise.name,
        franchiseeName: franchise.franchisee_name,
        franchiseeEmail: franchise.franchisee_email,
        franchiseePhone: franchise.franchisee_phone,
        contractStartDate: franchise.contract_start_date,
        contractEndDate: franchise.contract_end_date,
        maxLocations: franchise.max_locations,
        maxEmployees: franchise.max_employees,
        billingTier: franchise.billing_tier,
        status: franchise.status,
        createdAt: franchise.created_at,
        updatedAt: franchise.updated_at
      })),
      count,
      page,
      limit,
      'franchises'
    );

  } catch (error) {
    next(error);
  }
});

// Obtener franquicia por ID
router.get('/:franchiseId', authenticateToken, async (req, res, next) => {
  try {
    const { franchiseId } = req.params;

    let query = db.getClient()
      .from('franchises')
      .select(`
        id,
        organization_id,
        name,
        franchisee_name,
        franchisee_email,
        franchisee_phone,
        contract_start_date,
        contract_end_date,
        max_locations,
        max_employees,
        billing_tier,
        status,
        settings,
        created_at,
        updated_at,
        organizations(name, description)
      `)
      .eq('id', franchiseId);

    // Verificar permisos según rol
    if (req.user.role !== 'admin') {
      // Solo pueden ver franquicias de su organización
      query = query.eq('organization_id', req.user.organizationId);
    }

    const { data: franchise, error } = await query.single();

    if (error || !franchise) {
      return sendNotFound(res, 'Franquicia');
    }

    // Obtener estadísticas de la franquicia
    // Primero obtener locations de la franquicia para contar empleados
    const { data: franchiseLocations } = await db.getClient()
      .from('locations')
      .select('id')
      .eq('franchise_id', franchiseId);
    
    const locationIds = (franchiseLocations || []).map(l => l.id);
    
    const [
      { count: totalLocations },
      { count: activeLocations },
      { count: totalEmployees }
    ] = await Promise.all([
      db.getClient().from('locations').select('*', { count: 'exact', head: true }).eq('franchise_id', franchiseId),
      db.getClient().from('locations').select('*', { count: 'exact', head: true }).eq('franchise_id', franchiseId).eq('is_active', true),
      locationIds.length > 0 
        ? db.getClient().from('employee_assignments').select('*', { count: 'exact', head: true }).in('location_id', locationIds).eq('is_active', true)
        : Promise.resolve({ count: 0 })
    ]);

    return sendSuccess(res, {
      franchise: {
        id: franchise.id,
        organizationId: franchise.organization_id,
        organization: franchise.organizations,
        name: franchise.name,
        franchiseeName: franchise.franchisee_name,
        franchiseeEmail: franchise.franchisee_email,
        franchiseePhone: franchise.franchisee_phone,
        contractStartDate: franchise.contract_start_date,
        contractEndDate: franchise.contract_end_date,
        maxLocations: franchise.max_locations,
        maxEmployees: franchise.max_employees,
        billingTier: franchise.billing_tier,
        status: franchise.status,
        settings: franchise.settings,
        createdAt: franchise.created_at,
        updatedAt: franchise.updated_at,
        stats: {
          totalLocations: totalLocations || 0,
          activeLocations: activeLocations || 0,
          totalEmployees: totalEmployees || 0
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar franquicia
router.put('/:franchiseId', authenticateToken, requireRole(['admin', 'franchisee']), validate(updateFranchiseSchema), async (req, res, next) => {
  try {
    const { franchiseId } = req.params;

    let franchiseQuery = db.getClient()
      .from('franchises')
      .select('id, organization_id, franchisee_name')
      .eq('id', franchiseId);

    if (req.user.role !== 'admin') {
      franchiseQuery = franchiseQuery.eq('organization_id', req.user.organizationId);
    }

    const { data: existingFranchise, error: franchiseError } = await franchiseQuery.single();

    if (franchiseError || !existingFranchise) {
      return sendNotFound(res, 'Franquicia');
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.franchiseeName) updateData.franchisee_name = req.body.franchiseeName;
    if (req.body.franchiseeEmail) updateData.franchisee_email = req.body.franchiseeEmail;
    if (req.body.franchiseePhone) updateData.franchisee_phone = req.body.franchiseePhone;
    if (req.body.contractEndDate) updateData.contract_end_date = req.body.contractEndDate;
    if (req.body.maxLocations) updateData.max_locations = req.body.maxLocations;
    if (req.body.maxEmployees) updateData.max_employees = req.body.maxEmployees;
    if (req.body.billingTier) updateData.billing_tier = req.body.billingTier;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.settings) updateData.settings = req.body.settings;
    
    updateData.updated_at = new Date().toISOString();

    const { data: franchise, error: updateError } = await db.getClient()
      .from('franchises')
      .update(updateData)
      .eq('id', franchiseId)
      .select()
      .single();

    if (updateError) {
      return sendError(res, 'Error actualizando franquicia', 'No se pudo actualizar la franquicia', 500);
    }

    logger.info(`Franquicia ${franchiseId} actualizada por ${req.user.email}`);

    return sendSuccess(res, {
      franchise: {
        id: franchise.id,
        organizationId: franchise.organization_id,
        name: franchise.name,
        franchiseeName: franchise.franchisee_name,
        franchiseeEmail: franchise.franchisee_email,
        franchiseePhone: franchise.franchisee_phone,
        contractStartDate: franchise.contract_start_date,
        contractEndDate: franchise.contract_end_date,
        maxLocations: franchise.max_locations,
        maxEmployees: franchise.max_employees,
        billingTier: franchise.billing_tier,
        status: franchise.status,
        settings: franchise.settings,
        updatedAt: franchise.updated_at
      }
    }, 'Franquicia actualizada exitosamente');

  } catch (error) {
    next(error);
  }
});

// Cambiar estado de franquicia (suspender/activar)
router.patch('/:franchiseId/status', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { franchiseId } = req.params;
    const { status } = req.body;

    const validStatuses = Object.values(FRANCHISE_STATUS);
    if (!validStatuses.includes(status)) {
      return sendError(res, 'Estado inválido', 'El estado debe ser: active, suspended o terminated', 400);
    }

    const { data: franchise, error: franchiseError } = await db.getClient()
      .from('franchises')
      .select('id, name, status')
      .eq('id', franchiseId)
      .single();

    if (franchiseError || !franchise) {
      return sendNotFound(res, 'Franquicia');
    }

    const { error: updateError } = await db.getClient()
      .from('franchises')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', franchiseId);

    if (updateError) {
      return sendError(res, 'Error cambiando estado', 'No se pudo cambiar el estado de la franquicia', 500);
    }

    // Si se suspende o termina, también suspender todos los usuarios de la franquicia
    if (status === FRANCHISE_STATUS.SUSPENDED || status === FRANCHISE_STATUS.TERMINATED) {
      await db.getClient()
        .from('users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', 
          db.getClient()
            .from('employee_assignments')
            .select('user_id')
            .in('location_id',
              db.getClient()
                .from('locations')
                .select('id')
                .eq('franchise_id', franchiseId)
            )
        );
    }

    logger.info(`Estado de franquicia ${franchise.name} cambiado a ${status} por ${req.user.email}`);

    return sendSuccess(res, {
      franchise: {
        id: franchiseId,
        name: franchise.name,
        status
      }
    }, `Estado de franquicia cambiado a ${status}`);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
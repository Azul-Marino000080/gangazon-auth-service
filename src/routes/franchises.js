const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createFranchiseSchema, updateFranchiseSchema } = require('../validators/schemas');
const { v4: uuidv4 } = require('uuid');

// Crear franquicia (solo casa matriz)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { error, value } = createFranchiseSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      return next(error);
    }

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
    } = value;

    // Usar el organizationId del usuario autenticado
    const organizationId = req.user.organizationId;

    // Verificar que la organización existe
    const { data: organization, error: orgError } = await db.getClient()
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (orgError || !organization) {
      return res.status(404).json({
        error: 'Organización no encontrada',
        message: 'La organización especificada no existe'
      });
    }

    // Verificar que no existe una franquicia con el mismo nombre en la organización
    const { data: existingFranchise } = await db.getClient()
      .from('franchises')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', name)
      .single();

    if (existingFranchise) {
      return res.status(409).json({
        error: 'Franquicia ya existe',
        message: 'Ya existe una franquicia con este nombre en la organización'
      });
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
      return res.status(500).json({
        error: 'Error creando franquicia',
        message: 'No se pudo crear la franquicia'
      });
    }

    logger.info(`Franquicia creada: ${name} por ${req.user.email}`);

    res.status(201).json({
      message: 'Franquicia creada exitosamente',
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
    });

  } catch (error) {
    next(error);
  }
});

// Listar franquicias
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const organizationId = req.query.organizationId;

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
    if (['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Casa matriz puede ver todas las franquicias
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
    } else if (['franchisee_owner', 'franchisee_admin'].includes(req.user.role)) {
      // Franquiciados solo pueden ver su propia franquicia
      query = query.eq('organization_id', req.user.organizationId);
    } else {
      // Otros roles no pueden ver franquicias
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para ver franquicias'
      });
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
      return res.status(500).json({
        error: 'Error obteniendo franquicias',
        message: 'No se pudieron obtener las franquicias'
      });
    }

    res.json({
      franchises: franchises.map(franchise => ({
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
    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      // Solo pueden ver franquicias de su organización
      query = query.eq('organization_id', req.user.organizationId);
    }

    const { data: franchise, error } = await query.single();

    if (error || !franchise) {
      return res.status(404).json({
        error: 'Franquicia no encontrada',
        message: 'No se pudo encontrar la franquicia'
      });
    }

    // Obtener estadísticas de la franquicia
    const [
      { count: totalLocations },
      { count: activeLocations },
      { count: totalEmployees }
    ] = await Promise.all([
      db.getClient().from('locations').select('*', { count: 'exact', head: true }).eq('franchise_id', franchiseId),
      db.getClient().from('locations').select('*', { count: 'exact', head: true }).eq('franchise_id', franchiseId).eq('is_active', true),
      db.getClient().from('employee_assignments').select('*', { count: 'exact', head: true }).eq('location_id', franchiseId).eq('is_active', true)
    ]);

    res.json({
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
router.put('/:franchiseId', authenticateToken, requireRole(['admin', 'franchisee']), async (req, res, next) => {
  try {
    const { franchiseId } = req.params;
    const { error, value } = updateFranchiseSchema.validate(req.body);
    
    if (error) {
      error.isJoi = true;
      return next(error);
    }

    // Verificar que la franquicia existe y permisos
    let franchiseQuery = db.getClient()
      .from('franchises')
      .select('id, organization_id, franchisee_name')
      .eq('id', franchiseId);

    if (!['franchisor_admin', 'franchisor_ceo', 'super_admin'].includes(req.user.role)) {
      franchiseQuery = franchiseQuery.eq('organization_id', req.user.organizationId);
    }

    const { data: existingFranchise, error: franchiseError } = await franchiseQuery.single();

    if (franchiseError || !existingFranchise) {
      return res.status(404).json({
        error: 'Franquicia no encontrada',
        message: 'No se pudo encontrar la franquicia'
      });
    }

    const updateData = {};
    if (value.name) updateData.name = value.name;
    if (value.franchiseeName) updateData.franchisee_name = value.franchiseeName;
    if (value.franchiseeEmail) updateData.franchisee_email = value.franchiseeEmail;
    if (value.franchiseePhone) updateData.franchisee_phone = value.franchiseePhone;
    if (value.contractEndDate) updateData.contract_end_date = value.contractEndDate;
    if (value.maxLocations) updateData.max_locations = value.maxLocations;
    if (value.maxEmployees) updateData.max_employees = value.maxEmployees;
    if (value.billingTier) updateData.billing_tier = value.billingTier;
    if (value.status !== undefined) updateData.status = value.status;
    if (value.settings) updateData.settings = value.settings;
    
    updateData.updated_at = new Date().toISOString();

    const { data: franchise, error: updateError } = await db.getClient()
      .from('franchises')
      .update(updateData)
      .eq('id', franchiseId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        error: 'Error actualizando franquicia',
        message: 'No se pudo actualizar la franquicia'
      });
    }

    logger.info(`Franquicia ${franchiseId} actualizada por ${req.user.email}`);

    res.json({
      message: 'Franquicia actualizada exitosamente',
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
    });

  } catch (error) {
    next(error);
  }
});

// Cambiar estado de franquicia (suspender/activar)
router.patch('/:franchiseId/status', authenticateToken, requireRole(['admin']), async (req, res, next) => {
  try {
    const { franchiseId } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'terminated'].includes(status)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: 'El estado debe ser: active, suspended o terminated'
      });
    }

    // Verificar que la franquicia existe
    const { data: franchise, error: franchiseError } = await db.getClient()
      .from('franchises')
      .select('id, name, status')
      .eq('id', franchiseId)
      .single();

    if (franchiseError || !franchise) {
      return res.status(404).json({
        error: 'Franquicia no encontrada',
        message: 'No se pudo encontrar la franquicia'
      });
    }

    // Actualizar estado
    const { error: updateError } = await db.getClient()
      .from('franchises')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', franchiseId);

    if (updateError) {
      return res.status(500).json({
        error: 'Error cambiando estado',
        message: 'No se pudo cambiar el estado de la franquicia'
      });
    }

    // Si se suspende o termina, también suspender todos los usuarios de la franquicia
    if (status === 'suspended' || status === 'terminated') {
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

    res.json({
      message: `Estado de franquicia cambiado a ${status}`,
      franchise: {
        id: franchiseId,
        name: franchise.name,
        status
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
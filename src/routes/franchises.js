const express = require('express');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createFranchiseSchema, updateFranchiseSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, getPaginated, createAuditLog, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/franchises
 */
router.post('/', validate(createFranchiseSchema), catchAsync(async (req, res) => {
  const { name, code, email, phone, address, city, state, postalCode, country, contactPerson } = req.body;

  await checkExists('auth_gangazon.auth_franchises', { code }, 'El código de franquicia ya existe');

  const result = await query(
    `INSERT INTO auth_gangazon.auth_franchises (name, code, email, phone, address, city, state, postal_code, country, contact_person)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [name, code.toUpperCase(), email || null, phone || null, address || null, city || null, state || null, postalCode || null, country || null, contactPerson || null]
  );

  const newFranchise = result.rows[0];

  await createAuditLog({ userId: req.user.id, action: 'franchise_created', ipAddress: req.ip, details: { franchiseCode: newFranchise.code, franchiseName: newFranchise.name } });

  logger.info(`Franquicia creada: ${newFranchise.code} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { franchise: mapFranchise(newFranchise) } });
}));

/**
 * GET /api/franchises
 */
router.get('/', catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;

  let whereClauses = [];
  const values = [];
  let paramIndex = 1;

  if (search) {
    whereClauses.push(`(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (isActive !== undefined) {
    whereClauses.push(`is_active = $${paramIndex++}`);
    values.push(isActive === 'true');
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT * FROM auth_gangazon.auth_franchises ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM auth_gangazon.auth_franchises ${whereClause}`,
      values
    )
  ]);

  res.json({
    success: true,
    data: {
      franchises: dataResult.rows.map(mapFranchise),
      pagination: { 
        total: parseInt(countResult.rows[0].total), 
        page: parseInt(page), 
        limit: parseInt(limit), 
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit) 
      }
    }
  });
}));

/**
 * GET /api/franchises/:id
 */
router.get('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;

  const [franchiseResult, userCountResult] = await Promise.all([
    query('SELECT * FROM auth_gangazon.auth_franchises WHERE id = $1', [id]),
    query('SELECT COUNT(*) as count FROM auth_gangazon.auth_users WHERE franchise_id = $1', [id])
  ]);

  if (franchiseResult.rows.length === 0) throw new AppError('Franquicia no encontrada', 404);

  const franchise = franchiseResult.rows[0];
  const userCount = parseInt(userCountResult.rows[0].count);

  res.json({ 
    success: true, 
    data: { franchise: { ...mapFranchise(franchise, true), userCount } } 
  });
}));

/**
 * PUT /api/franchises/:id
 */
router.put('/:id', validate(updateFranchiseSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, city, state, postalCode, country, contactPerson, isActive } = req.body;

  const existing = await getOne('auth_gangazon.auth_franchises', { id }, 'Franquicia no encontrada');
  // Protección: GANGAZON_HQ es la franquicia matriz del sistema
  if (existing.code === 'GANGAZON_HQ') throw new AppError('No se puede modificar la franquicia matriz del sistema (GANGAZON_HQ)', 400);

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(email);
  }
  if (phone !== undefined) {
    updates.push(`phone = $${paramIndex++}`);
    values.push(phone);
  }
  if (address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    values.push(address);
  }
  if (city !== undefined) {
    updates.push(`city = $${paramIndex++}`);
    values.push(city);
  }
  if (state !== undefined) {
    updates.push(`state = $${paramIndex++}`);
    values.push(state);
  }
  if (postalCode !== undefined) {
    updates.push(`postal_code = $${paramIndex++}`);
    values.push(postalCode);
  }
  if (country !== undefined) {
    updates.push(`country = $${paramIndex++}`);
    values.push(country);
  }
  if (contactPerson !== undefined) {
    updates.push(`contact_person = $${paramIndex++}`);
    values.push(contactPerson);
  }
  if (isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    values.push(isActive);
  }

  if (updates.length === 0) {
    return res.json({ success: true, data: { franchise: mapFranchise(existing) } });
  }

  values.push(id);
  const result = await query(
    `UPDATE auth_gangazon.auth_franchises SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  const updatedFranchise = result.rows[0];

  await createAuditLog({ 
    userId: req.user.id, 
    action: 'franchise_updated', 
    ipAddress: req.ip, 
    details: { franchiseCode: existing.code, changes: req.body } 
  });

  logger.info(`Franquicia actualizada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { franchise: mapFranchise(updatedFranchise) } });
}));

/**
 * DELETE /api/franchises/:id
 */
router.delete('/:id', catchAsync(async (req, res) => {
  const { id } = req.params;

  const existing = await getOne('auth_gangazon.auth_franchises', { id }, 'Franquicia no encontrada');
  // Protección: GANGAZON_HQ es la franquicia matriz del sistema
  if (existing.code === 'GANGAZON_HQ') throw new AppError('No se puede eliminar la franquicia matriz del sistema (GANGAZON_HQ)', 400);

  const userCountResult = await query('SELECT COUNT(*) as count FROM auth_gangazon.auth_users WHERE franchise_id = $1', [id]);
  const userCount = parseInt(userCountResult.rows[0].count);

  if (userCount > 0) throw new AppError(`No se puede eliminar la franquicia porque tiene ${userCount} usuario(s) asociado(s)`, 400);

  await query('DELETE FROM auth_gangazon.auth_franchises WHERE id = $1', [id]);

  await createAuditLog({ 
    userId: req.user.id, 
    action: 'franchise_deleted', 
    ipAddress: req.ip, 
    details: { deletedFranchiseCode: existing.code, deletedFranchiseName: existing.name } 
  });

  logger.warn(`Franquicia eliminada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, message: 'Franquicia eliminada correctamente' });
}));

function mapFranchise(f, includeUpdatedAt = false) {
  const mapped = {
    id: f.id, name: f.name, code: f.code, email: f.email, phone: f.phone, address: f.address,
    city: f.city, state: f.state, postalCode: f.postal_code, country: f.country,
    contactPerson: f.contact_person, isActive: f.is_active, createdAt: f.created_at
  };
  if (includeUpdatedAt) mapped.updatedAt = f.updated_at;
  return mapped;
}

module.exports = router;

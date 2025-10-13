const express = require('express');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validation');
const { createFranchiseSchema, updateFranchiseSchema } = require('../validators/schemas');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, buildPaginatedQuery, createAuditLog, checkExists } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * POST /api/franchises
 */
router.post('/', requirePermission('franchises.create'), validate(createFranchiseSchema), catchAsync(async (req, res) => {
  const { name, code, email, phone, address, city, state, postalCode, country, contactPerson } = req.body;
  const supabase = createClient();

  await checkExists('franchises', { code }, 'El código de franquicia ya existe');

  const { data: newFranchise, error } = await supabase.from('franchises').insert({
    name, code: code.toUpperCase(), email: email || null, phone: phone || null, address: address || null,
    city: city || null, state: state || null, postal_code: postalCode || null, country: country || null,
    contact_person: contactPerson || null
  }).select().single();

  if (error) throw new AppError('Error al crear franquicia', 500);

  await createAuditLog({ userId: req.user.id, action: 'franchise_created', ipAddress: req.ip, details: { franchiseCode: newFranchise.code, franchiseName: newFranchise.name } });

  logger.info(`Franquicia creada: ${newFranchise.code} por ${req.user.email}`);
  res.status(201).json({ success: true, data: { franchise: mapFranchise(newFranchise) } });
}));

/**
 * GET /api/franchises
 */
router.get('/', requirePermission('franchises.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  let query = buildPaginatedQuery('franchises', { page, limit });

  if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,city.ilike.%${search}%`);
  if (isActive !== undefined) query = query.eq('is_active', isActive === 'true');
  
  query = query.order('created_at', { ascending: false });

  const { data: franchises, count, error } = await query;
  if (error) throw new AppError('Error al obtener franquicias', 500);

  res.json({
    success: true,
    data: {
      franchises: franchises.map(mapFranchise),
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    }
  });
}));

/**
 * GET /api/franchises/:id
 */
router.get('/:id', requirePermission('franchises.view'), catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const [franchise, { count: userCount }] = await Promise.all([
    getOne('franchises', { id }, 'Franquicia no encontrada'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('franchise_id', id)
  ]);

  res.json({ success: true, data: { franchise: { ...mapFranchise(franchise, true), userCount: userCount || 0 } } });
}));

/**
 * PUT /api/franchises/:id
 */
router.put('/:id', requirePermission('franchises.edit'), validate(updateFranchiseSchema), catchAsync(async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, city, state, postalCode, country, contactPerson, isActive } = req.body;
  const supabase = createClient();

  const existing = await getOne('franchises', { id }, 'Franquicia no encontrada');
  // Protección: GANGAZON_HQ es la franquicia matriz del sistema
  if (existing.code === 'GANGAZON_HQ') throw new AppError('No se puede modificar la franquicia matriz del sistema (GANGAZON_HQ)', 400);

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (address !== undefined) updateData.address = address;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (postalCode !== undefined) updateData.postal_code = postalCode;
  if (country !== undefined) updateData.country = country;
  if (contactPerson !== undefined) updateData.contact_person = contactPerson;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data: updatedFranchise, error } = await supabase.from('franchises').update(updateData).eq('id', id).select().single();
  if (error) throw new AppError('Error al actualizar franquicia', 500);

  await createAuditLog({ userId: req.user.id, action: 'franchise_updated', ipAddress: req.ip, details: { franchiseCode: existing.code, changes: updateData } });

  logger.info(`Franquicia actualizada: ${existing.code} por ${req.user.email}`);
  res.json({ success: true, data: { franchise: mapFranchise(updatedFranchise) } });
}));

/**
 * DELETE /api/franchises/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const existing = await getOne('franchises', { id }, 'Franquicia no encontrada');
  // Protección: GANGAZON_HQ es la franquicia matriz del sistema
  if (existing.code === 'GANGAZON_HQ') throw new AppError('No se puede eliminar la franquicia matriz del sistema (GANGAZON_HQ)', 400);

  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('franchise_id', id);
  if (userCount > 0) throw new AppError(`No se puede eliminar la franquicia porque tiene ${userCount} usuario(s) asociado(s)`, 400);

  const { error } = await supabase.from('franchises').delete().eq('id', id);
  if (error) throw new AppError('Error al eliminar franquicia', 500);

  await createAuditLog({ userId: req.user.id, action: 'franchise_deleted', ipAddress: req.ip, details: { deletedFranchiseCode: existing.code, deletedFranchiseName: existing.name } });

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

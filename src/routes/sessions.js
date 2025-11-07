const express = require('express');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, buildPaginatedQuery, createAuditLog } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/sessions
 */
router.get('/', requirePermission('sessions.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 20, userId, applicationId, isActive } = req.query;
  
  let query = buildPaginatedQuery('auth_gangazon.auth_sessions', { page, limit })
    .select('*, user:auth_users(id, email, first_name, last_name), application:auth_applications(id, name, code)');

  if (userId) query = query.eq('user_id', userId);
  if (applicationId) query = query.eq('application_id', applicationId);
  if (isActive === 'true') query = query.is('ended_at', null);
  else if (isActive === 'false') query = query.not('ended_at', 'is', null);

  query = query.order('created_at', { ascending: false });

  const { data: sessions, count, error } = await query;
  if (error) throw new AppError('Error al obtener sesiones', 500);

  res.json({
    success: true,
    data: {
      sessions: sessions.map(mapSession),
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    }
  });
}));

/**
 * GET /api/sessions/my
 */
router.get('/my', catchAsync(async (req, res) => {
  const supabase = createClient();
  const { data: sessions, error } = await supabase.from('auth_sessions')
    .select('*, application:auth_applications(id, name, code)')
    .eq('user_id', req.user.id).is('ended_at', null).order('created_at', { ascending: false });

  if (error) throw new AppError('Error al obtener sesiones', 500);

  res.json({ success: true, data: { sessions: sessions.map(s => mapSession(s, false)) } });
}));

/**
 * DELETE /api/sessions/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;
  const supabase = createClient();

  const session = await getOne('auth_gangazon.auth_sessions', { id }, 'Sesión no encontrada');
  if (session.ended_at) throw new AppError('La sesión ya está cerrada', 400);

  const { error } = await supabase.from('auth_sessions').update({ ended_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new AppError('Error al cerrar sesión', 500);

  await createAuditLog({ userId: req.user.id, action: 'session_closed', ipAddress: req.ip, details: { closedSessionId: id, sessionUserId: session.user_id } });

  logger.info(`Sesión cerrada: ${id} por ${req.user.email}`);
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}));

/**
 * DELETE /api/sessions/user/:userId
 */
router.delete('/user/:userId', requireSuperAdmin, catchAsync(async (req, res) => {
  const { userId } = req.params;
  const supabase = createClient();

  const user = await getOne('auth_gangazon.auth_users', { id: userId }, 'Usuario no encontrado');

  const { count: activeCount } = await supabase.from('auth_sessions').select('*', { count: 'exact', head: true })
    .eq('user_id', userId).is('ended_at', null);

  if (activeCount === 0) throw new AppError('El usuario no tiene sesiones activas', 400);

  const { error } = await supabase.from('auth_sessions').update({ ended_at: new Date().toISOString() })
    .eq('user_id', userId).is('ended_at', null);

  if (error) throw new AppError('Error al cerrar sesiones', 500);

  await createAuditLog({ userId: req.user.id, action: 'all_sessions_closed', ipAddress: req.ip, details: { targetUserId: userId, targetUserEmail: user.email, closedCount: activeCount } });

  logger.warn(`Todas las sesiones cerradas para: ${user.email} por ${req.user.email}`);
  res.json({ success: true, message: `${activeCount} sesión(es) cerrada(s) correctamente` });
}));

function mapSession(s, includeUser = true) {
  const mapped = {
    id: s.id,
    application: s.application ? { id: s.application.id, name: s.application.name, code: s.application.code } : null,
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    lastActivityAt: s.last_activity_at
  };
  if (includeUser && s.user) {
    mapped.user = { id: s.user.id, email: s.user.email, firstName: s.user.first_name, lastName: s.user.last_name };
    mapped.endedAt = s.ended_at;
    mapped.isActive = !s.ended_at;
  }
  return mapped;
}

module.exports = router;

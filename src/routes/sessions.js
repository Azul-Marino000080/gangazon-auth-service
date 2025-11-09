const express = require('express');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission, requireSuperAdmin } = require('../middleware/auth');
const { getOne, createAuditLog } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/sessions
 */
router.get('/', requirePermission('sessions.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 20, userId, applicationId, isActive } = req.query;
  
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;

  if (userId) {
    whereClauses.push(`s.user_id = $${paramIndex++}`);
    values.push(userId);
  }
  if (applicationId) {
    whereClauses.push(`s.application_id = $${paramIndex++}`);
    values.push(applicationId);
  }
  if (isActive === 'true') {
    whereClauses.push(`s.ended_at IS NULL`);
  } else if (isActive === 'false') {
    whereClauses.push(`s.ended_at IS NOT NULL`);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT s.*, 
              u.id as user_id, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
              a.id as app_id, a.name as app_name, a.code as app_code
       FROM auth_gangazon.auth_sessions s
       LEFT JOIN auth_gangazon.auth_users u ON s.user_id = u.id
       LEFT JOIN auth_gangazon.auth_applications a ON s.application_id = a.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM auth_gangazon.auth_sessions s ${whereClause}`,
      values
    )
  ]);

  const sessions = dataResult.rows.map(s => ({
    ...s,
    user: s.user_id ? { id: s.user_id, email: s.user_email, firstName: s.user_first_name, lastName: s.user_last_name } : null,
    application: s.app_id ? { id: s.app_id, name: s.app_name, code: s.app_code } : null
  }));

  res.json({
    success: true,
    data: {
      sessions: sessions.map(mapSession),
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
 * GET /api/sessions/my
 */
router.get('/my', catchAsync(async (req, res) => {
  const result = await query(
    `SELECT s.*, a.id as app_id, a.name as app_name, a.code as app_code
     FROM auth_gangazon.auth_sessions s
     LEFT JOIN auth_gangazon.auth_applications a ON s.application_id = a.id
     WHERE s.user_id = $1 AND s.ended_at IS NULL
     ORDER BY s.created_at DESC`,
    [req.user.id]
  );

  const sessions = result.rows.map(s => ({
    ...s,
    application: s.app_id ? { id: s.app_id, name: s.app_name, code: s.app_code } : null
  }));

  res.json({ success: true, data: { sessions: sessions.map(s => mapSession(s, false)) } });
}));

/**
 * DELETE /api/sessions/:id
 */
router.delete('/:id', requireSuperAdmin, catchAsync(async (req, res) => {
  const { id } = req.params;

  const session = await getOne('auth_gangazon.auth_sessions', { id }, 'Sesión no encontrada');
  if (session.ended_at) throw new AppError('La sesión ya está cerrada', 400);

  await query('UPDATE auth_gangazon.auth_sessions SET ended_at = NOW() WHERE id = $1', [id]);

  await createAuditLog({ 
    userId: req.user.id, 
    action: 'session_closed', 
    ipAddress: req.ip, 
    details: { closedSessionId: id, sessionUserId: session.user_id } 
  });

  logger.info(`Sesión cerrada: ${id} por ${req.user.email}`);
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
}));

/**
 * DELETE /api/sessions/user/:userId
 */
router.delete('/user/:userId', requireSuperAdmin, catchAsync(async (req, res) => {
  const { userId } = req.params;

  const user = await getOne('auth_gangazon.auth_users', { id: userId }, 'Usuario no encontrado');

  const activeCountResult = await query(
    'SELECT COUNT(*) as count FROM auth_gangazon.auth_sessions WHERE user_id = $1 AND ended_at IS NULL',
    [userId]
  );
  const activeCount = parseInt(activeCountResult.rows[0].count);

  if (activeCount === 0) throw new AppError('El usuario no tiene sesiones activas', 400);

  await query('UPDATE auth_gangazon.auth_sessions SET ended_at = NOW() WHERE user_id = $1 AND ended_at IS NULL', [userId]);

  await createAuditLog({ 
    userId: req.user.id, 
    action: 'all_sessions_closed', 
    ipAddress: req.ip, 
    details: { targetUserId: userId, targetUserEmail: user.email, closedCount: activeCount } 
  });

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

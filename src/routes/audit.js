const express = require('express');
const { createClient } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { buildPaginatedQuery } = require('../utils/queryHelpers');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/audit
 */
router.get('/', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 50, userId, applicationId, action, startDate, endDate } = req.query;
  
  let query = buildPaginatedQuery('auth_gangazon.auth_audit_log', { page, limit })
    .select('*, user:auth_users(id, email, first_name, last_name), application:auth_applications(id, name, code)');

  if (userId) query = query.eq('user_id', userId);
  if (applicationId) query = query.eq('application_id', applicationId);
  if (action) {
    const actions = action.split(',').map(a => a.trim());
    query = actions.length === 1 ? query.eq('action', actions[0]) : query.in('action', actions);
  }
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  query = query.order('created_at', { ascending: false });

  const { data: logs, count, error } = await query;
  if (error) throw new AppError('Error al obtener logs de auditoría', 500);

  res.json({
    success: true,
    data: {
      logs: logs.map(mapAuditLog),
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
    }
  });
}));

/**
 * GET /api/audit/actions
 */
router.get('/actions', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const supabase = createClient();
  const { data: actions, error } = await supabase.from('auth_audit_log').select('action').order('action', { ascending: true });

  if (error) throw new AppError('Error al obtener acciones', 500);

  res.json({ success: true, data: { actions: [...new Set(actions.map(a => a.action))] } });
}));

/**
 * GET /api/audit/stats
 */
router.get('/stats', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const supabase = createClient();

  let query = supabase.from('auth_audit_log').select('action');
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const [{ data: logs, error }, { count: totalUsers }, { count: activeSessions }] = await Promise.all([
    query,
    supabase.from('auth_users').select('*', { count: 'exact', head: true }),
    supabase.from('auth_sessions').select('*', { count: 'exact', head: true }).is('ended_at', null)
  ]);

  if (error) throw new AppError('Error al obtener estadísticas', 500);

  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      totalLogs: logs.length,
      actionCounts,
      totalUsers,
      activeSessions,
      periodStart: startDate || 'desde el inicio',
      periodEnd: endDate || 'hasta ahora'
    }
  });
}));

function mapAuditLog(log) {
  return {
    id: log.id,
    user: log.user ? { id: log.user.id, email: log.user.email, firstName: log.user.first_name, lastName: log.user.last_name } : null,
    application: log.application ? { id: log.application.id, name: log.application.name, code: log.application.code } : null,
    action: log.action,
    details: log.details,
    ipAddress: log.ip_address,
    createdAt: log.created_at
  };
}

module.exports = router;

const express = require('express');
const { query } = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
router.use(authenticateToken);

/**
 * GET /api/audit
 */
router.get('/', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const { page = 1, limit = 50, userId, applicationId, action, startDate, endDate } = req.query;
  
  const whereClauses = [];
  const values = [];
  let paramIndex = 1;

  if (userId) {
    whereClauses.push(`l.user_id = $${paramIndex++}`);
    values.push(userId);
  }
  if (applicationId) {
    whereClauses.push(`l.application_id = $${paramIndex++}`);
    values.push(applicationId);
  }
  if (action) {
    const actions = action.split(',').map(a => a.trim());
    if (actions.length === 1) {
      whereClauses.push(`l.action = $${paramIndex++}`);
      values.push(actions[0]);
    } else {
      whereClauses.push(`l.action = ANY($${paramIndex++})`);
      values.push(actions);
    }
  }
  if (startDate) {
    whereClauses.push(`l.created_at >= $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`l.created_at <= $${paramIndex++}`);
    values.push(endDate);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query(
      `SELECT l.*,
              u.id as user_id_val, u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
              a.id as app_id, a.name as app_name, a.code as app_code
       FROM auth_gangazon.auth_audit_log l
       LEFT JOIN auth_gangazon.auth_users u ON l.user_id = u.id
       LEFT JOIN auth_gangazon.auth_applications a ON l.application_id = a.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    ),
    query(
      `SELECT COUNT(*) as total FROM auth_gangazon.auth_audit_log l ${whereClause}`,
      values
    )
  ]);

  const logs = dataResult.rows.map(l => ({
    ...l,
    user: l.user_id_val ? { id: l.user_id_val, email: l.user_email, firstName: l.user_first_name, lastName: l.user_last_name } : null,
    application: l.app_id ? { id: l.app_id, name: l.app_name, code: l.app_code } : null
  }));

  res.json({
    success: true,
    data: {
      logs: logs.map(mapAuditLog),
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
 * GET /api/audit/actions
 */
router.get('/actions', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const result = await query('SELECT DISTINCT action FROM auth_gangazon.auth_audit_log ORDER BY action ASC');
  res.json({ success: true, data: { actions: result.rows.map(a => a.action) } });
}));

/**
 * GET /api/audit/stats
 */
router.get('/stats', requirePermission('audit.view'), catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;

  const whereClauses = [];
  const values = [];
  let paramIndex = 1;

  if (startDate) {
    whereClauses.push(`created_at >= $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate) {
    whereClauses.push(`created_at <= $${paramIndex++}`);
    values.push(endDate);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [logsResult, totalUsersResult, activeSessionsResult] = await Promise.all([
    query(`SELECT action FROM auth_gangazon.auth_audit_log ${whereClause}`, values),
    query('SELECT COUNT(*) as count FROM auth_gangazon.auth_users'),
    query('SELECT COUNT(*) as count FROM auth_gangazon.auth_sessions WHERE ended_at IS NULL')
  ]);

  const actionCounts = logsResult.rows.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      totalLogs: logsResult.rows.length,
      actionCounts,
      totalUsers: parseInt(totalUsersResult.rows[0].count),
      activeSessions: parseInt(activeSessionsResult.rows[0].count),
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

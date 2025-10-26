const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('./logger');

/**
 * Genera un access token (30 minutos)
 */
function generateAccessToken(user, permissions = [], applicationId = null) {
  const payload = {
    userId: user.id,
    email: user.email,
    franchiseId: user.franchise_id,
    applicationId: applicationId,
    permissions: permissions.map(p => p.code || p)
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30m',
    issuer: 'gangazon-auth-service'
  });
}

/**
 * Genera un refresh token (7 días)
 */
function generateRefreshToken(user, applicationId = null) {
  const payload = {
    userId: user.id,
    applicationId: applicationId,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
    issuer: 'gangazon-auth-service'
  });
}

/**
 * Verifica un access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.warn(`Invalid access token: ${error.message}`);
    return null;
  }
}

/**
 * Verifica un refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    logger.warn(`Invalid refresh token: ${error.message}`);
    return null;
  }
}

/**
 * Guarda un refresh token en la base de datos
 */
async function storeRefreshToken(userId, token, expiresInDays = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt.toISOString()]
  );
}

/**
 * Verifica si un refresh token existe en la base de datos
 */
async function validateRefreshToken(token) {
  const result = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Elimina un refresh token
 */
async function revokeRefreshToken(token) {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

/**
 * Elimina todos los refresh tokens expirados
 */
async function cleanExpiredTokens() {
  await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  cleanExpiredTokens
};

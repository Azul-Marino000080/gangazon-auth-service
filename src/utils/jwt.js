const jwt = require('jsonwebtoken');
const { createClient } = require('../config/database');
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
  const supabase = createClient();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString()
    });

  if (error) {
    logger.error('Error storing refresh token:', error);
    throw error;
  }
}

/**
 * Verifica si un refresh token existe en la base de datos
 */
async function validateRefreshToken(token) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Elimina un refresh token
 */
async function revokeRefreshToken(token) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('refresh_tokens')
    .delete()
    .eq('token', token);

  if (error) {
    logger.error('Error revoking refresh token:', error);
    throw error;
  }
}

/**
 * Elimina todos los refresh tokens expirados
 */
async function cleanExpiredTokens() {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('refresh_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    logger.error('Error cleaning expired tokens:', error);
  }
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

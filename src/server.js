require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Importar rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const applicationsRoutes = require('./routes/applications');
const permissionsRoutes = require('./routes/permissions');
const franchisesRoutes = require('./routes/franchises');
const sessionsRoutes = require('./routes/sessions');
const auditRoutes = require('./routes/audit');
const setupRoutes = require('./routes/setup');

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================
// MIDDLEWARE DE SEGURIDAD
// =====================================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS - Configuración de orígenes permitidos
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (ej: Postman, apps móviles)
    if (!origin) {
      return callback(null, true);
    }
    
    // Permitir localhost en cualquier puerto (desarrollo)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Permitir orígenes configurados
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting - Límite de peticiones
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// =====================================================
// MIDDLEWARE GENERAL
// =====================================================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger de peticiones
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// =====================================================
// RUTAS
// =====================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/franchises', franchisesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/audit', auditRoutes);

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`
  });
});

// =====================================================
// MANEJADOR DE ERRORES
// =====================================================

app.use(errorHandler);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(PORT, () => {
  logger.info(`🚀 Gangazon Auth Service v2.0 iniciado`);
  logger.info(`📡 Servidor escuchando en puerto ${PORT}`);
  logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 CORS habilitado para: ${allowedOrigins.join(', ')}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;

#!/usr/bin/env node

/**
 * Script de pruebas para verificar el despliegue del Auth Service
 * Ejecuta: node test-deployment.js [URL_RENDER]
 */

const https = require('https');
const http = require('http');

// URL del servicio desplegado (cambiar por tu URL real de Render)
const BASE_URL = process.argv[2] || 'https://gangazon-auth-service.onrender.com';

console.log(`🚀 Probando Auth Service en: ${BASE_URL}`);
console.log('=' * 60);

// Función para hacer requests HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Función para mostrar resultados
function showResult(test, success, details) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${test}`);
  if (details) {
    console.log(`   ${details}`);
  }
  console.log('');
}

// Tests principales
async function runTests() {
  let token = null;

  try {
    // Test 1: Health Check
    console.log('🔍 Test 1: Health Check');
    const health = await makeRequest(`${BASE_URL}/health`);
    showResult(
      'Health endpoint',
      health.status === 200,
      `Status: ${health.status} - ${JSON.stringify(health.data)}`
    );

    // Test 2: CORS Headers
    console.log('🔍 Test 2: CORS Configuration');
    const corsHeaders = health.headers['access-control-allow-origin'];
    showResult(
      'CORS headers present',
      !!corsHeaders,
      `CORS: ${corsHeaders || 'No CORS headers'}`
    );

    // Test 3: API Base Route
    console.log('🔍 Test 3: API Base Route');
    const apiBase = await makeRequest(`${BASE_URL}/api`);
    showResult(
      'API base route',
      apiBase.status === 200,
      `Status: ${apiBase.status}`
    );

    // Test 4: Login con usuario admin
    console.log('🔍 Test 4: Admin Login');
    const login = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@gangazon.com',
        password: 'Admin123!'
      }
    });
    
    showResult(
      'Admin login',
      login.status === 200 && login.data.token,
      `Status: ${login.status} - Token: ${login.data.token ? 'Present' : 'Missing'}`
    );

    if (login.data.token) {
      token = login.data.token;
    }

    // Test 5: Verificar JWT token
    if (token) {
      console.log('🔍 Test 5: Token Verification');
      const profile = await makeRequest(`${BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      showResult(
        'Token verification',
        profile.status === 200,
        `Status: ${profile.status} - User: ${profile.data.user?.email || 'Not found'}`
      );
    }

    // Test 6: Listar organizaciones
    if (token) {
      console.log('🔍 Test 6: Organizations Endpoint');
      const orgs = await makeRequest(`${BASE_URL}/api/organizations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      showResult(
        'Organizations list',
        orgs.status === 200,
        `Status: ${orgs.status} - Count: ${orgs.data.organizations?.length || 0}`
      );
    }

    // Test 7: Listar franquicias
    if (token) {
      console.log('🔍 Test 7: Franchises Endpoint');
      const franchises = await makeRequest(`${BASE_URL}/api/franchises`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      showResult(
        'Franchises list',
        franchises.status === 200,
        `Status: ${franchises.status} - Count: ${franchises.data.franchises?.length || 0}`
      );
    }

    // Test 8: Rate Limiting
    console.log('🔍 Test 8: Rate Limiting');
    const rateLimitHeaders = health.headers['x-ratelimit-limit'];
    showResult(
      'Rate limiting active',
      !!rateLimitHeaders,
      `Limit: ${rateLimitHeaders || 'Not configured'}`
    );

  } catch (error) {
    console.error(`❌ Error during tests: ${error.message}`);
  }
}

// Mostrar información del sistema
console.log('📋 System Information:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Test URL: ${BASE_URL}`);
console.log('');

// Ejecutar tests
runTests().then(() => {
  console.log('🎉 Tests completed!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('   1. Test all endpoints with your frontend');
  console.log('   2. Create test franchises and locations');
  console.log('   3. Test employee check-in/check-out');
  console.log('   4. Verify GPS validation');
  console.log('   5. Test role-based permissions');
}).catch(error => {
  console.error(`💥 Test suite failed: ${error.message}`);
  process.exit(1);
});
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 GANGAZON AUTH SERVICE - TEST PANEL                  ║
║                                                           ║
║   Panel de pruebas: http://localhost:${PORT}              ║
║   Auth Service API: http://localhost:3001                ║
║                                                           ║
║   ✅ Servidor de pruebas activo                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
    
    console.log('\n📋 Instrucciones:');
    console.log('1. Asegúrate de que el auth service esté corriendo en el puerto 3001');
    console.log('2. Abre http://localhost:3000 en tu navegador');
    console.log('3. Usa el panel para probar los endpoints del servicio\n');
});

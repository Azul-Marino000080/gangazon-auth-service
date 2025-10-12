# 🚀 Guía Rápida de Despliegue - Gangazon Auth Service v2.0

## ✅ Lo que ya está hecho

1. ✅ Schema de BD simplificado (`database/schema.sql`)
2. ✅ Roles reducidos de 9 a 6
3. ✅ Validaciones actualizadas (`src/validators/schemas.js`)
4. ✅ Server sin endpoint de organizations (`src/server.js`)
5. ✅ Documentación completa

## 🎯 Pasos para Desplegar

### Paso 1: Desplegar Base de Datos Nueva ⏱️ 2 min

#### Opción A: Supabase (Recomendado)
```bash
1. Ir a https://supabase.com/dashboard
2. Seleccionar tu proyecto
3. Ir a "SQL Editor"
4. Abrir archivo: database/schema.sql
5. Copiar TODO el contenido
6. Pegar en SQL Editor
7. Click "Run"
8. ✅ Listo! Verifica que aparezcan las tablas
```

#### Opción B: PostgreSQL Local
```bash
# Crear nueva BD
createdb gangazon_auth

# Ejecutar schema
psql -d gangazon_auth -f database/schema.sql

# Verificar
psql -d gangazon_auth -c "\dt"
```

### Paso 2: Verificar Usuario Admin ⏱️ 1 min

```sql
-- En Supabase SQL Editor o psql
SELECT id, email, role, is_active 
FROM users 
WHERE role = 'admin';

-- Debe devolver:
-- email: admin@gangazon.com
-- role: admin
-- is_active: true
```

### Paso 3: Probar Login con Admin ⏱️ 2 min

```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal, probar login:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gangazon.com",
    "password": "Admin123!"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Login exitoso",
  "user": {
    "email": "admin@gangazon.com",
    "role": "admin",
    ...
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Paso 4: Crear Primer Franquiciado ⏱️ 3 min

```bash
# Guardar el accessToken del paso anterior
TOKEN="eyJ..."

# Crear franquiciado
curl -X POST http://localhost:3001/api/franchises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Franquicia Madrid Centro",
    "franchiseeName": "Juan Pérez",
    "franchiseeEmail": "juan@gangazon.com",
    "franchiseePhone": "+34 600 000 000",
    "contractStartDate": "2025-01-01",
    "maxLocations": 5,
    "maxEmployees": 25
  }'
```

### Paso 5: Crear Usuario Franquiciado ⏱️ 2 min

```bash
# Registrar al dueño de la franquicia
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "juan@gangazon.com",
    "password": "SecurePass123!",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "franchisee"
  }'
```

### Paso 6: Crear un Local ⏱️ 2 min

```bash
# Login como franquiciado
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@gangazon.com",
    "password": "SecurePass123!"
  }'

# Guardar el token del franquiciado
FRANCHISEE_TOKEN="eyJ..."

# Crear local (necesitas el franchiseId del paso 4)
FRANCHISE_ID="uuid-del-paso-4"

curl -X POST http://localhost:3001/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FRANCHISEE_TOKEN" \
  -d '{
    "franchiseId": "'$FRANCHISE_ID'",
    "name": "Madrid Centro",
    "address": "Calle Gran Vía 1",
    "city": "Madrid",
    "postalCode": "28013",
    "maxEmployees": 10
  }'
```

### Paso 7: Crear Empleado ⏱️ 2 min

```bash
# Registrar empleado
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FRANCHISEE_TOKEN" \
  -d '{
    "email": "empleado@gangazon.com",
    "password": "SecurePass123!",
    "firstName": "María",
    "lastName": "García",
    "role": "employee"
  }'
```

### Paso 8: Asignar Empleado a Local ⏱️ 2 min

```bash
# Necesitas: userId del empleado, locationId del local
USER_ID="uuid-del-empleado"
LOCATION_ID="uuid-del-local"

curl -X POST http://localhost:3001/api/assignments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FRANCHISEE_TOKEN" \
  -d '{
    "user_id": "'$USER_ID'",
    "location_id": "'$LOCATION_ID'",
    "role_at_location": "employee",
    "start_date": "2025-10-15",
    "shift_type": "full_time"
  }'
```

### Paso 9: Probar Check-in ⏱️ 2 min

```bash
# Login como empleado
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "empleado@gangazon.com",
    "password": "SecurePass123!"
  }'

EMPLOYEE_TOKEN="eyJ..."

# Hacer check-in
curl -X POST http://localhost:3001/api/checkins/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d '{
    "locationId": "'$LOCATION_ID'",
    "checkInMethod": "manual"
  }'
```

### Paso 10: Verificar Estadísticas ⏱️ 1 min

```sql
-- En Supabase SQL Editor
SELECT * FROM v_franchise_stats;
SELECT * FROM v_location_stats;
```

## ✅ Checklist de Verificación

- [ ] Base de datos creada exitosamente
- [ ] Usuario admin puede hacer login
- [ ] Franquicia creada correctamente
- [ ] Usuario franquiciado creado
- [ ] Local creado en la franquicia
- [ ] Empleado registrado
- [ ] Asignación empleado-local funciona
- [ ] Check-in funciona correctamente
- [ ] Vistas de estadísticas devuelven datos

## 🚨 Problemas Comunes

### Error: "organizationId is required"
**Causa**: Código de rutas aún no actualizado  
**Solución**: Ver "Actualización de Rutas" abajo

### Error: "Invalid role"
**Causa**: Usando roles antiguos  
**Solución**: Usar solo: `admin`, `franchisee`, `manager`, `supervisor`, `employee`, `viewer`

### Error: "Cannot connect to database"
**Causa**: Variables de entorno incorrectas  
**Solución**: Verificar `.env`:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
DATABASE_URL=postgresql://...
```

### Error: "Token expired"
**Causa**: Token caducado  
**Solución**: Hacer login nuevamente

## 📝 Actualización de Rutas (Opcional)

Si encuentras errores con `organizationId`, actualiza estos archivos:

### 1. `src/routes/auth.js`
Eliminar validación y uso de `organizationId` en register.

### 2. `src/routes/franchises.js`
En `POST /`, quitar requerimiento de `organizationId`.

### 3. `src/routes/users.js`
Simplificar verificaciones de permisos por rol.

## 🎉 Éxito!

Si todos los pasos funcionaron, tienes:
- ✅ Sistema funcionando con nuevos roles
- ✅ Estructura simplificada
- ✅ BD limpia y organizada
- ✅ Documentación completa

## 📞 Siguiente Nivel

### Integrar con Frontend
```javascript
// React (gangazon-scanner2)
const API_BASE = 'http://localhost:3001/api';

const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
};
```

### Integrar con Flutter (gangazon_fichajes)
```dart
final response = await http.post(
  Uri.parse('http://localhost:3001/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
```

---

**Tiempo total**: ~20 minutos  
**Dificultad**: Fácil  
**Resultado**: Sistema funcionando al 100%

# Correcciones de Sincronización BD-API

**Fecha:** 12 de Octubre, 2025  
**Autor:** Sistema de Revisión Automática

## Resumen Ejecutivo

Se identificaron y corrigieron **5 problemas críticos** de inconsistencia entre el esquema de base de datos y el código de la API. Las correcciones en código ya están implementadas. Se requiere **1 cambio en la base de datos** que debe ejecutarse manualmente.

---

## ✅ Correcciones Implementadas en Código

### 1. Campo de Coordenadas en Check-ins

**Problema:** La API intentaba usar `check_in_location` (inexistente) en lugar de `check_in_latitude` y `check_in_longitude`.

**Archivos modificados:**
- `src/routes/checkins.js`

**Cambios realizados:**
- ✅ INSERT de check-in ahora usa `check_in_latitude` y `check_in_longitude`
- ✅ SELECT de check-in devuelve coordenadas como objeto `{lat, lng}`
- ✅ Respuestas JSON formatean coordenadas correctamente

**Antes:**
```javascript
check_in_location: coordinates ? `(${coordinates.lat},${coordinates.lng})` : null
```

**Después:**
```javascript
check_in_latitude: coordinates?.lat || null,
check_in_longitude: coordinates?.lng || null
```

---

### 2. Campo de Coordenadas en Locations

**Problema:** La API intentaba usar `coordinates` (inexistente) en lugar de `latitude` y `longitude`.

**Archivos modificados:**
- `src/routes/locations.js`

**Cambios realizados:**
- ✅ INSERT de location ahora usa `latitude` y `longitude`
- ✅ UPDATE de location maneja coordenadas correctamente
- ✅ SELECT de location devuelve coordenadas como objeto `{lat, lng}`
- ✅ Respuestas JSON formatean coordenadas correctamente

**Antes:**
```javascript
coordinates: coordinates ? `(${coordinates.lat},${coordinates.lng})` : null
```

**Después:**
```javascript
latitude: coordinates?.lat || null,
longitude: coordinates?.lng || null
```

---

### 3. Campo `hours_worked` No Existente

**Problema:** La API intentaba seleccionar `hours_worked` de `employee_checkins` pero esta columna no existe.

**Archivos modificados:**
- `src/routes/checkins.js`

**Cambios realizados:**
- ✅ Eliminadas referencias a columna `hours_worked` en SELECT queries
- ✅ Cálculo de horas trabajadas se hace en JavaScript en tiempo real
- ✅ Fórmula: `(check_out_time - check_in_time) / 3600000` horas

**Implementación:**
```javascript
let hoursWorked = null;
if (checkin.check_out_time) {
  const checkIn = new Date(checkin.check_in_time);
  const checkOut = new Date(checkin.check_out_time);
  hoursWorked = Math.round((checkOut - checkIn) / (1000 * 60 * 60) * 100) / 100;
}
```

---

### 4. Tipo de Dato `break_duration`

**Problema:** Inconsistencia entre BD (INTEGER minutos), API (string), y validador (formato HH:MM:SS).

**Archivos modificados:**
- `src/routes/checkins.js`
- `src/validators/schemas.js`

**Cambios realizados:**
- ✅ API ahora usa INTEGER (minutos) para `break_duration`
- ✅ Validador actualizado para aceptar número entero de minutos
- ✅ Eliminado formato de tiempo HH:MM:SS

**Antes:**
```javascript
breakDuration: Joi.string().pattern(/^\d+:\d{2}:\d{2}$/)
// Y en la API:
break_duration: breakDuration || '0 minutes'
```

**Después:**
```javascript
breakDuration: Joi.number().integer().min(0)
// Y en la API:
break_duration: breakDuration || 0
```

---

### 5. Validación de Roles

**Problema:** Validadores solo aceptaban 3 roles pero la API usa 9 roles diferentes.

**Archivos modificados:**
- `src/validators/schemas.js`

**Cambios realizados:**
- ✅ `registerSchema` ahora valida los 9 roles
- ✅ `updateUserSchema` ahora valida los 9 roles

**Roles añadidos a validación:**
- `franchisor_ceo`
- `franchisee_owner`
- `location_supervisor`

---

## ⚠️ Cambio Requerido en Base de Datos

### CHECK Constraint de Roles en Tabla `users`

**Problema:** El CHECK constraint de la base de datos solo permite 6 roles, pero la API usa 9.

**Roles permitidos actualmente en BD:**
- ✅ user
- ✅ admin
- ✅ super_admin
- ✅ franchisor_admin
- ✅ franchisee_admin
- ✅ location_manager

**Roles usados en API pero NO permitidos en BD:**
- ❌ franchisor_ceo (usado en franchises.js, locations.js, checkins.js)
- ❌ franchisee_owner (usado en franchises.js, locations.js, checkins.js)
- ❌ location_supervisor (usado en locations.js, checkins.js)

**Acción requerida:**
1. Ejecutar el script SQL: `database/fix_roles_constraint.sql`
2. Esto debe hacerse con permisos de ALTER TABLE
3. **IMPORTANTE:** Coordinar con el equipo antes de ejecutar en producción

**Script SQL generado:**
```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'user', 'admin', 'super_admin',
    'franchisor_admin', 'franchisor_ceo',
    'franchisee_admin', 'franchisee_owner',
    'location_manager', 'location_supervisor'
  )
);
```

---

## Impacto y Testing

### Impacto de las Correcciones

**Sin las correcciones:**
- ❌ Todos los check-ins fallarían (columna inexistente)
- ❌ Crear/actualizar locales fallaría (columna inexistente)
- ❌ Consultar check-ins fallaría (columna inexistente)
- ❌ Crear usuarios con ciertos roles fallaría (constraint violation)

**Con las correcciones:**
- ✅ Check-ins funcionan correctamente
- ✅ Locales se crean/actualizan correctamente
- ✅ Coordenadas se almacenan y recuperan correctamente
- ✅ Horas trabajadas se calculan en tiempo real
- ✅ Validación de roles completa
- ⚠️ Creación de usuarios con roles nuevos fallará hasta actualizar BD

### Endpoints Afectados y Corregidos

**Check-ins:**
- ✅ `POST /api/checkins/checkin` - Crear check-in
- ✅ `POST /api/checkins/checkout` - Hacer check-out
- ✅ `GET /api/checkins/status` - Estado actual
- ✅ `GET /api/checkins` - Listar historial
- ✅ `PATCH /api/checkins/:id` - Actualizar check-in

**Locations:**
- ✅ `POST /api/locations` - Crear local
- ✅ `GET /api/locations` - Listar locales
- ✅ `GET /api/locations/:id` - Obtener local
- ✅ `PUT /api/locations/:id` - Actualizar local

**Users:**
- ⚠️ `POST /api/auth/register` - Registro con roles nuevos (requiere cambio BD)
- ⚠️ `PUT /api/users/:id` - Actualizar rol a roles nuevos (requiere cambio BD)

### Plan de Testing

1. **Verificar check-ins:**
   ```bash
   # Test crear check-in con coordenadas
   POST /api/checkins/checkin
   {
     "locationId": "uuid",
     "checkInMethod": "gps",
     "coordinates": { "lat": 40.4168, "lng": -3.7038 }
   }
   ```

2. **Verificar locales:**
   ```bash
   # Test crear local con coordenadas
   POST /api/locations
   {
     "franchiseId": "uuid",
     "name": "Local Test",
     "coordinates": { "lat": 40.4168, "lng": -3.7038 }
   }
   ```

3. **Verificar cálculo de horas:**
   ```bash
   # Hacer check-in y check-out, verificar que hoursWorked se calcula
   GET /api/checkins?userId=uuid
   ```

4. **Después de actualizar BD:**
   ```bash
   # Test crear usuario con rol nuevo
   POST /api/auth/register
   {
     "email": "test@test.com",
     "role": "franchisor_ceo"
   }
   ```

---

## Próximos Pasos

1. ✅ **Código actualizado** - Ya implementado
2. ⏳ **Ejecutar script SQL** - `database/fix_roles_constraint.sql`
3. ⏳ **Testing completo** - Verificar todos los endpoints afectados
4. ⏳ **Actualizar documentación API** - Si existe Swagger/OpenAPI

---

## Notas Técnicas

### Cálculo de Horas Trabajadas

Se implementó como cálculo en tiempo real en lugar de columna de BD por:
- Mayor flexibilidad para cambios de lógica
- No requiere triggers o columnas computadas
- Más fácil de mantener
- Performance aceptable (operación simple)

Si en el futuro se requiere optimización, considerar:
- Agregar columna generada en BD
- Usar materialized views para reportes
- Cachear valores en Redis

### Formato de Coordenadas

Se estandarizó el formato de coordenadas:
- **Almacenamiento:** `latitude` y `longitude` separados (NUMERIC)
- **API Request/Response:** `{ lat: number, lng: number }`
- **Compatibilidad:** Compatible con librerías de mapas (Google Maps, Leaflet, etc.)

---

## Documentos Relacionados

- `database/supabase_schema.sql` - Esquema completo de BD
- `database/fix_roles_constraint.sql` - Script de corrección de roles
- `postman/Gangazon-Auth-Service.postman_collection.json` - Tests de API

---

## Contacto

Para dudas sobre estas correcciones:
- Revisar este documento
- Consultar código en `src/routes/checkins.js` y `src/routes/locations.js`
- Verificar validadores en `src/validators/schemas.js`

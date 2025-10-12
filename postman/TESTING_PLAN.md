# 🧪 Suite de Testing Automatizado - Gangazon Auth Service

## 📋 Credenciales de Testing

### 👨‍💼 **Admin de Testing**
```
Email: testing@gangazon.com
Password: Testing123!
Role: super_admin
Organization ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### 👤 **Empleado de Testing**
```
Email: employee.test@gangazon.com
Password: Employee123!
Role: user
User ID: e5f6a7b8-c9d0-1234-ef01-23456789abcd
```

### 🏢 **Datos de Testing Pre-creados**
```
Franchise ID: c3d4e5f6-a7b8-9012-cdef-123456789012
Location ID: d4e5f6a7-b8c9-0123-def0-123456789abc
Assignment ID: f6a7b8c9-d0e1-2345-f012-3456789abcde
Location GPS: 40.416775, -3.703790 (Puerta del Sol, Madrid)
Max Distance: 100 metros
```

---

## 🎯 Tests Automatizados Recomendados

### 1️⃣ **HEALTH & STATUS TESTS**

#### ✅ Test: Health Check Availability
- **Endpoint:** `GET /health`
- **Expected:** Status 200
- **Validar:**
  - Response time < 500ms
  - Status "ok" en respuesta
  - Timestamp presente

#### ✅ Test: API Base Route
- **Endpoint:** `GET /`
- **Expected:** Status 200
- **Validar:**
  - Mensaje de bienvenida
  - Versión de la API
  - Endpoints disponibles

---

### 2️⃣ **AUTHENTICATION TESTS**

#### ✅ Test: Login Exitoso (Admin)
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "testing@gangazon.com", password: "Testing123!" }`
- **Expected:** Status 200
- **Validar:**
  - Token JWT presente
  - User ID presente
  - Role = "super_admin"
  - Organization ID presente
- **Post-Test:** Guardar token en variable `auth_token`

#### ✅ Test: Login Exitoso (Employee)
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "employee.test@gangazon.com", password: "Employee123!" }`
- **Expected:** Status 200
- **Validar:**
  - Token JWT presente
  - Role = "user"

#### ✅ Test: Login Fallido - Credenciales Incorrectas
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "testing@gangazon.com", password: "WrongPassword123!" }`
- **Expected:** Status 401
- **Validar:**
  - Mensaje de error apropiado
  - No hay token en respuesta

#### ✅ Test: Login Fallido - Usuario No Existe
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "noexiste@gangazon.com", password: "Testing123!" }`
- **Expected:** Status 401

#### ✅ Test: Login Fallido - Email Inválido
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "invalid-email", password: "Testing123!" }`
- **Expected:** Status 400
- **Validar:** Error de validación

#### ✅ Test: Login Fallido - Campos Vacíos
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email: "", password: "" }`
- **Expected:** Status 400

#### ✅ Test: Get User Profile (Autenticado)
- **Endpoint:** `GET /api/auth/profile`
- **Headers:** `Authorization: Bearer {{auth_token}}`
- **Expected:** Status 200
- **Validar:**
  - Email del usuario
  - Nombre completo
  - Role
  - Organization ID

#### ✅ Test: Get Profile Sin Token
- **Endpoint:** `GET /api/auth/profile`
- **Headers:** Sin Authorization
- **Expected:** Status 401

#### ✅ Test: Get Profile Token Inválido
- **Endpoint:** `GET /api/auth/profile`
- **Headers:** `Authorization: Bearer invalid_token_123`
- **Expected:** Status 401

#### ✅ Test: Refresh Token
- **Endpoint:** `POST /api/auth/refresh`
- **Headers:** `Authorization: Bearer {{auth_token}}`
- **Expected:** Status 200
- **Validar:**
  - Nuevo token generado
  - Token diferente al anterior

#### ✅ Test: Register New User (Como Admin)
- **Endpoint:** `POST /api/auth/register`
- **Headers:** `Authorization: Bearer {{auth_token}}`
- **Body:**
```json
{
  "email": "newuser@test.com",
  "password": "NewUser123!",
  "full_name": "New Test User",
  "phone": "+34666777888",
  "role": "user"
}
```
- **Expected:** Status 201
- **Validar:**
  - User ID creado
  - Email correcto
- **Post-Test:** Guardar `new_user_id`

#### ✅ Test: Register - Email Duplicado
- **Endpoint:** `POST /api/auth/register`
- **Body:** Email ya existente
- **Expected:** Status 409 (Conflict)

#### ✅ Test: Register - Password Débil
- **Endpoint:** `POST /api/auth/register`
- **Body:** `{ password: "123" }`
- **Expected:** Status 400
- **Validar:** Mensaje sobre fortaleza de password

#### ✅ Test: Register Sin Autorización
- **Endpoint:** `POST /api/auth/register`
- **Headers:** Sin Authorization
- **Expected:** Status 401

#### ✅ Test: Logout
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer {{auth_token}}`
- **Expected:** Status 200

---

### 3️⃣ **ORGANIZATIONS TESTS**

#### ✅ Test: List Organizations (Admin)
- **Endpoint:** `GET /api/organizations`
- **Headers:** `Authorization: Bearer {{auth_token}}`
- **Expected:** Status 200
- **Validar:**
  - Array de organizaciones
  - Al menos 1 organización presente

#### ✅ Test: Get Organization by ID
- **Endpoint:** `GET /api/organizations/{{organization_id}}`
- **Expected:** Status 200
- **Validar:**
  - ID coincide
  - Nombre presente

#### ✅ Test: Get Organization - ID Inválido
- **Endpoint:** `GET /api/organizations/invalid-uuid`
- **Expected:** Status 400

#### ✅ Test: Get Organization - No Existe
- **Endpoint:** `GET /api/organizations/00000000-0000-0000-0000-000000000000`
- **Expected:** Status 404

#### ✅ Test: List Organizations Sin Autenticación
- **Endpoint:** `GET /api/organizations`
- **Headers:** Sin Authorization
- **Expected:** Status 401

---

### 4️⃣ **FRANCHISES TESTS**

#### ✅ Test: Create Franchise
- **Endpoint:** `POST /api/franchises`
- **Body:**
```json
{
  "name": "Test Franchise Automated",
  "code": "TEST-AUTO-001",
  "address": "Test Street 123",
  "contact_phone": "+34999888777",
  "contact_email": "test@franchise.com"
}
```
- **Expected:** Status 201
- **Validar:**
  - Franchise ID creado
  - Code único
- **Post-Test:** Guardar `test_franchise_id`

#### ✅ Test: Create Franchise - Código Duplicado
- **Endpoint:** `POST /api/franchises`
- **Body:** Mismo `code` que anterior
- **Expected:** Status 409

#### ✅ Test: Create Franchise - Campos Requeridos Faltantes
- **Endpoint:** `POST /api/franchises`
- **Body:** `{ "name": "Only Name" }`
- **Expected:** Status 400

#### ✅ Test: List Franchises
- **Endpoint:** `GET /api/franchises`
- **Expected:** Status 200
- **Validar:**
  - Array de franquicias
  - Franquicia creada está en lista

#### ✅ Test: Get Franchise by ID
- **Endpoint:** `GET /api/franchises/{{test_franchise_id}}`
- **Expected:** Status 200
- **Validar:**
  - Datos coinciden con creación

#### ✅ Test: Update Franchise
- **Endpoint:** `PUT /api/franchises/{{test_franchise_id}}`
- **Body:**
```json
{
  "name": "Test Franchise Updated",
  "contact_phone": "+34999888666"
}
```
- **Expected:** Status 200
- **Validar:**
  - Datos actualizados correctamente

#### ✅ Test: Delete Franchise
- **Endpoint:** `DELETE /api/franchises/{{test_franchise_id}}`
- **Expected:** Status 200 o 204
- **Post-Test:** Verificar que no existe

#### ✅ Test: Get Deleted Franchise
- **Endpoint:** `GET /api/franchises/{{test_franchise_id}}`
- **Expected:** Status 404

#### ✅ Test: Franchise Operations Sin Permisos (Employee)
- **Endpoint:** `POST /api/franchises`
- **Headers:** Token de employee
- **Expected:** Status 403

---

### 5️⃣ **LOCATIONS TESTS**

#### ✅ Test: Create Location
- **Endpoint:** `POST /api/locations`
- **Body:**
```json
{
  "franchise_id": "{{franchise_id}}",
  "name": "Test Location Auto",
  "address": "Test Address 456",
  "latitude": 40.416775,
  "longitude": -3.703790,
  "max_distance_meters": 100
}
```
- **Expected:** Status 201
- **Post-Test:** Guardar `test_location_id`

#### ✅ Test: Create Location - Coordenadas Inválidas
- **Endpoint:** `POST /api/locations`
- **Body:** `{ latitude: 999, longitude: 999 }`
- **Expected:** Status 400

#### ✅ Test: Create Location - Franchise No Existe
- **Endpoint:** `POST /api/locations`
- **Body:** `{ franchise_id: "00000000-0000-0000-0000-000000000000" }`
- **Expected:** Status 404

#### ✅ Test: List Locations by Franchise
- **Endpoint:** `GET /api/locations?franchise_id={{franchise_id}}`
- **Expected:** Status 200
- **Validar:**
  - Solo locations de la franchise especificada

#### ✅ Test: Get Location by ID
- **Endpoint:** `GET /api/locations/{{test_location_id}}`
- **Expected:** Status 200

#### ✅ Test: Update Location
- **Endpoint:** `PUT /api/locations/{{test_location_id}}`
- **Body:** `{ "max_distance_meters": 150 }`
- **Expected:** Status 200

#### ✅ Test: Delete Location
- **Endpoint:** `DELETE /api/locations/{{test_location_id}}`
- **Expected:** Status 200 o 204

---

### 6️⃣ **EMPLOYEE ASSIGNMENTS TESTS**

#### ✅ Test: Create Assignment
- **Endpoint:** `POST /api/assignments`
- **Body:**
```json
{
  "user_id": "{{new_user_id}}",
  "location_id": "{{location_id}}",
  "start_date": "2024-01-15",
  "position": "Test Salesperson"
}
```
- **Expected:** Status 201
- **Post-Test:** Guardar `test_assignment_id`

#### ✅ Test: Create Assignment - Usuario No Existe
- **Endpoint:** `POST /api/assignments`
- **Body:** `{ user_id: "00000000-0000-0000-0000-000000000000" }`
- **Expected:** Status 404

#### ✅ Test: Create Assignment - Location No Existe
- **Endpoint:** `POST /api/assignments`
- **Body:** `{ location_id: "00000000-0000-0000-0000-000000000000" }`
- **Expected:** Status 404

#### ✅ Test: Create Assignment - Fecha Inválida
- **Endpoint:** `POST /api/assignments`
- **Body:** `{ start_date: "invalid-date" }`
- **Expected:** Status 400

#### ✅ Test: List Assignments by Location
- **Endpoint:** `GET /api/assignments?location_id={{location_id}}`
- **Expected:** Status 200

#### ✅ Test: Get Assignment by ID
- **Endpoint:** `GET /api/assignments/{{test_assignment_id}}`
- **Expected:** Status 200

#### ✅ Test: Update Assignment
- **Endpoint:** `PUT /api/assignments/{{test_assignment_id}}`
- **Body:** `{ "position": "Senior Salesperson" }`
- **Expected:** Status 200

#### ✅ Test: End Assignment
- **Endpoint:** `DELETE /api/assignments/{{test_assignment_id}}`
- **Expected:** Status 200

---

### 7️⃣ **EMPLOYEE CHECK-INS TESTS**

#### ✅ Test: Create Check-in - Dentro del Rango GPS
- **Endpoint:** `POST /api/checkins`
- **Body:**
```json
{
  "location_id": "{{location_id}}",
  "latitude": 40.416775,
  "longitude": -3.703790
}
```
- **Expected:** Status 201
- **Post-Test:** Guardar `test_checkin_id`

#### ✅ Test: Create Check-in - Fuera del Rango GPS
- **Endpoint:** `POST /api/checkins`
- **Body:**
```json
{
  "location_id": "{{location_id}}",
  "latitude": 41.0,
  "longitude": -4.0
}
```
- **Expected:** Status 400
- **Validar:** Mensaje sobre distancia

#### ✅ Test: Create Check-in - Ya Tiene Check-in Activo
- **Endpoint:** `POST /api/checkins`
- **Body:** Mismo usuario con check-in activo
- **Expected:** Status 409

#### ✅ Test: Create Check-in - Sin Asignación
- **Endpoint:** `POST /api/checkins`
- **Body:** Usuario sin asignación al location
- **Expected:** Status 403

#### ✅ Test: Get Active Employees at Location
- **Endpoint:** `GET /api/checkins/location/{{location_id}}/active`
- **Expected:** Status 200
- **Validar:**
  - Lista de empleados activos
  - Check-in activo presente

#### ✅ Test: Create Check-out
- **Endpoint:** `POST /api/checkins/{{test_checkin_id}}/checkout`
- **Body:**
```json
{
  "latitude": 40.416775,
  "longitude": -3.703790
}
```
- **Expected:** Status 200
- **Validar:**
  - Checkout timestamp presente
  - Horas trabajadas calculadas

#### ✅ Test: Check-out - Fuera del Rango GPS
- **Endpoint:** `POST /api/checkins/{{test_checkin_id}}/checkout`
- **Body:** Coordenadas fuera de rango
- **Expected:** Status 400

#### ✅ Test: Check-out - Check-in No Existe
- **Endpoint:** `POST /api/checkins/00000000-0000-0000-0000-000000000000/checkout`
- **Expected:** Status 404

#### ✅ Test: Check-out - Ya Tiene Check-out
- **Endpoint:** `POST /api/checkins/{{test_checkin_id}}/checkout`
- **Body:** Segundo check-out
- **Expected:** Status 409

#### ✅ Test: List Check-ins by User
- **Endpoint:** `GET /api/checkins?user_id={{user_id}}`
- **Expected:** Status 200

#### ✅ Test: List Check-ins by Location
- **Endpoint:** `GET /api/checkins?location_id={{location_id}}`
- **Expected:** Status 200

#### ✅ Test: List Check-ins con Date Range
- **Endpoint:** `GET /api/checkins?user_id={{user_id}}&start_date=2024-01-01&end_date=2024-12-31`
- **Expected:** Status 200

---

### 8️⃣ **AUTHORIZATION & PERMISSIONS TESTS**

#### ✅ Test: Employee No Puede Crear Franquicia
- **Endpoint:** `POST /api/franchises`
- **Headers:** Token de employee
- **Expected:** Status 403

#### ✅ Test: Employee No Puede Eliminar Location
- **Endpoint:** `DELETE /api/locations/{{location_id}}`
- **Headers:** Token de employee
- **Expected:** Status 403

#### ✅ Test: Employee Puede Ver Su Perfil
- **Endpoint:** `GET /api/auth/profile`
- **Headers:** Token de employee
- **Expected:** Status 200

#### ✅ Test: Employee Puede Hacer Check-in
- **Endpoint:** `POST /api/checkins`
- **Headers:** Token de employee
- **Expected:** Status 201

#### ✅ Test: Admin Puede Acceder a Todos los Endpoints
- **Endpoint:** Varios endpoints
- **Headers:** Token de admin
- **Expected:** Status 200/201

---

### 9️⃣ **PERFORMANCE & STRESS TESTS**

#### ✅ Test: Response Time - Health Check
- **Validar:** < 100ms

#### ✅ Test: Response Time - Login
- **Validar:** < 500ms

#### ✅ Test: Response Time - List Operations
- **Validar:** < 1000ms

#### ✅ Test: Concurrent Logins
- **Ejecutar:** 10 logins simultáneos
- **Validar:** Todos exitosos

#### ✅ Test: Rate Limiting
- **Ejecutar:** 100+ requests consecutivos
- **Validar:** Rate limit aplicado (si está configurado)

---

### 🔟 **ERROR HANDLING TESTS**

#### ✅ Test: 404 - Ruta No Existe
- **Endpoint:** `GET /api/no-existe`
- **Expected:** Status 404

#### ✅ Test: 405 - Método No Permitido
- **Endpoint:** `DELETE /health`
- **Expected:** Status 405

#### ✅ Test: Malformed JSON
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ invalid json`
- **Expected:** Status 400

#### ✅ Test: Missing Content-Type
- **Endpoint:** `POST /api/auth/login`
- **Headers:** Sin Content-Type
- **Expected:** Status 400 o manejo apropiado

---

## 🎬 Orden de Ejecución Recomendado

```
1. Health & Status Tests
2. Authentication Tests (Login Admin primero)
3. Organizations Tests
4. Franchises Tests (Create → List → Get → Update)
5. Locations Tests (Create → List → Get → Update)
6. Employee Assignments Tests
7. Employee Check-ins Tests (Check-in → List Active → Check-out)
8. Authorization Tests
9. Cleanup Tests (Delete creados durante testing)
10. Performance Tests
```

---

## 📊 Métricas a Validar en Cada Test

### ✅ **Basics:**
- Status code correcto
- Response time aceptable
- Content-Type correcto

### ✅ **Data Validation:**
- Estructura de respuesta correcta
- Tipos de datos correctos
- Campos requeridos presentes

### ✅ **Business Logic:**
- Reglas de negocio aplicadas
- Validaciones funcionando
- Relaciones entre entidades correctas

### ✅ **Security:**
- Autenticación requerida
- Autorización aplicada
- Tokens válidos

---

## 🚀 Total de Tests Recomendados

| Categoría | # Tests |
|-----------|---------|
| Health & Status | 2 |
| Authentication | 13 |
| Organizations | 5 |
| Franchises | 9 |
| Locations | 7 |
| Assignments | 8 |
| Check-ins | 13 |
| Authorization | 5 |
| Performance | 5 |
| Error Handling | 4 |
| **TOTAL** | **71 tests** |

---

## 📝 Notas de Implementación

1. **Variables de Entorno:** Usar las credenciales de testing proporcionadas
2. **Cleanup:** Implementar cleanup después de cada suite
3. **Datos de Prueba:** Usar UUIDs fijos para datos pre-creados
4. **GPS Testing:** Usar coordenadas de Puerta del Sol (40.416775, -3.703790)
5. **Secuencia:** Algunos tests dependen de otros (ej: Create antes de Update)
6. **Idempotencia:** Tests deben poder ejecutarse múltiples veces

---

## 🎯 Implementación en Postman

Para cada test, crear en la pestaña **"Tests"**:

```javascript
// Ejemplo básico
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

pm.test("Has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.expect(jsonData).to.have.property('name');
});
```

# 🚀 Script para Crear Usuario Admin en Producción

## Paso 1: Esperar a que Render termine el deploy
Ir a: https://dashboard.render.com
Esperar a que el servicio `gangazon-auth-service` muestre estado "Live"

## Paso 2: Ejecutar este comando en PowerShell

```powershell
$headers = @{ 
    "Content-Type" = "application/json"
    "x-emergency-token" = "4200003e3b0715150c742166ac9e2fc9d9d173c10e8a141baff60efbf1f0c860" 
}

$body = @{ 
    email = "admin@gangazon.com"
    password = "AdminGangazon2025!"
    firstName = "Admin"
    lastName = "Gangazon"
    role = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://gangazon-auth-service.onrender.com/api/emergency/create-admin" -Method Post -Headers $headers -Body $body
```

## Resultado Esperado:

```json
{
  "message": "Usuario administrador creado exitosamente",
  "user": {
    "id": "uuid-generado",
    "email": "admin@gangazon.com",
    "firstName": "Admin",
    "lastName": "Gangazon",
    "role": "admin",
    "organizationId": "00000000-0000-0000-0000-000000000001"
  },
  "warning": "IMPORTANTE: Desactive este endpoint cambiando ENABLE_EMERGENCY_ENDPOINT=false en producción"
}
```

## Paso 3: Probar Login

```powershell
$loginBody = @{
    email = "admin@gangazon.com"
    password = "AdminGangazon2025!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://gangazon-auth-service.onrender.com/api/auth/login" -Method Post -Headers @{"Content-Type"="application/json"} -Body $loginBody
```

## Paso 4: IMPORTANTE - Desactivar Endpoint de Emergencia

1. Ir a Render Dashboard
2. Seleccionar `gangazon-auth-service`
3. Ir a "Environment"
4. Cambiar `ENABLE_EMERGENCY_ENDPOINT` a `false`
5. Guardar cambios (esto reiniciará el servicio)

## Credenciales del Admin Creado:
- **Email**: admin@gangazon.com
- **Password**: AdminGangazon2025!
- **Rol**: admin

⚠️ **Cambia la contraseña después del primer login**

## Verificar en Supabase:

```sql
SELECT id, email, role, is_active, created_at 
FROM users 
WHERE email = 'admin@gangazon.com';

SELECT id, name, is_active 
FROM organizations 
WHERE name = 'Gangazon';
```

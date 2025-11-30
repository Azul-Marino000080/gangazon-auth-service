# Actualización de Variables de Entorno en Render

## DATABASE_URL - Conexión Directa a Supabase

Para que el servicio de autenticación funcione correctamente en producción, debes actualizar la variable `DATABASE_URL` en Render.

### Pasos:

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Selecciona el servicio `gangazon-auth-service`
3. Ve a la pestaña "Environment"
4. Busca la variable `DATABASE_URL`
5. Actualiza su valor a:

```
postgresql://postgres:Email4-Snowy9-Unviable6-Conceal6-Attentive7@db.ptmspjghbzocwrqmblnk.supabase.co:5432/postgres
```

### Detalles de la conexión:

- **Host**: `db.ptmspjghbzocwrqmblnk.supabase.co` (conexión directa, no pooler)
- **Puerto**: `5432` (puerto estándar de PostgreSQL)
- **Usuario**: `postgres` (NO `postgres.ptmspjghbzocwrqmblnk`)
- **Base de datos**: `postgres`

### ¿Por qué este cambio?

La conexión a través del pooler (`aws-0-eu-west-1.pooler.supabase.com:6543`) causaba errores "Tenant or user not found". La conexión directa es más estable y compatible con el esquema `auth_gangazon`.

### Después de actualizar:

1. Guarda la variable de entorno
2. Render redesplegará automáticamente el servicio
3. Verifica los logs para confirmar que la conexión es exitosa:
   ```
   ✅ Conexión a PostgreSQL/Supabase establecida correctamente
   📂 Esquema activo: auth_gangazon
   ```

### Verificación local:

El archivo `.env` local ya está actualizado con la conexión directa. Puedes probarlo ejecutando:

```bash
npm start
```

Y deberías ver:
```
🚀 Gangazon Auth Service v2.0 iniciado en puerto 10000
✅ Conexión a PostgreSQL/Supabase establecida correctamente
```

---

**Fecha de actualización**: 2024-11-30
**Commit relacionado**: 8f98d39

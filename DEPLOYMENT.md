# Despliegue de PersonalGim en Hostinger VPS

## Arquitectura elegida

La aplicación se despliega en tres contenedores dentro de la misma red Docker:

- **web**: exportación web de Expo servida por Nginx.
- **api**: API Node.js con autenticación JWT y autorización por roles.
- **db**: PostgreSQL 16 para cuentas, socios, sesiones y auditoría.

PostgreSQL no publica ningún puerto hacia Internet. Solo el contenedor `api` puede conectarse a él, y Nginx expone el frontend y reenvía `/api` internamente al API.

Los roles disponibles son:

- `admin`: crea cuentas, administra la aplicación y consulta analítica.
- `monitor`: consulta socios y actividad de la sala, sin permisos administrativos.
- `user`: utiliza sus rutinas, entrenamientos e historial.

## Preparar variables

En Dokploy crea las variables definidas en `.env.example`. Sustituye todos los valores de ejemplo por secretos únicos. Para generar secretos se recomienda una cadena aleatoria de al menos 32 caracteres para `JWT_SECRET` y una contraseña larga para `POSTGRES_PASSWORD`.

La primera vez, `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` crean la cuenta administradora. Después de entrar con esa cuenta, el administrador puede crear accesos de monitor o usuario desde el panel.

Para el despliegue web mantén:

```env
EXPO_PUBLIC_API_URL=/api
```

Al usar una ruta relativa, el frontend, el API y las cookies/tokens permanecen bajo el mismo dominio y no hace falta exponer ni configurar una URL interna de PostgreSQL.

## Dokploy en la VPS

La VPS `srv1865637.hstgr.cloud` ya cuenta con Dokploy. En su panel:

1. Crea un proyecto de tipo **Docker Compose** desde este repositorio.
2. Selecciona `docker-compose.yml` como fichero Compose.
3. Añade las variables de entorno anteriores como secretos de Dokploy; no subas un `.env` al repositorio.
4. Asigna el dominio o subdominio al servicio `web`, puerto interno `80`, y activa HTTPS.
5. Despliega. La inicialización de PostgreSQL aplica `server/db/001-init.sql` en el primer arranque.
6. Comprueba `https://tu-dominio/health` y entra con el administrador inicial.

## Copias y operaciones

- Toma un snapshot de la VPS antes del primer despliegue productivo.
- Programa una copia de seguridad externa de PostgreSQL antes de actualizar contenedores o esquemas.
- No publiques el puerto `5432` ni guardes secretos en archivos versionados.
- La base de datos se conserva en el volumen Docker `postgres_data`; no se elimina al recrear los contenedores mientras no se borre ese volumen.

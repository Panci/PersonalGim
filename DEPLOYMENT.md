# Despliegue de PersonalGim en Hostinger VPS

## Arquitectura elegida

La aplicación se despliega en tres contenedores dentro de la misma red Docker:

- **web**: exportación web de Expo servida por Nginx.
- **api**: API Node.js con autenticación JWT y autorización por roles.
- **db**: PostgreSQL 16 para cuentas, socios, sesiones y auditoría.

PostgreSQL no publica ningún puerto hacia Internet. Solo el contenedor `api` puede conectarse a él, y Nginx expone el frontend y reenvía `/api` internamente al API.

Las imágenes y vídeos de los ejercicios se sirven desde una carpeta persistente de la VPS, montada en `web` en modo lectura. No forman parte del contexto Docker ni de la exportación web. Las URLs existentes `/exercise-library/media/...` no cambian. El manifiesto y el catálogo de texto sí permanecen en Git.

## Primera separación de la librería (antes del siguiente despliegue)

Haz esta preparación mientras sigue funcionando la versión actual. La nueva web exige que estén presentes todos los recursos del manifiesto y no arranca si falta alguno. No despliegues el nuevo Compose hasta completar esta copia.

1. En el equipo que conserva `public/exercise-library/media/`, ejecuta:

   ```powershell
   npm run library:check
   npm run library:pack
   ```

   El paquete queda en `.exercise-library-artifacts/exercise-library.tar.gz`. Consérvalo también en la ubicación de copias de seguridad: los vídeos e imágenes dejan de estar versionados en el estado actual de Git. El historial antiguo no se modifica.

2. Sube ese paquete a una carpeta temporal de la VPS mediante tu acceso SSH/SFTP habitual. Por ejemplo, desde PowerShell, sustituyendo `usuario@servidor` por el acceso real:

   ```powershell
   scp .exercise-library-artifacts/exercise-library.tar.gz usuario@servidor:/tmp/personalgim-exercise-library.tar.gz
   ```

3. En la VPS, descomprime en una carpeta temporal nueva y ejecuta el instalador. Este usa un contenedor Node y no requiere instalar Node en el servidor:

   ```sh
   SOURCE_DIR=$(mktemp -d /tmp/personalgim-library.XXXXXX)
   EXERCISE_LIBRARY_PATH=/opt/personalgim/exercise-library
   mkdir -p "$EXERCISE_LIBRARY_PATH"
   tar -xzf /tmp/personalgim-exercise-library.tar.gz -C "$SOURCE_DIR"
   docker run --rm \
     --mount "type=bind,source=$SOURCE_DIR,target=/input,readonly" \
     --mount "type=bind,source=$EXERCISE_LIBRARY_PATH,target=/output" \
     node:24-alpine node /input/install-library.mjs sync /input /output
   ```

   El instalador comprueba SHA-256 y tamaño de todos los archivos antes de tocar el destino, copia solo los que cambian y conserva recursos anteriores para que sigan funcionando sesiones o versiones antiguas. La primera instalación debe indicar `copied: 3210` para el manifiesto actual (3209 recursos más el manifiesto); una segunda ejecución sin cambios indica `copied: 0`.

4. En Dokploy añade `EXERCISE_LIBRARY_PATH=/opt/personalgim/exercise-library` al entorno del Compose. La ruta debe ser absoluta y pertenecer al mismo servidor que ejecuta `web`. El montaje no crea carpetas vacías automáticamente.

5. Despliega la nueva web. Comprueba una imagen, la reproducción y el desplazamiento de un vídeo, y `/health`. Un archivo inexistente bajo `/exercise-library/` debe devolver `404`, sin devolver el HTML de la aplicación. Nginx conserva las peticiones por rangos para reproducir vídeos.

Si el despliegue falla por un archivo ausente, completa la instalación y vuelve a desplegar. La web anterior y su imagen siguen conteniendo la librería mientras se prepara esta migración; no borres contenedores ni copias anteriores hasta verificarla.

## Despliegues siguientes y cambios de librería

- **Cambios solo de aplicación:** despliega normalmente en Dokploy. La carpeta persistente se reutiliza y los recursos no se reconstruyen, copian ni suben con la web.
- **Cambios de imágenes o vídeos:** genera y sube un nuevo paquete; ejecuta el mismo instalador. No hace falta reconstruir la web si solo cambia el contenido de un archivo con la misma URL.
- **Ejercicios nuevos o cambios de rutas:** instala primero la librería actualizada y después despliega el catálogo de la aplicación. La comprobación de arranque evita publicar una web que referencia archivos ausentes.
- **Copias de seguridad:** incluye `/opt/personalgim/exercise-library` junto con las copias de PostgreSQL. Recrear `web` no borra la carpeta; cambiar de VPS requiere restaurarla.
- **Clon nuevo para desarrollo:** descomprime el paquete y ejecuta `node install-library.mjs sync <carpeta-del-paquete> <repo>/public/exercise-library`. Después usa `npm run web` para servir los recursos locales. `npm run build:web` genera siempre una exportación sin la librería; las vistas previas de esa exportación deben servir `/exercise-library/` desde la carpeta local por separado.

Los paquetes se transfieren únicamente cuando se actualiza la librería; el instalador evita recopiarlos dentro del servidor cuando no cambian. Para evitar también transferencias completas en actualizaciones frecuentes, puede sincronizarse la carpeta por SSH con `rsync --checksum` desde un equipo que disponga de rsync, conservando los archivos antiguos (sin `--delete`). La extracción inicial de un paquete de respaldo permite recuperar los recursos sin volver a descargarlos de su proveedor.

Los roles disponibles son:

- `admin`: crea cuentas, administra la aplicación y consulta analítica.
- `monitor`: consulta socios y actividad de la sala, sin permisos administrativos.
- `user`: utiliza sus rutinas, entrenamientos e historial.

## Preparar variables

En Dokploy crea las variables definidas en `.env.example`. Sustituye todos los valores de ejemplo por valores propios. Para generar secretos se recomienda una cadena aleatoria de al menos 32 caracteres para `JWT_SECRET` y una contraseña larga para `POSTGRES_PASSWORD`. El `BOOTSTRAP_ADMIN_PIN` debe ser un PIN numérico de exactamente 4 dígitos.

La primera vez, `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PIN` crean la cuenta administradora. Después de entrar con esa cuenta, el administrador puede crear accesos de monitor o usuario desde el panel.

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

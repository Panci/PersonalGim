# PersonalGim

Aplicación personal de gimnasio desarrollada con Expo.

## Web y librería de ejercicios independientes

`npm run build:web` exporta la aplicación sin copiar los vídeos e imágenes de `public/exercise-library/media/`. Docker también excluye estos archivos del contexto de construcción. El catálogo de ejercicios sigue incluido en la aplicación; las URLs `/exercise-library/media/...` se conservan.

La librería se mantiene en `/opt/personalgim/exercise-library` en la VPS y se monta en Nginx en modo lectura. Se instala una vez y se actualiza únicamente cuando cambian los recursos, sin volver a construir la web. `npm run library:check` valida la copia local y `npm run library:pack` prepara un paquete independiente con comprobaciones SHA-256. Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para la primera migración y las actualizaciones.

Los recursos locales están ignorados por Git y siguen disponibles con `npm run web`. En un clon nuevo, restaura `media/` desde el paquete de la librería antes de probar ejercicios en local. El manifiesto y el catálogo de texto siguen versionados; no se reescribe el historial anterior de Git.

## Marca roja

La compilación Docker publica por defecto el rojo de referencia (`#FF0000`) y el logo adaptado `assets/personalgim-logo-red.png`. «Realizar», «Finalizar Entrenamiento» y su confirmación aparecen en rojo con texto blanco; «Realizada» y el fondo de su fila mantienen el verde. El peso y las repeticiones completadas usan el naranja de referencia (`#FF7E00`), y el aviso de descanso suena a cinco segundos. `EXPO_PUBLIC_BRAND_THEME=green` permite recuperar la marca verde al volver a compilar. Para desarrollo con Expo, configura `EXPO_PUBLIC_BRAND_THEME=red` en `.env.local`; ese archivo permanece ignorado.

## Historial y valores personales de las rutinas

Los pesos, repeticiones y series se conservan al confirmar la edición de una serie durante el entrenamiento. La siguiente sesión utiliza esos valores con las series pendientes de realizar. Los entrenamientos finalizados se guardan en el dispositivo y se sincronizan con la cuenta; si falla la conexión, se reintenta al volver a la aplicación, recuperar la conexión web o tocar el aviso del historial. Las peticiones repetidas no duplican sesiones.

Durante el entrenamiento, el botón «Realizar» aparece en rojo y pasa a verde al completar la serie. Los campos de peso y repeticiones de las series completadas tienen el fondo naranja de referencia (`#FF7E00`).

El descanso emite un pitido cuando quedan cinco segundos y dos pitidos al finalizar la cuenta atrás. Pausar y reanudar no repite el aviso de cinco segundos; omitir el descanso no activa el aviso final.

El almacenamiento local se separa por cuenta. La primera cuenta que utiliza esta actualización conserva la copia local anterior, incluidos los entrenamientos pendientes de sincronizar. El catálogo integrado se reconstruye desde la aplicación; solo se guardan sus favoritos y los ejercicios personalizados, para dejar espacio al historial.

Esta corrección requiere actualizar tanto la web como la API en Dokploy. Las comprobaciones locales se ejecutan con `node --test src/db/database.web.test.js src/db/database.native.test.js src/store/workoutStore.test.js src/utils/routineProgress.test.js src/components/workout/RestTimerBar.test.js server/tests/workout-sync.test.js server/tests/workout-postgres.test.js` y `npx tsc --noEmit`. La prueba de la API de producción utiliza el codificador real de PostgreSQL con una base simulada; no sustituye la comprobación posterior al despliegue contra PostgreSQL.

## Cuotas y avisos por WhatsApp

La pestaña **Cuotas y Pagos** guarda una cuota y su vencimiento por socio. Al registrar un pago, se conserva el historial y el próximo vencimiento avanza un mes. Si pasan cinco días desde la fecha de vencimiento sin registrar el pago, la API bloquea el inicio de sesión y las peticiones del socio; al poner al día los pagos vencidos, el acceso se recupera.

Para los avisos automáticos, configura en el entorno de la API `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE` y `WHATSAPP_GRAPH_API_VERSION`. La plantilla de Meta debe estar aprobada como mensaje de utilidad y tener tres variables de texto en el cuerpo, en este orden: nombre del socio, importe de la cuota y fecha del vencimiento. El nombre predeterminado es `cuota_recordatorio` y el idioma `es_ES`. Guarda la configuración en el entorno del servidor; no en la aplicación cliente. Antes de activar el aviso para un socio, obtén su autorización para recibir mensajes por WhatsApp y registra en su ficha una referencia breve al documento y fecha donde consta. La API no envía avisos sin esa referencia y su fecha de registro. Conserva el documento original conforme a tu política de privacidad; la nota de la aplicación por sí sola no demuestra que el socio haya autorizado los mensajes.

La tarea se ejecuta en la API durante el día que faltan dos días para el vencimiento y reintenta hasta tres veces si Meta devuelve un error. Cuando no hay credenciales configuradas, los avisos quedan desactivados y el panel lo muestra.

Antes de activar bloqueos por impago con socios reales, informa de la fecha de cobro y del plazo de cinco días en las condiciones de inscripción, revisa los pagos pendientes de conciliación y establece una vía de revisión humana para incidencias. El administrador puede corregir el vencimiento o registrar el pago para restablecer el acceso. Las credenciales de WhatsApp configuradas no prueban que la plantilla esté aprobada ni que el envío funcione; verifica ambos extremos con Meta antes de usar el servicio.

## Pendientes antes de usar cuotas con socios reales

Revisión realizada el 24/09/2026. El código pasó la compilación web, TypeScript y una prueba aislada de permisos, consentimiento, bloqueo y recuperación tras el pago. La migración no se probó contra PostgreSQL de producción y no se hizo ningún envío real de WhatsApp.

- [ ] **Condiciones de inscripción:** indicar importe y fecha de cobro, plazo de cinco días, consecuencias del impago y cómo reclamar o acreditar un pago pendiente de conciliación. Revisar con asesoramiento jurídico si el bloqueo automático requiere garantías adicionales de intervención humana.
- [ ] **Privacidad:** publicar y entregar a los socios información sobre responsable, fines y base jurídica, destinatarios (incluido Meta si se usa WhatsApp), posibles transferencias internacionales, conservación y ejercicio de derechos. Definir una política de conservación para historial de pagos, avisos y auditoría.
- [ ] **WhatsApp:** configurar la cuenta Business Cloud API y una plantilla aprobada; probar un envío con un número autorizado. Obtener y conservar la autorización original de cada socio, registrar su referencia en la ficha y atender la retirada de autorización. Hasta entonces, mantener vacías las credenciales de WhatsApp en el servidor.
- [ ] **Acceso administrativo:** sustituir el PIN de cuatro dígitos por una autenticación más robusta, planificando la transición de las cuentas ya existentes. Revisar las 11 alertas moderadas detectadas en dependencias del cliente el 24/09/2026; la auditoría del servidor no mostró alertas.
- [ ] **Despliegue:** hacer copia de seguridad de PostgreSQL, comprobar la migración y las cuentas existentes, desplegar desde Dokploy, y revisar después el acceso de administrador y socio, la sección de cuotas y las cabeceras de seguridad de la web. Subir cambios a GitHub no despliega por sí solo.

Referencias: [deber de informar (AEPD)](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/6-el-deber-de-informacion/FAQ-0217-que-informacion-debe-facilitarse-cuando-los-datos-se-obtengan-directamente-del-afectado), [decisiones automatizadas (AEPD)](https://www.aepd.es/derechos-y-deberes/conoce-tus-derechos/derecho-no-ser-objeto-de-decisiones-individuales) y [política de WhatsApp Business](https://whatsappbusiness.com/policy/).

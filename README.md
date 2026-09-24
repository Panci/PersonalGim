# PersonalGim

Aplicación personal de gimnasio desarrollada con Expo.

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

# PersonalGim

Aplicación personal de gimnasio desarrollada con Expo.

## Cuotas y avisos por WhatsApp

La pestaña **Cuotas y Pagos** guarda una cuota y su vencimiento por socio. Al registrar un pago, se conserva el historial y el próximo vencimiento avanza un mes. Si pasan cinco días desde la fecha de vencimiento sin registrar el pago, la API bloquea el inicio de sesión y las peticiones del socio; al poner al día los pagos vencidos, el acceso se recupera.

Para los avisos automáticos, configura en el entorno de la API `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE` y `WHATSAPP_GRAPH_API_VERSION`. La plantilla de Meta debe estar aprobada como mensaje de utilidad y tener tres variables de texto en el cuerpo, en este orden: nombre del socio, importe de la cuota y fecha del vencimiento. El nombre predeterminado es `cuota_recordatorio` y el idioma `es_ES`. Guarda la configuración en el entorno del servidor; no en la aplicación cliente. Antes de activar el aviso para un socio, obtén su autorización para recibir mensajes por WhatsApp y registra en su ficha una referencia breve al documento y fecha donde consta. La API no envía avisos sin esa referencia y su fecha de registro. Conserva el documento original conforme a tu política de privacidad; la nota de la aplicación por sí sola no demuestra que el socio haya autorizado los mensajes.

La tarea se ejecuta en la API durante el día que faltan dos días para el vencimiento y reintenta hasta tres veces si Meta devuelve un error. Cuando no hay credenciales configuradas, los avisos quedan desactivados y el panel lo muestra.

Antes de activar bloqueos por impago con socios reales, informa de la fecha de cobro y del plazo de cinco días en las condiciones de inscripción, revisa los pagos pendientes de conciliación y establece una vía de revisión humana para incidencias. El administrador puede corregir el vencimiento o registrar el pago para restablecer el acceso. Las credenciales de WhatsApp configuradas no prueban que la plantilla esté aprobada ni que el envío funcione; verifica ambos extremos con Meta antes de usar el servicio.

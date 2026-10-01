# Biblioteca de ejercicios importada

Contenido descargado con autorización del autor para un trabajo de investigación.

- Fuente: https://smartworkout.app/es/biblioteca-ejercicios
- Proveedor de los recursos: SmartWorkout
- Manifiesto completo: `manifest.json`
- Recursos multimedia: `media/`
- Script reproducible: `scripts/scrape-smartworkout.mjs`

La importación conserva la URL de origen de cada ficha, las indicaciones de ejecución,
consejos, errores comunes, imágenes y el vídeo de movimiento cuando estaba disponible.

`media/` se conserva localmente y está excluido de Git y de la imagen Docker de la
web. En producción se sirve desde una carpeta persistente de la VPS, manteniendo
las rutas `/exercise-library/media/...`. El manifiesto sigue versionado junto con
el catálogo de texto. Consulta `DEPLOYMENT.md` para instalar el paquete separado.

# Revisión de la clasificación de ejercicios — 1 de octubre de 2026

Estado: corregido y publicado en producción con `2527e0b`, verificado el 1 de octubre de 2026.

Se comprueban los datos anatómicos originales de los 812 ejercicios del catálogo SmartWorkout y se contrastan nombres, instrucciones y descripciones en los movimientos compuestos y las variantes ambiguas. Se corrigen 174 grupos principales y 471 listas de músculos secundarios. Las 3209 imágenes y vídeos, los identificadores y sus rutas se conservan.

## Criterio

Cada ejercicio aparece en el grupo de su objetivo principal. Los músculos secundarios se conservan sin duplicar el principal. La clasificación anatómica reconoce correctamente bíceps femoral, semimembranoso, semitendinoso, aductores, glúteo medio, trapecio, erectores espinales y oblicuos. Los índices del proveedor se interpretan como énfasis relativo, no como porcentajes medidos de activación.

Los movimientos compuestos y nombres ambiguos tienen decisiones explícitas por identificador en `src/data/exerciseClassificationOverrides.json`. Por ejemplo: curl nórdico = isquiotibiales; Nordic inverso = cuádriceps; almeja de pecho = pectoral; concha de cadera = abductores. Los flexores de cadera iliopsoas y sartorio conservan sus datos de origen sin etiquetarlos falsamente como cuádriceps. Las actividades cardiovasculares puras tienen el grupo Cardio; una etiqueta CARDIO por sí sola no convierte un ejercicio de fuerza o abdominales en cardio.

## Recuento por grupo

| Grupo | Ejercicios |
| --- | ---: |
| pectoral | 99 |
| antebrazo | 30 |
| cardio | 16 |
| dorsales | 88 |
| hombros | 108 |
| trapecio | 15 |
| oblicuos | 40 |
| lumbares | 9 |
| abdomen | 69 |
| isquiotibiales | 34 |
| adductores | 11 |
| pantorrillas | 20 |
| cuadriceps | 101 |
| gluteos | 48 |
| abductores | 9 |
| biceps | 54 |
| triceps | 61 |

## Mantenimiento

- Auditoría completa: [exercise-classification-audit.csv](docs/exercise-classification-audit.csv).
- `npm run library:classify` reconstruye los grupos y los datos de la aplicación a partir del manifiesto, sin descargar ni modificar medios.
- La importación aplica el mismo clasificador y conserva `sourceMuscles` para futuras revisiones.
- Los 17 filtros tienen etiquetas y una categoría; aductores y abductores ya son seleccionables.
- SQLite actualiza la clasificación de los ejercicios existentes conservando favoritos, ejercicios propios y rutinas. La web utiliza el catálogo actualizado conservando los datos del usuario.

## Comprobaciones

Pruebas de catálogo completo, ejemplos ambiguos, conservación de datos en web y SQLite, tipado TypeScript, exportación web e integridad de los 3209 medios. Verificación visual local y en producción de los grupos que antes quedaban vacíos y de la reproducción de vídeo. En producción se comprobaron los 17 recuentos del filtro, los 11 ejercicios de Aductores y los 9 de Abductores, con sus imágenes cargadas y un vídeo reproducido. Las rutinas existentes de la cuenta de comprobación se conservan.

La aplicación publicada utiliza el catálogo corregido. Las imágenes y vídeos del servidor se reutilizan desde el almacenamiento independiente, sin copiarlos ni subirlos de nuevo.

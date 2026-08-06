# Retirada segura de Storage documental

La primera versión de MatriculaPro no permite subir PDF, fotografías ni otros archivos. La migración `202608050007_retire_document_storage.sql` elimina las políticas de escritura autenticada conocidas del bucket histórico `case-documents`, instala un trigger que rechaza cualquier escritura `anon`/`authenticated` aunque exista una política permisiva heredada y bloquea nuevos metadatos de archivo en `case_documents`.

La migración no borra objetos ni el bucket. Mantiene la política de lectura privada existente para que cada titular pueda recuperar sus objetos históricos. El `service_role` conserva sus facultades administrativas propias de Supabase y debe permanecer exclusivamente en backend.

Antes de eliminar definitivamente el bucket en un entorno existente:

1. Cuenta y exporta los objetos con una tarea administrativa autenticada con `service_role`.
2. Contrasta cada ruta con `case_documents.storage_path` y conserva el registro exigible.
3. Define y aprueba la política de conservación y supresión.
4. Obtén confirmación expresa del propietario para eliminar los objetos.
5. Borra primero los objetos, verifica que el bucket esté vacío y solo entonces elimina el bucket.

No ejecutes una eliminación masiva desde una migración automática: podría destruir documentación histórica sin posibilidad de recuperación.

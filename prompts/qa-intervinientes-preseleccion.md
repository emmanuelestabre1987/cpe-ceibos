# Agente: QA | Rama: `dev`

Revisá y testeá la funcionalidad de preselección de roles opcionales en la sección Intervinientes, implementada en la rama `dev`.

## Qué se implementó

En `src/pages/NewRecord.tsx` y `src/pages/EditRecord.tsx`, la sección "Intervinientes (Sección A)" ahora tiene un sistema de toggles (pills) para mostrar u ocultar campos opcionales. Los 8 roles opcionales son:

- Rte. Venta Primaria
- Rte. Venta Secundaria
- Rte. Venta Sec. 2
- Mercado a Término
- Corredor Primario
- Corredor Secundario
- Rep. Entregador
- Rep. Recibidor

## Casos a verificar

**Comportamiento base**
- [ ] Al entrar al Step 2 (Intervinientes) todos los toggles están desactivados y no se ve ningún campo opcional
- [ ] Los campos fijos siempre visibles están presentes: Titular, Remitente Comercial, Destinatario, Destino, Flete Pagador, Intermediario de Flete

**Activar roles**
- [ ] Al tocar un toggle el pill cambia a color azul (`#2C9FC0`) y aparecen los campos correspondientes debajo
- [ ] Cada rol muestra exactamente sus dos campos (CUIT + nombre), excepto Mercado a Término que tiene solo uno
- [ ] Los campos aparecen en el orden correcto (mismo que antes de la implementación)

**Desactivar roles**
- [ ] Al desactivar un toggle los campos desaparecen y el pill vuelve al estado inactivo
- [ ] Los valores cargados en esos campos se limpian del estado (verificar que al reactivar el toggle los campos aparecen vacíos)

**EditRecord**
- [ ] El mismo comportamiento funciona en la pantalla de edición (`/registro/:id/editar`)
- [ ] Al editar un registro que ya tenía roles cargados, los toggles correspondientes se activan automáticamente y los campos muestran los valores existentes

**Regresión**
- [ ] Los campos fijos (Titular, Destinatario, etc.) siguen funcionando con autocompletado de CUIT
- [ ] El flujo completo de guardado incluye los campos opcionales completados en el payload
- [ ] No hay errores en consola al activar/desactivar roles

## Archivos involucrados

- `src/pages/NewRecord.tsx` — líneas 75–84 (ROLES_OPCIONALES), 162–173 (clearRolFields), 367–424 (render)
- `src/pages/EditRecord.tsx` — misma estructura

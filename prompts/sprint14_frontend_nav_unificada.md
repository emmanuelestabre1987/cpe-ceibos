# PROMPT — Agente Frontend: Sprint 14 · Navegación unificada DetalleCupo + fix botón

Repo: `C:\Users\Emmanuel Estabre\Desktop\Cpe_ceibos`.

Leé antes de empezar:
- `src/pages/DetalleCupo.tsx` — tabs, BottomBar por tab, handleSave* por sección
- `src/pages/NewRecord.tsx` — referencia de navegación: "Anterior" + "Guardar y continuar"

---

## Contexto

NewRecord tiene navegación wizard: botón "Anterior" (izquierda) + "Guardar y continuar" (derecha).
DetalleCupo tiene TabBar arriba + "Guardar cambios" en el fondo sin navegación entre tabs.
El usuario quiere que DetalleCupo tenga exactamente la misma experiencia de navegación que NewRecord.

Además, el botón "Guardar y continuar" está cortando el texto en dos líneas. Hay que forzarlo a una sola.

---

## TAREA 1 — Fix texto "Guardar y continuar" en una sola línea

En **ambos archivos** (NewRecord.tsx y DetalleCupo.tsx), en el botón "Guardar y continuar":

- Agregar `whitespace-nowrap` a la className
- Cambiar el tamaño de texto a `text-sm` si no lo tiene ya
- El ícono `<ChevronRight>` va inline, mismo renglón que el texto

Resultado esperado:
```tsx
<Button onClick={...} loading={saving} className="flex-1 whitespace-nowrap text-sm">
  Guardar y continuar <ChevronRight className="w-4 h-4 inline-block" />
</Button>
```

---

## TAREA 2 — Reemplazar navegación de DetalleCupo

### Orden de tabs (sin historial)
```
1. transporte
2. intervinientes
3. grano
4. procedencia
5. contingencias
6. descarga
```
`historial` es solo lectura, no entra en la secuencia de navegación wizard.

### Nueva lógica del BottomBar

Reemplazar los BottomBar individuales por un único BottomBar condicional al final del JSX:

```tsx
{activeTab !== 'historial' && (
  <BottomBar>
    <div className="flex gap-3">
      {activeTab !== 'transporte' && (
        <Button
          variant="ghost"
          className="flex-1"
          onClick={() => {
            const idx = EDITABLE_TABS.indexOf(activeTab as EditableTabId)
            if (idx > 0) setActiveTab(EDITABLE_TABS[idx - 1])
          }}
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </Button>
      )}
      <Button
        className="flex-1 whitespace-nowrap text-sm"
        loading={saving}
        onClick={handleGuardarYContinuar}
      >
        {activeTab === 'descarga' ? 'Guardar' : <>Guardar y continuar <ChevronRight className="w-4 h-4 inline-block" /></>}
      </Button>
    </div>
  </BottomBar>
)}
```

### Constante de tabs editables

Agregar junto a `VALID_TABS`:

```ts
type EditableTabId = 'transporte' | 'intervinientes' | 'grano' | 'procedencia' | 'contingencias' | 'descarga'
const EDITABLE_TABS: EditableTabId[] = ['transporte', 'intervinientes', 'grano', 'procedencia', 'contingencias', 'descarga']
```

### Handler `handleGuardarYContinuar`

Llama al handler de guardado del tab activo y luego avanza al siguiente tab:

```ts
const handleGuardarYContinuar = async () => {
  switch (activeTab) {
    case 'transporte':     await handleSaveTransporte();     break
    case 'intervinientes': await handleSaveIntervinientes(); break
    case 'grano':          await handleSaveGrano();          break
    case 'procedencia':    await handleSaveProcedencia();    break
    case 'contingencias':  await handleSaveContingencias();  break
    case 'descarga':       await handleSaveDescarga();       break
  }
  const idx = EDITABLE_TABS.indexOf(activeTab as EditableTabId)
  if (idx >= 0 && idx < EDITABLE_TABS.length - 1) {
    setActiveTab(EDITABLE_TABS[idx + 1])
  }
}
```

Importante: los handlers individuales (`handleSaveTransporte`, etc.) ya existen — no modificarlos, solo llamarlos desde acá.

### Eliminar los BottomBar individuales

Quitar todos los bloques:
```tsx
{activeTab === 'transporte' && (<BottomBar>...</BottomBar>)}
{activeTab === 'intervinientes' && (<BottomBar>...</BottomBar>)}
// etc.
```

Reemplazarlos por el único BottomBar unificado descrito arriba.

### Imports adicionales necesarios

```tsx
import { ChevronLeft, ChevronRight, ... } from 'lucide-react'
```

Verificar que `ChevronLeft` y `ChevronRight` estén en el import de lucide-react.

---

## Criterios de aceptación

- [ ] "Guardar y continuar" en una sola línea en NewRecord y DetalleCupo
- [ ] DetalleCupo: tab `transporte` muestra solo "Guardar y continuar" (sin Anterior)
- [ ] DetalleCupo: tabs 2-5 muestran "Anterior" + "Guardar y continuar"
- [ ] DetalleCupo: tab `descarga` muestra "Anterior" + "Guardar"
- [ ] DetalleCupo: tab `historial` no muestra BottomBar
- [ ] Al presionar "Guardar y continuar" guarda los datos del tab actual Y navega al siguiente
- [ ] La TabBar superior sigue funcionando para navegación directa
- [ ] `npm run build` pasa sin errores TypeScript
- [ ] No se modifica ningún otro archivo

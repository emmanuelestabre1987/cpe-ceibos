# QA Report — CPE Campo (Avancargo)

**Fecha:** 2026-05-07  
**Revisor:** QA Engineer (Claude)  
**Prioridad principal:** estabilidad en campo con mala señal

---

## Resumen ejecutivo

Se revisaron los 20 archivos de `src/`. Se encontraron **9 problemas**, de los cuales **3 son críticos** (causan cuelgue o pantalla en blanco ante un error de red). Todos los issues fueron corregidos en el mismo pase.

---

## Issues encontrados y corregidos

### CRÍTICO — Cuelgue infinito en `useAuth.ts` (línea 10)

**Archivo:** `src/hooks/useAuth.ts`  
**Problema:** `supabase.auth.getSession()` no tenía `.catch()`. Si la sesión fallaba por red, `setLoading(false)` nunca se ejecutaba y toda la app quedaba trabada en pantalla blanca.  
**Impacto en campo:** Con señal intermitente, la app no cargaba nunca tras el primer intento fallido.

```ts
// ANTES
supabase.auth.getSession().then(({ data }) => {
  setUser(data.session?.user ?? null)
  setLoading(false)
})

// DESPUÉS
supabase.auth.getSession()
  .then(({ data }) => {
    setUser(data.session?.user ?? null)
    setLoading(false)
  })
  .catch(() => {
    setLoading(false)
  })
```

---

### CRÍTICO — Cuelgue infinito en `EditRecord.tsx` (línea 31)

**Archivo:** `src/pages/EditRecord.tsx`  
**Problema:** `getRecord(id)` no tenía manejo de error. Si fallaba, `setLoading(false)` nunca se ejecutaba y el skeleton de "Cargando…" era permanente. Además, cuando el registro no existía y `loading=false`, `form=null` mostraba igualmente el skeleton con título "Cargando…" en lugar de un mensaje de error.  
**Corrección:**
- Agregado `.catch()` que llama a `setLoadError()` y `setLoading(false)`.
- Agregado estado `loadError`.
- Separados los casos `loading`, `loadError || !form` (nuevo: muestra mensaje de error), y form cargado exitosamente.

---

### CRÍTICO — Cuelgue infinito en `RecordDetail.tsx` (línea 123)

**Archivo:** `src/pages/RecordDetail.tsx`  
**Problema:** `Promise.all([getRecord(id), null])` no tenía `.catch()`. Si `getRecord` o `getAuditLog` fallaban, `setLoading(false)` nunca se ejecutaba.  
**Nota adicional:** `Promise.all([getRecord(id), null])` pasaba `null` como segundo elemento sin ningún propósito — simplificado a `getRecord(id).then(async (rec) => {...})`.  
**Corrección:** Reescrito con `.then().catch()` limpio; al fallar, `setLoading(false)` permite mostrar la pantalla de "Registro no encontrado".

---

### ALTO — Falta de error handling en `Admin.tsx` (línea 50)

**Archivo:** `src/pages/Admin.tsx`  
**Problema:** Las tres cargas de datos (`getAuthorizedEmails`, `getAllAuditLog`, `getRecords`) no tenían `.catch()`. En caso de error de red, el panel de admin mostraba todo vacío sin ninguna indicación.  
**Corrección:** Agregado `.catch()` con toast de error en cada llamada.

```ts
// ANTES
getAuthorizedEmails().then(setEmails)
getAllAuditLog().then(setLogs)
getRecords().then(setRecords)

// DESPUÉS
getAuthorizedEmails().then(setEmails).catch(() => show('Error al cargar usuarios', 'error'))
getAllAuditLog().then(setLogs).catch(() => show('Error al cargar logs', 'error'))
getRecords().then(setRecords).catch(() => show('Error al cargar registros', 'error'))
```

---

### ALTO — Audit entry no atómica en `storage.ts` (línea 58)

**Archivo:** `src/lib/storage.ts`  
**Problema:** En `createRecord()`, si el INSERT al registro de CPE tenía éxito pero `addAuditEntry()` fallaba (ej. segunda request en señal baja), el error se propagaba al caller y el usuario veía un mensaje de falla — aunque el registro **ya estaba guardado en la base**. El usuario podría reintentar y crear un duplicado.  
**Corrección:** `addAuditEntry` ahora está envuelta en `try/catch`. Un fallo de auditoría no cancela el guardado del registro.

```ts
// DESPUÉS — el record ya fue guardado, el audit es secundario
try {
  await addAuditEntry({ ... })
} catch {
  // Audit failure must not roll back a successful record save
}
```

---

### ALTO — Crash en `voice.ts` con resultado vacío (línea 25)

**Archivo:** `src/lib/voice.ts`  
**Problema:** `event.results[0][0].transcript` accedía sin guardia. Si el motor de voz devolvía un evento `onresult` sin alternativas (posible en Android con baja calidad de audio), la app crasheaba con `TypeError: Cannot read properties of undefined`.  
**Corrección:**

```ts
// ANTES
recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript as string
  onResult(transcript)
}

// DESPUÉS
recognition.onresult = (event: any) => {
  const result = event.results?.[0]?.[0]
  if (!result) return
  onResult(result.transcript as string)
}
```

---

### MEDIO — Import duplicado en `Login.tsx` (líneas 1 y 8)

**Archivo:** `src/pages/Login.tsx`  
**Problema:** `React` y `useState` se importaban en línea 1, y `useEffect` en un import separado en línea 8. Funciona pero es un error de organización y confunde al linter.  
**Corrección:** Fusionados en un único import.

```ts
// ANTES
import React, { useState } from 'react'
// ... otras líneas ...
import { useEffect } from 'react'

// DESPUÉS
import React, { useState, useEffect } from 'react'
```

---

### MEDIO — Conteo incorrecto de usuarios únicos en `Admin.tsx` (línea 93)

**Archivo:** `src/pages/Admin.tsx`  
**Problema:** `created_by` es `string | null`. `new Set(records.map(r => r.created_by))` incluía `null` como elemento, inflando el conteo de "Usuarios activos" en +1.  
**Corrección:**

```ts
// ANTES
const uniqueUsers = new Set(records.map((r) => r.created_by)).size

// DESPUÉS
const uniqueUsers = new Set(records.map((r) => r.created_by).filter(Boolean)).size
```

---

## Lo que NO necesitaba cambios

| Área | Estado |
|------|--------|
| `src/lib/supabase.ts` | ✅ Variables de entorno validadas correctamente con `throw` si faltan |
| `src/lib/voice.ts` — soporte de navegador | ✅ `isVoiceSupported()` chequea ambos `SpeechRecognition` y `webkitSpeechRecognition`; `startVoiceRecognition()` retorna early con `onError` si no hay soporte |
| `src/lib/storage.ts` — patrón `if (error) throw error` | ✅ Correcto para Supabase JS SDK: los errores de red siempre llegan como el campo `error`, no como excepciones lanzadas |
| `src/lib/auth.ts` — `isAdmin()` sin throw en error | ✅ Degradación segura: si no se puede verificar admin, se deniega acceso (retorna `false`) |
| `src/hooks/useRecords.ts` | ✅ Tiene try/catch completo con estado `error` |
| `src/hooks/useVoice.ts` | ✅ Verifica `isVoiceSupported()` antes de iniciar |
| `src/components/forms/GPSInput.tsx` | ✅ Maneja `!navigator.geolocation` y el callback de error |
| Todos los imports | ✅ Sin imports rotos ni faltantes |
| TypeScript `any` en voice.ts | ✅ Justificado: la API WebKit SpeechRecognition no está en los tipos del DOM estándar |

---

## Tabla de severidad

| # | Archivo | Severidad | Tipo | Estado |
|---|---------|-----------|------|--------|
| 1 | `hooks/useAuth.ts:10` | CRÍTICO | Cuelgue al fallar getSession | ✅ Corregido |
| 2 | `pages/EditRecord.tsx:31` | CRÍTICO | Cuelgue + "no encontrado" sin feedback | ✅ Corregido |
| 3 | `pages/RecordDetail.tsx:123` | CRÍTICO | Cuelgue al fallar getRecord/getAuditLog | ✅ Corregido |
| 4 | `pages/Admin.tsx:50` | ALTO | Datos vacíos sin feedback en error de red | ✅ Corregido |
| 5 | `lib/storage.ts:58` | ALTO | Audit failure puede parecer save failure | ✅ Corregido |
| 6 | `lib/voice.ts:25` | ALTO | Crash con resultado de voz vacío | ✅ Corregido |
| 7 | `pages/Login.tsx:1,8` | MEDIO | Import duplicado de React | ✅ Corregido |
| 8 | `pages/Admin.tsx:93` | MEDIO | null en uniqueUsers infla el conteo | ✅ Corregido |

---

*Total: 8 issues corregidos — 3 críticos, 3 altos, 2 medios.*

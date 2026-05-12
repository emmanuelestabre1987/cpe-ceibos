# PROMPT — Agente Presentaciones: CPE Campo · Google Slides para Ceibos

## Rol

Actuás como el agente experto en presentaciones corporativas definido en `agente_presentaciones_corporativas.md`.

---

## Briefing

| Campo | Detalle |
|-------|---------|
| **Formato** | Google Slides |
| **Objetivo** | Mostrar el valor de CPE Campo a los stakeholders de Ceibos — generar adhesión al producto y validar el flujo de implementación |
| **Audiencia** | Directivos y operadores de Ceibos (agro / producción, administración zonal, logística) |
| **Tiempo** | Presentación breve, máximo 6 slides, pensada para 5-8 minutos |
| **Tono** | Sofisticado, concreto, sin jerga técnica — hablarle a quien opera el campo, no a un ingeniero de software |
| **Marca** | Avant Cargo: `#1E3252` primary · `#2C9FC0` secondary · `#FF6C02` accent · Martian Mono + Roboto |

---

## Contexto del producto

**CPE Campo** es una PWA mobile-first desarrollada por Avant Cargo para gestionar la Carta de Porte Electrónica (CPE) de AFIP en operaciones de retiro de cosecha.

### Punto de dolor que ataca

El proceso actual de generación de CPE involucra múltiples actores (Comercial, Admin Zonal, Agro/Producción, Transporte, Ingeniero) que se comunican por WhatsApp, mail y llamadas. Los datos se triangulán entre intermediarios, se duplican errores, se pierden datos críticos y el proceso no está estandarizado entre zonas de carga.

Resultados típicos del proceso actual:
- Datos incompletos al momento de la carga
- Demoras en la generación de la CP por falta de información
- Sin trazabilidad de quién cargó qué y cuándo
- Imposible consolidar datos entre múltiples zonas

### Qué hace CPE Campo

- **Un cupo, múltiples stakeholders en simultáneo**: cada actor carga sus datos desde su propio dispositivo en el mismo cupo, sin esperar al anterior
- **Cada tab tiene un responsable claro**: Datos (Comercial/Log Central) · Transporte (Admin Zonal) · Pesaje (Agro/Producción) · Cierre (Admin Zonal / Ingeniero)
- **Trazabilidad completa**: historial de cambios por campo, con usuario y timestamp
- **Estandarización de zonas**: mismo proceso, mismo formulario, mismos campos — en todas las zonas de carga

### Output actual (provisorio)

Al completar el cupo, el sistema dispara automáticamente un correo al equipo de operaciones solicitando la generación de la CP, con todos los datos del cupo organizados por sección.

### Output final (roadmap)

Integración directa con la API de AFIP para generación automática de la CPE sin intervención manual.

---

## Estructura propuesta (6 slides)

El agente puede ajustar, pero como referencia:

1. **Portada** — CPE Campo · Avant Cargo · Logo
2. **El problema** — triangulación actual: WhatsApp, mails, llamadas, errores y sin trazabilidad
3. **La solución** — un cupo, todos los stakeholders cargando en simultáneo desde sus dispositivos
4. **Output y roadmap** — hoy: correo automático solicitando la CP · futuro: API directa con AFIP
5. **Plan de implementación** — 3 etapas (ver abajo)
6. **Siguiente paso** — CTA concreto, no "Gracias"

---

## Plan de implementación (3 etapas)

### Etapa 1 — Validación interna (Avant Cargo)
Avant Cargo replica los datos del proceso actual en la app. Objetivo: validar el flujo completo, detectar fricciones y empezar a demostrar el valor antes de involucrar a terceros.

### Etapa 2 — Incorporar Transporte
El transportista o Admin Zonal carga directamente los datos de transporte (chofer, patente, CUIT). Se elimina la triangulación en esa etapa.

### Etapa 3 — Ingenieros y Zonales
Los ingenieros y administradores zonales completan cierre y pesaje desde el campo. Proceso 100% distribuido, sin intermediarios.

---

## Instrucciones de diseño

- Slide 2 y 3 (el problema): usar esquema visual del flujo actual — actores conectados con flechas caóticas tipo "whatsapp → mail → llamada → error"
- Slide 4 y 5 (la solución): contrastar con un esquema limpio — cupo central, tabs por stakeholder irradiando desde el centro
- Slide 9 (implementación): línea de tiempo horizontal con las 3 etapas, destacar en qué punto está Ceibos hoy
- Slide 10: un solo CTA claro — no "Gracias", sino algo como "Arranquemos la Etapa 1 esta semana"
- Usar iconografía simple (línea, no relleno) para representar actores: camión, campo, persona, edificio
- Los datos numéricos (kg, cupos, fechas) siempre en `#2C9FC0` para destacar

---

## Entregable esperado

Para cada slide, especificá:
- **Título** (afirmación, no sustantivo)
- **Contenido visual** (qué se ve: diagrama, dato grande, tabla, foto)
- **Copy** (texto exacto que va en el slide, mínimo)
- **Notas del presentador** (lo que dice el orador, no lo que se lee)
- **Especificaciones de layout** (colores, tipografía, posición de elementos)

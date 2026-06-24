# Base para arrancar un proyecto nuevo

Este documento resume el stack y los patrones de arquitectura que funcionaron bien en
`crm-lh` (CRM de leads para asesores, React + Vite + Firebase). Está pensado para
pegarlo en un chat nuevo (junto con la sección "Prompt para copiar" al final) y que
genere el arranque de un proyecto distinto reusando las mismas convenciones.

Ajustá o borrá lo que no aplique al proyecto nuevo — esto es un punto de partida, no un
checklist obligatorio.

## Stack que funcionó bien acá

- **Frontend**: React 18 + React Router v6 + Vite + Tailwind CSS.
- **Backend**: Firebase (Auth + Firestore + Cloud Functions). Sin backend propio.
- **Librerías puntuales**: `@hello-pangea/dnd` (drag and drop), Recharts (gráficos),
  `lucide-react` (íconos), PapaParse/pdf-lib/html2canvas (exports a CSV/PDF/imagen).
- **Sin test suite ni linter** — la verificación es manual corriendo `npm run dev` y
  probando en el navegador. Si el proyecto nuevo es más crítico, considerar agregar
  tests desde el inicio en vez de copiar esta decisión.
- **Hosting**: Firebase Hosting con `firebase deploy --only hosting` apuntando a un
  `site` explícito en `firebase.json`.

## Patrones de arquitectura a reusar

1. **Datos por usuario, no globales.** Todo lo que pertenece a un asesor/usuario vive
   bajo `users/{userId}/...` en Firestore (leads, configuración, metas). Evitar
   colecciones globales compartidas salvo que el dato sea explícitamente cross-usuario
   (en este repo, ese fue justamente un bug: un objetivo mensual quedó guardado en una
   colección global `metas` en vez de `users/{uid}/metas`, y hubo que migrarlo).

2. **Un servicio por entidad, nunca Firestore directo en componentes.** Todas las
   lecturas/escrituras de una entidad (ej. `leadsService.js`) se centralizan en un
   archivo de servicio. Los componentes nunca llaman `getDoc`/`updateDoc` directamente.
   Esto hizo fácil rastrear quién modifica qué y mantener invariantes (ej.: toda
   transición de estado debe loguearse en un historial y actualizar un timestamp).

3. **Un hook por feature Firestore-backed.** Cada feature con datos en tiempo real
   tiene su propio hook (`useLeads`, `useDashboardMetrics`, `useWhatsAppNotifications`,
   etc.) que envuelve `onSnapshot`/queries y devuelve `{ data, loading }`. Los
   componentes consumen el hook, nunca la query cruda.

4. **Componentes organizados por feature, no por átomo/shared.** Carpeta plana de
   componentes agrupados por dominio (ej. todos los `WhatsApp*`, todos los del
   Kanban) en lugar de una jerarquía `atoms/molecules/organisms`.

5. **Single source of truth de routing.** Un solo archivo (`App.jsx`) define todas las
   rutas. Si en algún momento aparece una segunda tabla de rutas "legacy" sin usar,
   eliminarla en vez de dejarla viva — generó confusión documentada en el CLAUDE.md de
   este repo.

6. **Feature cross-cutting documentada como tal.** Cuando una funcionalidad toca
   frontend + Cloud Functions + un componente externo (en este caso, una extensión de
   Chrome para WhatsApp), documentarla en un bloque propio del CLAUDE.md explicando el
   flujo completo end-to-end, no solo archivo por archivo.

## Errores a no repetir

- **Nunca commitear archivos de service account** (`*-firebase-adminsdk*.json`,
  `firebase-key.json`, etc.). En este repo terminaron sueltos en la raíz y sin
  `.gitignore`, y uno llegó a quedar staged para commit. Agregar el patrón al
  `.gitignore` desde el commit inicial del proyecto nuevo.
- **No mezclar cambios de estética (rediseño visual) con cambios funcionales en el
  mismo commit/PR** si se puede evitar — dificulta revisar qué de lo nuevo es lógica
  real vs. solo CSS.
- **Cambiar el esquema de un path de Firestore (ej. de colección global a
  subcolección por usuario) requiere un paso de migración explícito**, no solo cambiar
  el código que lee/escribe — si no, los datos viejos quedan huérfanos silenciosamente.

## Prompt para copiar en el chat nuevo

```
Quiero arrancar un proyecto nuevo: [DESCRIBIR QUÉ HACE EL PROYECTO Y PARA QUIÉN ES].

Stack: React + Vite + Tailwind CSS + Firebase (Auth + Firestore + Cloud Functions).
Sin test suite ni linter por ahora; voy a verificar corriendo `npm run dev` y probando
manualmente en el navegador.

Convenciones de arquitectura que quiero desde el día uno:
- Todo dato de Firestore que pertenezca a un usuario vive bajo `users/{userId}/...`,
  nunca en una colección global.
- Un archivo de servicio por entidad (ej. `xService.js`) centraliza todas las
  lecturas/escrituras a Firestore de esa entidad. Los componentes nunca llaman
  Firestore directamente.
- Un hook custom por feature con datos en tiempo real (envuelve `onSnapshot`,
  devuelve `{ data, loading }`).
- Componentes organizados por feature/dominio, no por capas atómicas.
- Un solo archivo de rutas (routing), sin tablas de rutas duplicadas o legacy.
- Nunca commitear credenciales de service account — agregar el patrón al
  `.gitignore` desde el primer commit.

Por favor generá:
1. La estructura inicial de carpetas (`src/components`, `src/hooks`, `src/services`,
   `src/pages`).
2. Un `CLAUDE.md` inicial documentando el stack, el modelo de datos de Firestore y
   estas convenciones.
3. [AGREGAR: feature inicial concreta a implementar, ej. "un formulario de alta de
   X" o "el modelo de datos de Y"].
```

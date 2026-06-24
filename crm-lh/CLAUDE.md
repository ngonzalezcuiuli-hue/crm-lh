# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is "crm-funnel" — a CRM for Swiss Medical sales advisors to manage leads through a sales funnel (Kanban), built with React + Vite + Firebase. There is no test suite and no linter configured.

## Commands

Run all commands from the repo root (`crm-lh/`) unless noted otherwise.

- `npm run dev` — start Vite dev server at `http://localhost:5173`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `firebase deploy --only hosting` — deploy `dist/` to Firebase Hosting (site `crm-lh-e27c4`, see [firebase.json](firebase.json))
- `cd functions && npm run deploy` (i.e. `firebase deploy --only functions`) — deploy Cloud Functions
- There are no automated tests and no lint script (`functions/package.json`'s `lint` is a no-op echo). Verify changes by running the dev server and exercising the UI manually.

## Architecture

### Stack
React 18 + React Router v6, Vite, Tailwind CSS, Firebase (Auth + Firestore + Cloud Functions), `@hello-pangea/dnd` for the Kanban drag-and-drop, Recharts for charts, PapaParse/pdf-lib/html2canvas for exports.

Ignore `.agent/rules/*` and `.agent/workflows/*` — they describe a Next.js/Supabase/shadcn stack that does not match this codebase (this project is Vite + Firebase, not Next.js). They appear to be boilerplate from a different template and are not authoritative for this repo.

### Data model (Firestore)
Everything is scoped per advisor under `users/{userId}/...`:
- `users/{userId}/leads/{leadId}` — the core lead document. Key fields: `estado` (`Funnel` | `Onboarding` | `Completado` | `Perdido`), `etapa` (funnel stage, e.g. "Primer Contacto", "Segundo Contacto", "Seguimiento"), `etapaHistorial` (array tracking entry/exit timestamps per stage), `infoProceso` (onboarding/production tracking), `cotizacionMiembros`, `whatsappEnviados` (per-stage send log), `whatsappProximo` (scheduled WhatsApp send: `programadoPara`, `readyToSend`), `recordatorio` (follow-up reminder), `razonPerdida` (loss reason), `interestLevel`/`nivelInteres`.
- `users/{userId}/lead_events` — audit trail (e.g. recycle-clone events).
- `config/appSettings` — global app config, including `objetivosComerciales.{mes}` (monthly commercial objectives), read/written via [src/services/configService.js](src/services/configService.js).
- `routing/coreToRecycle/{coreUid}` and `routing/pool` — mapping used by the lead-recycling Cloud Function to route lost leads to a secondary "Reciclaje" advisor account.

All reads/writes to leads go through [src/services/leadsService.js](src/services/leadsService.js) — extend it rather than calling Firestore directly from components. State transitions (`estado`/`etapa`) always append to `etapaHistorial` and bump `lastUpdatedAt`.

### Frontend structure
- [src/app/App.jsx](src/app/App.jsx) is the single source of routing truth: wraps everything in `AuthProvider`, then `AuthRouter` switches between `LoginPage` (unauthenticated) and `AppLayout` (authenticated), which renders `Sidebar` + page `Outlet` for routes `/`, `dashboard`, `proceso`, `perdidos`, `completados`, `informes`, `integraciones`. `src/reports/routes.jsx` is a separate, unused/legacy route table — don't add routes there.
- Auth state lives in [src/hooks/useAuth.jsx](src/hooks/useAuth.jsx) (`AuthProvider`/`useAuthContext`), backed by Firebase Auth. On login it also pushes the ID token to the Chrome extension via `extensionBridge`.
- Each Firestore-backed feature has a dedicated hook (`useLeads`, `useLostLeads`, `useOnboardingLeads`, `useCompletedLeads`, `useStandByLeads`, `useDashboardMetrics`, `useReports`, `useWhatsAppNotifications`, `useWhatsAppAutomation`) that wraps `onSnapshot`/queries and exposes `{ data, loading }`-shaped state to components. Follow this pattern for new Firestore-backed features rather than querying inside components.
- Components are organized by feature, not by atomic/shared split: `KanbanBoard`/`Column`/`LeadCard` (funnel board), `LeadModal`/`RecordatorioModal`/`LossReasonModal` (lead detail/edit flows), `WhatsApp*` components (bulk send, scheduling, notification bell), `CommercialObjective`/`ForecastProjection`/`ObjectiveManager` (sales targets/dashboard), `Dashboard`/`Reports`.

### WhatsApp automation (cross-cutting feature)
This is the most complex subsystem and spans frontend, Cloud Functions, and a companion Chrome extension:
1. **Manual send**: [src/services/whatsappAutomationService.js](src/services/whatsappAutomationService.js) builds `wa.me`/`whatsapp://` URLs and per-stage default message copy, then `recordWhatsAppSent` in `leadsService.js` logs the send on the lead.
2. **Scheduled send**: a lead can have `whatsappProximo.programadoPara` (a future send time). The Pub/Sub Cloud Function `procesScheduledWhatsApp` in [functions/sendScheduledWhatsApp.js](functions/sendScheduledWhatsApp.js) runs every minute, flips `whatsappProximo.readyToSend = true` once due, and the callable `completeScheduledWhatsApp` clears it once the client confirms the send.
3. **Notification delivery**: [src/hooks/useWhatsAppNotifications.js](src/hooks/useWhatsAppNotifications.js) listens to Firestore in real time for `readyToSend: true` leads and fires a browser Notification (no extension required — see [GUIA_NOTIFICACIONES.md](GUIA_NOTIFICACIONES.md) for the full manual test flow).
4. **Lead recycling**: the Firestore trigger `cloneLostToRecycle` in [functions/index.js](functions/index.js) watches `users/{userId}/leads/{leadId}` updates; when a lead's `estado` becomes `Perdido`, it clones it into a different advisor's funnel (`routing/coreToRecycle` mapping, with pool fallback) so lost leads get a second pass.
5. **Chrome extension** ([chrome-extension/](chrome-extension/)) is an optional companion that mirrors the CRM's Firebase auth token (via `src/utils/extensionBridge.js`, which reads `localStorage`'s `firebase:authUser:*` key) into `chrome.storage` so a background service worker can poll Firestore and surface OS notifications even when the CRM tab isn't focused. See [DIAGNOSTICO_EXTENSION.md](DIAGNOSTICO_EXTENSION.md) for the expected console-log sequence when debugging the bridge.

### Integrations
[src/services/makeReportsService.js](src/services/makeReportsService.js) posts report exports to a Make.com webhook (`MAKE_WEBHOOK_URL`, currently a placeholder — set via `setWebhookUrl` or replace before use). Wired up from [src/pages/IntegrationsPage.jsx](src/pages/IntegrationsPage.jsx).

### Firebase config
[src/services/firebase.js](src/services/firebase.js) hardcodes the Firebase web config (this is normal/expected for Firebase client SDKs — these keys are public by design, security is enforced via Firestore rules, not by hiding this config). Project id `crm-lh-e27c4`. There are also several Firebase service-account JSON key files at the repo root (`firebase-key.json`, `crm-lh-e27c4-*.json`) — these are sensitive admin credentials, not the client config; never reference or embed their contents in app code.

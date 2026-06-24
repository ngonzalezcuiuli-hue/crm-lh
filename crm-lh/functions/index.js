/**
 * Firebase Functions - Reciclaje "Espejo" + WhatsApp Automation
 */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Importar funciones de sendScheduledWhatsApp
const {
  procesScheduledWhatsApp,
  completeScheduledWhatsApp
} = require("./sendScheduledWhatsApp");

// --- Configurables rápidos ---
const COOLING_DAYS = 0; // si querés esperar X días, poné > 0
const ENABLE_POOL_FALLBACK = true; // usar pool si no hay mapeo Core→Reciclaje

async function pickRecycleTarget(coreUid) {
  // 1) Intentar mapeo directo: routing/coreToRecycle/{coreUid}
  const mapDoc = await db.doc(`routing/coreToRecycle/${coreUid}`).get();
  if (mapDoc.exists) {
    const data = mapDoc.data() || {};
    if (data.enabled !== false && data.uid) {
      return { uid: data.uid, waNumberId: data.waNumberId || null };
    }
  }

  // 2) Fallback opcional al pool
  if (!ENABLE_POOL_FALLBACK) return null;

  const poolSnap = await db.collection("routing/pool").where("enabled", "==", true).get();
  if (!poolSnap.empty) {
    // selección round-robin simple por timestamp
    const docs = poolSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
    const pick = docs[Math.floor(Date.now() / 1000) % docs.length];
    if (pick?.uid) return { uid: pick.uid, waNumberId: pick.waNumberId || null };
  }
  return null;
}

exports.cloneLostToRecycle = functions.firestore
  .document("users/{userId}/leads/{leadId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data() || {};
    const after  = change.after.data()  || {};

    // Dispara SOLO cuando cambia a "Perdido"
    if (before.estado === "Perdido" || after.estado !== "Perdido") return null;

    const coreOwnerUid = ctx.params.userId;

    // Cooling-off (opcional)
    const nowMs = Date.now();
    const effectiveRecycleAt =
      after.recycleAt || nowMs + COOLING_DAYS * 24 * 60 * 60 * 1000;
    if (effectiveRecycleAt > nowMs) return null;

    // Opt-out compliance (si tenés este flag en tus leads)
    if (after.optStatus && String(after.optStatus).toLowerCase() === "opt_out") {
      return null;
    }

    // Elegir destino (espejo o pool)
    const target = await pickRecycleTarget(coreOwnerUid);
    if (!target || !target.uid) return null;

    // Dedupe: ¿ya existe reciclado de este source para ese destino?
    const dup = await db
      .collection(`users/${target.uid}/leads`)
      .where("sourceLeadId", "==", ctx.params.leadId)
      .limit(1)
      .get();
    if (!dup.empty) return null;

    // Armar payload "sanitizado" para el nuevo funnel
    const payload = { ...after };
    // Campos estandarizados para reciclaje
    payload.estado = "Funnel"; // arranca el pipeline secundario
    payload.origin = "recycle";
    payload.sourceLeadId = ctx.params.leadId;
    payload.coreOwnerUid = coreOwnerUid;
    payload.waNumberId = target.waNumberId || payload.waNumberId || null;
    payload.lastUpdatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Limpiar posibles campos conflictivos
    delete payload.id;
    delete payload.createdAt;

    // Crear lead en la cuenta de Reciclaje
    const ref = await db.collection(`users/${target.uid}/leads`).add(payload);

    // Auditoría mínima (opcional) en el core
    await db.collection(`users/${coreOwnerUid}/lead_events`).add({
      type: "clone_to_recycle",
      sourceLeadId: ctx.params.leadId,
      targetLeadId: ref.id,
      targetOwnerUid: target.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return null;
  });

// Exportar funciones de WhatsApp
exports.procesScheduledWhatsApp = procesScheduledWhatsApp;
exports.completeScheduledWhatsApp = completeScheduledWhatsApp;

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Pub/Sub trigger - Se ejecuta cada minuto para enviar WhatsApp programados
 *
 * Este Cloud Function:
 * 1. Busca leads con whatsappProximo.programadoPara <= ahora
 * 2. Crea un registro de "envío pendiente" para que el cliente lo detecte
 * 3. El cliente abre la URL en WhatsApp Web/App
 * 4. Una vez enviado, limpia el campo programadoPara
 */
exports.procesScheduledWhatsApp = functions
  .pubsub.schedule('every 1 minutes')
  .onRun(async (context) => {
    const now = new Date();
    console.log(`[${now.toISOString()}] Iniciando procesamiento de WhatsApp programados`);

    try {
      // Obtener todos los usuarios
      const usersSnapshot = await db.collection('users').get();

      if (usersSnapshot.empty) {
        console.log('No hay usuarios en la base de datos');
        return null;
      }

      let processedCount = 0;

      // Por cada usuario, buscar leads con envíos programados
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Buscar leads con whatsappProximo.programadoPara <= ahora
        const leadsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('leads')
          .get();

        for (const leadDoc of leadsSnapshot.docs) {
          const lead = leadDoc.data();
          const leadId = leadDoc.id;

          // Verificar si hay un envío programado pendiente
          if (lead.whatsappProximo?.programadoPara) {
            try {
              const scheduledTime = lead.whatsappProximo.programadoPara.toDate?.()
                || new Date(lead.whatsappProximo.programadoPara);

              // Si la hora programada es <= ahora
              if (scheduledTime <= now) {
                console.log(
                  `WhatsApp programado vencido para lead ${leadId} en usuario ${userId}. ` +
                  `Programado para: ${scheduledTime.toISOString()}, Ahora: ${now.toISOString()}`
                );

                // Marcar como "listo para enviar"
                await db
                  .collection('users')
                  .doc(userId)
                  .collection('leads')
                  .doc(leadId)
                  .update({
                    'whatsappProximo.readyToSend': true,
                    'whatsappProximo.statusUpdatedAt': admin.firestore.FieldValue.serverTimestamp()
                  });

                processedCount++;
              }
            } catch (leadError) {
              console.error(
                `Error procesando lead ${leadId} del usuario ${userId}:`,
                leadError
              );
            }
          }
        }
      }

      console.log(
        `✓ Procesamiento completado. ${processedCount} leads marcados como listos para enviar`
      );
      return null;
    } catch (error) {
      console.error('Error en procesScheduledWhatsApp:', error);
      return null;
    }
  });

/**
 * HTTP Trigger - Endpoint para marcar un envío como completado
 *
 * POST a esta función con:
 * {
 *   userId: "...",
 *   leadId: "...",
 *   etapa: "Primer Contacto"
 * }
 */
exports.completeScheduledWhatsApp = functions.https.onCall(async (data, context) => {
  const { userId, leadId, etapa } = data;

  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'El usuario debe estar autenticado'
    );
  }

  if (!userId || !leadId || !etapa) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Faltan parámetros requeridos: userId, leadId, etapa'
    );
  }

  try {
    const leadRef = db.collection('users').doc(userId).collection('leads').doc(leadId);

    // Registrar el envío
    await leadRef.update({
      [`whatsappEnviados.${etapa}`]: {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        enviado: true
      },
      'whatsappProximo': admin.firestore.FieldValue.delete(),
      'lastUpdatedAt': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(
      `✓ WhatsApp completado para lead ${leadId} (usuario ${userId}, etapa: ${etapa})`
    );

    return {
      success: true,
      message: `WhatsApp registrado para ${etapa}`
    };
  } catch (error) {
    console.error('Error en completeScheduledWhatsApp:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Error al registrar el envío de WhatsApp'
    );
  }
});

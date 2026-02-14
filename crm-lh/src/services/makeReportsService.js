// Configuración del webhook de Make
// Reemplaza esta URL con tu webhook de Make
let MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/tu-webhook-id-aqui';

// Timeout para las peticiones (30 segundos)
const REQUEST_TIMEOUT = 30000;

class MakeReportsService {
  async sendReportToMake(reportData) {
    try {
      // Validar que tenemos datos para enviar
      if (!reportData.data || reportData.data.length === 0) {
        throw new Error('No hay datos para enviar');
      }

      // Preparar el payload para Make
      const payload = {
        reportType: reportData.reportType,
        dateFilter: reportData.dateFilter,
        timestamp: reportData.timestamp,
        totalRecords: reportData.totalRecords,
        data: reportData.data,
        // Metadatos adicionales para Make
        metadata: {
          source: 'CRM-Funnel',
          version: '1.0',
          exported_by: 'system', // Podrías agregar usuario si tienes auth
          export_date: new Date().toISOString()
        }
      };

      console.log(`Enviando ${reportData.totalRecords} registros a Make...`);

      // Crear la petición con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Verificar si la respuesta fue exitosa
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Make webhook error: ${response.status} - ${errorText}`);
      }

      // Intentar parsear la respuesta
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        // Si no se puede parsear como JSON, usar el texto
        responseData = { message: await response.text() };
      }

      console.log('Datos enviados exitosamente a Make:', responseData);
      return responseData;

    } catch (error) {
      console.error('Error al enviar datos a Make:', error);

      // Manejar diferentes tipos de errores
      if (error.name === 'AbortError') {
        throw new Error('Timeout: La exportación tardó demasiado tiempo');
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error('Error de conexión: Verifica tu conexión a internet');
      }

      throw new Error(`Error al exportar: ${error.message}`);
    }
  }

  // Método para enviar datos en lotes (útil para muchos registros)
  async sendReportInBatches(reportData, batchSize = 100) {
    if (!reportData.data || reportData.data.length === 0) {
      throw new Error('No hay datos para enviar');
    }

    const data = reportData.data;
    const batches = [];

    // Dividir datos en lotes
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    console.log(`Enviando ${data.length} registros en ${batches.length} lotes...`);

    const results = [];

    // Enviar cada lote
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchPayload = {
        ...reportData,
        data: batch,
        totalRecords: batch.length,
        batchInfo: {
          batchNumber: i + 1,
          totalBatches: batches.length,
          isLastBatch: i === batches.length - 1
        }
      };

      try {
        const result = await this.sendReportToMake(batchPayload);
        results.push(result);

        // Esperar un poco entre lotes para no saturar Make
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error en lote ${i + 1}:`, error);
        throw new Error(`Error en lote ${i + 1} de ${batches.length}: ${error.message}`);
      }
    }

    return results;
  }

  // Método para testear la conexión con Make
  async testConnection() {
    try {
      const testPayload = {
        test: true,
        message: 'Test de conexión desde CRM-Funnel',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'Conexión exitosa' : 'Error en la conexión'
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        message: error.message
      };
    }
  }

  // Configurar URL del webhook (útil si necesitas cambiarla dinámicamente)
  setWebhookUrl(url) {
    MAKE_WEBHOOK_URL = url;
  }
}

// Exportar una instancia única del servicio
export const makeReportsService = new MakeReportsService();
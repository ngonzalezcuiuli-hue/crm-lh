# 🔧 Guía de Diagnóstico - Extensión Chrome + CRM

## Paso 1: Verificar que el CRM está corriendo
```bash
# En la raíz del proyecto
npm run dev
```
- Abre http://localhost:5173
- **Loguéate** con tu usuario

---

## Paso 2: Abre la Consola del Navegador (F12)

Busca estos logs (en orden):

### ✅ Si ves ESTO todo está bien:
```
✅ Content script cargado para WhatsApp CRM
🔧 Inyectando bridge de autenticación...
📱 Token de Firebase detectado, enviando a extensión...
✅ Autenticación completada
🔐 Usuario autenticado, conectando con extensión...
✅ Conectado con extensión Chrome
📱 Usuario: [tu_user_id]
```

### ❌ Si NO ves estos logs:

**A. Si NO ves "Content script cargado":**
- El manifest.json no está inyectando el script
- **Solución:**
  1. Abre `chrome://extensions/`
  2. Busca "SwissMedical CRM"
  3. Haz clic en "Recargar" (icono circular)
  4. Recarga el CRM (F5)

**B. Si ves "Content script" pero NO "Bridge inyectado":**
- El script inyectado no está ejecutándose
- **Solución:**
  1. Verifica que localStorage tenga claves firebase:authUser
  2. En consola, ejecuta:
     ```javascript
     Object.keys(localStorage).filter(k => k.includes('firebase:authUser'))
     ```
  3. Deberías ver algo como: `["firebase:authUser:AIzaSy...:[user_id]"]`

**C. Si ves logs del bridge pero NO "Conectado con extensión":**
- El background script no está recibiendo el mensaje
- **Solución:**
  1. Abre `chrome://extensions/`
  2. Haz clic en "Detalles" de tu extensión
  3. Ve a "Inspeccionar vistas: Service Worker"
  4. Deberías ver en la consola:
     ```
     ✅ Extensión instalada: WhatsApp CRM Notificaciones
     ```

---

## Paso 3: Verifica el Storage de la Extensión

En la consola del **Service Worker** (chrome://extensions/ → Inspeccionar Service Worker):

```javascript
chrome.storage.local.get(null, (data) => {
  console.log('🔍 Storage de extensión:', data);
});
```

Deberías ver:
```javascript
{
  authToken: "[long_jwt_token]",
  userId: "[tu_user_id]",
  notificationsEnabled: true
}
```

---

## Paso 4: Prueba las Notificaciones

En la consola del Service Worker, ejecuta:

```javascript
chrome.alarms.create('checkWhatsAppMessages', { periodInMinutes: 1 });
chrome.alarms.get('checkWhatsAppMessages', (alarm) => {
  console.log('⏰ Alarma:', alarm);
});
```

Luego, en 1 minuto deberías recibir:
- 📳 Notificación del sistema operativo
- O logs en la consola del Service Worker si hay leads listos

---

## Paso 5: Verifica Firestore Access

El background script intenta consultar Firestore. Verifica el acceso:

```javascript
// En Service Worker console
const token = 'tu_token'; // Obtenlo del Step 3
fetch('https://firestore.googleapis.com/v1/projects/swiss-medical-crm/databases/(default)/documents/users/USER_ID/leads?pageSize=1', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log('📊 Firestore response:', d));
```

---

## 🆘 Si NADA funciona:

1. **Reinstala la extensión:**
   ```
   chrome://extensions/ → Quitar → Recargar la carpeta
   ```

2. **Limpia localStorage:**
   - DevTools → Application → Clear storage

3. **Revisa los permisos:**
   - La extensión necesita:
     - ✅ notifications
     - ✅ alarms
     - ✅ storage
     - ✅ host_permissions: http://localhost/*

4. **Contacta el soporte con:**
   - Screenshot de la consola (F12)
   - Screenshot de chrome://extensions/

---

## 📝 Logs Esperados en Orden

| Paso | Log | Dónde |
|------|-----|-------|
| 1 | "Content script cargado" | Consola CRM |
| 2 | "Bridge inyectado" | Consola CRM |
| 3 | "Token detectado" | Consola CRM |
| 4 | "Enviado a extensión" | Consola CRM |
| 5 | "Conectado" | Consola CRM |
| 6 | "Auth guardado" | Service Worker |
| 7 | Notificación OS | Sistema operativo |


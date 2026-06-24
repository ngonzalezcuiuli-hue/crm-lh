# 🔔 Guía de Notificaciones - CRM WhatsApp

## ¿Cómo funciona?

El CRM ahora tiene **notificaciones automáticas del navegador** (sin extensión).

### Flujo:
1. Usuario se loguea en el CRM
2. El hook `useWhatsAppNotifications` se activa
3. Monitorea Firestore buscando leads con `whatsappProximo.readyToSend = true`
4. **Cuando encuentra un lead, muestra automáticamente una notificación**

---

## 📋 Pasos para probar:

### Paso 1: Abre el CRM
```
http://localhost:5173
```
Loguéate con tu usuario

### Paso 2: Habilita notificaciones (solo la primera vez)
En la **esquina inferior derecha** verás un widget:
```
🔔 Prueba de Notificaciones
Estado: ❌ Rechazadas (o similar)
```

**Haz clic en: "📬 Habilitar Notificaciones"**

Chrome te pedirá autorización → **Autoriza**

### Paso 3: Probar con un lead real
Ahora tienes dos opciones:

#### Opción A: Usar el botón de prueba (Rápido)
1. Verás el botón: "⏰ Probar Notificación" (ahora en azul)
2. **Haz clic en él**
3. Deberías ver una **notificación del SO** (popup) que dice:
   ```
   ⏰ Mensajes de WhatsApp Listos
   Tienes 3 mensajes programados listos para enviar
   María Eugenia Russo, Yasmín, Agustín
   ```

#### Opción B: Configurar un lead real en Firestore (Recomendado para producción)
1. Abre Firestore Console
2. Ve a: `users/{userId}/leads/{leadId}`
3. Edita el documento y agrega/modifica:
   ```
   whatsappProximo: {
     readyToSend: true,
     mensaje: "Tu mensaje aquí",
     timestamp: [fecha/hora]
   }
   ```
4. **Guarda** los cambios
5. **Espera 2-5 segundos**
6. Deberías recibir la notificación automáticamente

---

## 🧪 Componente de Prueba (NotificationTester.jsx)

Ubicación en pantalla: **esquina inferior derecha**, fixed

**Estados:**
- ❌ Rechazadas: Usuario rechazó notificaciones
- ⚠️ Sin permiso: No se ha solicitado permiso
- ✅ Habilitadas: Listo para recibir notificaciones

**Botones:**
- 📬 Habilitar Notificaciones: Solicita permiso
- ⏰ Probar Notificación: Simula un mensaje listo

---

## 🔧 Archivos involucrados

| Archivo | Descripción |
|---------|-------------|
| `src/services/notificationService.js` | Servicio que maneja notificaciones |
| `src/hooks/useWhatsAppNotifications.js` | Hook que monitorea Firestore |
| `src/components/NotificationTester.jsx` | Widget de prueba (esquina inferior derecha) |
| `src/app/App.jsx` | Integración en la app |

---

## 📱 Cómo se ve la notificación

Cuando un lead está listo para enviar WhatsApp:

```
┌─────────────────────────────────┐
│ ⏰ Mensajes de WhatsApp Listos   │
│                                 │
│ Tienes 3 mensajes programados   │
│ listos para enviar              │
│                                 │
│ María Eugenia Russo             │
│ Yasmín García                   │
│ Agustín López                   │
│                                 │
│ [Abrir CRM]  [Descartar]       │
└─────────────────────────────────┘
```

---

## ⚙️ Configuración en Firestore

Para que un lead dispare la notificación, necesita:

```javascript
{
  name: "María Eugenia Russo",
  phone: "297590589",
  whatsappProximo: {
    readyToSend: true,          // ← CLAVE: esto debe ser true
    mensaje: "Texto del mensaje",
    timestamp: 1234567890,
    // ... otros campos
  },
  // ... otros campos del lead
}
```

---

## 🔐 Permisos necesarios

El navegador solo pide permiso **UNA VEZ**:
- ✅ Mostrar notificaciones
- ✅ Acceder a localStorage
- ✅ Conectarse a Firestore

**No requiere extensión de Chrome**

---

## 📊 Monitoreo en tiempo real

El hook usa `onSnapshot` de Firestore para:
- Escuchar cambios en **tiempo real**
- Mostrar notificación cuando `readyToSend` cambia a `true`
- Evitar spam con cooldown (5 minutos entre notificaciones del mismo tipo)

---

## ✅ Checklist para probar

- [ ] Abre http://localhost:5173
- [ ] Loguéate
- [ ] Ves el widget "🔔 Prueba de Notificaciones" en esquina inferior derecha
- [ ] Haces clic en "📬 Habilitar Notificaciones"
- [ ] Chrome pide autorización → Autorizas
- [ ] Haces clic en "⏰ Probar Notificación"
- [ ] Ves la notificación del navegador (popup)
- [ ] Editas un lead en Firestore con `readyToSend: true`
- [ ] Recibes notificación automática en 2-5 segundos

---

## 🐛 Si algo falla

1. **No ves el widget:**
   - Recarga F5
   - Verifica que estés logueado
   - Abre DevTools (F12) → Consola

2. **Botón deshabilitado después de "Habilitar":**
   - Recarga la página
   - Verifica que Chrome permitió las notificaciones
   - Revisa DevTools → Aplicación → Notificaciones

3. **No recibiste notificación al editar Firestore:**
   - Verifica que `readyToSend` sea exactamente `true` (boolean)
   - Verifica que el campo esté en la ruta correcta
   - Mira los logs en F12 → Consola (busca "📊 Leads listos")

---

## 📞 Soporte

Revisa los logs de la consola (F12) para ver:
- `🔍 Iniciando monitoreo de leads...`
- `📊 Leads listos: X`
- Cualquier error con `❌`

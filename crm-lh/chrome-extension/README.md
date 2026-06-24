# 📲 Extensión Chrome - WhatsApp CRM Notificaciones

Recibe notificaciones automáticas cuando tus mensajes de WhatsApp programados están listos para enviar, **sin necesidad de tener abierto el CRM**.

---

## 🚀 Características

✅ **Notificaciones en tiempo real** - Campana con badge de contador  
✅ **Verificación automática** - Cada minuto verifica si hay mensajes listos  
✅ **Notificaciones del SO** - Avisos del sistema operativo (Windows/Mac)  
✅ **Click para abrir** - Abre automáticamente el CRM al hacer click  
✅ **Control toggle** - Activa/desactiva notificaciones cuando quieras  
✅ **Bajo consumo Firebase** - Solo ~43K lecturas/mes (plan gratuito: 50K)  

---

## 📦 Instalación

### Paso 1: Crear carpeta de íconos

```bash
mkdir chrome-extension/icons
```

### Paso 2: Agregar íconos (opcional)

Los íconos deben estar en `chrome-extension/icons/`:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

**Si no tienes íconos:** Crea archivos PNG simples o usa emojis (para desarrollo)

### Paso 3: Instalar en Chrome

1. Abre Chrome y ve a: **chrome://extensions/**
2. Activa el **Modo de desarrollador** (esquina superior derecha)
3. Click en **"Cargar extensión sin empaquetar"**
4. Selecciona la carpeta `chrome-extension`
5. ¡Listo! La extensión aparecerá en tu barra de herramientas

---

## 🔌 Cómo funciona

### 1️⃣ **Conexión automática**
Cuando inicias sesión en el CRM desde el navegador, la extensión detecta automáticamente tu `userId` y `authToken` y los guarda de forma segura.

### 2️⃣ **Verificación cada minuto**
```
Chrome abierto
    ↓
Background Service Worker verifica Firebase cada 60 segundos
    ↓
¿Hay leads con whatsappProximo.readyToSend = true?
    ↓
SÍ → Notificación del SO aparece
NO → Sigue esperando
```

### 3️⃣ **Notificación automática**
Cuando llega la hora de envío:
```
⏰ Mensajes de WhatsApp Listos
   Tienes 3 mensaje(s) listo(s)
   
   [Abrir CRM] [Descartar]
```

### 4️⃣ **Envío con un click**
- Haces click en "Abrir CRM"
- Se abre automáticamente con los mensajes listos
- Haces click en la campana del CRM
- Se abren todos en WhatsApp Web/App

---

## 📊 Consumo de Firebase

### Cálculo:
- **Verificación por minuto:** 1 lectura Firestore
- **Minutos por día:** 1,440 (24h × 60min)
- **Lecturas/día:** 1,440
- **Lecturas/mes:** ~43,200

### Plan Gratuito Firestore:
- **Límite gratis:** 50,000 lecturas/mes
- **Tu consumo:** 43,200 lecturas/mes
- **Disponible:** 6,800 lecturas/mes para otras operaciones

✅ **Conclusión:** Totalmente dentro del plan gratuito, incluso si tienes varias extensiones

---

## 🔐 Seguridad

- ✅ El `authToken` se guarda **localmente en tu navegador** (no en servidores)
- ✅ Solo tu navegador puede acceder a tus datos
- ✅ La extensión NO tiene acceso a tus contraseñas
- ✅ Puedes desactivarla en cualquier momento desde `chrome://extensions/`

---

## 🛠️ Estructura de archivos

```
chrome-extension/
├── manifest.json          # Configuración de la extensión
├── background.js          # Service Worker (corre en segundo plano)
├── popup.html            # Interfaz emergente
├── popup.js              # Script del popup
├── icons/                # Carpeta con íconos
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # Este archivo
```

---

## 📱 Flujo completo de uso

```
DÍA 1 (10:00 AM)
├─ Programas 3 mensajes para las 3 PM
└─ Se guardan en Firebase con readyToSend: false

DÍA 1 (3:00 PM)
├─ Cloud Function marca como readyToSend: true
└─ Extensión detecta el cambio

DÍA 1 (3:01 PM)
├─ Notificación del SO aparece: "⏰ 3 mensajes listos"
└─ Puedes estar en cualquier lugar (no necesitas CRM abierto)

DÍA 1 (3:05 PM)
├─ Haces click en la notificación
├─ Se abre el CRM automáticamente
├─ Aparece modal de mensajes listos
└─ Haces click en "Enviar 3" → Se abren en WhatsApp
```

---

## ❓ Preguntas frecuentes

### ¿Necesito tener Chrome abierto?
**Sí**, pero NO necesitas tener abierto el CRM ni ninguna pestaña específica. Solo Chrome en segundo plano.

### ¿Qué pasa si cierro Chrome?
La extensión no funciona hasta que vuelvas a abrir Chrome. Cuando lo abres, retoma las verificaciones automáticas.

### ¿Puedo tener múltiples cuentas?
Actualmente, la extensión usa la última cuenta que iniciaste sesión en el CRM. Para múltiples cuentas, necesitarías múltiples navegadores o perfiles de Chrome.

### ¿Qué pasa si rechazo una notificación?
La extensión seguirá verificando. La próxima vez que haya mensajes listos, mostrará otra notificación (después de 5 minutos de cooldown).

### ¿Se ve afectado mi plan Firebase?
**No significativamente**. Las 43K lecturas/mes son pequeñas comparadas con los 50K gratis. Además, son **solo verificaciones** (lecturas), no escrituras.

---

## 🚨 Solución de problemas

### "No recibo notificaciones"
1. Verifica que la extensión esté **activada** (chrome://extensions/)
2. Abre el CRM y inicia sesión para que se conecte
3. Haz click en el botón "Verificar ahora" en el popup
4. Revisa que las notificaciones de Chrome estén **permitidas**

### "No se conecta a Firebase"
1. Verifica tu conexión a internet
2. Asegúrate de estar conectado al CRM primero
3. Recarga la extensión: chrome://extensions/ → Click en ↻

### "Consume mucho ancho de banda"
Las lecturas de Firestore son muy pequeñas (~1KB cada una). El consumo es mínimo.

---

## 📝 Versión

- **Versión:** 1.0.0
- **Última actualización:** Mayo 2026
- **Compatible con:** Chrome 90+

---

## 💡 Próximas mejoras

- [ ] Soporte para múltiples cuentas
- [ ] Personalización de sonidos de notificación
- [ ] Historial de notificaciones
- [ ] Integración con WhatsApp Business API (sin necesidad de navegador)

---

¿Preguntas? Revisa la sección de "Solución de problemas" o contacta soporte.

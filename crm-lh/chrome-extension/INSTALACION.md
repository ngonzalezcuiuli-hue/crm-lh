# 🚀 Cómo instalar la extensión en tu Chrome

## Paso 1: Abrir Chrome Developer Mode

1. Abre **Google Chrome**
2. En la esquina superior derecha, haz click en los **3 puntos** (⋮)
3. Ve a: **Más herramientas** → **Extensiones**
   - O simplemente escribe: `chrome://extensions/` en la barra de direcciones

## Paso 2: Activar "Modo de desarrollador"

En la esquina **SUPERIOR DERECHA** de la página de extensiones, verás un toggle:
- Activa: **"Modo de desarrollador"** (debe estar en ON/azul)

## Paso 3: Cargar la extensión

Después de activar el modo de desarrollador:
1. Aparecerá un botón azul: **"Cargar extensión sin empaquetar"**
2. Click en ese botón
3. Navega a esta carpeta: 
   ```
   C:\Users\nigonzalezc\Desktop\ASESOR25\Ligthouse\HERRAMIENTAS ASESOR\CRM\CRM\crm-lh\chrome-extension
   ```
4. Click en **"Seleccionar carpeta"**

## Paso 4: ¡Listo! Extensión instalada

- En la barra de herramientas (esquina superior derecha de Chrome), verás un icono nuevo 🔔
- Si no ves el icono, haz click en el **icono de extensiones** (pieza de puzzle) y fija la extensión

---

## 🔌 Conectar con tu cuenta

1. **Abre el CRM** desde Chrome: http://localhost:5173/
2. **Inicia sesión** con tu cuenta
3. La extensión detectará automáticamente que iniciaste sesión
4. Verás en el popup de la extensión: **✓ Conectado**

---

## ✅ Verificar que funciona

### En el popup de la extensión (click en el icono 🔔):

```
┌─────────────────────────────┐
│ ⏰ WhatsApp Notificaciones   │
│                              │
│ ✓ Conectado                  │
│ Usuario: tu_email@gmail.com  │
│                              │
│ [📲 Abrir CRM]              │
│ [Verificar ahora]            │
│ [Notificaciones activas ✓]  │
│                              │
│ v1.0.0 • SwissMedical CRM   │
└─────────────────────────────┘
```

Si ves "✓ Conectado", ¡todo funciona! ✅

---

## 📱 Cómo funciona después

### Cuando programas mensajes:
1. Programas en el CRM normalmente
2. La extensión verifica **cada minuto** automáticamente
3. Cuando llega la hora → **Notificación del SO** aparece

### Cuando ves la notificación:
```
⏰ Mensajes de WhatsApp Listos
Tienes 3 mensaje(s) listo(s) para enviar

[Abrir CRM] [Descartar]
```

4. Click en **"Abrir CRM"** → Se abre automáticamente
5. Click en la campana del CRM → Se abren en WhatsApp
6. ¡Listo! Envía los mensajes

---

## 🛑 Si algo no funciona

### "No aparece el icono de la extensión"
- Ve a: **chrome://extensions/**
- Busca: "WhatsApp CRM Notificaciones"
- Si está ahí pero no ves el icono en la barra:
  - Click en el icono de extensiones (pieza de puzzle) 🧩
  - Busca la extensión
  - Click en el 📌 para fijarla

### "Dice 'Desconectado'"
1. Abre el CRM: http://localhost:5173/
2. Inicia sesión
3. Abre el popup de la extensión de nuevo
4. Debe decir "✓ Conectado"

### "No recibe notificaciones"
1. Abre el CRM y programa un mensaje para dentro de 1 minuto
2. En el popup, haz click en **"Verificar ahora"**
3. Espera a que llegue la hora
4. Revisa que las notificaciones de Chrome estén activadas:
   - Windows: Panel de notificaciones (esquina inferior derecha)
   - Mac: Centro de notificaciones (esquina superior derecha)

---

## 💡 Tips

✅ **La extensión NO necesita que le hagas nada**
- Corre automáticamente en segundo plano
- Solo verifica cada minuto
- Muy bajo consumo de datos

✅ **Puedes dejarla activada todo el tiempo**
- Desactívala solo si quieres parar las notificaciones
- Desde: chrome://extensions/ → Toggle de la extensión

✅ **Si tienes problemas, prueba:**
1. Recarga la extensión: chrome://extensions/ → Click en ↻
2. Cierra Chrome completamente y reabre
3. Desconecta y vuelve a conectar el CRM

---

¿Necesitas ayuda? Revisa el archivo **README.md** en esta carpeta para más detalles técnicos.

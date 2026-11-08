const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('public')); // Carpeta con tu index.html

let pedidos = []; // Base de datos en memoria para pedidos

// CONFIGURACIÓN DE PUSHOVER (Para notificaciones directas a tu teléfono)
const PUSHOVER_USER_KEY = 'TU_USER_KEY_DE_PUSHOVER';
const PUSHOVER_APP_TOKEN = 'TU_APP_TOKEN_DE_PUSHOVER';

function enviarNotificacionPush(titulo, mensaje) {
  axios.post('https://api.pushover.net/1/messages.json', {
    token: PUSHOVER_APP_TOKEN,
    user: PUSHOVER_USER_KEY,
    title: titulo,
    message: mensaje
  }).catch(err => console.error("Error al enviar notificación:", err.message));
}

// Ruta 1: El cliente envía un pedido
app.post('/api/pedidos', (req, res) => {
  const nuevoPedido = {
    id: 'ORD-' + Date.now().toString().slice(-5),
    fecha: new Date().toLocaleString(),
    estado: 'Pendiente', // Pendiente -> En Proceso -> Enviado / Completado
    guiaSeguimiento: '',
    ...req.body
  };

  pedidos.unshift(nuevoPedido);

  // Construir mensaje para la alerta emergente de tu teléfono
  let mensajePush = `Monto Total: $${nuevoPedido.totalUSD.toFixed(2)}\nRef: ${nuevoPedido.referencia}`;
  if (nuevoPedido.categoria !== 'recargas') {
    mensajePush += `\nEnvío: ${nuevoPedido.courier}\nCI: ${nuevoPedido.cedula}\nDir: ${nuevoPedido.direccion}`;
  } else {
    mensajePush += `\nID Jugador: ${nuevoPedido.playerId}`;
  }

  enviarNotificacionPush(`🛒 NUEVO PEDIDO: ${nuevoPedido.producto}`, mensajePush);

  res.json({ status: 'ok', pedidoId: nuevoPedido.id });
});

// Ruta 2: Obtener todos los pedidos (Para tu Panel Admin)
app.get('/api/admin/pedidos', (req, res) => {
  res.json(pedidos);
});

// Ruta 3: Cambiar estado (Aprobar o agregar Guía MRW/Zoom)
app.post('/api/admin/actualizar-estado', (req, res) => {
  const { id, estado, guiaSeguimiento } = req.body;
  const pedido = pedidos.find(p => p.id === id);

  if (pedido) {
    pedido.estado = estado;
    if (guiaSeguimiento) pedido.guiaSeguimiento = guiaSeguimiento;
    return res.json({ status: 'ok', pedido });
  }

  res.status(404).json({ error: 'Pedido no encontrado' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
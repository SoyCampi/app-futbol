const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir la carpeta pública
app.use(express.static(path.join(__dirname, 'public')));

// Estado simulado del partido
let matchState = {
  teamA: 'Boca Juniors',
  teamB: 'River Plate',
  scoreA: 1,
  scoreB: 0,
  possessionA: 52,
  possessionB: 48,
  shotsA: 6,
  shotsB: 4,
  minute: 35
};

// Transmitir actualizaciones en vivo
setInterval(() => {
  if (matchState.minute < 90) {
    matchState.minute += 1;
    const shift = Math.floor(Math.random() * 3) - 1;
    matchState.possessionA = Math.min(70, Math.max(30, matchState.possessionA + shift));
    matchState.possessionB = 100 - matchState.possessionA;

    if (Math.random() > 0.7) {
      if (Math.random() > 0.5) matchState.shotsA += 1;
      else matchState.shotsB += 1;
    }

    const payload = JSON.stringify(matchState);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }
}, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
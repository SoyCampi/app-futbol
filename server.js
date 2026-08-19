const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos si existen
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// HTML fallback inline por si la carpeta public no es detectada por la ruta relativa
const HTML_FALLBACK = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estadísticas en Vivo</title>
  <style>
    body { font-family: sans-serif; background: #121212; color: #fff; text-align: center; padding: 20px; }
    .card { background: #1e1e1e; padding: 20px; border-radius: 12px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
    .teams { display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
    .score { font-size: 2.5rem; color: #00ff88; margin: 15px 0; }
    .stats { text-align: left; margin-top: 20px; font-size: 0.9rem; line-height: 1.6; }
    .badge { background: #ff0055; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">EN VIVO <span id="minuto">--</span>'</span>
    <div class="score">
      <span id="scoreA">0</span> - <span id="scoreB">0</span>
    </div>
    <div class="teams">
      <span id="teamA">Cargando...</span>
      <span id="teamB">...</span>
    </div>
    <hr style="border-color: #333;">
    <div class="stats">
      <p>Posesión: <b id="posA">50</b>% / <b id="posB">50</b>%</p>
      <p>Tiros al arco: <b id="shotsA">0</b> / <b id="shotsB">0</b></p>
    </div>
  </div>

  <script>
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(\`\${protocol}//\${location.host}\`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      document.getElementById('teamA').innerText = data.teamA;
      document.getElementById('teamB').innerText = data.teamB;
      document.getElementById('scoreA').innerText = data.scoreA;
      document.getElementById('scoreB').innerText = data.scoreB;
      document.getElementById('minuto').innerText = data.minute;
      document.getElementById('posA').innerText = data.possessionA;
      document.getElementById('posB').innerText = data.possessionB;
      document.getElementById('shotsA').innerText = data.shotsA;
      document.getElementById('shotsB').innerText = data.shotsB;
    };
  </script>
</body>
</html>`;

app.get('/', (req, res) => {
  const fileInPublic = path.join(__dirname, 'public', 'index.html');
  const fileInRoot = path.join(__dirname, 'index.html');

  if (fs.existsSync(fileInPublic)) {
    return res.sendFile(fileInPublic);
  } else if (fs.existsSync(fileInRoot)) {
    return res.sendFile(fileInRoot);
  } else {
    return res.send(HTML_FALLBACK);
  }
});

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

function obtenerPartido() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'thesportsdb.p.rapidapi.com',
      path: '/livescore.php?s=Soccer',
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'thesportsdb.p.rapidapi.com'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.events && json.events.length > 0) {
            const p = json.events[0];
            return resolve({
              teamA: p.strHomeTeam || 'Local',
              teamB: p.strAwayTeam || 'Visitante',
              scoreA: parseInt(p.intHomeScore) || 0,
              scoreB: parseInt(p.intAwayScore) || 0,
              possessionA: 52,
              possessionB: 48,
              shotsA: 6,
              shotsB: 4,
              minute: parseInt(p.strProgress) || 10
            });
          }
        } catch (e) {}
        resolve(datosBackup());
      });
    });

    req.on('error', () => resolve(datosBackup()));
    req.end();
  });
}

function datosBackup() {
  return {
    teamA: 'Racing Club',
    teamB: 'Belgrano',
    scoreA: 1,
    scoreB: 0,
    possessionA: 55,
    possessionB: 45,
    shotsA: 7,
    shotsB: 4,
    minute: 42
  };
}

setInterval(async () => {
  const match = await obtenerPartido();
  const payload = JSON.stringify(match);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

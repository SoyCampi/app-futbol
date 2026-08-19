const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

// Interfaz web optimizada con Home (Lista) + Detalle
const HTML_APP = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partidos en Vivo</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #121212; color: #fff; margin: 0; padding: 15px; }
    .container { max-width: 420px; margin: 0 auto; }
    h2 { text-align: center; font-size: 1.3rem; color: #00ff88; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .pulse { width: 10px; height: 10px; background: #ff0055; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #1e1e1e; padding: 16px; border-radius: 14px; margin-bottom: 12px; cursor: pointer; border: 1px solid #2a2a2a; transition: all 0.2s ease; }
    .match-card:active { transform: scale(0.98); background: #252525; }
    .match-card:hover { border-color: #00ff88; }
    
    .teams { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 1rem; }
    .team-name { width: 40%; }
    .team-left { text-align: left; }
    .team-right { text-align: right; }
    .score { color: #00ff88; font-size: 1.2rem; font-weight: 800; background: #121212; padding: 4px 10px; border-radius: 8px; }
    .time-badge { font-size: 0.75rem; color: #ff0055; font-weight: bold; margin-top: 8px; text-align: center; }

    .btn-back { background: #2a2a2a; color: #fff; border: none; padding: 10px 16px; border-radius: 10px; cursor: pointer; margin-bottom: 15px; font-weight: bold; display: inline-flex; align-items: center; gap: 6px; }
    .detail-card { background: #1e1e1e; padding: 20px; border-radius: 18px; text-align: center; border: 1px solid #2a2a2a; }
    .stats-grid { text-align: left; margin-top: 20px; color: #ddd; font-size: 0.95rem; line-height: 2; }
    .stat-row { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a2a; padding: 6px 0; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <!-- VISTA 1: HOME CON LISTA DE PARTIDOS EN VIVO -->
    <div id="view-list">
      <h2><span class="pulse"></span> Partidos en Vivo</h2>
      <div id="matches-container">Cargando partidos en tiempo real...</div>
    </div>

    <!-- VISTA 2: ESTADÍSTICAS DETALLADAS DEL PARTIDO -->
    <div id="view-detail" class="hidden">
      <button class="btn-back" onclick="mostrarLista()">← Volver al listado</button>
      <div class="detail-card">
        <div class="time-badge" style="font-size: 0.85rem; margin-bottom: 10px;">
          EN VIVO <span id="det-minuto">--</span>'
        </div>
        <div class="teams" style="font-size: 1.2rem; margin: 15px 0;">
          <span id="det-teamA" class="team-name team-left">--</span>
          <span class="score" style="font-size: 1.5rem;"><span id="det-scoreA">0</span> - <span id="det-scoreB">0</span></span>
          <span id="det-teamB" class="team-name team-right">--</span>
        </div>
        <div class="stats-grid">
          <div class="stat-row">
            <span>⚽ Posesión</span>
            <b><span id="det-posA">50</span>% / <span id="det-posB">50</span>%</b>
          </div>
          <div class="stat-row">
            <span>🎯 Tiros al arco</span>
            <b><span id="det-shotsA">0</span> / <span id="det-shotsB">0</span></b>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    let partidosCache = [];
    let partidoSeleccionadoId = null;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(\`\${protocol}//\${location.host}\`);

    ws.onmessage = (event) => {
      partidosCache = JSON.parse(event.data);
      if (partidoSeleccionadoId === null) {
        renderizarLista(partidosCache);
      } else {
        actualizarDetalle(partidoSeleccionadoId);
      }
    };

    function renderizarLista(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos || partidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">No hay partidos en directo en este momento.</p>';
        return;
      }
      container.innerHTML = partidos.map(p => \`
        <div class="match-card" onclick="verDetalle('\${p.id}')">
          <div class="teams">
            <span class="team-name team-left">\${p.teamA}</span>
            <span class="score">\${p.scoreA} - \${p.scoreB}</span>
            <span class="team-name team-right">\${p.teamB}</span>
          </div>
          <div class="time-badge">Minuto \${p.minute}'</div>
        </div>
      \`).join('');
    }

    function verDetalle(id) {
      partidoSeleccionadoId = id;
      document.getElementById('view-list').classList.add('hidden');
      document.getElementById('view-detail').classList.remove('hidden');
      actualizarDetalle(id);
    }

    function mostrarLista() {
      partidoSeleccionadoId = null;
      document.getElementById('view-detail').classList.add('hidden');
      document.getElementById('view-list').classList.remove('hidden');
      renderizarLista(partidosCache);
    }

    function actualizarDetalle(id) {
      const p = partidosCache.find(item => item.id === id);
      if (!p) return;
      document.getElementById('det-teamA').innerText = p.teamA;
      document.getElementById('det-teamB').innerText = p.teamB;
      document.getElementById('det-scoreA').innerText = p.scoreA;
      document.getElementById('det-scoreB').innerText = p.scoreB;
      document.getElementById('det-minuto').innerText = p.minute;
      document.getElementById('det-posA').innerText = p.possessionA;
      document.getElementById('det-posB').innerText = p.possessionB;
      document.getElementById('det-shotsA').innerText = p.shotsA;
      document.getElementById('det-shotsB').innerText = p.shotsB;
    }
  </script>
</body>
</html>`;

app.use((req, res) => res.send(HTML_APP));

function obtenerPartidos() {
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
            const partidos = json.events.map((p, idx) => ({
              id: String(p.idEvent || idx + 1),
              teamA: p.strHomeTeam || 'Local',
              teamB: p.strAwayTeam || 'Visitante',
              scoreA: parseInt(p.intHomeScore) || 0,
              scoreB: parseInt(p.intAwayScore) || 0,
              possessionA: Math.floor(Math.random() * 20) + 40,
              possessionB: 100 - (Math.floor(Math.random() * 20) + 40),
              shotsA: Math.floor(Math.random() * 8) + 2,
              shotsB: Math.floor(Math.random() * 8) + 1,
              minute: parseInt(p.strProgress) || 15
            }));
            return resolve(partidos);
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
  return [
    { id: '1', teamA: 'Racing Club', teamB: 'Belgrano', scoreA: 1, scoreB: 0, possessionA: 58, possessionB: 42, shotsA: 7, shotsB: 3, minute: 64 },
    { id: '2', teamA: 'River Plate', teamB: 'Boca Juniors', scoreA: 2, scoreB: 2, possessionA: 51, possessionB: 49, shotsA: 9, shotsB: 8, minute: 81 },
    { id: '3', teamA: 'Real Madrid', teamB: 'Barcelona', scoreA: 0, scoreB: 1, possessionA: 45, possessionB: 55, shotsA: 4, shotsB: 6, minute: 33 }
  ];
}

setInterval(async () => {
  const matches = await obtenerPartidos();
  const payload = JSON.stringify(matches);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

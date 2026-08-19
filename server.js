const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

const HTML_APP = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partidos de Hoy</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #121212; color: #fff; margin: 0; padding: 15px; }
    .container { max-width: 420px; margin: 0 auto; }
    h2 { text-align: center; font-size: 1.3rem; color: #00ff88; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .pulse { width: 10px; height: 10px; background: #00ff88; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #1e1e1e; padding: 16px; border-radius: 14px; margin-bottom: 12px; cursor: pointer; border: 1px solid #2a2a2a; transition: all 0.2s ease; }
    .match-card:hover { border-color: #00ff88; }
    
    .league-title { font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; }
    .teams { display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 0.95rem; }
    .team-name { width: 38%; }
    .team-left { text-align: left; }
    .team-right { text-align: right; }
    .score { color: #00ff88; font-size: 1.1rem; font-weight: 800; background: #121212; padding: 4px 8px; border-radius: 6px; }
    .status-badge { font-size: 0.8rem; color: #ffcc00; font-weight: bold; margin-top: 10px; text-align: center; background: #252512; padding: 4px; border-radius: 6px; }

    .btn-back { background: #2a2a2a; color: #fff; border: none; padding: 10px 16px; border-radius: 10px; cursor: pointer; margin-bottom: 15px; font-weight: bold; }
    .detail-card { background: #1e1e1e; padding: 20px; border-radius: 18px; text-align: center; border: 1px solid #2a2a2a; }
    .stats-grid { text-align: left; margin-top: 20px; color: #ddd; font-size: 0.95rem; }
    .stat-row { display: flex; justify-content: space-between; border-bottom: 1px solid #2a2a2a; padding: 8px 0; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <div id="view-list">
      <h2><span class="pulse"></span> Agenda Real de Hoy</h2>
      <div id="matches-container">Cargando la agenda de partidos...</div>
    </div>

    <div id="view-detail" class="hidden">
      <button class="btn-back" onclick="mostrarLista()">← Volver a la agenda</button>
      <div class="detail-card">
        <div id="det-league" class="league-title">--</div>
        <div id="det-status" class="status-badge" style="margin-bottom: 15px;">--</div>
        <div class="teams" style="font-size: 1.2rem; margin: 15px 0;">
          <span id="det-teamA" class="team-name team-left">--</span>
          <span class="score" style="font-size: 1.4rem;"><span id="det-scoreA">-</span> : <span id="det-scoreB">-</span></span>
          <span id="det-teamB" class="team-name team-right">--</span>
        </div>
        <div class="stats-grid">
          <div class="stat-row">
            <span>Estado del Encuentro</span>
            <b id="det-progress">--</b>
          </div>
          <div class="stat-row">
            <span>Hora Oficial de Inicio</span>
            <b id="det-time">--</b>
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
        container.innerHTML = '<p style="text-align:center; color:#888; padding: 20px;">No hay partidos programados ni en disputa registrados para el día de hoy.</p>';
        return;
      }
      container.innerHTML = partidos.map(p => \`
        <div class="match-card" onclick="verDetalle('\${p.id}')">
          <div class="league-title">\${p.league}</div>
          <div class="teams">
            <span class="team-name team-left">\${p.teamA}</span>
            <span class="score">\${p.scoreA !== null ? p.scoreA : '-'} : \${p.scoreB !== null ? p.scoreB : '-'}</span>
            <span class="team-name team-right">\${p.teamB}</span>
          </div>
          <div class="status-badge">\${p.status}</div>
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
      document.getElementById('det-league').innerText = p.league;
      document.getElementById('det-teamA').innerText = p.teamA;
      document.getElementById('det-teamB').innerText = p.teamB;
      document.getElementById('det-scoreA').innerText = p.scoreA !== null ? p.scoreA : '-';
      document.getElementById('det-scoreB').innerText = p.scoreB !== null ? p.scoreB : '-';
      document.getElementById('det-status').innerText = p.status;
      document.getElementById('det-progress').innerText = p.progress;
      document.getElementById('det-time').innerText = p.startTime;
    }
  </script>
</body>
</html>`;

app.use((req, res) => res.send(HTML_APP));

function obtenerPartidosReales() {
  return new Promise((resolve) => {
    // Generar la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];

    const options = {
      hostname: 'thesportsdb.p.rapidapi.com',
      path: `/eventsday.php?d=${hoy}&s=Soccer`,
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
            const partidos = json.events.map((p, idx) => {
              const horaInicio = p.strTime ? p.strTime.substring(0, 5) + ' hs' : 'Horario a confirmar';
              const enVivo = p.strStatus === 'In Progress' || p.strProgress;
              
              return {
                id: String(p.idEvent || idx + 1),
                league: p.strLeague || 'Fútbol Profesional',
                teamA: p.strHomeTeam || 'Local',
                teamB: p.strAwayTeam || 'Visitante',
                scoreA: p.intHomeScore !== null && p.intHomeScore !== "" ? parseInt(p.intHomeScore) : null,
                scoreB: p.intAwayScore !== null && p.intAwayScore !== "" ? parseInt(p.intAwayScore) : null,
                startTime: horaInicio,
                status: enVivo ? `🔴 EN VIVO (${p.strProgress || 'En juego'})` : `⏰ Inicio: ${horaInicio}`,
                progress: p.strProgress || p.strStatus || 'Programado'
              };
            });
            return resolve(partidos);
          }
        } catch (e) {}
        // Si no hay partidos en la fecha, devuelve lista vacía sin simulaciones
        resolve([]);
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

setInterval(async () => {
  const matches = await obtenerPartidosReales();
  const payload = JSON.stringify(matches);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}, 15000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

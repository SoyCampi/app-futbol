const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

// Interfaz Web de Agenda de Hoy con Actualización Continua
const HTML_APP = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda de Partidos de Hoy</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #121212; color: #fff; margin: 0; padding: 15px; }
    .container { max-width: 440px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    h2 { font-size: 1.3rem; color: #00ff88; margin: 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #aaa; background: #1e1e1e; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid #333; }
    .pulse { width: 10px; height: 10px; background: #00ff88; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #1e1e1e; padding: 14px 16px; border-radius: 14px; margin-bottom: 12px; border: 1px solid #2a2a2a; }
    .league-title { font-size: 0.75rem; color: #00ff88; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; letter-spacing: 0.5px; }
    .teams { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 0.95rem; }
    .team-name { width: 38%; }
    .team-left { text-align: left; }
    .team-right { text-align: right; }
    .score { color: #fff; font-size: 1.1rem; font-weight: 800; background: #121212; padding: 4px 10px; border-radius: 6px; border: 1px solid #333; }
    
    .status-container { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #282828; font-size: 0.8rem; }
    .time-badge { color: #ffcc00; font-weight: bold; }
    .live-badge { color: #ff0055; font-weight: bold; background: rgba(255,0,85,0.15); padding: 2px 8px; border-radius: 6px; }
    .finished-badge { color: #888; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2><span class="pulse"></span> Agenda de Hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando fecha...</div>
    </div>
    <div id="matches-container">Obteniendo fixture en vivo...</div>
  </div>

  <script>
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(\`\${protocol}//\${location.host}\`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      document.getElementById('fecha-hoy').innerText = data.fecha;
      renderizarAgenda(data.partidos);
    };

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos || partidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding: 30px 0;">No hay encuentros agendados para la jornada de hoy.</p>';
        return;
      }

      container.innerHTML = partidos.map(p => {
        let badgeEstado = \`<span class="time-badge">⏰ \${p.hora} hs</span>\`;
        if (p.enVivo) {
          badgeEstado = \`<span class="live-badge">🔴 EN VIVO \${p.minuto ? "(" + p.minuto + "')" : ""}</span>\`;
        } else if (p.finalizado) {
          badgeEstado = \`<span class="finished-badge">FINALIZADO</span>\`;
        }

        return \`
          <div class="match-card">
            <div class="league-title">\${p.liga}</div>
            <div class="teams">
              <span class="team-name team-left">\${p.local}</span>
              <span class="score">\${p.golesLocal !== null ? p.golesLocal : '-'} : \${p.golesVisitante !== null ? p.golesVisitante : '-'}</span>
              <span class="team-name team-right">\${p.visitante}</span>
            </div>
            <div class="status-container">
              \${badgeEstado}
              <span style="color: #666;">\${p.estadoText}</span>
            </div>
          </div>
        \`;
      }).join('');
    }
  </script>
</body>
</html>`;

app.use((req, res) => res.send(HTML_APP));

function formatearHoraArgentina(utcDateStr, utcTimeStr) {
  if (!utcTimeStr) return 'A confirmar';
  try {
    const fullIso = `${utcDateStr}T${utcTimeStr}Z`;
    const dateObj = new Date(fullIso);
    return dateObj.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return utcTimeStr.substring(0, 5);
  }
}

function obtenerAgendaHoy() {
  return new Promise((resolve) => {
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
            const partidos = json.events.map((p) => {
              const horaLocal = formatearHoraArgentina(p.dateEvent || hoy, p.strTime);
              const enVivo = p.strStatus === 'In Progress' || (p.strProgress && p.strProgress !== '');
              const finalizado = p.strStatus === 'Match Finished' || p.strStatus === 'FT';

              return {
                id: p.idEvent,
                liga: p.strLeague || 'Fútbol',
                local: p.strHomeTeam || 'Local',
                visitante: p.strAwayTeam || 'Visitante',
                golesLocal: p.intHomeScore !== null && p.intHomeScore !== "" ? parseInt(p.intHomeScore) : null,
                golesVisitante: p.intAwayScore !== null && p.intAwayScore !== "" ? parseInt(p.intAwayScore) : null,
                hora: horaLocal,
                enVivo: enVivo,
                finalizado: finalizado,
                minuto: p.strProgress || null,
                estadoText: enVivo ? 'En disputa' : (finalizado ? 'Partido terminado' : 'Programado')
              };
            });

            // Formatear la fecha actual de forma legible para la cabecera
            const fechaStr = new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'America/Argentina/Buenos_Aires'
            });

            return resolve({ fecha: fechaStr, partidos: partidos });
          }
        } catch (e) {}
        
        const fechaStr = new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Argentina/Buenos_Aires'
        });
        resolve({ fecha: fechaStr, partidos: [] });
      });
    });

    req.on('error', () => {
      const fechaStr = new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      resolve({ fecha: fechaStr, partidos: [] });
    });
    
    req.end();
  });
}

// Consultar la API cada 10 segundos y transmitir a todos los dispositivos conectados
setInterval(async () => {
  const agendaData = await obtenerAgendaHoy();
  const payload = JSON.stringify(agendaData);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

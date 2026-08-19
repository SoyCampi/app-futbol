const express = require('express');
const https = require('https');

const app = express();

// API Key gratuita de Football-Data.org
const API_KEY = '8a3a41b212f74151b7a6378e9064c12a';

function formatearHoraArgentina(utcDateStr) {
  if (!utcDateStr) return 'A confirmar';
  try {
    const dateObj = new Date(utcDateStr);
    return dateObj.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return 'A confirmar';
  }
}

function obtenerAgendaHoy() {
  return new Promise((resolve) => {
    // Formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];

    const options = {
      hostname: 'api.football-data.org',
      path: `/v4/matches?dateFrom=${hoy}&dateTo=${hoy}`,
      method: 'GET',
      headers: {
        'X-Auth-Token': API_KEY,
        'User-Agent': 'NodeJSApp'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const fechaStr = new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Argentina/Buenos_Aires'
        });

        try {
          const json = JSON.parse(data);
          if (json.matches && json.matches.length > 0) {
            const partidos = json.matches.map((p) => {
              const horaLocal = formatearHoraArgentina(p.utcDate);
              const enVivo = p.status === 'IN_PLAY' || p.status === 'PAUSED' || p.status === 'HALF_TIME';
              const finalizado = p.status === 'FINISHED';

              return {
                id: p.id,
                liga: p.competition ? p.competition.name : 'Fútbol Internacional',
                local: p.homeTeam ? p.homeTeam.shortName || p.homeTeam.name : 'Local',
                visitante: p.awayTeam ? p.awayTeam.shortName || p.awayTeam.name : 'Visitante',
                golesLocal: p.score && p.score.fullTime ? p.score.fullTime.home : null,
                golesVisitante: p.score && p.score.fullTime ? p.score.fullTime.away : null,
                hora: horaLocal,
                enVivo: enVivo,
                finalizado: finalizado,
                estadoText: enVivo ? 'En juego' : (finalizado ? 'Finalizado' : 'Programado')
              };
            });
            return resolve({ fecha: fechaStr, partidos: partidos });
          }
        } catch (e) {}

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

// Endpoint de la API
app.get('/api/partidos', async (req, res) => {
  const data = await obtenerAgendaHoy();
  res.json(data);
});

// Interfaz Web
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda de Partidos</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #121212; color: #fff; margin: 0; padding: 15px; }
    .container { max-width: 440px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    h2 { font-size: 1.3rem; color: #00ff88; margin: 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #aaa; background: #1e1e1e; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid #333; text-transform: capitalize; }
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
      <h2><span class="pulse"></span> Agenda Real de Hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando fecha...</div>
    </div>
    <div id="matches-container">Cargando agenda de partidos...</div>
  </div>

  <script>
    async function cargarPartidos() {
      try {
        const res = await fetch('/api/partidos');
        const data = await res.json();
        
        document.getElementById('fecha-hoy').innerText = data.fecha;
        renderizarAgenda(data.partidos);
      } catch (err) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#888;">Actualizando conexión...</p>';
      }
    }

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos || partidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; padding: 30px 0;">No hay encuentros agendados para la jornada de hoy.</p>';
        return;
      }

      container.innerHTML = partidos.map(p => {
        let badgeEstado = \`<span class="time-badge">⏰ \${p.hora} hs</span>\`;
        if (p.enVivo) {
          badgeEstado = \`<span class="live-badge">🔴 EN VIVO</span>\`;
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

    cargarPartidos();
    setInterval(cargarPartidos, 10000);
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

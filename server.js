const express = require('express');
const https = require('https');

const app = express();

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

function consultarESPN(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function obtenerAgendaHoy() {
  const fechaObj = new Date();
  const hoyStr = fechaObj.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(/-/g, '');
  const fechaHeader = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires'
  });

  // Endpoints públicos oficiales de ESPN (Agenda de Fútbol)
  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=${hoyStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard?dates=${hoyStr}`
  ];

  const resultados = await Promise.all(urls.map(consultarESPN));
  const partidosMap = new Map();

  resultados.forEach(json => {
    if (json && json.events && json.events.length > 0) {
      const nombreLigaGlobal = json.leagues && json.leagues[0] ? json.leagues[0].name : 'Fútbol Profesional';
      
      json.events.forEach(item => {
        if (partidosMap.has(item.id)) return;

        const comp = item.competitions && item.competitions[0];
        if (!comp) return;

        const homeTeam = comp.competitors ? comp.competitors.find(c => c.homeAway === 'home') : null;
        const awayTeam = comp.competitors ? comp.competitors.find(c => c.homeAway === 'away') : null;

        const statusState = item.status && item.status.type ? item.status.type.state : 'pre';
        const enVivo = statusState === 'in';
        const finalizado = statusState === 'post';
        const horaLocal = formatearHoraArgentina(item.date);

        partidosMap.set(item.id, {
          id: item.id,
          liga: json.leagues && json.leagues[0] ? json.leagues[0].name : nombreLigaGlobal,
          local: homeTeam && homeTeam.team ? homeTeam.team.shortDisplayName || homeTeam.team.displayName : 'Local',
          logoLocal: homeTeam && homeTeam.team ? homeTeam.team.logo || '' : '',
          visitante: awayTeam && awayTeam.team ? awayTeam.team.shortDisplayName || awayTeam.team.displayName : 'Visitante',
          logoVisitante: awayTeam && awayTeam.team ? awayTeam.team.logo || '' : '',
          golesLocal: homeTeam && homeTeam.score !== undefined ? homeTeam.score : '-',
          golesVisitante: awayTeam && awayTeam.score !== undefined ? awayTeam.score : '-',
          hora: horaLocal,
          enVivo: enVivo,
          finalizado: finalizado,
          minuto: item.status && item.status.displayClock ? item.status.displayClock + "'" : null,
          estadoText: enVivo ? 'En juego' : (finalizado ? 'Finalizado' : 'Programado')
        });
      });
    }
  });

  const partidos = Array.from(partidosMap.values());
  // Ordenar por partidos en vivo primero, luego por horario de inicio
  partidos.sort((a, b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora));

  return { fecha: fechaHeader, partidos: partidos };
}

// Endpoint API local
app.get('/api/partidos', async (req, res) => {
  const data = await obtenerAgendaHoy();
  res.json(data);
});

// Interfaz Web Frontend
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda de Partidos de Hoy</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #121212; color: #fff; margin: 0; padding: 15px; }
    .container { max-width: 450px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    h2 { font-size: 1.3rem; color: #00ff88; margin: 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #aaa; background: #1e1e1e; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid #333; text-transform: capitalize; }
    .pulse { width: 10px; height: 10px; background: #00ff88; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #1e1e1e; padding: 14px 16px; border-radius: 14px; margin-bottom: 12px; border: 1px solid #2a2a2a; }
    .league-title { font-size: 0.72rem; color: #00ff88; text-transform: uppercase; margin-bottom: 10px; font-weight: 700; letter-spacing: 0.5px; }
    
    .teams-container { display: flex; justify-content: space-between; align-items: center; }
    .team-box { display: flex; align-items: center; gap: 8px; width: 40%; }
    .team-left { justify-content: flex-start; text-align: left; }
    .team-right { justify-content: flex-end; text-align: right; }
    
    .club-logo { width: 28px; height: 28px; object-fit: contain; }
    .team-name { font-size: 0.9rem; font-weight: 600; line-height: 1.2; }
    .score { color: #fff; font-size: 1.1rem; font-weight: 800; background: #121212; padding: 4px 10px; border-radius: 6px; border: 1px solid #333; }
    
    .status-container { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid #282828; font-size: 0.8rem; }
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
    <div id="matches-container">Obteniendo agenda de encuentros...</div>
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
          badgeEstado = \`<span class="live-badge">🔴 EN VIVO \${p.minuto ? "(" + p.minuto + ")" : ""}</span>\`;
        } else if (p.finalizado) {
          badgeEstado = \`<span class="finished-badge">FINALIZADO</span>\`;
        }

        return \`
          <div class="match-card">
            <div class="league-title">\${p.liga}</div>
            <div class="teams-container">
              <div class="team-box team-left">
                \${p.logoLocal ? \`<img src="\${p.logoLocal}" class="club-logo" alt="" onerror="this.style.display='none'">\` : ''}
                <span class="team-name">\${p.local}</span>
              </div>
              <span class="score">\${p.golesLocal} : \${p.golesVisitante}</span>
              <div class="team-box team-right">
                <span class="team-name">\${p.visitante}</span>
                \${p.logoVisitante ? \`<img src="\${p.logoVisitante}" class="club-logo" alt="" onerror="this.style.display='none'">\` : ''}
              </div>
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
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

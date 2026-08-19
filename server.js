const express = require('express');
const https = require('https');

const app = express();

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

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
    // Generar la fecha de hoy en Argentina (YYYY-MM-DD)
    const fechaObj = new Date();
    const hoyStr = fechaObj.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

    const options = {
      hostname: 'api-football-v1.p.rapidapi.com',
      path: `/v3/fixtures?date=${hoyStr}`,
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const fechaHeader = new Date().toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: 'America/Argentina/Buenos_Aires'
        });

        try {
          const json = JSON.parse(data);
          if (json.response && json.response.length > 0) {
            const partidos = json.response.map((item) => {
              const fixture = item.fixture;
              const league = item.league;
              const teams = item.teams;
              const goals = item.goals;
              const statusShort = fixture.status ? fixture.status.short : 'NS';

              const enVivo = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort);
              const finalizado = ['FT', 'AET', 'PEN'].includes(statusShort);
              const horaLocal = formatearHoraArgentina(fixture.date);

              return {
                id: fixture.id,
                liga: `${league.country ? league.country + ' - ' : ''}${league.name}`,
                local: teams.home.name,
                logoLocal: teams.home.logo,
                visitante: teams.away.name,
                logoVisitante: teams.away.logo,
                golesLocal: goals.home !== null ? goals.home : '-',
                golesVisitante: goals.away !== null ? goals.away : '-',
                hora: horaLocal,
                enVivo: enVivo,
                finalizado: finalizado,
                minuto: fixture.status.elapsed ? fixture.status.elapsed + "'" : null,
                estadoText: enVivo ? 'En juego' : (finalizado ? 'Finalizado' : 'Programado')
              };
            });

            // Ordenar por partidos en vivo primero, luego por horario
            partidos.sort((a, b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora));

            return resolve({ fecha: fechaHeader, partidos: partidos });
          }
        } catch (e) {}

        resolve({ fecha: fechaHeader, partidos: [] });
      });
    });

    req.on('error', () => {
      const fechaHeader = new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires'
      });
      resolve({ fecha: fechaHeader, partidos: [] });
    });

    req.end();
  });
}

// API Route
app.get('/api/partidos', async (req, res) => {
  const data = await obtenerAgendaHoy();
  res.json(data);
});

// App Frontend HTML
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
    
    .club-logo { width: 26px; height: 26px; object-fit: contain; }
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
                <img src="\${p.logoLocal}" class="club-logo" alt="" onerror="this.style.display='none'">
                <span class="team-name">\${p.local}</span>
              </div>
              <span class="score">\${p.golesLocal} : \${p.golesVisitante}</span>
              <div class="team-box team-right">
                <span class="team-name">\${p.visitante}</span>
                <img src="\${p.logoVisitante}" class="club-logo" alt="" onerror="this.style.display='none'">
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

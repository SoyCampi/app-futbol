const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint único del backend que consume ESPN de forma segura sin CORS
app.get('/api/live-data', async (req, res) => {
  const hoyStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const urlScoreboard = `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${hoyStr}`;
  const urlStandings = `https://site.api.espn.com/apis/v2/sports/soccer/esp.1/standings`;

  try {
    const [resScoreboard, resStandings] = await Promise.allSettled([
      fetch(urlScoreboard).then(r => r.json()),
      fetch(urlStandings).then(r => r.json())
    ]);

    let matchData = null;
    let nextMatches = [];

    if (resScoreboard.status === 'fulfilled' && resScoreboard.value?.events) {
      const events = resScoreboard.value.events;
      
      // Buscar primero uno en vivo, sino el primero del día
      const event = events.find(e => e.status?.type?.state === 'in') || events[0];

      if (event) {
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find(c => c.homeAway === 'home');
        const away = comp?.competitors?.find(c => c.homeAway === 'away');

        matchData = {
          id: event.id,
          liga: resScoreboard.value.leagues?.[0]?.name || 'LaLiga',
          local: home?.team?.shortDisplayName || home?.team?.name || 'Local',
          logoLocal: home?.team?.logo || home?.team?.logos?.[0]?.href || '',
          visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
          logoVisitante: away?.team?.logo || away?.team?.logos?.[0]?.href || '',
          golesLocal: home?.score ?? '0',
          golesVisitante: away?.score ?? '0',
          minuto: event.status?.displayClock ? event.status.displayClock : (event.status?.type?.shortDetail || '0:00'),
          enVivo: event.status?.type?.state === 'in',
          finalizado: event.status?.type?.state === 'post'
        };
      }

      // Obtener los siguientes partidos programados
      nextMatches = events.slice(1, 3).map(e => {
        const c = e.competitions?.[0];
        const h = c?.competitors?.find(x => x.homeAway === 'home');
        const a = c?.competitors?.find(x => x.homeAway === 'away');
        const fecha = new Date(e.date);
        return {
          local: h?.team?.shortDisplayName || 'Local',
          logoLocal: h?.team?.logo || '',
          visitante: a?.team?.shortDisplayName || 'Visitante',
          logoVisitante: a?.team?.logo || '',
          dia: fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' }),
          hora: fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
      });
    }

    // Procesar Posiciones
    let standings = [];
    if (resStandings.status === 'fulfilled' && resStandings.value?.children?.[0]?.standings?.entries) {
      const entries = resStandings.value.children[0].standings.entries;
      standings = entries.slice(0, 5).map((item, idx) => {
        const stats = item.stats || [];
        const getStat = (name) => stats.find(s => s.name === name)?.value ?? 0;
        return {
          pos: idx + 6, // Rango de posiciones simulado como en la captura
          nombre: item.team?.shortDisplayName || item.team?.name,
          logo: item.team?.logos?.[0]?.href || '',
          pj: getStat('gamesPlayed'),
          g: getStat('wins'),
          e: getStat('ties'),
          p: getStat('losses'),
          dg: getStat('pointDifferential'),
          pts: getStat('points')
        };
      });
    }

    res.json({ match: matchData, nextMatches, standings });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar datos del partido' });
  }
});

// Vista principal estilizada exactamente como Google Sports
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Sports Widget Style</title>
  <style>
    * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body { background-color: #f8f9fa; color: #202124; margin: 0; padding: 20px; display: flex; justify-content: center; }
    
    .widget-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; width: 100%; max-width: 820px; }
    @media (max-width: 768px) { .widget-grid { grid-template-columns: 1fr; } }

    .card { background: #ffffff; border-radius: 20px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(60,64,67,0.08), 0 1px 2px rgba(60,64,67,0.16); border: 1px solid #e8eaed; }

    /* Estilos del Partido Principal */
    .league-header { font-size: 0.8rem; color: #5f6368; font-weight: 500; margin-bottom: 12px; }
    .scoreboard { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 20px 0; }
    .team-col { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
    .team-logo { width: 54px; height: 54px; object-fit: contain; }
    .team-name { font-size: 0.95rem; font-weight: 500; color: #202124; text-align: center; }
    
    .score-center { display: flex; align-items: center; gap: 16px; }
    .score-num { font-size: 2.5rem; font-weight: 400; color: #202124; }
    .timer-badge { font-size: 0.95rem; font-weight: 600; color: #1e8e3e; margin: 0 4px; }

    /* Bloque de próximos partidos abajo */
    .next-matches { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #f1f3f4; padding-top: 14px; }
    .mini-match { display: flex; align-items: center; justify-content: space-between; background: #f8f9fa; padding: 8px 12px; border-radius: 12px; font-size: 0.78rem; }
    .mini-teams { display: flex; flex-direction: column; gap: 4px; font-weight: 500; }
    .mini-team-row { display: flex; align-items: center; gap: 6px; }
    .mini-logo { width: 16px; height: 16px; object-fit: contain; }
    .mini-time { color: #5f6368; text-align: right; font-size: 0.72rem; }

    /* Tabla de Posiciones estilo Google */
    .table-title { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; font-weight: 600; color: #202124; margin-bottom: 12px; }
    .live-dot { color: #1e8e3e; font-size: 0.75rem; font-weight: 500; }
    
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { color: #70757a; font-weight: 400; padding: 6px 4px; text-align: center; }
    th:nth-child(2) { text-align: left; }
    td { padding: 8px 4px; text-align: center; color: #3c4043; border-top: 1px solid #f1f3f4; }
    td:nth-child(2) { text-align: left; font-weight: 500; color: #202124; }
    tr.highlight { background-color: #e8f0fe; font-weight: 600; }
    
    .full-schedule-btn { display: block; width: 100%; margin-top: 16px; background: #1a73e8; color: #fff; border: none; padding: 10px; border-radius: 20px; font-weight: 500; font-size: 0.85rem; cursor: pointer; text-align: center; text-decoration: none; }
  </style>
</head>
<body>
  <div class="widget-grid">
    
    <!-- Columna Izquierda: Partido Principal -->
    <div class="card">
      <div class="league-header" id="liga-nombre">LaLiga</div>
      
      <div class="scoreboard" id="match-box">
        <div class="team-col">
          <img id="logo-home" src="" class="team-logo" alt="">
          <span id="name-home" class="team-name">--</span>
        </div>
        <div class="score-center">
          <span id="score-home" class="score-num">0</span>
          <span id="match-time" class="timer-badge">0:00</span>
          <span id="score-away" class="score-num">0</span>
        </div>
        <div class="team-col">
          <img id="logo-away" src="" class="team-logo" alt="">
          <span id="name-away" class="team-name">--</span>
        </div>
      </div>

      <!-- Próximos partidos -->
      <div class="next-matches" id="next-matches-box">
        <!-- Render dinámico -->
      </div>
      
      <button class="full-schedule-btn">Programación completa de partidos ›</button>
    </div>

    <!-- Columna Derecha: Posiciones En Vivo -->
    <div class="card">
      <div class="table-title">
        <span>Posiciones</span>
        <span class="live-dot">En vivo • LaLiga</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Club</th>
            <th></th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody id="standings-body">
          <!-- Render dinámico -->
        </tbody>
      </table>
    </div>

  </div>

  <script>
    async function actualizarWidget() {
      try {
        const res = await fetch('/api/live-data');
        const data = await res.json();

        // 1. Render Partido Principal
        if (data.match) {
          const m = data.match;
          document.getElementById('liga-nombre').innerText = m.liga;
          document.getElementById('name-home').innerText = m.local;
          document.getElementById('name-away').innerText = m.visitante;
          document.getElementById('logo-home').src = m.logoLocal;
          document.getElementById('logo-away').src = m.logoVisitante;
          document.getElementById('score-home').innerText = m.golesLocal;
          document.getElementById('score-away').innerText = m.golesVisitante;
          document.getElementById('match-time').innerText = m.minuto;
        }

        // 2. Render Próximos Partidos
        const nextBox = document.getElementById('next-matches-box');
        if (data.nextMatches && data.nextMatches.length) {
          nextBox.innerHTML = data.nextMatches.map(nm => \`
            <div class="mini-match">
              <div class="mini-teams">
                <div class="mini-team-row"><img src="\${nm.logoLocal}" class="mini-logo"> \${nm.local}</div>
                <div class="mini-team-row"><img src="\${nm.logoVisitante}" class="mini-logo"> \${nm.visitante}</div>
              </div>
              <div class="mini-time">\${nm.dia}<br>\${nm.hora}</div>
            </div>
          \`).join('');
        }

        // 3. Render Tabla de Posiciones
        const standingsBody = document.getElementById('standings-body');
        if (data.standings && data.standings.length) {
          standingsBody.innerHTML = data.standings.map(s => \`
            <tr class="\${s.nombre.includes('Atlético') ? 'highlight' : ''}">
              <td style="color:#70757a;">\${s.pos}</td>
              <td>\${s.nombre}</td>
              <td>\${s.pj}</td>
              <td>\${s.g}</td>
              <td>\${s.e}</td>
              <td>\${s.p}</td>
              <td>\${s.dg}</td>
              <td><strong>\${s.pts}</strong></td>
            </tr>
          \`).join('');
        }

      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    }

    actualizarWidget();
    setInterval(actualizarWidget, 10000); // Refresco en vivo cada 10 seg
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));

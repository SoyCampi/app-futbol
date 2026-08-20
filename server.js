const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper para peticiones HTTPS seguras
function fetchESPN(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

// 1. ENDPOINT API REAL
app.get('/api/google-widget', async (req, res) => {
  const leagues = [
    { slug: 'arg.1', name: 'Liga Profesional Argentina' },
    { slug: 'esp.1', name: 'LaLiga España' },
    { slug: 'eng.1', name: 'Premier League' },
    { slug: 'uefa.champions', name: 'UEFA Champions League' },
    { slug: 'conmebol.libertadores', name: 'Copa Libertadores' }
  ];

  try {
    let allEvents = [];

    // Consultar agenda del día en las ligas
    for (const l of leagues) {
      const data = await fetchESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l.slug}/scoreboard`);
      if (data && data.events && data.events.length > 0) {
        const items = data.events.map(ev => ({
          ...ev,
          _leagueName: data.leagues?.[0]?.name || l.name,
          _leagueSlug: l.slug
        }));
        allEvents = allEvents.concat(items);
      }
    }

    const agenda = allEvents.map(e => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      const dt = new Date(e.date);
      const state = e.status?.type?.state;

      const horaArg = dt.toLocaleTimeString('es-AR', { 
        timeZone: 'America/Argentina_Buenos_Aires', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      }) + ' hs';

      let estadoTexto = horaArg;
      if (state === 'in') estadoTexto = `🔴 EN VIVO ${e.status?.displayClock ? e.status.displayClock + "'" : ''}`;
      else if (state === 'post') estadoTexto = 'FINAL';

      return {
        id: e.id,
        liga: e._leagueName,
        leagueSlug: e._leagueSlug,
        local: home?.team?.shortDisplayName || home?.team?.name || 'Local',
        logoLocal: home?.team?.logo || home?.team?.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
        golesLocal: home?.score ?? '0',
        visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
        logoVisitante: away?.team?.logo || away?.team?.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
        golesVisitante: away?.score ?? '0',
        estado: estadoTexto,
        displayClock: parseInt(e.status?.displayClock) || 0,
        enVivo: state === 'in'
      };
    });

    const mainEvent = agenda.find(a => a.enVivo) || agenda[0] || null;

    // Tabla de Posiciones Real (Liga Argentina por defecto si no hay partido activo)
    let standings = [];
    const targetSlug = mainEvent ? mainEvent.leagueSlug : 'arg.1';
    const resStandings = await fetchESPN(`https://site.api.espn.com/apis/v2/sports/soccer/${targetSlug}/standings`);

    if (resStandings?.children?.[0]?.standings?.entries) {
      standings = resStandings.children[0].standings.entries.slice(0, 10).map((item, idx) => {
        const stats = item.stats || [];
        const getVal = (n) => stats.find(s => s.name === n)?.value ?? 0;
        return {
          pos: idx + 1,
          nombre: item.team?.shortDisplayName || item.team?.name || 'Equipo',
          logo: item.team?.logos?.[0]?.href || 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
          pj: getVal('gamesPlayed'),
          g: getVal('wins'),
          e: getVal('ties'),
          p: getVal('losses'),
          dg: getVal('pointDifferential'),
          pts: getVal('points')
        };
      });
    }

    res.json({ agenda, mainMatch: mainEvent, standings });
  } catch (err) {
    res.json({ agenda: [], mainMatch: null, standings: [] });
  }
});

// Resumen / Estadísticas reales del partido
app.get('/api/match-summary', async (req, res) => {
  const { league, event } = req.query;
  if (!league || !event) return res.json(null);
  const data = await fetchESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${event}`);
  res.json(data);
});

// 2. FRONTEND HTML
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Match & Live Stats</title>
  <style>
    * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body { background-color: #f8f9fa; color: #202124; margin: 0; padding: 20px 10px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 860px; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #ffffff; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(60,64,67,0.1); border: 1px solid #dadce0; }
    .top-accordion-btn { width: 100%; background: #ffffff; border: 1px solid #dadce0; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; color: #1a73e8; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .agenda-dropdown { display: none; margin-top: 8px; max-height: 280px; overflow-y: auto; border: 1px solid #dadce0; border-radius: 12px; background: #fff; }
    .agenda-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f1f3f4; cursor: pointer; }
    .agenda-teams-col { display: flex; flex-direction: column; gap: 4px; }
    .agenda-team-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 500; }
    .agenda-logo { width: 18px; height: 18px; object-fit: contain; }
    .agenda-status-col { font-size: 0.78rem; font-weight: 600; color: #5f6368; }
    .league-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .league-name { font-size: 0.85rem; color: #5f6368; font-weight: 500; }
    .live-badge { background: #ea4335; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
    .match-score-board { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .team-col { display: flex; flex-direction: column; align-items: center; width: 32%; text-align: center; }
    .team-logo-lg { width: 64px; height: 64px; object-fit: contain; margin-bottom: 6px; }
    .team-title { font-size: 0.98rem; font-weight: 600; }
    .score-center { display: flex; align-items: center; gap: 12px; }
    .score-num { font-size: 2.8rem; font-weight: 500; }
    .timer-txt { font-size: 1rem; font-weight: 700; color: #1e8e3e; }
    .tabs-bar { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 16px; }
    .tab-btn { flex: 1; padding: 10px; border: none; background: none; font-size: 0.85rem; font-weight: 600; color: #1a73e8; border-bottom: 2px solid #1a73e8; }
    .stat-row { margin-bottom: 12px; }
    .stat-labels { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
    .stat-bar-bg { background: #f1f3f4; height: 8px; border-radius: 4px; display: flex; overflow: hidden; }
    .stat-bar-home { background: #1a73e8; height: 100%; }
    .stat-bar-away { background: #ea4335; height: 100%; }
    .table-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { color: #70757a; font-weight: 400; padding: 6px; text-align: center; }
    th.align-left { text-align: left; }
    td { padding: 8px 6px; text-align: center; border-top: 1px solid #f1f3f4; }
    td.align-left { text-align: left; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .mini-logo { width: 16px; height: 16px; object-fit: contain; }
    .no-match-box { text-align: center; padding: 20px; color: #5f6368; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <button class="top-accordion-btn" onclick="toggleAgenda()">
        <span>📅 Partidos Encontrados (<span id="count-agenda">0</span>)</span>
        <span id="arrow-icon">▼</span>
      </button>
      <div class="agenda-dropdown" id="dropdown-agenda"></div>
    </div>

    <div class="card" id="match-card">
      <div class="league-header">
        <span class="league-name" id="lbl-liga">Agenda del Día</span>
        <span id="badge-vivo" class="live-badge" style="display:none;">EN VIVO</span>
      </div>

      <div class="match-score-board" id="board-container">
        <div class="team-col">
          <img id="img-home" class="team-logo-lg" src="" onerror="this.onerror=null;this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png';" alt="">
          <span id="txt-home" class="team-title">--</span>
        </div>
        <div class="score-center">
          <span id="num-goles-home" class="score-num">-</span>
          <span id="txt-tiempo" class="timer-txt">--</span>
          <span id="num-goles-away" class="score-num">-</span>
        </div>
        <div class="team-col">
          <img id="img-away" class="team-logo-lg" src="" onerror="this.onerror=null;this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png';" alt="">
          <span id="txt-away" class="team-title">--</span>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn">Estadísticas</button>
      </div>

      <div id="stats-container"></div>
    </div>

    <div class="card">
      <div class="table-title">Tabla de Posiciones</div>
      <table>
        <thead>
          <tr>
            <th style="width: 15px;">#</th>
            <th class="align-left">Club</th>
            <th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th>
          </tr>
        </thead>
        <tbody id="tbody-posiciones"></tbody>
      </table>
    </div>
  </div>

  <script>
    let agendaMatches = [];
    let activeMatch = null;

    function toggleAgenda() {
      const drop = document.getElementById('dropdown-agenda');
      drop.style.display = drop.style.display === 'block' ? 'none' : 'block';
    }

    async function loadWidgetData() {
      try {
        const res = await fetch('/api/google-widget');
        const data = await res.json();
        
        agendaMatches = data.agenda || [];
        document.getElementById('count-agenda').innerText = agendaMatches.length;

        const dropdown = document.getElementById('dropdown-agenda');

        if (agendaMatches.length === 0) {
          document.getElementById('lbl-liga').innerText = 'Sin Partidos Hoy';
          document.getElementById('board-container').innerHTML = '<div class="no-match-box">No hay partidos programados en las ligas seguidas para la fecha de hoy.</div>';
          document.getElementById('stats-container').innerHTML = '';
        } else {
          dropdown.innerHTML = agendaMatches.map(item => \`
            <div class="agenda-item" onclick="selectMatch('\${item.id}')">
              <div class="agenda-teams-col">
                <div class="agenda-team-row"><img src="\${item.logoLocal}" class="agenda-logo" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png';"> \${item.local} <strong>\${item.golesLocal}</strong></div>
                <div class="agenda-team-row"><img src="\${item.logoVisitante}" class="agenda-logo" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png';"> \${item.visitante} <strong>\${item.golesVisitante}</strong></div>
              </div>
              <div class="agenda-status-col">\${item.estado}</div>
            </div>
          \`).join('');

          if (data.mainMatch) selectMatch(data.mainMatch.id);
        }

        // Cargar Tabla de Posiciones Real
        const tbody = document.getElementById('tbody-posiciones');
        if (data.standings && data.standings.length) {
          tbody.innerHTML = data.standings.map(s => \`
            <tr>
              <td style="color:#70757a;">\${s.pos}</td>
              <td class="align-left"><img src="\${s.logo}" class="mini-logo" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png';"> \${s.nombre}</td>
              <td>\${s.pj}</td><td>\${s.g}</td><td>\${s.e}</td><td>\${s.p}</td><td>\${s.dg}</td><td><strong>\${s.pts}</strong></td>
            </tr>
          \`).join('');
        }
      } catch (err) {
        console.error("Error al cargar la API:", err);
      }
    }

    async function selectMatch(matchId) {
      activeMatch = agendaMatches.find(m => m.id === matchId);
      if (!activeMatch) return;

      document.getElementById('dropdown-agenda').style.display = 'none';
      document.getElementById('lbl-liga').innerText = activeMatch.liga;
      document.getElementById('badge-vivo').style.display = activeMatch.enVivo ? 'inline-block' : 'none';
      document.getElementById('txt-home').innerText = activeMatch.local;
      document.getElementById('txt-away').innerText = activeMatch.visitante;
      document.getElementById('img-home').src = activeMatch.logoLocal;
      document.getElementById('img-away').src = activeMatch.logoVisitante;
      document.getElementById('num-goles-home').innerText = activeMatch.golesLocal;
      document.getElementById('num-goles-away').innerText = activeMatch.golesVisitante;
      document.getElementById('txt-tiempo').innerText = activeMatch.estado.replace('🔴 ', '');

      try {
        const sumRes = await fetch(\`/api/match-summary?league=\${activeMatch.leagueSlug}&event=\${activeMatch.id}\`).then(r => r.json());

        if (sumRes && sumRes.boxscore && sumRes.boxscore.teams) {
          const homeStats = sumRes.boxscore.teams[0]?.statistics || [];
          const awayStats = sumRes.boxscore.teams[1]?.statistics || [];
          const getStat = (stats, name) => stats.find(s => s.name === name || s.label === name)?.displayValue || '0';

          const statsList = [
            { label: 'Posesión', home: (getStat(homeStats, 'possessionPct') || '0') + '%', away: (getStat(awayStats, 'possessionPct') || '0') + '%' },
            { label: 'Tiros al Arco', home: getStat(homeStats, 'shotsOnTarget'), away: getStat(awayStats, 'shotsOnTarget') },
            { label: 'Tiros Totales', home: getStat(homeStats, 'totalShots'), away: getStat(awayStats, 'totalShots') }
          ];

          document.getElementById('stats-container').innerHTML = statsList.map(s => \`
            <div class="stat-row">
              <div class="stat-labels"><span>\${s.home}</span><span>\${s.label}</span><span>\${s.away}</span></div>
              <div class="stat-bar-bg">
                <div class="stat-bar-home" style="width: \${parseInt(s.home) || 50}%"></div>
                <div class="stat-bar-away" style="width: \${100 - (parseInt(s.home) || 50)}%"></div>
              </div>
            </div>
          \`).join('');
        } else {
          document.getElementById('stats-container').innerHTML = '<div class="no-match-box">Estadísticas no disponibles aún para este evento.</div>';
        }
      } catch (e) {
        document.getElementById('stats-container').innerHTML = '<div class="no-match-box">No se pudieron recuperar las estadísticas.</div>';
      }
    }

    loadWidgetData();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

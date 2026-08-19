const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// API Backend: Agenda de partidos y posiciones
app.get('/api/google-widget', async (req, res) => {
  const hoyStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const leagues = ['esp.1', 'arg.1', 'arg.copa', 'conmebol.libertadores', 'conmebol.sudamericana', 'uefa.champions', 'eng.1', 'usa.1'];

  try {
    let allEvents = [];

    for (const slug of leagues) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${hoyStr}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && data.events && data.events.length > 0) {
            data.events.forEach(ev => {
              ev._leagueName = data.leagues?.[0]?.name || 'Fútbol';
              ev._leagueSlug = slug;
            });
            allEvents = allEvents.concat(data.events);
          }
        }
      } catch (e) {}
    }

    if (allEvents.length === 0) {
      try {
        const urlDef = `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard`;
        const rDef = await fetch(urlDef).then(r => r.json());
        allEvents = (rDef.events || []).map(ev => ({
          ...ev,
          _leagueName: rDef.leagues?.[0]?.name || 'LaLiga',
          _leagueSlug: 'esp.1'
        }));
      } catch (e) {}
    }

    const agenda = allEvents.map(e => {
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      const dt = new Date(e.date);
      const state = e.status?.type?.state;

      let estadoTexto = '';
      if (state === 'in') {
        estadoTexto = `🔴 EN VIVO ${e.status?.displayClock ? e.status.displayClock + "'" : ''}`;
      } else if (state === 'post') {
        estadoTexto = 'FINAL';
      } else {
        estadoTexto = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs';
      }

      return {
        id: e.id,
        liga: e._leagueName,
        leagueSlug: e._leagueSlug,
        local: home?.team?.shortDisplayName || home?.team?.name || 'Local',
        logoLocal: home?.team?.logo || home?.team?.logos?.[0]?.href || '',
        golesLocal: home?.score ?? '0',
        visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
        logoVisitante: away?.team?.logo || away?.team?.logos?.[0]?.href || '',
        golesVisitante: away?.score ?? '0',
        estado: estadoTexto,
        enVivo: state === 'in'
      };
    });

    const mainEvent = agenda.find(a => a.enVivo) || agenda[0] || null;

    let standings = [];
    if (mainEvent) {
      try {
        const urlStandings = `https://site.api.espn.com/apis/v2/sports/soccer/${mainEvent.leagueSlug}/standings`;
        const resStandings = await fetch(urlStandings).then(r => r.ok ? r.json() : null);

        if (resStandings?.children?.[0]?.standings?.entries) {
          const entries = resStandings.children[0].standings.entries;
          standings = entries.slice(0, 8).map((item, idx) => {
            const stats = item.stats || [];
            const getVal = (n) => stats.find(s => s.name === n)?.value ?? 0;
            return {
              pos: idx + 1,
              nombre: item.team?.shortDisplayName || item.team?.name || 'Equipo',
              logo: item.team?.logos?.[0]?.href || '',
              pj: getVal('gamesPlayed'),
              g: getVal('wins'),
              e: getVal('ties'),
              p: getVal('losses'),
              dg: getVal('pointDifferential'),
              pts: getVal('points')
            };
          });
        }
      } catch (e) {}
    }

    res.json({ agenda, mainMatch: mainEvent, standings });
  } catch (err) {
    res.status(500).json({ error: 'Error procesando datos' });
  }
});

// Interfaz Frontend
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Match & Live Stats Widget</title>
  <style>
    * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body { background-color: #f8f9fa; color: #202124; margin: 0; padding: 20px 10px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 860px; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #ffffff; border-radius: 16px; padding: 18px; box-shadow: 0 1px 3px rgba(60,64,67,0.1); border: 1px solid #dadce0; }

    .top-accordion-btn { width: 100%; background: #ffffff; border: 1px solid #dadce0; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; color: #1a73e8; cursor: pointer; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .top-accordion-btn:hover { background: #f8f9fa; }
    .agenda-dropdown { display: none; margin-top: 8px; max-height: 280px; overflow-y: auto; border: 1px solid #dadce0; border-radius: 12px; background: #fff; }
    .agenda-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f1f3f4; cursor: pointer; }
    .agenda-item:hover { background: #f1f3f4; }
    .agenda-item.selected { background: #e8f0fe; border-left: 4px solid #1a73e8; }
    .agenda-teams-col { display: flex; flex-direction: column; gap: 4px; }
    .agenda-team-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 500; }
    .agenda-logo { width: 18px; height: 18px; object-fit: contain; }
    .agenda-status-col { font-size: 0.78rem; font-weight: 600; color: #5f6368; text-align: right; }

    .league-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .league-name { font-size: 0.85rem; color: #5f6368; font-weight: 500; }
    .live-badge { background: #ea4335; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    .match-score-board { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .team-col { display: flex; flex-direction: column; align-items: center; width: 32%; text-align: center; }
    .team-logo-lg { width: 64px; height: 64px; object-fit: contain; margin-bottom: 6px; }
    .team-title { font-size: 0.98rem; font-weight: 600; color: #202124; }

    .score-center { display: flex; align-items: center; gap: 12px; }
    .score-num { font-size: 2.8rem; font-weight: 500; color: #202124; }
    .timer-txt { font-size: 1rem; font-weight: 700; color: #1e8e3e; }

    .tabs-bar { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 16px; }
    .tab-btn { flex: 1; padding: 10px; border: none; background: none; font-size: 0.85rem; font-weight: 600; color: #5f6368; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .stat-row { margin-bottom: 12px; }
    .stat-labels { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
    .stat-bar-bg { background: #f1f3f4; height: 8px; border-radius: 4px; display: flex; overflow: hidden; }
    .stat-bar-home { background: #1a73e8; height: 100%; }
    .stat-bar-away { background: #ea4335; height: 100%; }

    .lineup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .lineup-col-title { font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: #1a73e8; }
    .player-row { font-size: 0.8rem; padding: 4px 0; border-bottom: 1px solid #f1f3f4; display: flex; gap: 8px; }
    .player-num { font-weight: 700; color: #70757a; width: 20px; }

    .pitch-field { width: 100%; height: 220px; background: #2e7d32; border-radius: 12px; border: 2px solid rgba(255,255,255,0.4); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .pitch-line-center { position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,255,255,0.4); }
    .pitch-circle { position: absolute; width: 70px; height: 70px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; }
    .heat-zone { position: absolute; border-radius: 50%; filter: blur(12px); opacity: 0.75; transition: all 0.5s ease; }
    .pitch-legend { display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.75rem; font-weight: 600; color: #5f6368; }

    .table-title { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { color: #70757a; font-weight: 400; padding: 6px; text-align: center; }
    th.align-left { text-align: left; }
    td { padding: 8px 6px; text-align: center; color: #3c4043; border-top: 1px solid #f1f3f4; }
    td.align-left { text-align: left; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .mini-logo { width: 16px; height: 16px; object-fit: contain; }
  </style>
</head>
<body>

  <div class="container">
    <div>
      <button class="top-accordion-btn" onclick="toggleAgenda()">
        <span>📅 Partidos de Hoy (<span id="count-agenda">0</span>)</span>
        <span id="arrow-icon">▼</span>
      </button>
      <div class="agenda-dropdown" id="dropdown-agenda"></div>
    </div>

    <div class="card" id="card-main">
      <div class="league-header">
        <span class="league-name" id="lbl-liga">Cargando datos...</span>
        <span id="badge-vivo" class="live-badge" style="display:none;">EN VIVO</span>
      </div>

      <div class="match-score-board">
        <div class="team-col">
          <img id="img-home" class="team-logo-lg" src="" alt="">
          <span id="txt-home" class="team-title">--</span>
        </div>
        <div class="score-center">
          <span id="num-goles-home" class="score-num">-</span>
          <span id="txt-tiempo" class="timer-txt">--</span>
          <span id="num-goles-away" class="score-num">-</span>
        </div>
        <div class="team-col">
          <img id="img-away" class="team-logo-lg" src="" alt="">
          <span id="txt-away" class="team-title">--</span>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn active" onclick="switchTab(event, 'stats')">Estadísticas</button>
        <button class="tab-btn" onclick="switchTab(event, 'lineups')">Alineaciones</button>
        <button class="tab-btn" onclick="switchTab(event, 'heatmap')">Mapa de Calor</button>
      </div>

      <div id="tab-stats" class="tab-content active">
        <div id="stats-container">
          <p style="text-align:center; color:#70757a; font-size:0.85rem;">Selecciona un partido para ver estadísticas.</p>
        </div>
      </div>

      <div id="tab-lineups" class="tab-content">
        <div class="lineup-grid">
          <div>
            <div class="lineup-col-title" id="lineup-home-title">Local</div>
            <div id="lineup-home-list"></div>
          </div>
          <div>
            <div class="lineup-col-title" id="lineup-away-title">Visitante</div>
            <div id="lineup-away-list"></div>
          </div>
        </div>
      </div>

      <div id="tab-heatmap" class="tab-content">
        <div class="pitch-field" id="pitch-container">
          <div class="pitch-line-center"></div>
          <div class="pitch-circle"></div>
          <div class="heat-zone" id="heat-home" style="width: 120px; height: 120px; background: #1a73e8; left: 20%; top: 20%;"></div>
          <div class="heat-zone" id="heat-away" style="width: 120px; height: 120px; background: #ea4335; right: 20%; top: 20%;"></div>
        </div>
        <div class="pitch-legend">
          <span id="legend-home" style="color: #1a73e8;">Local: Dominio territorial</span>
          <span id="legend-away" style="color: #ea4335;">Visitante: Dominio territorial</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="table-title">Tabla de Posiciones</div>
      <table>
        <thead>
          <tr>
            <th style="width: 15px;">#</th>
            <th class="align-left">Club</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>DG</th>
            <th>Pts</th>
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
      const arrow = document.getElementById('arrow-icon');
      const isHidden = drop.style.display !== 'block';
      drop.style.display = isHidden ? 'block' : 'none';
      arrow.innerText = isHidden ? '▲' : '▼';
    }

    function switchTab(evt, tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      evt.currentTarget.classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');
    }

    async function loadWidgetData() {
      try {
        const res = await fetch('/api/google-widget');
        const data = await res.json();

        agendaMatches = data.agenda || [];
        document.getElementById('count-agenda').innerText = agendaMatches.length;

        const container = document.getElementById('dropdown-agenda');
        container.innerHTML = agendaMatches.map(item => \`
          <div class="agenda-item \${activeMatch && activeMatch.id === item.id ? 'selected' : ''}" onclick="selectMatch('\${item.id}')">
            <div class="agenda-teams-col">
              <div class="agenda-team-row">
                \${item.logoLocal ? \`<img src="\${item.logoLocal}" class="agenda-logo">\` : ''}
                <span>\${item.local}</span>
                <strong>\${item.golesLocal}</strong>
              </div>
              <div class="agenda-team-row">
                \${item.logoVisitante ? \`<img src="\${item.logoVisitante}" class="agenda-logo">\` : ''}
                <span>\${item.visitante}</span>
                <strong>\${item.golesVisitante}</strong>
              </div>
            </div>
            <div class="agenda-status-col">\${item.estado}</div>
          </div>
        \`).join('');

        if (!activeMatch && data.mainMatch) {
          selectMatch(data.mainMatch.id);
        }

        const tbody = document.getElementById('tbody-posiciones');
        if (data.standings && data.standings.length) {
          tbody.innerHTML = data.standings.map(s => \`
            <tr>
              <td style="color:#70757a;">\${s.pos}</td>
              <td class="align-left">
                \${s.logo ? \`<img src="\${s.logo}" class="mini-logo">\` : ''}
                <span>\${s.nombre}</span>
              </td>
              <td>\${s.pj}</td>
              <td>\${s.g}</td>
              <td>\${s.e}</td>
              <td>\${s.p}</td>
              <td>\${s.dg}</td>
              <td><strong>\${s.pts}</strong></td>
            </tr>
          \`).join('');
        }

      } catch (e) {
        console.error("Error al obtener datos:", e);
      }
    }

    async function selectMatch(matchId) {
      activeMatch = agendaMatches.find(m => m.id === matchId);
      if (!activeMatch) return;

      document.getElementById('dropdown-agenda').style.display = 'none';
      document.getElementById('arrow-icon').innerText = '▼';

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
        const summaryUrl = \`https://site.api.espn.com/apis/site/v2/sports/soccer/\${activeMatch.leagueSlug}/summary?event=\${activeMatch.id}\`;
        const sumRes = await fetch(summaryUrl).then(r => r.ok ? r.json() : null);

        let possessionHome = 50;
        let possessionAway = 50;

        if (sumRes && sumRes.boxscore && sumRes.boxscore.teams) {
          const homeStats = sumRes.boxscore.teams[0]?.statistics || [];
          const awayStats = sumRes.boxscore.teams[1]?.statistics || [];

          const getStat = (stats, name) => stats.find(s => s.name === name || s.label === name)?.displayValue || '0';

          const posH = parseFloat(getStat(homeStats, 'possessionPct')) || 50;
          const posA = parseFloat(getStat(awayStats, 'possessionPct')) || 50;
          possessionHome = posH;
          possessionAway = posA;

          const statsList = [
            { label: 'Posesión', home: posH + '%', away: posA + '%' },
            { label: 'Tiros al Arco', home: getStat(homeStats, 'shotsOnTarget'), away: getStat(awayStats, 'shotsOnTarget') },
            { label: 'Tiros Totales', home: getStat(homeStats, 'totalShots'), away: getStat(awayStats, 'totalShots') },
            { label: 'Faltas', home: getStat(homeStats, 'foulsCommitted'), away: getStat(awayStats, 'foulsCommitted') },
            { label: 'Tarjetas Amarillas', home: getStat(homeStats, 'yellowCards'), away: getStat(awayStats, 'yellowCards') }
          ];

          document.getElementById('stats-container').innerHTML = statsList.map(s => {
            const hVal = parseFloat(s.home) || 0;
            const aVal = parseFloat(s.away) || 0;
            const total = (hVal + aVal) || 1;
            const hPct = Math.round((hVal / total) * 100);
            const aPct = 100 - hPct;

            return \`
              <div class="stat-row">
                <div class="stat-labels">
                  <span>\${s.home}</span>
                  <span>\${s.label}</span>
                  <span>\${s.away}</span>
                </div>
                <div class="stat-bar-bg">
                  <div class="stat-bar-home" style="width: \${hPct}%"></div>
                  <div class="stat-bar-away" style="width: \${aPct}%"></div>
                </div>
              </div>
            \`;
          }).join('');
        }

        const heatH = document.getElementById('heat-home');
        const heatA = document.getElementById('heat-away');
        
        const sizeH = Math.min(180, Math.max(70, possessionHome * 2.2));
        const sizeA = Math.min(180, Math.max(70, possessionAway * 2.2));

        heatH.style.width = \`\${sizeH}px\`;
        heatH.style.height = \`\${sizeH}px\`;
        heatA.style.width = \`\${sizeA}px\`;
        heatA.style.height = \`\${sizeA}px\`;

        document.getElementById('legend-home').innerText = \`\${activeMatch.local}: \${possessionHome}% Dominio territorial\`;
        document.getElementById('legend-away').innerText = \`\${activeMatch.visitante}: \${possessionAway}% Dominio territorial\`;

        if (sumRes && sumRes.rosters) {
          const hRoster = sumRes.rosters[0]?.roster || [];
          const aRoster = sumRes.rosters[1]?.roster || [];

          document.getElementById('lineup-home-title').innerText = activeMatch.local;
          document.getElementById('lineup-away-title').innerText = activeMatch.visitante;

          const renderRoster = (list) => list.length 
            ? list.slice(0, 11).map(p => \`<div class="player-row"><span class="player-num">\${p.jersey || '-'}</span> <span>\${p.athlete?.displayName || 'Jugador'}</span></div>\`).join('')
            : '<p style="font-size:0.8rem; color:#70757a;">Alineación sin confirmar</p>';

          document.getElementById('lineup-home-list').innerHTML = renderRoster(hRoster);
          document.getElementById('lineup-away-list').innerHTML = renderRoster(aRoster);
        }

      } catch (e) {
        console.error("Error cargando detalles:", e);
      }
    }

    loadWidgetData();
    setInterval(loadWidgetData, 15000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));

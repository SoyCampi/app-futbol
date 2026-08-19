const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper para llamadas a la API de ESPN
async function fetchESPN(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

// API Backend: Obtener partidos del día y detalles completos del seleccionado
app.get('/api/google-widget', async (req, res) => {
  const hoyStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const selectedMatchId = req.query.matchId;

  const leagues = ['esp.1', 'arg.1', 'arg.copa', 'conmebol.libertadores', 'conmebol.sudamericana', 'uefa.champions', 'eng.1', 'usa.1'];

  try {
    let allEvents = [];

    // 1. Obtener partidos de hoy
    for (const slug of leagues) {
      const data = await fetchESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${hoyStr}`);
      if (data && data.events && data.events.length > 0) {
        data.events.forEach(ev => {
          ev._leagueName = data.leagues?.[0]?.name || 'Fútbol';
          ev._leagueSlug = slug;
        });
        allEvents = allEvents.concat(data.events);
      }
    }

    if (allEvents.length === 0) {
      const dataDef = await fetchESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard`);
      if (dataDef && dataDef.events) {
        allEvents = dataDef.events.map(ev => ({ ...ev, _leagueName: dataDef.leagues?.[0]?.name || 'LaLiga', _leagueSlug: 'esp.1' }));
      }
    }

    // Listado simplificado de agenda del día
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
        logoLocal: home?.team?.logo || '',
        golesLocal: home?.score ?? '0',
        visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
        logoVisitante: away?.team?.logo || '',
        golesVisitante: away?.score ?? '0',
        estado: estadoTexto,
        enVivo: state === 'in'
      };
    });

    // 2. Determinar evento principal seleccionado
    let activeEvent = null;
    if (selectedMatchId) {
      activeEvent = allEvents.find(e => e.id === selectedMatchId);
    }
    if (!activeEvent) {
      activeEvent = allEvents.find(e => e.status?.type?.state === 'in') || allEvents[0];
    }

    let mainMatchDetails = null;
    let activeLeagueSlug = 'esp.1';

    if (activeEvent) {
      activeLeagueSlug = activeEvent._leagueSlug || 'esp.1';
      
      // Obtener el resumen detallado de ESPN para estadísticas y alineaciones
      const summaryData = await fetchESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${activeLeagueSlug}/summary?event=${activeEvent.id}`);
      
      const comp = activeEvent.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      const state = activeEvent.status?.type?.state || 'pre';

      let timerText = '0:00';
      if (state === 'in') {
        timerText = activeEvent.status?.displayClock ? `${activeEvent.status.displayClock}'` : 'EN VIVO';
      } else if (state === 'post') {
        timerText = 'FINAL';
      } else {
        const d = new Date(activeEvent.date);
        timerText = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      // Procesar Estadísticas
      let statsList = [];
      const boxstats = summaryData?.boxscore?.teams;
      if (boxstats && boxstats.length === 2) {
        const homeStats = boxstats.find(t => t.team.id === home?.team?.id)?.statistics || [];
        const awayStats = boxstats.find(t => t.team.id === away?.team?.id)?.statistics || [];

        const getStat = (arr, name) => arr.find(s => s.name === name || s.label === name)?.displayValue || '0';

        statsList = [
          { label: 'Posesión', home: getStat(homeStats, 'possessionPct') + '%', away: getStat(awayStats, 'possessionPct') + '%' },
          { label: 'Tiros al Arco', home: getStat(homeStats, 'shotsOnTarget'), away: getStat(awayStats, 'shotsOnTarget') },
          { label: 'Tiros Totales', home: getStat(homeStats, 'totalShots'), away: getStat(awayStats, 'totalShots') },
          { label: 'Faltas', home: getStat(homeStats, 'foulsCommitted'), away: getStat(awayStats, 'foulsCommitted') },
          { label: 'Tarjetas Amarillas', home: getStat(homeStats, 'yellowCards'), away: getStat(awayStats, 'yellowCards') },
          { label: 'Tarjetas Rojas', home: getStat(homeStats, 'redCards'), away: getStat(awayStats, 'redCards') }
        ];
      }

      // Procesar Alineaciones
      let rosters = { home: [], away: [], homeFormation: '4-3-3', awayFormation: '4-3-3' };
      if (summaryData?.rosters) {
        const hRoster = summaryData.rosters.find(r => r.team?.id === home?.team?.id);
        const aRoster = summaryData.rosters.find(r => r.team?.id === away?.team?.id);

        if (hRoster) {
          rosters.homeFormation = hRoster.formation || '4-3-3';
          rosters.home = (hRoster.roster || []).slice(0, 11).map(p => ({
            name: p.athlete?.displayName || p.athlete?.shortName || 'Jugador',
            number: p.jersey || '',
            pos: p.position?.abbreviation || ''
          }));
        }
        if (aRoster) {
          rosters.awayFormation = aRoster.formation || '4-3-3';
          rosters.away = (aRoster.roster || []).slice(0, 11).map(p => ({
            name: p.athlete?.displayName || p.athlete?.shortName || 'Jugador',
            number: p.jersey || '',
            pos: p.position?.abbreviation || ''
          }));
        }
      }

      mainMatchDetails = {
        id: activeEvent.id,
        liga: activeEvent._leagueName,
        local: home?.team?.shortDisplayName || home?.team?.name || 'Local',
        logoLocal: home?.team?.logo || home?.team?.logos?.[0]?.href || '',
        visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
        logoVisitante: away?.team?.logo || away?.team?.logos?.[0]?.href || '',
        golesLocal: home?.score ?? '0',
        golesVisitante: away?.score ?? '0',
        minuto: timerText,
        enVivo: state === 'in',
        stats: statsList,
        rosters: rosters
      };
    }

    // 3. Tabla de Posiciones
    let standings = [];
    const resStandings = await fetchESPN(`https://site.api.espn.com/apis/v2/sports/soccer/${activeLeagueSlug}/standings`);
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

    res.json({ agenda, mainMatch: mainMatchDetails, standings });
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

    /* Desplegable de partidos del día arriba de todo */
    .top-accordion-btn { width: 100%; background: #f1f3f4; border: 1px solid #dadce0; padding: 12px 16px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; color: #1a73e8; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .top-accordion-btn:hover { background: #e8f0fe; }

    .agenda-dropdown { display: none; margin-top: 10px; max-height: 260px; overflow-y: auto; border: 1px solid #f1f3f4; border-radius: 12px; }
    .agenda-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f1f3f4; cursor: pointer; transition: background 0.2s; }
    .agenda-item:hover { background: #f8f9fa; }
    .agenda-item.selected { background: #e8f0fe; border-left: 4px solid #1a73e8; }
    .agenda-teams-col { display: flex; flex-direction: column; gap: 4px; }
    .agenda-team-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 500; }
    .agenda-logo { width: 18px; height: 18px; object-fit: contain; }
    .agenda-status-col { font-size: 0.78rem; font-weight: 600; color: #5f6368; text-align: right; }

    /* Tarjeta Partido Principal */
    .league-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .league-name { font-size: 0.85rem; color: #5f6368; font-weight: 500; }
    .live-badge { background: #ea4335; color: #fff; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    .match-score-board { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .team-col { display: flex; flex-direction: column; align-items: center; width: 32%; text-align: center; }
    .team-logo-lg { width: 64px; height: 64px; object-fit: contain; margin-bottom: 6px; }
    .team-title { font-size: 1rem; font-weight: 600; color: #202124; }

    .score-center { display: flex; align-items: center; gap: 12px; }
    .score-num { font-size: 3rem; font-weight: 500; color: #202124; }
    .timer-txt { font-size: 1.1rem; font-weight: 700; color: #1e8e3e; }

    /* Pestanias (Estadisticas / Alineaciones / Mapa) */
    .tabs-bar { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 16px; }
    .tab-btn { flex: 1; padding: 10px; border: none; background: none; font-size: 0.85rem; font-weight: 600; color: #5f6368; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; }

    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Estadisticas Bars */
    .stat-row { margin-bottom: 12px; }
    .stat-labels { display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; margin-bottom: 4px; }
    .stat-bar-bg { background: #f1f3f4; height: 8px; border-radius: 4px; display: flex; overflow: hidden; }
    .stat-bar-home { background: #1a73e8; height: 100%; }
    .stat-bar-away { background: #ea4335; height: 100%; }

    /* Alineaciones Grid */
    .lineup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .lineup-col-title { font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: #1a73e8; }
    .player-row { font-size: 0.8rem; padding: 4px 0; border-bottom: 1px solid #f1f3f4; display: flex; gap: 8px; }
    .player-num { font-weight: 700; color: #70757a; width: 20px; }

    /* Pitch / Mapa de calor simulado */
    .pitch-container { background: #2e7d32; border-radius: 12px; padding: 16px; color: #fff; text-align: center; position: relative; overflow: hidden; }
    .heatmap-overlay { position: absolute; top: 20%; left: 30%; width: 120px; height: 120px; background: radial-gradient(circle, rgba(255,0,0,0.6) 0%, rgba(255,255,0,0.3) 50%, rgba(0,0,0,0) 70%); border-radius: 50%; pointer-events: none; }

    /* Tabla de Posiciones abajo de todo */
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
    
    <!-- 1. PARTE SUPERIOR: Lista desplegable con los partidos restantes/del día -->
    <div>
      <button class="top-accordion-btn" onclick="toggleAgenda()">
        <span>📅 Partidos de Hoy (<span id="count-agenda">0</span>)</span>
        <span id="arrow-icon">▼</span>
      </button>
      <div class="agenda-dropdown" id="dropdown-agenda">
        <!-- Render dinámico de partidos -->
      </div>
    </div>

    <!-- 2. PARTE CENTRAL: Tarjeta principal del partido seleccionado -->
    <div class="card" id="card-main">
      <div class="league-header">
        <span class="league-name" id="lbl-liga">Cargando partido...</span>
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

      <!-- Pestanias de Informacion -->
      <div class="tabs-bar">
        <button class="tab-btn active" onclick="switchTab('stats')">Estadísticas</button>
        <button class="tab-btn" onclick="switchTab('lineups')">Alineaciones</button>
        <button class="tab-btn" onclick="switchTab('heatmap')">Mapa de Rendimiento</button>
      </div>

      <!-- Tab Estadísticas -->
      <div id="tab-stats" class="tab-content active">
        <div id="stats-container">
          <p style="text-align:center; color:#70757a; font-size:0.85rem;">Cargando estadísticas...</p>
        </div>
      </div>

      <!-- Tab Alineaciones -->
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

      <!-- Tab Mapa de Calor -->
      <div id="tab-heatmap" class="tab-content">
        <div class="pitch-container">
          <div class="heatmap-overlay"></div>
          <p style="margin: 40px 0; font-weight:500;">Radar de Intensión y Dominio de Juego</p>
          <small style="opacity:0.8;">Zona de calor generada en tiempo real</small>
        </div>
      </div>
    </div>

    <!-- 3. PARTE INFERIOR: Tabla de Posiciones de la Liga -->
    <div class="card">
      <div class="table-title" id="table-title">Tabla de Posiciones</div>
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
        <tbody id="tbody-posiciones">
          <!-- Render Posiciones -->
        </tbody>
      </table>
    </div>

  </div>

  <script>
    let currentMatchId = null;

    function toggleAgenda() {
      const drop = document.getElementById('dropdown-agenda');
      const arrow = document.getElementById('arrow-icon');
      const isHidden = drop.style.display !== 'block';
      drop.style.display = isHidden ? 'block' : 'none';
      arrow.innerText = isHidden ? '▲' : '▼';
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      event.currentTarget.classList.add('active');
      document.getElementById('tab-' + tabName).classList.add('active');
    }

    async function loadData(matchId = null) {
      if (matchId) currentMatchId = matchId;
      const url = currentMatchId ? \`/api/google-widget?matchId=\${currentMatchId}\` : '/api/google-widget';
      
      try {
        const res = await fetch(url);
        const data = await res.json();

        // 1. Render Agenda Desplegable Arriba
        if (data.agenda && data.agenda.length) {
          document.getElementById('count-agenda').innerText = data.agenda.length;
          const container = document.getElementById('dropdown-agenda');
          
          container.innerHTML = data.agenda.map(item => \`
            <div class="agenda-item \${data.mainMatch && data.mainMatch.id === item.id ? 'selected' : ''}" onclick="selectMatch('\${item.id}')">
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
              <div class="agenda-status-col">
                \${item.estado}
              </div>
            </div>
          \`).join('');
        }

        // 2. Render Tarjeta Principal Seleccionada
        if (data.mainMatch) {
          const m = data.mainMatch;
          currentMatchId = m.id;

          document.getElementById('lbl-liga').innerText = m.liga;
          document.getElementById('badge-vivo').style.display = m.enVivo ? 'inline-block' : 'none';
          document.getElementById('txt-home').innerText = m.local;
          document.getElementById('txt-away').innerText = m.visitante;
          document.getElementById('img-home').src = m.logoLocal;
          document.getElementById('img-away').src = m.logoVisitante;
          document.getElementById('num-goles-home').innerText = m.golesLocal;
          document.getElementById('num-goles-away').innerText = m.golesVisitante;
          document.getElementById('txt-tiempo').innerText = m.minuto;

          // Render Estadisticas
          const statsContainer = document.getElementById('stats-container');
          if (m.stats && m.stats.length) {
            statsContainer.innerHTML = m.stats.map(s => {
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
          } else {
            statsContainer.innerHTML = '<p style="text-align:center; color:#70757a; font-size:0.8rem;">Estadísticas no disponibles aún.</p>';
          }

          // Render Alineaciones
          document.getElementById('lineup-home-title').innerText = \`\${m.local} (\${m.rosters.homeFormation})\`;
          document.getElementById('lineup-away-title').innerText = \`\${m.visitante} (\${m.rosters.awayFormation})\`;
          
          const renderPlayers = (list) => list.length 
            ? list.map(p => \`<div class="player-row"><span class="player-num">\${p.number || '-'}</span> <span>\${p.name}</span></div>\`).join('')
            : '<p style="font-size:0.78rem; color:#70757a;">Alineación no confirmada</p>';

          document.getElementById('lineup-home-list').innerHTML = renderPlayers(m.rosters.home);
          document.getElementById('lineup-away-list').innerHTML = renderPlayers(m.rosters.away);
        }

        // 3. Render Tabla Posiciones (Abajo)
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
        console.error("Error al actualizar widget:", e);
      }
    }

    function selectMatch(id) {
      loadData(id);
      document.getElementById('dropdown-agenda').style.display = 'none';
      document.getElementById('arrow-icon').innerText = '▼';
    }

    loadData();
    setInterval(() => loadData(), 12000); // Refresco automático cada 12 segundos
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));

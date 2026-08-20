const express = require('express');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de ligas a rastrear en vivo
const TRACKED_LEAGUES = [
  { slug: 'arg.1', name: 'Liga Profesional Argentina' },
  { slug: 'esp.1', name: 'LaLiga España' },
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'uefa.champions', name: 'UEFA Champions League' },
  { slug: 'conmebol.libertadores', name: 'Copa Libertadores' },
  { slug: 'ita.1', name: 'Serie A Italia' },
  { slug: 'ger.1', name: 'Bundesliga' },
  { slug: 'bra.1', name: 'Brasileirao' }
];

// Cliente HTTP seguro con Timeout
function requestESPN(url) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(4000, () => { req.destroy(); resolve(null); });
  });
}

// 1. ENDPOINT: Agenda del día en Hora Argentina
app.get('/api/agenda', async (req, res) => {
  try {
    let allEvents = [];
    for (const l of TRACKED_LEAGUES) {
      const data = await requestESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l.slug}/scoreboard`);
      if (data && data.events && data.events.length > 0) {
        const mapped = data.events.map(ev => ({
          ...ev,
          _leagueName: data.leagues?.[0]?.name || l.name,
          _leagueSlug: l.slug
        }));
        allEvents = allEvents.concat(mapped);
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
        leagueSlug: e._leagueSlug,
        liga: e._leagueName,
        local: home?.team?.displayName || home?.team?.shortDisplayName || 'Local',
        logoLocal: home?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
        golesLocal: home?.score ?? '0',
        visitante: away?.team?.displayName || away?.team?.shortDisplayName || 'Visitante',
        logoVisitante: away?.team?.logo || 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
        golesVisitante: away?.score ?? '0',
        estado: estadoTexto,
        enVivo: state === 'in'
      };
    });

    res.json({ success: true, count: agenda.length, matches: agenda });
  } catch (err) {
    res.json({ success: false, matches: [] });
  }
});

// 2. ENDPOINT: Detalle en vivo, Estadísticas, Incidencias y Alineaciones
app.get('/api/match-detail', async (req, res) => {
  const { league, event } = req.query;
  if (!league || !event) return res.json({ success: false });

  try {
    const summary = await requestESPN(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/summary?event=${event}`);
    if (!summary) return res.json({ success: false });

    // Estadísticas generales
    const teamsStats = summary.boxscore?.teams || [];
    const statsHome = teamsStats[0]?.statistics || [];
    const statsAway = teamsStats[1]?.statistics || [];

    // Incidencias (Goles, Tarjetas)
    const keyEvents = (summary.keyEvents || []).map(k => ({
      clock: k.clock?.displayValue || '',
      type: k.type?.text || 'Evento',
      text: k.text || '',
      teamId: k.team?.id || ''
    }));

    // Formaciones y Planteles
    const rostersRaw = summary.rosters || [];
    const rosters = rostersRaw.map(r => ({
      team: r.team?.displayName || '',
      formation: r.formation || 'N/A',
      starters: (r.roster || []).map(p => ({
        id: p.athlete?.id,
        name: p.athlete?.displayName || 'Jugador',
        jersey: p.jersey || '',
        position: p.position?.abbreviation || 'PO',
        subbedOut: p.subbedOut || false,
        stats: p.stats || []
      })),
      subs: (r.substitutes || []).map(p => ({
        id: p.athlete?.id,
        name: p.athlete?.displayName || 'Jugador',
        jersey: p.jersey || '',
        position: p.position?.abbreviation || 'SU',
        stats: p.stats || []
      }))
    }));

    res.json({
      success: true,
      statsHome,
      statsAway,
      incidents: keyEvents,
      rosters
    });
  } catch (e) {
    res.json({ success: false });
  }
});

// 3. FRONTEND SPA SINGLE PAGE
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Match & Live Stats</title>
  <style>
    * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body { background-color: #f8f9fa; color: #202124; margin: 0; padding: 16px 8px; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 800px; display: flex; flex-direction: column; gap: 14px; }
    .card { background: #ffffff; border-radius: 16px; padding: 16px; box-shadow: 0 1px 3px rgba(60,64,67,0.12); border: 1px solid #dadce0; }
    .header-agenda { font-weight: 700; font-size: 0.95rem; color: #1a73e8; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .agenda-list { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: thin; }
    .agenda-card { min-width: 170px; background: #f8f9fa; border: 1px solid #dadce0; border-radius: 12px; padding: 10px; cursor: pointer; transition: all 0.2s; }
    .agenda-card.active { border-color: #1a73e8; background: #e8f0fe; }
    .agenda-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; margin: 3px 0; }
    .agenda-logo { width: 18px; height: 18px; object-fit: contain; }
    .match-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: #5f6368; font-weight: 500; margin-bottom: 12px; }
    .live-badge { background: #ea4335; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
    .scoreboard { display: flex; justify-content: space-between; align-items: center; text-align: center; margin-bottom: 16px; }
    .team-box { width: 32%; display: flex; flex-direction: column; align-items: center; }
    .team-logo { width: 56px; height: 56px; object-fit: contain; margin-bottom: 6px; }
    .team-title { font-size: 0.9rem; font-weight: 700; }
    .score-box { font-size: 2.5rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .time-status { font-size: 0.85rem; font-weight: 700; color: #1e8e3e; text-align: center; }
    .tabs { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 14px; }
    .tab-btn { flex: 1; padding: 10px; border: none; background: none; font-size: 0.85rem; font-weight: 600; color: #5f6368; cursor: pointer; }
    .tab-btn.active { color: #1a73e8; border-bottom: 2px solid #1a73e8; }
    .stat-row { margin-bottom: 10px; }
    .stat-labels { display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 600; margin-bottom: 3px; }
    .stat-bar { background: #f1f3f4; height: 6px; border-radius: 3px; display: flex; overflow: hidden; }
    .stat-fill-home { background: #1a73e8; height: 100%; }
    .stat-fill-away { background: #ea4335; height: 100%; }
    .incidents-list { display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem; }
    .incident-item { background: #f8f9fa; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #1a73e8; }
    .rosters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .roster-title { font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; color: #202124; }
    .player-chip { background: #f1f3f4; padding: 6px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500; margin-bottom: 4px; cursor: pointer; display: flex; justify-content: space-between; }
    .player-chip:hover { background: #e8f0fe; color: #1a73e8; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); justify-content: center; align-items: center; z-index: 100; }
    .modal-box { background: #fff; width: 90%; max-width: 400px; border-radius: 16px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .modal-header { font-size: 1.1rem; font-weight: 700; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; font-weight: 700; }
  </style>
</head>
<body>
  <div class="container">
    <!-- AGENDA -->
    <div class="card">
      <div class="header-agenda">
        <span>📅 Agenda de Hoy (Hora Arg)</span>
        <span id="txt-last-update" style="font-size:0.75rem; color:#70757a; font-weight:400;">Actualizando...</span>
      </div>
      <div class="agenda-list" id="agenda-container">
        <div style="font-size:0.85rem; color:#70757a;">Cargando encuentros del día...</div>
      </div>
    </div>

    <!-- PARTIDO EN VIVO -->
    <div class="card" id="main-card">
      <div class="match-header">
        <span id="lbl-liga">Seleccionar un partido</span>
        <span id="badge-vivo" class="live-badge" style="display:none;">EN VIVO</span>
      </div>

      <div class="scoreboard">
        <div class="team-box">
          <img id="img-home" class="team-logo" src="https://a.espncdn.com/i/teamlogos/default-team-logo.png" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'">
          <span id="txt-home" class="team-title">--</span>
        </div>
        <div>
          <div class="score-box">
            <span id="score-home">-</span>
            <span style="font-size:1.5rem; color:#70757a;">:</span>
            <span id="score-away">-</span>
          </div>
          <div id="txt-timer" class="time-status">--</div>
        </div>
        <div class="team-box">
          <img id="img-away" class="team-logo" src="https://a.espncdn.com/i/teamlogos/default-team-logo.png" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'">
          <span id="txt-away" class="team-title">--</span>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('stats')">Estadísticas</button>
        <button class="tab-btn" onclick="switchTab('rosters')">Alineaciones</button>
        <button class="tab-btn" onclick="switchTab('incidents')">Incidencias</button>
      </div>

      <div id="tab-content">
        <p style="text-align:center; font-size:0.85rem; color:#70757a;">Cargando información del partido...</p>
      </div>
    </div>
  </div>

  <!-- MODAL JUGADOR -->
  <div class="modal-overlay" id="player-modal">
    <div class="modal-box">
      <div class="modal-header">
        <span id="modal-player-name">Nombre Jugador</span>
        <button class="close-btn" onclick="closeModal()">×</button>
      </div>
      <div id="modal-player-body" style="font-size:0.85rem; color:#3c4043;"></div>
    </div>
  </div>

  <script>
    let agenda = [];
    let selectedMatchId = null;
    let currentDetail = null;
    let activeTab = 'stats';

    async function fetchAgenda() {
      try {
        const res = await fetch('/api/agenda').then(r => r.json());
        if (res.success && res.matches) {
          agenda = res.matches;
          renderAgenda();
          document.getElementById('txt-last-update').innerText = 'En vivo: ' + new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

          if (agenda.length > 0 && !selectedMatchId) {
            selectMatch(agenda[0].id);
          } else if (selectedMatchId) {
            loadMatchDetail();
          }
        }
      } catch (e) {
        console.error("Error agenda:", e);
      }
    }

    function renderAgenda() {
      const container = document.getElementById('agenda-container');
      if (agenda.length === 0) {
        container.innerHTML = '<div style="font-size:0.85rem; color:#70757a; padding:10px;">No hay partidos programados para hoy en las ligas seguidas.</div>';
        return;
      }

      container.innerHTML = agenda.map(m => \`
        <div class="agenda-card \${m.id === selectedMatchId ? 'active' : ''}" onclick="selectMatch('\${m.id}')">
          <div style="font-size:0.7rem; color:#5f6368; font-weight:600; margin-bottom:4px;">\${m.liga}</div>
          <div class="agenda-row">
            <span><img src="\${m.logoLocal}" class="agenda-logo" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'"> \${m.local}</span>
            <span>\${m.golesLocal}</span>
          </div>
          <div class="agenda-row">
            <span><img src="\${m.logoVisitante}" class="agenda-logo" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'"> \${m.visitante}</span>
            <span>\${m.golesVisitante}</span>
          </div>
          <div style="font-size:0.75rem; font-weight:700; color:\${m.enVivo ? '#ea4335' : '#1e8e3e'}; text-align:right; margin-top:4px;">\${m.estado}</div>
        </div>
      \`).join('');
    }

    async function selectMatch(id) {
      selectedMatchId = id;
      renderAgenda();
      const match = agenda.find(m => m.id === id);
      if (!match) return;

      document.getElementById('lbl-liga').innerText = match.liga;
      document.getElementById('badge-vivo').style.display = match.enVivo ? 'inline-block' : 'none';
      document.getElementById('img-home').src = match.logoLocal;
      document.getElementById('img-away').src = match.logoVisitante;
      document.getElementById('txt-home').innerText = match.local;
      document.getElementById('txt-away').innerText = match.visitante;
      document.getElementById('score-home').innerText = match.golesLocal;
      document.getElementById('score-away').innerText = match.golesVisitante;
      document.getElementById('txt-timer').innerText = match.estado.replace('🔴 ', '');

      await loadMatchDetail();
    }

    async function loadMatchDetail() {
      const match = agenda.find(m => m.id === selectedMatchId);
      if (!match) return;

      try {
        const res = await fetch(\`/api/match-detail?league=\${match.leagueSlug}&event=\${match.id}\`).then(r => r.json());
        if (res.success) {
          currentDetail = res;
          renderTabContent();
        }
      } catch (e) {
        console.error("Error detalle:", e);
      }
    }

    function switchTab(tab) {
      activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', (idx === 0 && tab === 'stats') || (idx === 1 && tab === 'rosters') || (idx === 2 && tab === 'incidents'));
      });
      renderTabContent();
    }

    function renderTabContent() {
      const container = document.getElementById('tab-content');
      if (!currentDetail) {
        container.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:#70757a;">Cargando...</p>';
        return;
      }

      if (activeTab === 'stats') {
        const h = currentDetail.statsHome || [];
        const a = currentDetail.statsAway || [];
        if (h.length === 0) {
          container.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:#70757a;">Estadísticas generales aún no disponibles.</p>';
          return;
        }

        container.innerHTML = h.map((st, idx) => {
          const valH = parseFloat(st.displayValue) || 0;
          const valA = parseFloat(a[idx]?.displayValue) || 0;
          const total = (valH + valA) || 1;
          const pctH = Math.round((valH / total) * 100);
          return \`
            <div class="stat-row">
              <div class="stat-labels"><span>\${st.displayValue}</span><span>\${st.label || st.name}</span><span>\${a[idx]?.displayValue || 0}</span></div>
              <div class="stat-bar">
                <div class="stat-fill-home" style="width: \${pctH}%"></div>
                <div class="stat-fill-away" style="width: \${100 - pctH}%"></div>
              </div>
            </div>
          \`;
        }).join('');
      } else if (activeTab === 'incidents') {
        const inc = currentDetail.incidents || [];
        if (inc.length === 0) {
          container.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:#70757a;">Sin incidencias o tarjetas reportadas.</p>';
          return;
        }
        container.innerHTML = '<div class="incidents-list">' + inc.map(i => \`
          <div class="incident-item">
            <strong>\${i.clock}'</strong> - \${i.type}: \${i.text}
          </div>
        \`).join('') + '</div>';
      } else if (activeTab === 'rosters') {
        const ros = currentDetail.rosters || [];
        if (ros.length === 0) {
          container.innerHTML = '<p style="text-align:center; font-size:0.85rem; color:#70757a;">Alineaciones no confirmadas aún.</p>';
          return;
        }

        container.innerHTML = \`
          <div class="rosters-grid">
            \${ros.map(r => \`
              <div>
                <div class="roster-title">\${r.team} (\${r.formation})</div>
                <div style="font-size:0.75rem; font-weight:700; color:#5f6368; margin: 4px 0;">TITULARES</div>
                \${r.starters.map(p => \`
                  <div class="player-chip" onclick="showPlayerModal('\${p.name}', '\${p.jersey}', '\${p.position}', \${JSON.stringify(p.stats).replace(/"/g, '&quot;')})">
                    <span>#\${p.jersey} \${p.name}</span>
                    <span style="color:#70757a; font-size:0.7rem;">\${p.position}</span>
                  </div>
                \`).join('')}
              </div>
            \`).join('')}
          </div>
        \`;
      }
    }

    function showPlayerModal(name, jersey, pos, stats) {
      document.getElementById('modal-player-name').innerText = \`#\${jersey} \${name}\`;
      const body = document.getElementById('modal-player-body');
      let statsHtml = \`<p><strong>Posición:</strong> \${pos}</p>\`;

      if (stats && stats.length > 0) {
        statsHtml += '<ul style="padding-left:18px;">' + stats.map(s => \`<li><strong>\${s.label || s.name}:</strong> \${s.displayValue}</li>\`).join('') + '</ul>';
      } else {
        statsHtml += '<p style="color:#70757a;">Sin estadísticas individuales adicionales reportadas para este partido.</p>';
      }

      body.innerHTML = statsHtml;
      document.getElementById('player-modal').style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('player-modal').style.display = 'none';
    }

    // Inicialización y refresco automático cada 20 segundos
    fetchAgenda();
    setInterval(fetchAgenda, 20000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor de Fútbol iniciado en el puerto ${PORT}`));
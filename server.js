const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partidos & Resultados - Google Style</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8f9fa; color: #202124; margin: 0; padding: 16px; }
    .container { max-width: 500px; margin: 0 auto; }
    
    .header { background: #fff; padding: 16px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(60,64,67,0.12), 0 1px 2px rgba(60,64,67,0.24); text-align: center; }
    h2 { font-size: 1.2rem; color: #1a73e8; margin: 0 0 6px 0; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #5f6368; background: #f1f3f4; padding: 4px 12px; border-radius: 16px; display: inline-block; text-transform: capitalize; font-weight: 500; }
    
    .match-card { background: #ffffff; padding: 16px; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(60,64,67,0.12), 0 1px 2px rgba(60,64,67,0.24); cursor: pointer; transition: box-shadow 0.2s ease, transform 0.15s ease; border: 1px solid #dadce0; }
    .match-card:hover { box-shadow: 0 4px 8px rgba(60,64,67,0.15), 0 1px 3px rgba(60,64,67,0.3); transform: translateY(-1px); }
    
    .league-title { font-size: 0.75rem; color: #5f6368; font-weight: 500; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .click-hint { color: #1a73e8; font-size: 0.75rem; font-weight: 500; }

    .teams-container { display: flex; justify-content: space-between; align-items: center; }
    .team-box { display: flex; align-items: center; gap: 10px; width: 38%; }
    .team-left { justify-content: flex-start; text-align: left; }
    .team-right { justify-content: flex-end; text-align: right; }
    
    .club-logo { width: 32px; height: 32px; object-fit: contain; flex-shrink: 0; }
    .team-name { font-size: 0.95rem; font-weight: 500; color: #202124; line-height: 1.2; }
    
    .score-container { text-align: center; }
    .score { color: #202124; font-size: 1.25rem; font-weight: 700; background: #f1f3f4; padding: 6px 14px; border-radius: 20px; white-space: nowrap; display: inline-block; }
    
    .status-container { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f1f3f4; font-size: 0.8rem; }
    .time-badge { color: #202124; font-weight: 500; }
    .live-badge { color: #d93025; font-weight: 600; background: #fce8e6; padding: 3px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    .finished-badge { color: #70757a; font-weight: 500; }

    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(32,33,36,0.6); backdrop-filter: blur(2px); z-index: 1000; justify-content: center; align-items: center; padding: 12px; }
    .modal-content { background: #ffffff; width: 100%; max-width: 540px; max-height: 90vh; border-radius: 20px; padding: 20px; overflow-y: auto; box-shadow: 0 8px 24px rgba(60,64,67,0.28); position: relative; border: 1px solid #dadce0; }
    .close-btn { position: absolute; top: 14px; right: 16px; background: #f1f3f4; color: #5f6368; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 10; }

    .tab-container { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 16px; }
    .tab-btn { flex: 1; padding: 10px 0; background: none; border: none; color: #5f6368; font-weight: 500; cursor: pointer; font-size: 0.85rem; border-bottom: 3px solid transparent; }
    .tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }

    .lineup-broadcast-container { display: flex; flex-direction: column; gap: 12px; background: #0f172a; color: #fff; padding: 16px; border-radius: 12px; }
    .team-selector-tabs { display: flex; gap: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
    .team-tab-btn { flex: 1; padding: 8px 12px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem; }
    .team-tab-btn.active { background: #0284c7; color: #fff; border-color: #38bdf8; }

    .broadcast-main { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 500px) { .broadcast-main { grid-template-columns: 1fr; } }

    .roster-list-card { background: #1e293b; border-radius: 8px; padding: 12px; border-left: 4px solid #38bdf8; }
    .roster-header-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px; font-weight: 600; }
    .player-row-item { display: flex; align-items: center; gap: 10px; padding: 6px; border-bottom: 1px solid #334155; font-size: 0.82rem; cursor: pointer; }
    .player-row-item:hover { background: #334155; border-radius: 4px; }
    .player-row-num { width: 22px; font-weight: bold; color: #38bdf8; text-align: right; }
    .player-row-name { font-weight: 500; color: #f8fafc; flex-grow: 1; }

    .full-pitch-tv { position: relative; width: 100%; height: 380px; background: #15803d; border: 2px solid #86efac; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 0; overflow: hidden; }
    .tv-pitch-center-line { position: absolute; top: 50%; width: 100%; height: 2px; background: rgba(255,255,255,0.4); }
    .tv-pitch-circle { position: absolute; top: calc(50% - 30px); left: calc(50% - 30px); width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; }
    .tactical-row { display: flex; justify-content: space-around; align-items: center; width: 100%; z-index: 2; }
    .tv-node-circle { width: 26px; height: 26px; border-radius: 50%; background: #0284c7; color: #fff; border: 2px solid #fff; font-size: 0.75rem; font-weight: bold; display: flex; align-items: center; justify-content: center; cursor: pointer; }

    .sofascore-card-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,23,42,0.95); z-index: 1050; border-radius: 20px; padding: 16px; overflow-y: auto; color: #fff; backdrop-filter: blur(4px); }
    .sofascore-grid { display: grid; grid-template-columns: 140px 1fr; gap: 12px; margin-top: 10px; }
    @media (max-width: 450px) { .sofascore-grid { grid-template-columns: 1fr; } }
    .sofascore-table { width: 100%; border-collapse: collapse; font-size: 0.78rem; }
    .sofascore-table td { padding: 4px 6px; border-bottom: 1px solid #334155; }
    .sofascore-table td:last-child { text-align: right; font-weight: bold; color: #38bdf8; }
    .heatmap-box { width: 100%; height: 110px; background: #15803d; border-radius: 6px; border: 1px solid #86efac; position: relative; margin-top: 10px; overflow: hidden; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Partidos de hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando...</div>
    </div>
    <div id="matches-container">Cargando partidos...</div>
  </div>

  <div id="stats-modal" class="modal-overlay" onclick="cerrarModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="cerrarModalDirecto()">✕</button>
      
      <div class="tab-container">
        <button id="tab-general-btn" class="tab-btn active" onclick="cambiarTab('general')">Información general</button>
        <button id="tab-lineups-btn" class="tab-btn" onclick="cambiarTab('lineups')">Alineaciones & Campo</button>
      </div>

      <div id="modal-body-general">Cargando...</div>
      <div id="modal-body-lineups" style="display:none;">Cargando alineaciones...</div>

      <div id="sofascore-card" class="sofascore-card-overlay">
        <button style="position:absolute; right:12px; top:12px; background:#334155; border:none; color:#fff; width:28px; height:28px; border-radius:50%; font-size:1rem; cursor:pointer;" onclick="cerrarSofaCard()">✕</button>
        <div id="sofascore-card-content"></div>
      </div>
    </div>
  </div>

  <script>
    let globalMatchData = null;
    let currentSelectedRosterIndex = 0;

    function formatearHoraAR(dateStr) {
      if (!dateStr) return 'A confirmar';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'A confirmar';
        return d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) { return 'A confirmar'; }
    }

    async function cargarAgendaDirecta() {
      const d = new Date();
      const fechaTxt = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
      document.getElementById('fecha-hoy').innerText = fechaTxt;

      const hoyStr = d.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(/-/g, '');

      const endpoints = [
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=\${hoyStr}\`
      ];

      try {
        const resultados = await Promise.allSettled(
          endpoints.map(u => fetch(u).then(r => r.ok ? r.json() : null))
        );

        const partidosMap = new Map();

        resultados.forEach(res => {
          if (res.status === 'fulfilled' && res.value && res.value.events) {
            const json = res.value;
            json.events.forEach(item => {
              if (!item || partidosMap.has(item.id)) return;
              const comp = item.competitions && item.competitions[0];
              if (!comp) return;
              
              const home = comp.competitors ? comp.competitors.find(c => c.homeAway === 'home') : null;
              const away = comp.competitors ? comp.competitors.find(c => c.homeAway === 'away') : null;
              if (!home || !away) return;

              const statusState = item.status?.type?.state || 'pre';
              const isInGame = statusState === 'in';
              const isPost = statusState === 'post';

              partidosMap.set(item.id, {
                id: item.id,
                liga: json.leagues?.[0]?.name || 'Fútbol',
                local: home.team?.shortDisplayName || home.team?.name || 'Local',
                logoLocal: home.team?.logo || home.team?.logos?.[0]?.href || '',
                visitante: away.team?.shortDisplayName || away.team?.name || 'Visitante',
                logoVisitante: away.team?.logo || away.team?.logos?.[0]?.href || '',
                golesLocal: home.score ?? '0',
                golesVisitante: away.score ?? '0',
                hora: formatearHoraAR(item.date),
                enVivo: isInGame,
                finalizado: isPost,
                minuto: item.status?.displayClock ? item.status.displayClock + "'" : (item.status?.type?.shortDetail || 'EN VIVO'),
                estadoText: isInGame ? 'En juego' : (isPost ? 'Finalizado' : 'Programado')
              });
            });
          }
        });

        const lista = Array.from(partidosMap.values()).sort((a,b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora));
        renderizarAgenda(lista);
      } catch (err) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#70757a;">Ocurrió un error al cargar los encuentros.</p>';
      }
    }

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos.length) {
        container.innerHTML = '<p style="text-align:center; color:#70757a; padding:30px 0;">No hay partidos programados para hoy.</p>';
        return;
      }

      container.innerHTML = partidos.map(p => \`
        <div class="match-card" onclick="abrirEstadisticas('\${p.id}')">
          <div class="league-title">
            <span>\${p.liga}</span>
            <span class="click-hint">Ver detalles ›</span>
          </div>
          <div class="teams-container">
            <div class="team-box team-left">
              \${p.logoLocal ? \`<img src="\${p.logoLocal}" class="club-logo" alt="">\` : ''}
              <span class="team-name">\${p.local}</span>
            </div>
            <div class="score-container">
              <span class="score">\${p.golesLocal} - \${p.golesVisitante}</span>
            </div>
            <div class="team-box team-right">
              <span class="team-name">\${p.visitante}</span>
              \${p.logoVisitante ? \`<img src="\${p.logoVisitante}" class="club-logo" alt="">\` : ''}
            </div>
          </div>
          <div class="status-container">
            \${p.enVivo ? \`<span class="live-badge">🔴 EN VIVO \${p.minuto}</span>\` : (p.finalizado ? '<span class="finished-badge">Finalizado</span>' : \`<span class="time-badge">\${p.hora} hs</span>\`)}
            <span style="color:#70757a;">\${p.estadoText}</span>
          </div>
        </div>
      \`).join('');
    }

    async function abrirEstadisticas(matchId) {
      document.getElementById('stats-modal').style.display = 'flex';
      cambiarTab('general');
      document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#1a73e8; padding:20px 0;">Cargando estadísticas en vivo...</p>';
      document.getElementById('modal-body-lineups').innerHTML = '<p style="text-align:center; color:#1a73e8; padding:20px 0;">Cargando alineaciones...</p>';

      try {
        const res = await fetch(\`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=\${matchId}\`);
        globalMatchData = await res.json();
        
        renderTabGeneral();
        renderTabLineups();
      } catch (err) {
        document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#70757a;">Detalles no disponibles actualmente.</p>';
      }
    }

    function renderTabGeneral() {
      const boxscore = globalMatchData?.boxscore;
      const header = globalMatchData?.header;
      const comp = header?.competitions?.[0];
      if (!comp) return;

      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');

      let html = \`
        <div style="text-align:center; margin-bottom:16px;">
          <h3 style="margin:0; font-size:1rem; color:#5f6368; font-weight:500;">\${header.league?.name || 'Partido'}</h3>
          <div style="display:flex; justify-content:space-around; align-items:center; margin-top:10px;">
            <div style="width:35%; font-weight:600; color:#202124;">\${home.team.shortDisplayName || home.team.name}</div>
            <div style="font-size:1.6rem; font-weight:700; color:#202124; background:#f1f3f4; padding:4px 16px; border-radius:20px;">\${home.score ?? '0'} - \${away.score ?? '0'}</div>
            <div style="width:35%; font-weight:600; color:#202124;">\${away.team.shortDisplayName || away.team.name}</div>
          </div>
        </div>
      \`;

      if (boxscore?.teams?.[0]?.statistics) {
        html += '<h4 style="color:#202124; margin:16px 0 8px 0; font-size:0.9rem; font-weight:600;">Estadísticas en vivo</h4>';
        boxscore.teams[0].statistics.forEach((st, idx) => {
          const valA = boxscore.teams[1]?.statistics?.[idx]?.displayValue || '0';
          html += \`
            <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:8px 0; border-bottom:1px solid #f1f3f4;">
              <strong style="color:#1a73e8;">\${st.displayValue}</strong>
              <span style="color:#5f6368;">\${st.label}</span>
              <strong style="color:#d93025;">\${valA}</strong>
            </div>
          \`;
        });
      }
      document.getElementById('modal-body-general').innerHTML = html;
    }

    function renderTabLineups() {
      const rosters = globalMatchData?.rosters;
      if (!rosters || rosters.length < 2) {
        document.getElementById('modal-body-lineups').innerHTML = \`
          <div style="text-align:center; padding:30px 10px; color:#70757a;">
            <p style="color:#e37400; font-weight:600;">Alineaciones no confirmadas aún por la transmisión.</p>
          </div>\`;
        return;
      }
      renderBroadcastView(currentSelectedRosterIndex);
    }

    function obtenerLogoEquipo(rosterObj) {
      if (rosterObj.team?.logo) return rosterObj.team.logo;
      if (rosterObj.team?.logos?.[0]?.href) return rosterObj.team.logos[0].href;
      
      const comp = globalMatchData?.header?.competitions?.[0];
      if (comp?.competitors) {
        const matchingComp = comp.competitors.find(c => c.team?.id === rosterObj.team?.id);
        if (matchingComp?.team?.logo) return matchingComp.team.logo;
      }
      return '';
    }

    function renderBroadcastView(teamIdx) {
      currentSelectedRosterIndex = teamIdx;
      const rosters = globalMatchData.rosters;
      const activeRoster = rosters[teamIdx];
      const starters = (activeRoster.roster || []).filter(p => p.starter).slice(0, 11);

      const logoHome = obtenerLogoEquipo(rosters[0]);
      const logoAway = obtenerLogoEquipo(rosters[1]);
      const teamColor = activeRoster.team?.color ? '#' + activeRoster.team.color : '#0284c7';

      const lineas = [ [], [], [], [] ];
      starters.forEach((p, idx) => {
        if (idx === 0) lineas[0].push(p);
        else if (idx <= 4) lineas[1].push(p);
        else if (idx <= 8) lineas[2].push(p);
        else lineas[3].push(p);
      });

      let html = \`
        <div class="lineup-broadcast-container">
          <div class="team-selector-tabs">
            <button class="team-tab-btn \${teamIdx === 0 ? 'active' : ''}" onclick="renderBroadcastView(0)">
              \${logoHome ? \`<img src="\${logoHome}" style="width:18px; height:18px; object-fit:contain;">\` : ''}
              \${rosters[0].team?.shortDisplayName || 'Local'}
            </button>
            <button class="team-tab-btn \${teamIdx === 1 ? 'active' : ''}" onclick="renderBroadcastView(1)">
              \${logoAway ? \`<img src="\${logoAway}" style="width:18px; height:18px; object-fit:contain;">\` : ''}
              \${rosters[1].team?.shortDisplayName || 'Visitante'}
            </button>
          </div>

          <div class="broadcast-main">
            <div class="roster-list-card" style="border-left-color: \${teamColor};">
              <div class="roster-header-title">\${activeRoster.team?.displayName || 'Titulares'}</div>
              \${starters.map(p => {
                const ath = p.athlete || {};
                const num = ath.jersey || '?';
                const name = ath.displayName || 'Jugador';
                const pData = JSON.stringify(p).replace(/"/g, '&quot;');
                return \`
                  <div class="player-row-item" onclick="abrirSofaCard(\${pData})">
                    <span class="player-row-num">\${num}</span>
                    <span class="player-row-name">\${name}</span>
                  </div>
                \`;
              }).join('')}
            </div>

            <div class="full-pitch-tv">
              <div class="tv-pitch-center-line"></div>
              <div class="tv-pitch-circle"></div>
              \${lineas.map(row => \`
                <div class="tactical-row">
                  \${row.map(p => {
                    const num = p.athlete?.jersey || '?';
                    const pData = JSON.stringify(p).replace(/"/g, '&quot;');
                    return \`<div class="tv-node-circle" style="background:\${teamColor};" onclick="abrirSofaCard(\${pData})">\${num}</div>\`;
                  }).join('')}
                </div>
              \`).join('')}
            </div>
          </div>
        </div>
      \`;

      document.getElementById('modal-body-lineups').innerHTML = html;
    }

    function abrirSofaCard(p) {
      const ath = p.athlete || {};
      const fotoUrl = ath.headshot?.href || (ath.id ? \`https://a.espncdn.com/i/headshots/soccer/players/full/\${ath.id}.png\` : 'https://a.espncdn.com/i/headshots/nophoto.png');
      
      const statsMap = {};
      if (p.stats) {
        p.stats.forEach(st => {
          statsMap[st.name || st.label] = st.displayValue || st.value || '0';
        });
      }

      const html = \`
        <div style="font-size:0.8rem; font-weight:bold; color:#38bdf8; text-transform:uppercase; letter-spacing:1px;">Estadísticas Individuales</div>
        <div style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:8px;">\${ath.displayName || 'Jugador'} #\${ath.jersey || ''}</div>
        
        <div class="sofascore-grid">
          <div>
            <img src="\${fotoUrl}" style="width:100%; max-width:130px; height:150px; object-fit:cover; border-radius:8px; border:1px solid #334155; background:#1e293b;" onerror="this.src='https://a.espncdn.com/i/headshots/nophoto.png'" alt="">
            
            <div class="heatmap-box">
              <div style="position:absolute; top:4px; left:6px; font-size:0.65rem; color:#86efac; font-weight:bold; background:rgba(0,0,0,0.5); padding:1px 4px; border-radius:3px;">Mapa de calor</div>
              <div style="position:absolute; top:35%; left:30%; width:35px; height:35px; background:radial-gradient(circle, rgba(239,68,68,0.8) 0%, rgba(234,179,8,0.5) 50%, transparent 70%); border-radius:50%;"></div>
            </div>
          </div>

          <div>
            <table class="sofascore-table">
              <tr><td>Minutos jugados</td><td>\${statsMap['minutesPlayed'] || statsMap['mins'] || '90\''}</td></tr>
              <tr><td>Goles</td><td>\${statsMap['goals'] || '0'}</td></tr>
              <tr><td>Asistencias</td><td>\${statsMap['goalAssists'] || statsMap['assists'] || '0'}</td></tr>
              <tr><td>Despejes</td><td>\${statsMap['clearances'] || '0'}</td></tr>
              <tr><td>Disparos Bloqueados</td><td>\${statsMap['blockedShots'] || '0'}</td></tr>
              <tr><td>Intercepciones</td><td>\${statsMap['interceptions'] || '0'}</td></tr>
              <tr><td>Entradas</td><td>\${statsMap['tackles'] || '0'}</td></tr>
              <tr><td>Pases precisos</td><td>\${statsMap['accuratePasses'] || statsMap['passes'] || '0'}</td></tr>
              <tr><td>Pases clave</td><td>\${statsMap['keyPasses'] || '0'}</td></tr>
              <tr><td>Faltas recibidas</td><td>\${statsMap['foulsSuffered'] || '0'}</td></tr>
              <tr><td>Tiros a puerta</td><td>\${statsMap['shotsOnTarget'] || '0'}</td></tr>
            </table>
          </div>
        </div>
      \`;

      document.getElementById('sofascore-card-content').innerHTML = html;
      document.getElementById('sofascore-card').style.display = 'block';
    }

    function cerrarSofaCard() {
      document.getElementById('sofascore-card').style.display = 'none';
    }

    function cambiarTab(tab) {
      document.getElementById('tab-general-btn').classList.toggle('active', tab === 'general');
      document.getElementById('tab-lineups-btn').classList.toggle('active', tab === 'lineups');
      document.getElementById('modal-body-general').style.display = tab === 'general' ? 'block' : 'none';
      document.getElementById('modal-body-lineups').style.display = tab === 'lineups' ? 'block' : 'none';
      cerrarSofaCard();
    }

    function cerrarModal(e) {
      if (e.target.id === 'stats-modal') cerrarModalDirecto();
    }

    function cerrarModalDirecto() {
      document.getElementById('stats-modal').style.display = 'none';
      cerrarSofaCard();
    }

    cargarAgendaDirecta();
    setInterval(cargarAgendaDirecta, 10000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

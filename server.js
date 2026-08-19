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
    
    /* Header Google Style */
    .header { background: #fff; padding: 16px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(60,64,67,0.12), 0 1px 2px rgba(60,64,67,0.24); text-align: center; }
    h2 { font-size: 1.2rem; color: #1a73e8; margin: 0 0 6px 0; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #5f6368; background: #f1f3f4; padding: 4px 12px; border-radius: 16px; display: inline-block; text-transform: capitalize; font-weight: 500; }
    
    /* Match Card Estilo Google Search */
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
    .live-badge { color: #d93025; font-weight: 600; background: #fce8e6; padding: 3px 10px; border-radius: 12px; display: flex; align-items: center; gap: 4px; }
    .finished-badge { color: #70757a; font-weight: 500; }

    /* Modal Google Card */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(32,33,36,0.6); backdrop-filter: blur(2px); z-index: 1000; justify-content: center; align-items: center; padding: 12px; }
    .modal-content { background: #ffffff; width: 100%; max-width: 480px; max-height: 90vh; border-radius: 20px; padding: 20px; overflow-y: auto; box-shadow: 0 8px 24px rgba(60,64,67,0.28); position: relative; border: 1px solid #dadce0; }
    .close-btn { position: absolute; top: 14px; right: 16px; background: #f1f3f4; color: #5f6368; border: none; width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
    .close-btn:hover { background: #e8eaed; color: #202124; }

    /* Pestanas tipo Google Tab */
    .tab-container { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 16px; }
    .tab-btn { flex: 1; padding: 10px 0; background: none; border: none; color: #5f6368; font-weight: 500; cursor: pointer; font-size: 0.85rem; border-bottom: 3px solid transparent; transition: color 0.2s, border-color 0.2s; }
    .tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }

    /* Cancha Táctica Adaptada a Fondo Claro */
    .pitch { position: relative; width: 100%; height: 360px; background: #e6f4ea; border: 2px solid #ceead6; border-radius: 16px; overflow: hidden; margin: 10px 0; display: flex; flex-direction: column; justify-content: space-between; padding: 10px 0; }
    .pitch-line-center { position: absolute; width: 100%; height: 1px; background: rgba(52,168,83,0.3); top: 50%; }
    .pitch-circle { position: absolute; width: 70px; height: 70px; border: 1px solid rgba(52,168,83,0.3); border-radius: 50%; top: calc(50% - 35px); left: calc(50% - 35px); }
    
    .team-pitch-half { height: 48%; display: flex; flex-direction: column; justify-content: space-around; position: relative; }
    .tactical-row { display: flex; justify-content: space-around; align-items: center; width: 100%; }
    
    .player-node { display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.15s; position: relative; }
    .player-node:hover { transform: scale(1.1); }
    
    .player-avatar-box { width: 34px; height: 34px; border-radius: 50%; overflow: hidden; border: 2px solid #ffffff; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.2); position: relative; }
    .player-avatar-box img { width: 100%; height: 100%; object-fit: cover; }
    
    .player-shirt-badge { position: absolute; bottom: -2px; right: -4px; width: 15px; height: 15px; border-radius: 50%; font-size: 0.6rem; font-weight: bold; color: #fff; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; }
    .player-name { font-size: 0.65rem; color: #202124; font-weight: 500; background: rgba(255,255,255,0.85); padding: 1px 4px; border-radius: 4px; white-space: nowrap; max-width: 65px; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

    /* Tarjeta Flotante de Jugador (Estilo Pop-over) */
    .player-card-modal { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; background: #ffffff; border: 1px solid #dadce0; border-radius: 16px; padding: 16px; z-index: 1100; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
    .player-card-header { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f1f3f4; padding-bottom: 10px; margin-bottom: 12px; }
    .player-photo-container { position: relative; width: 54px; height: 54px; flex-shrink: 0; }
    .player-card-photo { width: 54px; height: 54px; border-radius: 50%; border: 2px solid #e8eaed; object-fit: cover; background: #f8f9fa; }
    .player-jersey-badge { position: absolute; bottom: -2px; right: -4px; padding: 2px 6px; border-radius: 10px; font-size: 0.65rem; font-weight: bold; color: #fff; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }

    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; }
    .stat-item { background: #f8f9fa; padding: 8px 10px; border-radius: 8px; border: 1px solid #f1f3f4; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Partidos de hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando fecha...</div>
    </div>
    <div id="matches-container">Consultando encuentros...</div>
  </div>

  <!-- Modal Principal -->
  <div id="stats-modal" class="modal-overlay" onclick="cerrarModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="cerrarModalDirecto()">✕</button>
      
      <div class="tab-container">
        <button id="tab-general-btn" class="tab-btn active" onclick="cambiarTab('general')">Información general</button>
        <button id="tab-lineups-btn" class="tab-btn" onclick="cambiarTab('lineups')">Alineaciones & Campo</button>
      </div>

      <div id="modal-body-general">Cargando...</div>
      <div id="modal-body-lineups" style="display:none;">Cargando alineaciones...</div>

      <!-- Card Flotante del Jugador -->
      <div id="player-card" class="player-card-modal">
        <button style="position:absolute; right:12px; top:12px; background:none; border:none; color:#70757a; font-size:1.1rem; cursor:pointer;" onclick="cerrarPlayerCard()">✕</button>
        <div id="player-card-content"></div>
      </div>
    </div>
  </div>

  <script>
    let globalMatchData = null;

    function formatearHoraAR(dateStr) {
      if (!dateStr) return 'A confirmar';
      try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false });
      } catch (e) { return 'A confirmar'; }
    }

    async function cargarAgendaDirecta() {
      const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(/-/g, '');
      document.getElementById('fecha-hoy').innerText = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' });

      const endpoints = [
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=\${hoyStr}\`,
        \`https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=\${hoyStr}\`
      ];

      try {
        const respuestas = await Promise.all(endpoints.map(u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null)));
        const partidosMap = new Map();

        respuestas.forEach(json => {
          if (json && json.events) {
            json.events.forEach(item => {
              if (!item || partidosMap.has(item.id)) return;
              const comp = item.competitions && item.competitions[0];
              if (!comp) return;
              const home = comp.competitors ? comp.competitors.find(c => c.homeAway === 'home') : null;
              const away = comp.competitors ? comp.competitors.find(c => c.homeAway === 'away') : null;
              if (!home || !away) return;

              const statusState = item.status?.type?.state || 'pre';
              partidosMap.set(item.id, {
                id: item.id,
                liga: json.leagues?.[0]?.name || 'Fútbol',
                local: home.team?.shortDisplayName || home.team?.name || 'Local',
                logoLocal: home.team?.logo || '',
                visitante: away.team?.shortDisplayName || away.team?.name || 'Visitante',
                logoVisitante: away.team?.logo || '',
                golesLocal: home.score ?? '-',
                golesVisitante: away.score ?? '-',
                hora: formatearHoraAR(item.date),
                enVivo: statusState === 'in',
                finalizado: statusState === 'post',
                minuto: item.status?.displayClock ? item.status.displayClock + "'" : null,
                estadoText: statusState === 'in' ? 'En juego' : (statusState === 'post' ? 'Finalizado' : 'Programado')
              });
            });
          }
        });

        renderizarAgenda(Array.from(partidosMap.values()).sort((a,b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora)));
      } catch (err) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#70757a;">Cargando partidos...</p>';
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
              <img src="\${p.logoLocal}" class="club-logo" alt="">
              <span class="team-name">\${p.local}</span>
            </div>
            <div class="score-container">
              <span class="score">\${p.golesLocal} - \${p.golesVisitante}</span>
            </div>
            <div class="team-box team-right">
              <span class="team-name">\${p.visitante}</span>
              <img src="\${p.logoVisitante}" class="club-logo" alt="">
            </div>
          </div>
          <div class="status-container">
            \${p.enVivo ? \`<span class="live-badge">🔴 EN VIVO \${p.minuto || ''}</span>\` : (p.finalizado ? '<span class="finished-badge">Finalizado</span>' : \`<span class="time-badge">\${p.hora} hs</span>\`)}
            <span style="color:#70757a;">\${p.estadoText}</span>
          </div>
        </div>
      \`).join('');
    }

    async function abrirEstadisticas(matchId) {
      document.getElementById('stats-modal').style.display = 'flex';
      cambiarTab('general');
      document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#1a73e8; padding:20px 0;">Cargando estadísticas...</p>';
      document.getElementById('modal-body-lineups').innerHTML = '<p style="text-align:center; color:#1a73e8; padding:20px 0;">Cargando alineaciones...</p>';

      try {
        const res = await fetch(\`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=\${matchId}\`);
        globalMatchData = await res.json();
        
        renderTabGeneral();
        renderTabLineups();
      } catch (err) {
        document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#70757a;">Detalles no disponibles.</p>';
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
            <div style="font-size:1.6rem; font-weight:700; color:#202124; background:#f1f3f4; padding:4px 16px; border-radius:20px;">\${home.score ?? '-'} - \${away.score ?? '-'}</div>
            <div style="width:35%; font-weight:600; color:#202124;">\${away.team.shortDisplayName || away.team.name}</div>
          </div>
        </div>
      \`;

      if (boxscore?.teams?.[0]?.statistics) {
        html += '<h4 style="color:#202124; margin:16px 0 8px 0; font-size:0.9rem; font-weight:600;">Estadísticas del partido</h4>';
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
            <p style="color:#e37400; font-weight:600;">Alineaciones no confirmadas</p>
            <p style="font-size:0.8rem;">Estarán disponibles antes del inicio del encuentro.</p>
          </div>
        \`;
        return;
      }

      const homeRoster = rosters[0];
      const awayRoster = rosters[1];

      const colorHome = homeRoster.team?.color ? '#' + homeRoster.team.color : '#1a73e8';
      const colorAway = awayRoster.team?.color ? '#' + awayRoster.team.color : '#d93025';

      let html = \`
        <div style="text-align:center; font-size:0.8rem; color:#5f6368; margin-bottom:8px;">
          <span>\${homeRoster.formation || '4-3-3'} vs \${awayRoster.formation || '4-3-3'}</span>
        </div>
        <div class="pitch">
          <div class="pitch-line-center"></div>
          <div class="pitch-circle"></div>
          
          <div class="team-pitch-half">
            \${generarCanchaJugadores(homeRoster.roster, true, colorHome, homeRoster.team?.displayName || 'Local', homeRoster.team?.logo || '')}
          </div>
          
          <div class="team-pitch-half" style="transform: rotate(180deg);">
            \${generarCanchaJugadores(awayRoster.roster, false, colorAway, awayRoster.team?.displayName || 'Visitante', awayRoster.team?.logo || '')}
          </div>
        </div>
        <p style="text-align:center; font-size:0.75rem; color:#1a73e8; margin-top:6px;">Toca un jugador para ver detalles</p>
      \`;

      document.getElementById('modal-body-lineups').innerHTML = html;
    }

    function generarCanchaJugadores(rosterList, isHome, colorCamiseta, nombreEquipo, logoEquipo) {
      if (!rosterList) return '';
      const starters = rosterList.filter(p => p.starter).slice(0, 11);
      
      const lineas = [ [], [], [], [] ];
      starters.forEach((p, idx) => {
        if (idx === 0) lineas[0].push(p);
        else if (idx <= 4) lineas[1].push(p);
        else if (idx <= 8) lineas[2].push(p);
        else lineas[3].push(p);
      });

      const fallbackAvatar = 'https://a.espncdn.com/i/headshots/nophoto.png';

      return lineas.map(row => \`
        <div class="tactical-row">
          \${row.map(p => {
            const ath = p.athlete || {};
            const num = ath.jersey || '?';
            const name = ath.shortName || ath.displayName || 'Jugador';
            const fotoUrl = ath.headshot?.href || (ath.id ? \`https://a.espncdn.com/i/headshots/soccer/players/full/\${ath.id}.png\` : fallbackAvatar);

            const playerObjStr = JSON.stringify({
              id: ath.id,
              name: ath.displayName || name,
              jersey: num,
              foto: fotoUrl,
              equipo: nombreEquipo,
              logoEquipo: logoEquipo,
              color: colorCamiseta,
              stats: p.stats || []
            }).replace(/"/g, '&quot;');

            return \`
              <div class="player-node" onclick="verPlayerStats(\${playerObjStr})">
                <div class="player-avatar-box">
                  <img src="\${fotoUrl}" onerror="this.src='\${fallbackAvatar}'" alt="">
                  <div class="player-shirt-badge" style="background:\${colorCamiseta};">\${num}</div>
                </div>
                <div class="player-name" style="\${isHome ? '' : 'transform: rotate(180deg);'}">\${name}</div>
              </div>
            \`;
          }).join('')}
        </div>
      \`).join('');
    }

    function verPlayerStats(p) {
      const card = document.getElementById('player-card');
      const content = document.getElementById('player-card-content');
      
      let statsListHtml = '<p style="color:#70757a; font-size:0.8rem; text-align:center; padding:10px 0;">Sin registros estadísticos individuales en este partido.</p>';
      if (p.stats && p.stats.length > 0) {
        statsListHtml = \`
          <div class="stat-grid">
            \${p.stats.map(s => \`
              <div class="stat-item">
                <div style="color:#70757a; font-size:0.75rem;">\${s.label || s.name}</div>
                <div style="color:#202124; font-weight:600; font-size:0.95rem;">\${s.value || s.displayValue || '0'}</div>
              </div>
            \`).join('')}
          </div>
        \`;
      }

      content.innerHTML = \`
        <div class="player-card-header">
          <div class="player-photo-container">
            <img src="\${p.foto}" class="player-card-photo" onerror="this.src='https://a.espncdn.com/i/headshots/nophoto.png'" alt="">
            <div class="player-jersey-badge" style="background:\${p.color};">#\${p.jersey}</div>
          </div>
          <div style="flex-grow:1;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <h4 style="margin:0; font-size:1rem; color:#202124; font-weight:600;">\${p.name}</h4>
              \${p.logoEquipo ? \`<img src="\${p.logoEquipo}" style="width:20px; height:20px; object-fit:contain;" alt="">\` : ''}
            </div>
            <span style="font-size:0.8rem; color:#1a73e8; font-weight:500;">\${p.equipo}</span>
          </div>
        </div>
        \${statsListHtml}
      \`;

      card.style.display = 'block';
    }

    function cerrarPlayerCard() {
      document.getElementById('player-card').style.display = 'none';
    }

    function cambiarTab(tab) {
      document.getElementById('tab-general-btn').classList.toggle('active', tab === 'general');
      document.getElementById('tab-lineups-btn').classList.toggle('active', tab === 'lineups');
      document.getElementById('modal-body-general').style.display = tab === 'general' ? 'block' : 'none';
      document.getElementById('modal-body-lineups').style.display = tab === 'lineups' ? 'block' : 'none';
      cerrarPlayerCard();
    }

    function cerrarModal(e) {
      if (e.target.id === 'stats-modal') cerrarModalDirecto();
    }

    function cerrarModalDirecto() {
      document.getElementById('stats-modal').style.display = 'none';
      cerrarPlayerCard();
    }

    cargarAgendaDirecta();
    setInterval(cargarAgendaDirecta, 15000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

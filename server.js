const express = require('express');
const app = express();
const PORT = process process.env.PORT || 3000;

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda & Estadísticas de Partidos</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0e0e10; color: #efeff1; margin: 0; padding: 15px; }
    .container { max-width: 480px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    h2 { font-size: 1.3rem; color: #00ff88; margin: 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #adadb8; background: #1f1f23; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid #2f2f35; text-transform: capitalize; }
    .pulse { width: 10px; height: 10px; background: #00ff88; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #18181b; padding: 16px; border-radius: 14px; margin-bottom: 12px; border: 1px solid #26262c; cursor: pointer; transition: transform 0.15s ease, border-color 0.15s ease; }
    .match-card:hover { border-color: #00ff88; transform: translateY(-2px); }
    .league-title { font-size: 0.72rem; color: #00ff88; text-transform: uppercase; margin-bottom: 10px; font-weight: 700; letter-spacing: 0.5px; display: flex; justify-content: space-between; }
    
    .teams-container { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .team-box { display: flex; align-items: center; gap: 8px; width: 40%; }
    .team-left { justify-content: flex-start; text-align: left; }
    .team-right { justify-content: flex-end; text-align: right; }
    
    .club-logo { width: 28px; height: 28px; object-fit: contain; flex-shrink: 0; }
    .team-name { font-size: 0.9rem; font-weight: 600; line-height: 1.2; }
    .score { color: #fff; font-size: 1.15rem; font-weight: 800; background: #0e0e10; padding: 6px 12px; border-radius: 8px; border: 1px solid #2f2f35; white-space: nowrap; }
    
    .status-container { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #26262c; font-size: 0.8rem; }
    .time-badge { color: #ffcc00; font-weight: bold; }
    .live-badge { color: #ff0055; font-weight: bold; background: rgba(255,0,85,0.15); padding: 3px 8px; border-radius: 6px; }
    .finished-badge { color: #adadb8; font-weight: bold; }
    .click-hint { font-size: 0.7rem; color: #00ff88; font-weight: 600; }

    /* Modal */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center; padding: 15px; }
    .modal-content { background: #18181b; width: 100%; max-width: 460px; max-height: 88vh; border-radius: 16px; padding: 18px; overflow-y: auto; border: 1px solid #00ff88; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative; }
    .close-btn { position: absolute; top: 12px; right: 15px; background: #2f2f35; color: #fff; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; z-index: 10; }
    
    /* Pestañas */
    .tab-container { display: flex; border-bottom: 1px solid #2f2f35; margin-bottom: 15px; }
    .tab-btn { flex: 1; padding: 8px; background: none; border: none; color: #888; font-weight: bold; cursor: pointer; font-size: 0.8rem; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: #00ff88; border-bottom-color: #00ff88; }

    /* Cancha Táctica */
    .pitch { position: relative; width: 100%; height: 360px; background: #17381d; border: 2px solid #2e5c33; border-radius: 12px; overflow: hidden; margin: 10px 0; display: flex; flex-direction: column; justify-content: space-between; padding: 10px 0; }
    .pitch-line-center { position: absolute; width: 100%; height: 1px; background: rgba(255,255,255,0.25); top: 50%; }
    .pitch-circle { position: absolute; width: 70px; height: 70px; border: 1px solid rgba(255,255,255,0.25); border-radius: 50%; top: calc(50% - 35px); left: calc(50% - 35px); }
    
    .team-pitch-half { height: 48%; display: flex; flex-direction: column; justify-content: space-around; position: relative; }
    .tactical-row { display: flex; justify-content: space-around; align-items: center; width: 100%; }
    
    .player-node { display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.15s; position: relative; }
    .player-node:hover { transform: scale(1.15); }
    
    .player-avatar-box { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid #fff; background: #222; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.6); position: relative; }
    .player-avatar-box img { width: 100%; height: 100%; object-fit: cover; }
    
    .player-shirt-badge { position: absolute; bottom: -2px; right: -4px; width: 14px; height: 14px; border-radius: 50%; font-size: 0.55rem; font-weight: bold; color: #fff; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; }
    
    .player-name { font-size: 0.65rem; color: #fff; text-shadow: 1px 1px 2px #000; white-space: nowrap; max-width: 65px; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .card-badge { position: absolute; top: -3px; left: -3px; width: 8px; height: 11px; border-radius: 1px; z-index: 2; }
    .card-yellow { background: #ffcc00; }
    .card-red { background: #ff0055; }

    /* Card de Jugador Individual con Foto */
    .player-card-modal { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; background: #1c1c20; border: 1px solid #00ff88; border-radius: 14px; padding: 16px; z-index: 1100; box-shadow: 0 10px 30px rgba(0,0,0,0.95); }
    .player-card-header { display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #2f2f35; padding-bottom: 12px; margin-bottom: 12px; }
    
    .player-photo-container { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
    .player-card-photo { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #00ff88; object-fit: cover; background: #2f2f35; }
    .player-jersey-badge { position: absolute; bottom: -2px; right: -4px; padding: 2px 6px; border-radius: 8px; font-size: 0.65rem; font-weight: bold; color: #fff; border: 1px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.8); }

    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; }
    .stat-item { background: #121214; padding: 8px 10px; border-radius: 8px; border: 1px solid #26262c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2><span class="pulse"></span> Agenda Real de Hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando fecha...</div>
    </div>
    <div id="matches-container">Consultando partidos...</div>
  </div>

  <!-- Modal Principal -->
  <div id="stats-modal" class="modal-overlay" onclick="cerrarModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="cerrarModalDirecto()">✕</button>
      
      <div class="tab-container">
        <button id="tab-general-btn" class="tab-btn active" onclick="cambiarTab('general')">📊 Stats & Heatmap</button>
        <button id="tab-lineups-btn" class="tab-btn" onclick="cambiarTab('lineups')">📋 Campo & Formaciones</button>
      </div>

      <div id="modal-body-general">Cargando...</div>
      <div id="modal-body-lineups" style="display:none;">Cargando formaciones...</div>

      <!-- Card Flotante con Foto del Jugador -->
      <div id="player-card" class="player-card-modal">
        <button style="position:absolute; right:10px; top:10px; background:none; border:none; color:#aaa; font-size:1.1rem; cursor:pointer;" onclick="cerrarPlayerCard()">✕</button>
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
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#adadb8;">Cargando datos...</p>';
      }
    }

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos.length) {
        container.innerHTML = '<p style="text-align:center; color:#adadb8; padding:30px 0;">No hay encuentros agendados hoy.</p>';
        return;
      }

      container.innerHTML = partidos.map(p => \`
        <div class="match-card" onclick="abrirEstadisticas('\${p.id}')">
          <div class="league-title">
            <span>\${p.liga}</span>
            <span class="click-hint">Ver stats & campo 📋</span>
          </div>
          <div class="teams-container">
            <div class="team-box team-left">
              <img src="\${p.logoLocal}" class="club-logo" alt="">
              <span class="team-name">\${p.local}</span>
            </div>
            <span class="score">\${p.golesLocal} : \${p.golesVisitante}</span>
            <div class="team-box team-right">
              <span class="team-name">\${p.visitante}</span>
              <img src="\${p.logoVisitante}" class="club-logo" alt="">
            </div>
          </div>
          <div class="status-container">
            \${p.enVivo ? \`<span class="live-badge">🔴 EN VIVO \${p.minuto || ''}</span>\` : (p.finalizado ? '<span class="finished-badge">FINALIZADO</span>' : \`<span class="time-badge">⏰ \${p.hora} hs</span>\`)}
            <span style="color:#888;">\${p.estadoText}</span>
          </div>
        </div>
      \`).join('');
    }

    async function abrirEstadisticas(matchId) {
      document.getElementById('stats-modal').style.display = 'flex';
      cambiarTab('general');
      document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#00ff88; padding:20px 0;">Cargando datos...</p>';
      document.getElementById('modal-body-lineups').innerHTML = '<p style="text-align:center; color:#00ff88; padding:20px 0;">Cargando alineaciones...</p>';

      try {
        const res = await fetch(\`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=\${matchId}\`);
        globalMatchData = await res.json();
        
        renderTabGeneral();
        renderTabLineups();
      } catch (err) {
        document.getElementById('modal-body-general').innerHTML = '<p style="text-align:center; color:#aaa;">Detalles no disponibles.</p>';
      }
    }

    function renderTabGeneral() {
      const boxscore = globalMatchData?.boxscore;
      const header = globalMatchData?.header;
      const comp = header?.competitions?.[0];
      if (!comp) return;

      const home = comp.competitors.find(c => c.homeAway === 'home');
      const away = comp.competitors.find(c => c.homeAway === 'away');

      let valPosHome = 50;
      if (boxscore?.teams?.[0]?.statistics) {
        const pos = boxscore.teams[0].statistics.find(s => s.name === 'possessionPct');
        if (pos) valPosHome = parseFloat(pos.displayValue) || 50;
      }
      let valPosAway = 100 - valPosHome;

      let html = \`
        <div style="text-align:center; margin-bottom:15px;">
          <h3 style="margin:0; font-size:0.95rem; color:#00ff88;">\${header.league?.name || 'Partido'}</h3>
          <div style="display:flex; justify-content:space-around; align-items:center; margin-top:8px;">
            <div style="width:35%; font-weight:bold;">\${home.team.shortDisplayName || home.team.name}</div>
            <div style="font-size:1.5rem; font-weight:bold;">\${home.score ?? '-'} - \${away.score ?? '-'}</div>
            <div style="width:35%; font-weight:bold;">\${away.team.shortDisplayName || away.team.name}</div>
          </div>
        </div>

        <h4 style="color:#00ff88; margin:10px 0 5px 0; font-size:0.85rem;">🔥 Mapa de Calor (Dominio)</h4>
        <div style="position:relative; width:100%; height:140px; background:#1b381e; border:1px solid #2e5c33; border-radius:8px; overflow:hidden;">
          <div style="position:absolute; width:100%; height:1px; background:rgba(255,255,255,0.2); top:50%;"></div>
          <div style="position:absolute; width:50px; height:50px; border:1px solid rgba(255,255,255,0.2); border-radius:50%; top:calc(50% - 25px); left:calc(50% - 25px);"></div>
          <div style="position:absolute; width:\${valPosHome * 1.5}px; height:\${valPosHome * 1.5}px; background:radial-gradient(circle, rgba(0,255,136,0.8) 0%, transparent 70%); top:10%; left:15%; filter:blur(10px);"></div>
          <div style="position:absolute; width:\${valPosAway * 1.5}px; height:\${valPosAway * 1.5}px; background:radial-gradient(circle, rgba(255,0,85,0.8) 0%, transparent 70%); bottom:10%; right:15%; filter:blur(10px);"></div>
        </div>
      \`;

      if (boxscore?.teams?.[0]?.statistics) {
        html += '<h4 style="color:#00ff88; margin:15px 0 8px 0; font-size:0.85rem;">📊 Estadísticas</h4>';
        boxscore.teams[0].statistics.forEach((st, idx) => {
          const valA = boxscore.teams[1]?.statistics?.[idx]?.displayValue || '0';
          html += \`
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:4px 0; border-bottom:1px solid #26262c;">
              <strong style="color:#00ff88;">\${st.displayValue}</strong>
              <span style="color:#aaa;">\${st.label}</span>
              <strong style="color:#ff0055;">\${valA}</strong>
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
          <div style="text-align:center; padding:30px 10px; color:#aaa;">
            <p style="color:#ffcc00; font-weight:bold;">⏳ Formaciones Aún No Confirmadas</p>
            <p style="font-size:0.8rem;">Las alineaciones oficiales se publican 45 minutos antes del partido.</p>
          </div>
        \`;
        return;
      }

      const homeRoster = rosters[0];
      const awayRoster = rosters[1];

      const colorHome = homeRoster.team?.color ? '#' + homeRoster.team.color : '#00ff88';
      const colorAway = awayRoster.team?.color ? '#' + awayRoster.team.color : '#ff0055';

      let html = \`
        <div style="text-align:center; font-size:0.8rem; color:#aaa; margin-bottom:8px;">
          <span>\${homeRoster.formation || '4-3-3'} vs \${awayRoster.formation || '4-3-3'}</span>
        </div>
        <div class="pitch">
          <div class="pitch-line-center"></div>
          <div class="pitch-circle"></div>
          
          <!-- LOCAL -->
          <div class="team-pitch-half">
            \${generarCanchaJugadores(homeRoster.roster, true, colorHome, homeRoster.team?.displayName || 'Local', homeRoster.team?.logo || '')}
          </div>
          
          <!-- VISITANTE -->
          <div class="team-pitch-half" style="transform: rotate(180deg);">
            \${generarCanchaJugadores(awayRoster.roster, false, colorAway, awayRoster.team?.displayName || 'Visitante', awayRoster.team?.logo || '')}
          </div>
        </div>
        <p style="text-align:center; font-size:0.7rem; color:#00ff88; margin-top:4px;">💡 Tocá un jugador para ver su tarjeta de rendimiento</p>
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
            
            // Construir URL de la foto oficial
            const fotoUrl = ath.headshot?.href || (ath.id ? \`https://a.espncdn.com/i/headshots/soccer/players/full/\${ath.id}.png\` : fallbackAvatar);
            
            let cardHtml = '';
            if (p.yellowCards) cardHtml = '<div class="card-badge card-yellow"></div>';
            if (p.redCards) cardHtml = '<div class="card-badge card-red"></div>';

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
                \${cardHtml}
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
      
      let statsListHtml = '<p style="color:#aaa; font-size:0.8rem; text-align:center; padding:10px 0;">Sin estadísticas registradas aún en el partido.</p>';
      if (p.stats && p.stats.length > 0) {
        statsListHtml = \`
          <div class="stat-grid">
            \${p.stats.map(s => \`
              <div class="stat-item">
                <div style="color:#aaa; font-size:0.7rem;">\${s.label || s.name}</div>
                <div style="color:#00ff88; font-weight:bold; font-size:0.95rem;">\${s.value || s.displayValue || '0'}</div>
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
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
              <h4 style="margin:0; font-size:1rem; color:#fff;">\${p.name}</h4>
              \${p.logoEquipo ? \`<img src="\${p.logoEquipo}" style="width:20px; height:20px; object-fit:contain;" alt="">\` : ''}
            </div>
            <span style="font-size:0.75rem; color:#00ff88; font-weight:600;">\${p.equipo}</span>
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

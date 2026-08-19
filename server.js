const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

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

    /* Modal centrado */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(4px); z-index: 1000; justify-content: center; align-items: center; padding: 20px; }
    .modal-content { background: #18181b; width: 100%; max-width: 440px; max-height: 85vh; border-radius: 16px; padding: 20px; overflow-y: auto; border: 1px solid #00ff88; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative; }
    
    .close-btn { position: absolute; top: 12px; right: 15px; background: #2f2f35; color: #fff; border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: bold; cursor: pointer; }
    .modal-header { text-align: center; margin-bottom: 15px; }
    
    .stat-row { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; font-size: 0.85rem; border-bottom: 1px solid #26262c; padding-bottom: 4px; }

    /* Cancha Táctica y Mapa de Calor */
    .pitch-container { position: relative; width: 100%; height: 180px; background: #1b381e; border: 2px solid #2e5c33; border-radius: 10px; margin: 15px 0; overflow: hidden; display: flex; justify-content: center; align-items: center; }
    .pitch-line-center { position: absolute; width: 100%; height: 1px; background: rgba(255,255,255,0.3); top: 50%; }
    .pitch-circle { position: absolute; width: 60px; height: 60px; border: 1px solid rgba(255,255,255,0.3); border-radius: 50%; top: calc(50% - 30px); }
    .pitch-box-top { position: absolute; width: 100px; height: 35px; border: 1px solid rgba(255,255,255,0.3); border-top: none; top: 0; }
    .pitch-box-bottom { position: absolute; width: 100px; height: 35px; border: 1px solid rgba(255,255,255,0.3); border-bottom: none; bottom: 0; }
    
    .heat-zone { position: absolute; border-radius: 50%; filter: blur(12px); opacity: 0.75; transition: all 0.5s ease; }
    .heat-home { background: radial-gradient(circle, rgba(0,255,136,0.9) 0%, rgba(0,255,136,0) 70%); }
    .heat-away { background: radial-gradient(circle, rgba(255,0,85,0.9) 0%, rgba(255,0,85,0) 70%); }
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

  <div id="stats-modal" class="modal-overlay" onclick="cerrarModal(event)">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="cerrarModalDirecto()">✕</button>
      <div id="modal-body">Cargando estadísticas en tiempo real...</div>
    </div>
  </div>

  <script>
    function formatearHoraAR(dateStr) {
      if (!dateStr) return 'A confirmar';
      try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch (e) { return 'A confirmar'; }
    }

    async function cargarAgendaDirecta() {
      const hoyStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).replace(/-/g, '');
      const fechaHeader = new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Argentina/Buenos_Aires'
      });

      document.getElementById('fecha-hoy').innerText = fechaHeader;

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
          if (json && json.events && Array.isArray(json.events)) {
            const nombreLiga = (json.leagues && json.leagues[0]) ? json.leagues[0].name : 'Fútbol Profesional';

            json.events.forEach(item => {
              if (!item || partidosMap.has(item.id)) return;

              const comp = item.competitions && item.competitions[0];
              if (!comp) return;

              const homeTeam = comp.competitors ? comp.competitors.find(c => c.homeAway === 'home') : null;
              const awayTeam = comp.competitors ? comp.competitors.find(c => c.homeAway === 'away') : null;

              if (!homeTeam || !awayTeam) return;

              const statusState = (item.status && item.status.type) ? item.status.type.state : 'pre';
              const enVivo = statusState === 'in';
              const finalizado = statusState === 'post';

              partidosMap.set(item.id, {
                id: item.id,
                liga: (json.leagues && json.leagues[0]) ? json.leagues[0].name : nombreLiga,
                local: homeTeam.team ? (homeTeam.team.shortDisplayName || homeTeam.team.name) : 'Local',
                logoLocal: homeTeam.team && homeTeam.team.logo ? homeTeam.team.logo : 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
                visitante: awayTeam.team ? (awayTeam.team.shortDisplayName || awayTeam.team.name) : 'Visitante',
                logoVisitante: awayTeam.team && awayTeam.team.logo ? awayTeam.team.logo : 'https://a.espncdn.com/i/teamlogos/default-team-logo.png',
                golesLocal: (homeTeam.score !== undefined && homeTeam.score !== null) ? homeTeam.score : '-',
                golesVisitante: (awayTeam.score !== undefined && awayTeam.score !== null) ? awayTeam.score : '-',
                hora: formatearHoraAR(item.date),
                enVivo: enVivo,
                finalizado: finalizado,
                minuto: (item.status && item.status.displayClock) ? item.status.displayClock + "'" : null,
                estadoText: enVivo ? 'En juego' : (finalizado ? 'Finalizado' : 'Programado')
              });
            });
          }
        });

        const partidos = Array.from(partidosMap.values());
        partidos.sort((a, b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora));

        renderizarAgenda(partidos);
      } catch (err) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#adadb8;">Actualizando conexión...</p>';
      }
    }

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos || partidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#adadb8; padding: 30px 0;">No hay encuentros agendados hoy.</p>';
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
          <div class="match-card" onclick="abrirEstadisticas('\${p.id}')">
            <div class="league-title">
              <span>\${p.liga}</span>
              <span class="click-hint">Ver stats & heatmap 🔥</span>
            </div>
            <div class="teams-container">
              <div class="team-box team-left">
                <img src="\${p.logoLocal}" class="club-logo" alt="" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'">
                <span class="team-name">\${p.local}</span>
              </div>
              <span class="score">\${p.golesLocal} : \${p.golesVisitante}</span>
              <div class="team-box team-right">
                <span class="team-name">\${p.visitante}</span>
                <img src="\${p.logoVisitante}" class="club-logo" alt="" onerror="this.src='https://a.espncdn.com/i/teamlogos/default-team-logo.png'">
              </div>
            </div>
            <div class="status-container">
              \${badgeEstado}
              <span style="color: #888;">\${p.estadoText}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    async function abrirEstadisticas(matchId) {
      const modal = document.getElementById('stats-modal');
      const modalBody = document.getElementById('modal-body');
      modal.style.display = 'flex';
      modalBody.innerHTML = '<p style="text-align:center; color:#00ff88; padding: 20px 0;">Cargando mapa de calor y estadísticas...</p>';

      try {
        const res = await fetch(\`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=\${matchId}\`);
        if (!res.ok) throw new Error('Api error');
        const json = await res.json();

        const boxscore = json.boxscore;
        const header = json.header;
        const comp = header && header.competitions ? header.competitions[0] : null;

        if (!comp) {
          modalBody.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px 0;">Detalles no disponibles temporalmente.</p>';
          return;
        }

        const home = comp.competitors.find(c => c.homeAway === 'home');
        const away = comp.competitors.find(c => c.homeAway === 'away');

        let htmlStats = \`
          <div class="modal-header">
            <h3 style="margin:0 0 10px 0; font-size:1rem; color:#00ff88;">\${header.league ? header.league.name : 'Estadísticas'}</h3>
            <div style="display:flex; justify-content:space-around; align-items:center; margin-top:10px;">
              <div style="text-align:center; width:35%;">
                <img src="\${home.team.logo}" style="width:36px; height:36px; object-fit:contain;" onerror="this.style.display='none'">
                <div style="font-weight:bold; font-size:0.85rem; margin-top:4px;">\${home.team.shortDisplayName || home.team.name}</div>
              </div>
              <div style="font-size:1.6rem; font-weight:bold; color:#fff;">\${home.score !== undefined ? home.score : '-'} - \${away.score !== undefined ? away.score : '-'}</div>
              <div style="text-align:center; width:35%;">
                <img src="\${away.team.logo}" style="width:36px; height:36px; object-fit:contain;" onerror="this.style.display='none'">
                <div style="font-weight:bold; font-size:0.85rem; margin-top:4px;">\${away.team.shortDisplayName || away.team.name}</div>
              </div>
            </div>
          </div>
        \`;

        // Generación de Mapa de Calor de Presión y Dominio
        let valPosesionHome = 50;
        let valPosesionAway = 50;

        if (boxscore && Array.isArray(boxscore.teams) && boxscore.teams.length >= 2) {
          const statsHome = boxscore.teams[0].statistics || [];
          const posStat = statsHome.find(s => s.name === 'possessionPct' || s.label === 'Posesión');
          if (posStat) {
            valPosesionHome = parseFloat(posStat.displayValue) || 50;
            valPosesionAway = 100 - valPosesionHome;
          }
        }

        htmlStats += \`
          <h4 style="color:#00ff88; margin: 15px 0 5px 0; font-size:0.85rem;">🔥 Mapa de Calor de Dominio</h4>
          <div class="pitch-container">
            <div class="pitch-line-center"></div>
            <div class="pitch-circle"></div>
            <div class="pitch-box-top"></div>
            <div class="pitch-box-bottom"></div>
            
            <!-- Zona de Calor Equipo Local (Verde) -->
            <div class="heat-zone heat-home" style="width:\${valPosesionHome * 1.8}px; height:\${valPosesionHome * 1.8}px; top:15%; left:\${Math.max(10, valPosesionHome - 20)}%;"></div>
            
            <!-- Zona de Calor Equipo Visitante (Rojo) -->
            <div class="heat-zone heat-away" style="width:\${valPosesionAway * 1.8}px; height:\${valPosesionAway * 1.8}px; bottom:15%; right:\${Math.max(10, valPosesionAway - 20)}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#aaa; margin-bottom:15px;">
            <span style="color:#00ff88;">🟢 Zona Local (\${valPosesionHome}%)</span>
            <span style="color:#ff0055;">🔴 Zona Visitante (\${valPosesionAway}%)</span>
          </div>
        \`;

        // Métricas numéricas
        if (boxscore && Array.isArray(boxscore.teams) && boxscore.teams.length >= 2) {
          const statsHome = boxscore.teams[0].statistics || [];
          const statsAway = boxscore.teams[1].statistics || [];

          if (statsHome.length > 0) {
            htmlStats += '<h4 style="color:#00ff88; margin: 15px 0 10px 0; border-bottom:1px solid #2f2f35; padding-bottom:5px; font-size:0.85rem;">📊 Métricas del Partido</h4>';

            statsHome.forEach((st, idx) => {
              const valHome = st.displayValue || '0';
              const valAway = statsAway[idx] ? statsAway[idx].displayValue : '0';

              htmlStats += \`
                <div class="stat-row">
                  <strong style="color:#00ff88;">\${valHome}</strong>
                  <span style="color:#aaa; font-size:0.8rem;">\${st.label}</span>
                  <strong style="color:#ff0055;">\${valAway}</strong>
                </div>
              \`;
            });
          }
        }

        modalBody.innerHTML = htmlStats;
      } catch (err) {
        modalBody.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px 0;">No se pudo cargar la vista táctica de este encuentro.</p>';
      }
    }

    function cerrarModal(event) {
      if (event.target.id === 'stats-modal') cerrarModalDirecto();
    }

    function cerrarModalDirecto() {
      document.getElementById('stats-modal').style.display = 'none';
    }

    cargarAgendaDirecta();
    setInterval(cargarAgendaDirecta, 15000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

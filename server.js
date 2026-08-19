const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agenda de Partidos y Estadísticas</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0e0e10; color: #efeff1; margin: 0; padding: 15px; }
    .container { max-width: 480px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    h2 { font-size: 1.3rem; color: #00ff88; margin: 5px 0; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .date-badge { font-size: 0.85rem; color: #adadb8; background: #1f1f23; padding: 4px 12px; border-radius: 12px; display: inline-block; border: 1px solid #2f2f35; text-transform: capitalize; }
    .pulse { width: 10px; height: 10px; background: #00ff88; border-radius: 50%; display: inline-block; animation: blink 1.5s infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    
    .match-card { background: #18181b; padding: 16px; border-radius: 14px; margin-bottom: 14px; border: 1px solid #26262c; }
    .league-title { font-size: 0.75rem; color: #00ff88; text-transform: uppercase; margin-bottom: 12px; font-weight: 700; letter-spacing: 0.5px; }
    
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

    /* Panel de estadísticas en vivo */
    .stats-box { margin-top: 12px; background: #0e0e10; padding: 10px; border-radius: 8px; font-size: 0.78rem; border: 1px solid #2f2f35; color: #adadb8; }
    .stats-title { font-weight: bold; color: #00ff88; margin-bottom: 6px; text-transform: uppercase; font-size: 0.7rem; }
    .stats-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2><span class="pulse"></span> Agenda Real de Hoy</h2>
      <div id="fecha-hoy" class="date-badge">Cargando fecha...</div>
    </div>
    <div id="matches-container">Consultando agenda directa...</div>
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
      } catch (e) {
        return 'A confirmar';
      }
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

              // Extraer estadisticas en vivo si existen
              let estadisticas = null;
              if (enVivo && comp.headlines && comp.headlines[0]) {
                estadisticas = comp.headlines[0].description || comp.headlines[0].shortLinkText;
              }

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
                estadoText: enVivo ? 'En juego' : (finalizado ? 'Finalizado' : 'Programado'),
                resumenStats: estadisticas,
                detallesComp: comp.status ? comp.status.type.detail : ''
              });
            });
          }
        });

        const partidos = Array.from(partidosMap.values());
        partidos.sort((a, b) => (b.enVivo - a.enVivo) || a.hora.localeCompare(b.hora));

        renderizarAgenda(partidos);
      } catch (err) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#adadb8; padding: 20px 0;">Error de conexión. Reintentando...</p>';
      }
    }

    function renderizarAgenda(partidos) {
      const container = document.getElementById('matches-container');
      if (!partidos || partidos.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#adadb8; padding: 30px 0;">No hay encuentros agendados en las ligas monitoreadas para la jornada de hoy.</p>';
        return;
      }

      container.innerHTML = partidos.map(p => {
        let badgeEstado = \`<span class="time-badge">⏰ \${p.hora} hs</span>\`;
        if (p.enVivo) {
          badgeEstado = \`<span class="live-badge">🔴 EN VIVO \${p.minuto ? "(" + p.minuto + ")" : ""}</span>\`;
        } else if (p.finalizado) {
          badgeEstado = \`<span class="finished-badge">FINALIZADO</span>\`;
        }

        let panelStats = '';
        if (p.enVivo) {
          panelStats = \`
            <div class="stats-box">
              <div class="stats-title">📊 Estado del Partido en Vivo</div>
              <div class="stats-row"><span>Estado:</span> <strong>\${p.detallesComp || 'En disputa'}</strong></div>
              \${p.resumenStats ? \`<div class="stats-row"><span>Incidencias:</span> <strong>\${p.resumenStats}</strong></div>\` : ''}
            </div>
          \`;
        }

        return \`
          <div class="match-card">
            <div class="league-title">\${p.liga}</div>
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
            \${panelStats}
            <div class="status-container">
              \${badgeEstado}
              <span style="color: #888;">\${p.estadoText}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    cargarAgendaDirecta();
    setInterval(cargarAgendaDirecta, 15000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

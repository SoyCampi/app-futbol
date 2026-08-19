const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint backend para evitar bloqueos CORS en el cliente
app.get('/api/partidos', async (req, res) => {
  const hoyStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const endpoints = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=${hoyStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.libertadores/scoreboard?dates=${hoyStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/conmebol.sudamericana/scoreboard?dates=${hoyStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${hoyStr}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard?dates=${hoyStr}`
  ];

  try {
    const respuestas = await Promise.allSettled(
      endpoints.map(url => fetch(url).then(r => r.json()))
    );

    const partidosMap = new Map();

    respuestas.forEach(r => {
      if (r.status === 'fulfilled' && r.value && r.value.events) {
        const json = r.value;
        json.events.forEach(item => {
          if (!item || partidosMap.has(item.id)) return;
          const comp = item.competitions?.[0];
          if (!comp) return;

          const home = comp.competitors?.find(c => c.homeAway === 'home');
          const away = comp.competitors?.find(c => c.homeAway === 'away');
          if (!home || !away) return;

          const state = item.status?.type?.state || 'pre';
          partidosMap.set(item.id, {
            id: item.id,
            liga: json.leagues?.[0]?.name || 'Fútbol',
            local: home.team?.shortDisplayName || home.team?.name || 'Local',
            logoLocal: home.team?.logo || home.team?.logos?.[0]?.href || '',
            visitante: away.team?.shortDisplayName || away.team?.name || 'Visitante',
            logoVisitante: away.team?.logo || away.team?.logos?.[0]?.href || '',
            golesLocal: home.score ?? '0',
            golesVisitante: away.score ?? '0',
            hora: item.date ? new Date(item.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--',
            enVivo: state === 'in',
            finalizado: state === 'post',
            minuto: item.status?.displayClock ? item.status.displayClock + "'" : 'EN VIVO'
          });
        });
      }
    });

    res.json(Array.from(partidosMap.values()));
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar la API' });
  }
});

// Detalle de un partido específico
app.get('/api/partido/:id', async (req, res) => {
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${req.params.id}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar evento' });
  }
});

// Renderizado de la App Frontend
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partidos & Resultados</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f8f9fa; color: #202124; margin: 0; padding: 16px; }
    .container { max-width: 500px; margin: 0 auto; }
    .header { background: #fff; padding: 16px; border-radius: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    h2 { font-size: 1.2rem; color: #1a73e8; margin: 0 0 6px 0; }
    .date-badge { font-size: 0.85rem; color: #5f6368; background: #f1f3f4; padding: 4px 12px; border-radius: 16px; display: inline-block; text-transform: capitalize; }
    
    .match-card { background: #fff; padding: 16px; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; border: 1px solid #dadce0; }
    .league-title { font-size: 0.75rem; color: #5f6368; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; display: flex; justify-content: space-between; }
    .teams-container { display: flex; justify-content: space-between; align-items: center; }
    .team-box { display: flex; align-items: center; gap: 8px; width: 38%; }
    .team-left { justify-content: flex-start; }
    .team-right { justify-content: flex-end; text-align: right; }
    .club-logo { width: 28px; height: 28px; object-fit: contain; }
    .team-name { font-size: 0.9rem; font-weight: 600; }
    .score { font-size: 1.2rem; font-weight: 700; background: #f1f3f4; padding: 4px 12px; border-radius: 16px; }
    
    .status-container { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 1px solid #f1f3f4; font-size: 0.8rem; }
    .live-badge { color: #d93025; font-weight: 700; background: #fce8e6; padding: 2px 8px; border-radius: 10px; }

    /* Modal */
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 1000; justify-content: center; align-items: center; padding: 12px; }
    .modal-content { background: #fff; width: 100%; max-width: 500px; max-height: 90vh; border-radius: 16px; padding: 20px; overflow-y: auto; position: relative; }
    .close-btn { position: absolute; top: 12px; right: 12px; background: #f1f3f4; border: none; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; }
    
    .tab-container { display: flex; border-bottom: 1px solid #dadce0; margin-bottom: 12px; }
    .tab-btn { flex: 1; padding: 8px; background: none; border: none; font-weight: 600; color: #5f6368; cursor: pointer; }
    .tab-btn.active { color: #1a73e8; border-bottom: 3px solid #1a73e8; }

    .lineup-bg { background: #0f172a; color: #fff; padding: 12px; border-radius: 12px; }
    .player-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #334155; font-size: 0.85rem; cursor: pointer; }
    .player-num { width: 20px; color: #38bdf8; font-weight: bold; }

    /* Card SofaScore Overlay */
    .card-sofa { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; z-index: 1100; border-radius: 16px; padding: 16px; color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Partidos de hoy</h2>
      <div id="fecha-hoy" class="date-badge">---</div>
    </div>
    <div id="matches-container">Cargando encuentros...</div>
  </div>

  <div id="stats-modal" class="modal-overlay" onclick="cerrarModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <button class="close-btn" onclick="cerrarModal()">✕</button>
      <div class="tab-container">
        <button id="tb-gen" class="tab-btn active" onclick="setTab('gen')">General</button>
        <button id="tb-lin" class="tab-btn" onclick="setTab('lin')">Alineaciones</button>
      </div>
      <div id="modal-gen">Cargando...</div>
      <div id="modal-lin" style="display:none;">Cargando...</div>

      <div id="card-sofa" class="card-sofa">
        <button style="float:right; background:#334155; color:#fff; border:none; border-radius:50%; width:26px; height:26px; cursor:pointer;" onclick="cerrarCardSofa()">✕</button>
        <div id="card-sofa-body"></div>
      </div>
    </div>
  </div>

  <script>
    let matchCache = null;

    async function obtenerPartidos() {
      const hoy = new Date();
      document.getElementById('fecha-hoy').innerText = hoy.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

      try {
        const res = await fetch('/api/partidos');
        const partidos = await res.json();
        
        const container = document.getElementById('matches-container');
        if(!partidos.length) {
          container.innerHTML = '<p style="text-align:center; color:#70757a;">No hay partidos para mostrar hoy.</p>';
          return;
        }

        container.innerHTML = partidos.map(p => \`
          <div class="match-card" onclick="verDetalles('\${p.id}')">
            <div class="league-title"><span>\${p.liga}</span> <span>Ver más ›</span></div>
            <div class="teams-container">
              <div class="team-box team-left">
                \${p.logoLocal ? \`<img src="\${p.logoLocal}" class="club-logo">\` : ''}
                <span class="team-name">\${p.local}</span>
              </div>
              <span class="score">\${p.golesLocal} - \${p.golesVisitante}</span>
              <div class="team-box team-right">
                <span class="team-name">\${p.visitante}</span>
                \${p.logoVisitante ? \`<img src="\${p.logoVisitante}" class="club-logo">\` : ''}
              </div>
            </div>
            <div class="status-container">
              \${p.enVivo ? \`<span class="live-badge">🔴 EN VIVO \${p.minuto}</span>\` : (p.finalizado ? '<span>Finalizado</span>' : \`<span>\${p.hora} hs</span>\`)}
            </div>
          </div>
        \`).join('');
      } catch (e) {
        document.getElementById('matches-container').innerHTML = '<p style="text-align:center; color:#d93025;">Error de conexión con el servidor.</p>';
      }
    }

    async function verDetalles(id) {
      document.getElementById('stats-modal').style.display = 'flex';
      setTab('gen');
      document.getElementById('modal-gen').innerHTML = 'Cargando estadísticas...';
      document.getElementById('modal-lin').innerHTML = 'Cargando alineaciones...';

      try {
        const res = await fetch('/api/partido/' + id);
        matchCache = await res.json();
        
        // Render General
        const comp = matchCache?.header?.competitions?.[0];
        if (comp) {
          document.getElementById('modal-gen').innerHTML = \`
            <h3 style="text-align:center;">\${comp.competitors[0].team.name} \${comp.competitors[0].score ?? 0} - \${comp.competitors[1].score ?? 0} \${comp.competitors[1].team.name}</h3>
          \`;
        }

        // Render Alineaciones
        const rosters = matchCache?.rosters;
        if(rosters && rosters.length >= 2) {
          document.getElementById('modal-lin').innerHTML = \`
            <div class="lineup-bg">
              <h4>\${rosters[0].team.displayName}</h4>
              \${(rosters[0].roster || []).map(p => {
                const data = JSON.stringify(p).replace(/"/g, '&quot;');
                return \`<div class="player-row" onclick="mostrarJugador(\${data})"><span class="player-num">\${p.athlete?.jersey || '?'}</span> <span>\${p.athlete?.displayName}</span></div>\`;
              }).join('')}
            </div>
          \`;
        } else {
          document.getElementById('modal-lin').innerHTML = '<p style="text-align:center; padding:20px;">Alineaciones no confirmadas.</p>';
        }

      } catch(e) {
        document.getElementById('modal-gen').innerHTML = 'Error al cargar detalles.';
      }
    }

    function mostrarJugador(p) {
      const ath = p.athlete || {};
      const img = ath.headshot?.href || 'https://a.espncdn.com/i/headshots/nophoto.png';
      
      document.getElementById('card-sofa-body').innerHTML = \`
        <h3 style="margin:0 0 10px 0; color:#38bdf8;">\${ath.displayName || 'Jugador'} #\${ath.jersey || ''}</h3>
        <div style="display:flex; gap:12px;">
          <img src="\${img}" style="width:100px; height:110px; object-fit:cover; border-radius:8px; background:#1e293b;">
          <div style="font-size:0.8rem; line-height:1.6;">
            <p style="margin:0;">Posición: \${p.position?.displayName || 'Jugador'}</p>
            <p style="margin:0;">Titular: \${p.starter ? 'Sí' : 'No'}</p>
            <p style="margin:0;">Minutos: 90'</p>
          </div>
        </div>
      \`;
      document.getElementById('card-sofa').style.display = 'block';
    }

    function cerrarCardSofa() { document.getElementById('card-sofa').style.display = 'none'; }
    function setTab(t) {
      document.getElementById('tb-gen').classList.toggle('active', t === 'gen');
      document.getElementById('tb-lin').classList.toggle('active', t === 'lin');
      document.getElementById('modal-gen').style.display = t === 'gen' ? 'block' : 'none';
      document.getElementById('modal-lin').style.display = t === 'lin' ? 'block' : 'none';
      cerrarCardSofa();
    }
    function cerrarModal() { document.getElementById('stats-modal').style.display = 'none'; cerrarCardSofa(); }

    obtenerPartidos();
    setInterval(obtenerPartidos, 15000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// API Backend: Consulta ligas y torneos del día
app.get('/api/google-widget', async (req, res) => {
  const hoyStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // Ligas y torneos principales
  const leagues = [
    'esp.1',              // LaLiga España
    'arg.1',              // Liga Argentina
    'arg.copa',          // Copa Argentina
    'conmebol.libertadores', // Copa Libertadores
    'conmebol.sudamericana', // Copa Sudamericana
    'uefa.champions',    // UEFA Champions League
    'eng.1',              // Premier League
    'usa.1'               // MLS
  ];
  
  try {
    let allEvents = [];

    // Obtener eventos de todas las ligas configuradas
    for (const slug of leagues) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${hoyStr}`;
        const r = await fetch(url).then(res => res.ok ? res.json() : null);
        if (r && r.events && r.events.length > 0) {
          r.events.forEach(ev => {
            ev._leagueName = r.leagues?.[0]?.name || 'Fútbol';
            ev._leagueSlug = slug;
          });
          allEvents = allEvents.concat(r.events);
        }
      } catch (err) {
        // Si falla una liga, continua con las demás
      }
    }

    // Si la API no retorna resultados para la fecha exacta de hoy, fallback general
    if (allEvents.length === 0) {
      const urlDefault = `https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard`;
      const rDef = await fetch(urlDefault).then(res => res.json());
      allEvents = (rDef.events || []).map(ev => ({ ...ev, _leagueName: rDef.leagues?.[0]?.name || 'LaLiga', _leagueSlug: 'esp.1' }));
    }

    // 1. SELECCIONAR EL PARTIDO DESTACADO (Prioridad: En Vivo -> Finalizado reciente -> Próximo)
    const mainEvent = allEvents.find(e => e.status?.type?.state === 'in') 
                   || allEvents.find(e => e.status?.type?.state === 'post') 
                   || allEvents[0];
    
    let mainMatchData = null;
    let activeLeagueSlug = 'esp.1';

    if (mainEvent) {
      activeLeagueSlug = mainEvent._leagueSlug || 'esp.1';
      const comp = mainEvent.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');

      const state = mainEvent.status?.type?.state || 'pre';
      let timerText = '0:00';
      if (state === 'in') {
        timerText = mainEvent.status?.displayClock ? `${mainEvent.status.displayClock}'` : 'EN VIVO';
      } else if (state === 'post') {
        timerText = 'FINAL';
      } else {
        const d = new Date(mainEvent.date);
        timerText = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      mainMatchData = {
        id: mainEvent.id,
        liga: mainEvent._leagueName,
        local: home?.team?.shortDisplayName || home?.team?.name || 'Local',
        logoLocal: home?.team?.logo || home?.team?.logos?.[0]?.href || '',
        visitante: away?.team?.shortDisplayName || away?.team?.name || 'Visitante',
        logoVisitante: away?.team?.logo || away?.team?.logos?.[0]?.href || '',
        golesLocal: home?.score ?? '0',
        golesVisitante: away?.score ?? '0',
        minuto: timerText,
        enVivo: state === 'in'
      };
    }

    // 2. CONSTRUIR EL LISTADO COMPLETO DE PARTIDOS DEL DÍA
    const fullAgenda = allEvents.map(e => {
      const c = e.competitions?.[0];
      const h = c?.competitors?.find(x => x.homeAway === 'home');
      const a = c?.competitors?.find(x => x.homeAway === 'away');
      const dt = new Date(e.date);
      const state = e.status?.type?.state;

      let estadoTexto = '';
      if (state === 'in') {
        estadoTexto = `🔴 EN VIVO (${e.status?.displayClock || ''}')`;
      } else if (state === 'post') {
        estadoTexto = 'Finalizado';
      } else {
        estadoTexto = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' hs';
      }

      return {
        id: e.id,
        liga: e._leagueName,
        local: h?.team?.shortDisplayName || h?.team?.name || 'Local',
        logoLocal: h?.team?.logo || '',
        golesLocal: h?.score ?? '-',
        visitante: a?.team?.shortDisplayName || a?.team?.name || 'Visitante',
        logoVisitante: a?.team?.logo || '',
        golesVisitante: a?.score ?? '-',
        estado: estadoTexto,
        enVivo: state === 'in'
      };
    });

    // 3. TABLA DE POSICIONES
    let standings = [];
    try {
      const urlStandings = `https://site.api.espn.com/apis/v2/sports/soccer/${activeLeagueSlug}/standings`;
      const resStandings = await fetch(urlStandings).then(r => r.ok ? r.json() : null);

      if (resStandings?.children?.[0]?.standings?.entries) {
        const entries = resStandings.children[0].standings.entries;
        standings = entries.slice(0, 6).map((item, idx) => {
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
    } catch(e) {}

    res.json({ mainMatch: mainMatchData, agenda: fullAgenda, standings });
  } catch (err) {
    res.status(500).json({ error: 'Error cargando agenda' });
  }
});

// Frontend HTML + CSS
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google Live Match & Schedule</title>
  <style>
    * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body { background-color: #f8f9fa; color: #202124; margin: 0; padding: 24px 12px; display: flex; justify-content: center; }
    
    .google-widget { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 16px; width: 100%; max-width: 880px; }
    @media (max-width: 768px) { .google-widget { grid-template-columns: 1fr; } }

    .card { background: #ffffff; border-radius: 20px; padding: 20px; box-shadow: 0 1px 3px rgba(60,64,67,0.1), 0 1px 2px rgba(60,64,67,0.15); border: 1px solid #dadce0; }

    /* Tarjeta Partido en Vivo Arriba */
    .league-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .league-name { font-size: 0.85rem; color: #5f6368; font-weight: 500; }
    .live-badge-red { background: #ea4335; color: #fff; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

    .match-main-display { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px; }
    .team-box { display: flex; flex-direction: column; align-items: center; width: 32%; text-align: center; }
    .team-logo { width: 64px; height: 64px; object-fit: contain; margin-bottom: 8px; }
    .team-title { font-size: 1rem; font-weight: 600; color: #202124; line-height: 1.2; }

    .score-timer-center { display: flex; align-items: center; gap: 14px; justify-content: center; }
    .score-big { font-size: 3rem; font-weight: 500; color: #202124; line-height: 1; }
    .timer-green { font-size: 1.1rem; font-weight: 700; color: #1e8e3e; line-height: 1; text-align: center; }

    /* Desplegable Lista de Partidos */
    .schedule-section { border-top: 1px solid #f1f3f4; padding-top: 14px; margin-top: 10px; }
    .btn-toggle { width: 100%; background: #f1f3f4; color: #1a73e8; border: none; padding: 10px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; cursor: pointer; text-align: center; }
    .btn-toggle:hover { background: #e8f0fe; }

    .agenda-list { display: none; margin-top: 12px; max-height: 320px; overflow-y: auto; padding-right: 4px; }
    .agenda-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid #f1f3f4; font-size: 0.8rem; }
    .agenda-item.active-live { background-color: #e6f4ea; border-radius: 8px; }
    .agenda-teams { display: flex; flex-direction: column; gap: 4px; width: 65%; }
    .agenda-row { display: flex; align-items: center; justify-content: space-between; }
    .agenda-team-info { display: flex; align-items: center; gap: 6px; }
    .agenda-logo { width: 16px; height: 16px; object-fit: contain; }
    .agenda-status { font-size: 0.75rem; font-weight: 600; color: #5f6368; text-align: right; width: 30%; }

    /* Tabla de Posiciones Derecha */
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .table-title { font-size: 0.95rem; font-weight: 600; color: #202124; }

    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th { color: #70757a; font-weight: 400; padding: 8px 4px; text-align: center; }
    th.align-left { text-align: left; }
    td { padding: 9px 4px; text-align: center; color: #3c4043; border-top: 1px solid #f1f3f4; }
    td.align-left { text-align: left; font-weight: 500; color: #202124; display: flex; align-items: center; gap: 6px; }
    .mini-table-logo { width: 16px; height: 16px; object-fit: contain; }
  </style>
</head>
<body>

  <div class="google-widget">
    
    <!-- Bloque Izquierdo: Tarjeta Partido En Vivo -->
    <div class="card">
      <div class="league-header">
        <span class="league-name" id="lbl-liga">Cargando...</span>
        <span id="badge-vivo" class="live-badge-red" style="display:none;">EN VIVO</span>
      </div>
      
      <div class="match-main-display">
        <div class="team-box">
          <img id="img-home" src="" class="team-logo" alt="">
          <span id="txt-home" class="team-title">--</span>
        </div>

        <div class="score-timer-center">
          <span id="num-goles-home" class="score-big">-</span>
          <span id="txt-tiempo" class="timer-green">--</span>
          <span id="num-goles-away" class="score-big">-</span>
        </div>

        <div class="team-box">
          <img id="img-away" src="" class="team-logo" alt="">
          <span id="txt-away" class="team-title">--</span>
        </div>
      </div>

      <!-- Desplegable Listado de Partidos del Día -->
      <div class="schedule-section">
        <button class="btn-toggle" onclick="toggleAgenda()">📅 Ver partidos del día (<span id="count-partidos">0</span>) ▾</button>
        <div class="agenda-list" id="lista-agenda">
          <!-- Carga Dinámica de Partidos del día -->
        </div>
      </div>
    </div>

    <!-- Bloque Derecho: Tabla de Posiciones -->
    <div class="card">
      <div class="table-header">
        <span class="table-title">Tabla de Posiciones</span>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 15px;">#</th>
            <th class="align-left">Club</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody id="tbody-posiciones">
          <!-- Carga Dinámica -->
        </tbody>
      </table>
    </div>

  </div>

  <script>
    function toggleAgenda() {
      const list = document.getElementById('lista-agenda');
      list.style.display = list.style.display === 'block' ? 'none' : 'block';
    }

    async function cargarDatos() {
      try {
        const response = await fetch('/api/google-widget');
        const data = await response.json();

        // 1. Render Tarjeta Partido Principal / En Vivo
        if (data.mainMatch) {
          const m = data.mainMatch;
          document.getElementById('lbl-liga').innerText = m.liga;
          document.getElementById('txt-home').innerText = m.local;
          document.getElementById('txt-away').innerText = m.visitante;
          document.getElementById('img-home').src = m.logoLocal;
          document.getElementById('img-away').src = m.logoVisitante;
          document.getElementById('num-goles-home').innerText = m.golesLocal;
          document.getElementById('num-goles-away').innerText = m.golesVisitante;
          document.getElementById('txt-tiempo').innerText = m.minuto;
          
          if (m.enVivo) {
            document.getElementById('badge-vivo').style.display = 'inline-block';
          } else {
            document.getElementById('badge-vivo').style.display = 'none';
          }
        }

        // 2. Render Listado de Partidos del Día
        if (data.agenda && data.agenda.length) {
          document.getElementById('count-partidos').innerText = data.agenda.length;
          const container = document.getElementById('lista-agenda');
          
          container.innerHTML = data.agenda.map(item => \`
            <div class="agenda-item \${item.enVivo ? 'active-live' : ''}">
              <div class="agenda-teams">
                <div class="agenda-row">
                  <div class="agenda-team-info">
                    \${item.logoLocal ? \`<img src="\${item.logoLocal}" class="agenda-logo">\` : ''}
                    <span>\${item.local}</span>
                  </div>
                  <strong>\${item.golesLocal}</strong>
                </div>
                <div class="agenda-row">
                  <div class="agenda-team-info">
                    \${item.logoVisitante ? \`<img src="\${item.logoVisitante}" class="agenda-logo">\` : ''}
                    <span>\${item.visitante}</span>
                  </div>
                  <strong>\${item.golesVisitante}</strong>
                </div>
              </div>
              <div class="agenda-status">
                \${item.estado}
              </div>
            </div>
          \`).join('');
        }

        // 3. Render Tabla Posiciones
        const tbody = document.getElementById('tbody-posiciones');
        if (data.standings && data.standings.length) {
          tbody.innerHTML = data.standings.map(s => \`
            <tr>
              <td style="color:#70757a;">\${s.pos}</td>
              <td class="align-left">
                \${s.logo ? \`<img src="\${s.logo}" class="mini-table-logo">\` : ''}
                <span>\${s.nombre}</span>
              </td>
              <td>\${s.pj}</td>
              <td>\${s.g}</td>
              <td>\${s.e}</td>
              <td>\${s.p}</td>
              <td><strong>\${s.pts}</strong></td>
            </tr>
          \`).join('');
        }

      } catch (e) {
        console.error("Error cargando el widget:", e);
      }
    }

    cargarDatos();
    setInterval(cargarDatos, 10000); // Actualiza datos solos en vivo cada 10 segundos
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Servidor iniciado en puerto ${PORT}`));

// ==========================================
// 1. API BACKEND (Corregida con Peticiones Paralelas y Timeouts)
// ==========================================
app.get('/api/google-widget', async (req, res) => {
  // Fecha actual en formato YYYYMMDD para Argentina
  const hoyArg = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina_Buenos_Aires' }).replace(/-/g, '');
  const leagues = ['arg.1', 'arg.copa', 'conmebol.libertadores', 'conmebol.sudamericana', 'esp.1', 'uefa.champions', 'eng.1', 'usa.1'];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    // 1. Obtener todas las ligas en paralelo para no agotar el tiempo del servidor
    const fetchPromises = leagues.map(async (slug) => {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${hoyArg}`;
        const r = await fetch(url, { headers });
        if (!r.ok) return [];
        const data = await r.json();
        
        if (data && data.events && data.events.length > 0) {
          return data.events.map(ev => ({
            ...ev,
            _leagueName: data.leagues?.[0]?.name || 'Fútbol',
            _leagueSlug: slug
          }));
        }
        return [];
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.allSettled(fetchPromises);
    let allEvents = [];
    results.forEach(res => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allEvents = allEvents.concat(res.value);
      }
    });

    // 2. Mapear partidos encontrados
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

      let estadoTexto = '';
      if (state === 'in') {
        estadoTexto = `🔴 EN VIVO ${e.status?.displayClock ? e.status.displayClock + "'" : ''}`;
      } else if (state === 'post') {
        estadoTexto = 'FINAL';
      } else {
        estadoTexto = horaArg;
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
        displayClock: parseInt(e.status?.displayClock) || 0,
        enVivo: state === 'in'
      };
    });

    const mainEvent = agenda.find(a => a.enVivo) || agenda[0] || null;

    // 3. Posiciones
    let standings = [];
    if (mainEvent) {
      try {
        const urlStandings = `https://site.api.espn.com/apis/v2/sports/soccer/${mainEvent.leagueSlug}/standings`;
        const resStandings = await fetch(urlStandings, { headers }).then(r => r.ok ? r.json() : null);

        if (resStandings?.children?.[0]?.standings?.entries) {
          const entries = resStandings.children[0].standings.entries;
          standings = entries.slice(0, 10).map((item, idx) => {
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

    // Respuesta segura asegurando siempre un objeto
    res.json({ agenda, mainMatch: mainEvent, standings });

  } catch (err) {
    console.error("Error backend:", err);
    res.json({ agenda: [], mainMatch: null, standings: [] });
  }
});

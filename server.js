const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal para evitar el error 404 / Not Found
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

async function obtenerPartido() {
  try {
    const res = await axios.get('https://thesportsdb.p.rapidapi.com/livescore.php', {
      params: { s: 'Soccer' },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'thesportsdb.p.rapidapi.com'
      }
    });

    const partidos = res.data?.events;
    if (partidos && partidos.length > 0) {
      const p = partidos[0];
      return {
        teamA: p.strHomeTeam || 'Local',
        teamB: p.strAwayTeam || 'Visitante',
        scoreA: parseInt(p.intHomeScore) || 0,
        scoreB: parseInt(p.intAwayScore) || 0,
        possessionA: 52,
        possessionB: 48,
        shotsA: 6,
        shotsB: 4,
        minute: parseInt(p.strProgress) || 10
      };
    }
  } catch (err) {
    console.error('Error consultando API:', err.message);
  }
  
  // Estado de respaldo por si la API no devuelve partidos en este instante
  return {
    teamA: 'Racing Club',
    teamB: 'Belgrano',
    scoreA: 1,
    scoreB: 0,
    possessionA: 55,
    possessionB: 45,
    shotsA: 7,
    shotsB: 4,
    minute: 42
  };
}

// Enviar datos por WebSocket cada 10 segundos
setInterval(async () => {
  const match = await obtenerPartido();
  if (match) {
    const data = JSON.stringify(match);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  }
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

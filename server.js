const express = require('express');
const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

const API_KEY = 'c617284c9amsh85e0674d8d84794p15d8adjsn647e0bdfdb55';

function obtenerPartido() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'thesportsdb.p.rapidapi.com',
      path: '/livescore.php?s=Soccer',
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'thesportsdb.p.rapidapi.com'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.events && json.events.length > 0) {
            const p = json.events[0];
            return resolve({
              teamA: p.strHomeTeam || 'Local',
              teamB: p.strAwayTeam || 'Visitante',
              scoreA: parseInt(p.intHomeScore) || 0,
              scoreB: parseInt(p.intAwayScore) || 0,
              possessionA: 52,
              possessionB: 48,
              shotsA: 6,
              shotsB: 4,
              minute: parseInt(p.strProgress) || 10
            });
          }
        } catch (e) {}
        resolve(datosBackup());
      });
    });

    req.on('error', () => resolve(datosBackup()));
    req.end();
  });
}

function datosBackup() {
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

setInterval(async () => {
  const match = await obtenerPartido();
  const payload = JSON.stringify(match);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));

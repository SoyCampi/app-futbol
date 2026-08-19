/* Layout estilo Transmision TV */
.lineup-broadcast-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #0f172a;
  color: #fff;
  padding: 16px;
  border-radius: 12px;
}

.team-selector-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #334155;
  padding-bottom: 8px;
}

.team-tab-btn {
  flex: 1;
  padding: 8px 12px;
  background: #1e293b;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.team-tab-btn.active {
  background: #0284c7;
  color: #fff;
  border-color: #38bdf8;
}

.broadcast-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 500px) {
  .broadcast-main { grid-template-columns: 1fr; }
}

/* Lista Lateral de Jugadores */
.roster-list-card {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px;
  border-left: 4px solid #38bdf8;
}

.roster-header-title {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #94a3b8;
  margin-bottom: 8px;
  border-bottom: 1px solid #334155;
  padding-bottom: 4px;
}

.player-row-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 6px;
  border-bottom: 1px solid #334155;
  font-size: 0.82rem;
  cursor: pointer;
}

.player-row-item:hover {
  background: #334155;
  border-radius: 4px;
}

.player-row-num {
  width: 22px;
  font-weight: bold;
  color: #38bdf8;
  text-align: right;
}

.player-row-name {
  font-weight: 500;
  color: #f8fafc;
  flex-grow: 1;
}

/* Cancha Completa Vertical (Vista TV) */
.full-pitch-tv {
  position: relative;
  width: 100%;
  height: 380px;
  background: #15803d;
  border: 2px solid #86efac;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 0;
  overflow: hidden;
}

.tv-pitch-center-line {
  position: absolute;
  top: 50%;
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.4);
}

.tv-pitch-circle {
  position: absolute;
  top: calc(50% - 30px);
  left: calc(50% - 30px);
  width: 60px;
  height: 60px;
  border: 2px solid rgba(255,255,255,0.4);
  border-radius: 50%;
}

.tv-node-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #0284c7;
  color: #fff;
  border: 2px solid #fff;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

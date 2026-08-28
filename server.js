import { runMatchmaking } from './core/matchmaker.js';
// 🧠 Start The Master Matchmaker Engine (Runs every 2 seconds)
setInterval(() => {
    runMatchmaking(connectedPlayers, io);
}, 2000);

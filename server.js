// server.js (Production-Ready Master Brain)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Core Systems
import { runMatchmaking } from './core/matchmaker.js';
import { handleRoomEvents } from './core/roommanager.js';
import { handleChatEvents } from './core/chatmanager.js'; 

// Game Logic & Security
import { validateMovement } from './game-logic/antiCheat.js';
import { handleEconomyAndTraps } from './game-logic/economy.js';

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

// Static Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'lobby.html')));
app.get('/game.html', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const connectedPlayers = new Map();

console.log("🚀 Server Booting Up... Loading Core Modules...");

io.on('connection', (socket) => {
    console.log(`🟢 New Player Connected: [ID: ${socket.id}]`);
    
    // Initial State Setup
    connectedPlayers.set(socket.id, { 
        id: socket.id, 
        status: 'idle', 
        room: null,
        gender: 'Boy',
        age: 20,
        vehicle: 'Padal'
    });

    // 1. Profile Registration from Lobby
    socket.on('registerPlayer', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && data) {
            player.uid = data.uid;
            player.gameName = data.gameName || 'Racer';
            if (data.gender) player.gender = data.gender;
            if (data.age) player.age = data.age;
            if (data.location) player.location = data.location;
            if (data.vehicle) player.vehicle = data.vehicle;
            console.log(`👤 Profile Registered: ${player.gameName} (${socket.id})`);
        }
    });

    // 2. Room & Team Management
    handleRoomEvents(socket, io, connectedPlayers);

    // 3. Economy & Traps
    handleEconomyAndTraps(socket, io, connectedPlayers);

    // 4. Global & Team Chat System
    handleChatEvents(socket, io, connectedPlayers);

    // 5. Join Game Room Handler
    socket.on('joinGameRoom', (data) => {
        const { roomId } = data;
        if (roomId) {
            socket.join(roomId);
            const player = connectedPlayers.get(socket.id);
            if (player) {
                player.room = roomId;
                player.status = 'in-match';
            }
            console.log(`🏁 Player ${socket.id} joined room: ${roomId}`);
        }
    });

    // 6. Matchmaking Triggers (Aliased for compatibility with lobby.js and team.js)
    const handleMatchSearch = (data = {}) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            player.status = 'searching';
            player.searchStartTime = Date.now();
            if (data.gender) player.gender = data.gender;
            if (data.age) player.age = data.age;
            if (data.lat && data.lng) player.location = { lat: data.lat, lng: data.lng };
            if (data.location) player.location = data.location;
            console.log(`🔍 Matchmaking active for: ${player.gameName || socket.id}`);
        }
    };

    socket.on('findMatch', handleMatchSearch);
    socket.on('startMatchmaking', handleMatchSearch);

    // 7. Anti-Cheat & Movement Sync
    socket.on('playerMove', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || player.status !== 'in-match') return;

        const isLegal = validateMovement(player, data.position);
        
        if (isLegal) {
            socket.to(player.room).emit('enemyMoved', {
                id: socket.id,
                position: data.position
            });
            // Also compatible with network.js event listeners:
            socket.to(player.room).emit('updatePlayerPosition', {
                playerId: socket.id,
                position: data.position
            });
        } else {
            socket.emit('rubberBand', {
                safePosition: player.lastPosition
            });
            socket.emit('forceTeleport', player.lastPosition);
        }
    });

    // 8. Disconnect Handler
    socket.on('disconnect', () => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            console.log(`🔴 Player Disconnected: [ID: ${player.gameName || socket.id}]`);
            connectedPlayers.delete(socket.id);
        }
    });
});

// Master Loop: Matchmaker Engine Execution Every 2 Seconds
setInterval(() => {
    runMatchmaking(connectedPlayers, io);
}, 2000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`✅ GAME SERVER LIVE ON PORT: ${PORT}`);
    console.log(`🛡️ ANTI-CHEAT: ACTIVE | 🪙 ECONOMY: LINKED`);
    console.log(`=========================================`);
});


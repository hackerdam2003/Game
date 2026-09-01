// server.js (Production-Ready Master Brain)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { runMatchmaking } from './core/matchmaker.js';
import { handleRoomEvents } from './core/roommanager.js';
import { handleChatEvents } from './core/chatmanager.js'; 

import { validateMovement } from './game-logic/antiCheat.js';
import { handleEconomyAndTraps } from './game-logic/economy.js';

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'lobby.html')));
app.get('/game.html', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const connectedPlayers = new Map();

// 🛑 Broadcast active online UIDs to all clients
function broadcastOnlineUsers() {
    const onlineUids = Array.from(connectedPlayers.values()).map(p => p.uid).filter(Boolean);
    io.emit('updateOnlineUsers', onlineUids);
}

io.on('connection', (socket) => {
    console.log(`🟢 New Player Connected: [ID: ${socket.id}]`);
    
    connectedPlayers.set(socket.id, { 
        id: socket.id, 
        status: 'idle', 
        room: null,
        uid: null
    });

    socket.on('registerPlayer', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && data) {
            player.uid = data.uid;
            player.gameName = data.gameName || 'Racer';
            console.log(`👤 Profile Registered: ${player.gameName} (${data.uid})`);
            broadcastOnlineUsers(); // Update online status instantly
        }
    });

    handleRoomEvents(socket, io, connectedPlayers);
    handleEconomyAndTraps(socket, io, connectedPlayers);
    handleChatEvents(socket, io, connectedPlayers);

    socket.on('joinGameRoom', (data) => {
        const { roomId } = data;
        if (roomId) {
            socket.join(roomId);
            const player = connectedPlayers.get(socket.id);
            if (player) {
                player.room = roomId;
                player.status = 'in-match';
            }
        }
    });

    const handleMatchSearch = (data = {}) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            player.status = 'searching';
            player.searchStartTime = Date.now();
        }
    };

    socket.on('findMatch', handleMatchSearch);
    socket.on('startMatchmaking', handleMatchSearch);

    socket.on('playerMove', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || player.status !== 'in-match') return;

        const isLegal = validateMovement(player, data.position);
        if (isLegal) {
            socket.to(player.room).emit('enemyMoved', { id: socket.id, position: data.position });
            socket.to(player.room).emit('updatePlayerPosition', { playerId: socket.id, position: data.position });
        } else {
            socket.emit('forceTeleport', player.lastPosition);
        }
    });

    socket.on('disconnect', () => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            console.log(`🔴 Player Disconnected: [ID: ${player.gameName || socket.id}]`);
            connectedPlayers.delete(socket.id);
            broadcastOnlineUsers(); // Update online status instantly
        }
    });
});

setInterval(() => {
    runMatchmaking(connectedPlayers, io);
}, 2000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`✅ GAME SERVER LIVE ON PORT: ${PORT}`);
});


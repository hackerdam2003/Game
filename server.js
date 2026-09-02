// server.js (Production-Ready Master Brain)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 🛑 Purana matchmaker.js hata diya kyunki ab roommanager.js Party Matchmaking handle karta hai
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

io.on('connection', (socket) => {
    console.log(`🟢 New Player Connected: [ID: ${socket.id}]`);
    
    // 🛑 FIXED: Naye player ko start se hi Party ki details de do
    connectedPlayers.set(socket.id, { 
        id: socket.id, 
        status: 'idle', 
        room: null,
        uid: null,
        gameName: 'Racer',
        partyRoom: null, 
        isPartyHost: false
    });

    // Jab frontend se registerPlayer trigger ho
    socket.on('registerPlayer', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && data) {
            player.uid = data.uid;
            player.gameName = data.gameName || 'Racer';
            console.log(`👤 Profile Registered: ${player.gameName} (${data.uid})`);
        }
    });

    // 🛡️ LOAD CORE MODULES (Party, Matchmaking & Chat ab yahan se chalenge)
    handleRoomEvents(socket, io, connectedPlayers); 
    handleEconomyAndTraps(socket, io, connectedPlayers);
    handleChatEvents(socket, io, connectedPlayers);

    // 🏎️ IN-MATCH RACING LOGIC (Next Phase ke liye)
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
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`✅ GAME SERVER LIVE ON PORT: ${PORT}`);
});

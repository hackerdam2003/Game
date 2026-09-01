// server.js (The Ultimate Main Brain - Modular Version with Static Server)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// 🧠 Import Core Systems (✅ Fixed Case Sensitivity)
import { runMatchmaking } from './core/matchmaker.js';
import { handleRoomEvents } from './core/roommanager.js';
import { handleChatEvents } from './core/chatmanager.js'; 

// 🛡️ Import Game Logic & Security
import { validateMovement } from './game-logic/antiCheat.js';
import { handleEconomyAndTraps } from './game-logic/economy.js';

// Server Setup
const app = express();
app.use(cors());

// Path setup for serving frontend files (HTML, CSS, JS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

// 🛠️ EXPLICIT ROUTES FOR ALL PAGES (Fixes "Cannot GET" Error on Render)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); 
});

app.get('/profile.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html')); 
});

app.get('/lobby.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'lobby.html')); 
});

app.get('/game.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'game.html')); 
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const connectedPlayers = new Map();

console.log("🚀 Server Booting Up... Loading Core Modules...");

// 📡 THE MAIN SOCKET CONNECTION
io.on('connection', (socket) => {
    console.log(`🟢 New Player Connected: [ID: ${socket.id}]`);
    
    // Default Player State
    connectedPlayers.set(socket.id, { 
        id: socket.id, 
        status: 'idle', 
        room: null 
    });

    // 1. 🛡️ Lobby & Team Management
    handleRoomEvents(socket, io, connectedPlayers);

    // 2. 🪙 Economy & Traps
    handleEconomyAndTraps(socket, io, connectedPlayers);

    // 3. 💬 Global & Team Chat System
    handleChatEvents(socket, io, connectedPlayers);

    // 4. 🔗 Join Game Room Handler (Fixes live game synchronization)
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

    // 5. 🔍 Matchmaking Search Event
    socket.on('findMatch', (data) => {
        console.log(`🔍 Solo Matchmaking Triggered for: ${socket.id}`);
        const player = connectedPlayers.get(socket.id);
        if (player) {
            player.status = 'searching';
            player.searchStartTime = Date.now();
            
            // Profile Sync
            if(data.gender) player.gender = data.gender;
            if(data.age) player.age = data.age;
            if(data.location) player.location = data.location;
            if(data.vehicle) player.vehicle = data.vehicle;
        }
    });

    // 6. 🚫 In-Code Anti-Cheat & Movement Sync
    socket.on('playerMove', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player || player.status !== 'in-match') return;

        const isLegal = validateMovement(player, data.position);
        
        if (isLegal) {
            socket.to(player.room).emit('enemyMoved', {
                id: socket.id,
                position: data.position
            });
        } else {
            // HACKER DETECTED!
            socket.emit('rubberBand', {
                safePosition: player.lastPosition
            });
        }
    });

    // 7. 🔴 Disconnect Handler
    socket.on('disconnect', () => {
        console.log(`🔴 Player Disconnected: [ID: ${socket.id}]`);
        connectedPlayers.delete(socket.id);
    });
});

// 🧠 THE MASTER LOOP: Start The Matchmaker Engine Every 2 Seconds
setInterval(() => {
    runMatchmaking(connectedPlayers, io);
}, 2000);

// SERVER START
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`✅ GAME SERVER LIVE ON PORT: ${PORT}`);
    console.log(`🛡️ ANTI-CHEAT: ACTIVE | 🪙 ECONOMY: LINKED`);
    console.log(`=========================================`);
});

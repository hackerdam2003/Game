// server.js (Production-Ready Master Brain)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleRoomEvents } from './core/roommanager.js';
import { handleChatEvents } from './core/chatmanager.js'; 

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
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

const connectedPlayers = new Map();

io.on('connection', (socket) => {
    console.log(`🟢 Socket Connected: ${socket.id}`);
    
    // Default dummy data assign kiya
    connectedPlayers.set(socket.id, { 
        id: socket.id, uid: null, gameName: 'Loading...', partyRoom: null, isPartyHost: false
    });

    // 🛑 DUAL-LOCK: Jab client apni asli identity bheje
    socket.on('registerPlayer', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && data && data.uid) {
            player.uid = data.uid;
            player.gameName = data.gameName || 'Racer';
            if(data.gender) player.gender = data.gender;
            if(data.age) player.age = data.age;
            console.log(`✅ Player Identity Confirmed: ${player.gameName} (UID: ${player.uid})`);
        }
    });

    handleRoomEvents(socket, io, connectedPlayers); 
    handleChatEvents(socket, io, connectedPlayers);

    socket.on('disconnect', () => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            console.log(`🔴 Player Disconnected: ${player.gameName || socket.id}`);
            connectedPlayers.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`✅ SERVER LIVE ON PORT: ${PORT}`));

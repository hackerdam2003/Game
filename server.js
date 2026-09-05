import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleRoomEvents, handlePlayerDisconnect, checkAutoRejoin } from './core/roommanager.js';
import { handleChatEvents } from './core/chatmanager.js'; 
import { handleGameWorld } from './core/gameEngine.js'; 

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'lobby.html')));
app.get('/game.html', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
app.get('/character.html', (req, res) => res.sendFile(path.join(__dirname, 'character.html')));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

const connectedPlayers = new Map();
const worldPlayers = {}; // 🌍 3D World ke live players ko track karne ke liye

// 🚀 START THE DEDICATED GAME ENGINE PIPELINE
handleGameWorld(io);

io.on('connection', (socket) => {
    console.log(`🟢 Socket Connected: ${socket.id}`);
    
    connectedPlayers.set(socket.id, { 
        id: socket.id, uid: null, gameName: 'Loading...', partyRoom: null, isPartyHost: false 
    });

    socket.on('registerPlayer', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player && data && data.uid) {
            player.uid = data.uid;
            player.gameName = data.gameName || 'Racer';
            if(data.gender) player.gender = data.gender;
            if(data.age) player.age = data.age;
            if(data.playerTag) player.playerTag = data.playerTag;
            if(data.location) player.location = data.location;
            
            console.log(`✅ Player Identity Confirmed: ${player.gameName} (UID: ${player.uid})`);
            
            checkAutoRejoin(socket, io, connectedPlayers);
        }
    });

    // ==========================================
    // 🎮 3D WORLD MULTIPLAYER SYNC (GLOBAL ROOM)
    // ==========================================
    socket.on('join-world', (data) => {
        worldPlayers[socket.id] = data;
        const roomName = data.gameRoomId || 'GLOBAL-ROOM';
        socket.join(roomName);
        
        // Naye player ko batao ki map me pehle se kaun kaun hai
        socket.emit('current-players', worldPlayers);
        
        // Purane players ko batao ki naya player aa gaya hai
        socket.broadcast.to(roomName).emit('player-joined', data);
    });

    socket.on('player-moved', (data) => {
        if(worldPlayers[socket.id]) {
            worldPlayers[socket.id].x = data.x;
            worldPlayers[socket.id].y = data.y;
            worldPlayers[socket.id].z = data.z;
            worldPlayers[socket.id].rot = data.rot;
            worldPlayers[socket.id].action = data.action;
            worldPlayers[socket.id].env = data.env;
        }
        // Sabko nayi location aur animation bhejo
        socket.broadcast.to('GLOBAL-ROOM').emit('player-moved', data);
    });

    socket.on('chat-message', (data) => {
        // 3D floating chat bubbles ke liye
        socket.broadcast.to('GLOBAL-ROOM').emit('chat-message', data);
    });
    // ==========================================

    handleRoomEvents(socket, io, connectedPlayers); 
    handleChatEvents(socket, io, connectedPlayers);

    socket.on('disconnect', () => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            console.log(`🔴 Player Disconnected: ${player.gameName || socket.id}`);
            handlePlayerDisconnect(socket, io, connectedPlayers);
        }

        // 3D World Cleanup jab player game band kare
        if (worldPlayers[socket.id]) {
            const uid = worldPlayers[socket.id].uid;
            delete worldPlayers[socket.id];
            io.to('GLOBAL-ROOM').emit('player-left', uid);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`✅ SERVER LIVE ON PORT: ${PORT}`));

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

// 🚀 EXPRESS ROUTES FIX: Island Mode added
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/profile.html', (req, res) => res.sendFile(path.join(__dirname, 'profile.html')));
app.get('/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'lobby.html')));
app.get('/game.html', (req, res) => res.sendFile(path.join(__dirname, 'game.html')));
app.get('/island.html', (req, res) => res.sendFile(path.join(__dirname, 'island.html'))); // ✅ FIXED
app.get('/character.html', (req, res) => res.sendFile(path.join(__dirname, 'character.html')));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

const connectedPlayers = new Map();
const worldPlayers = {}; 

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
    // 🎮 3D WORLD MULTIPLAYER SYNC (DYNAMIC ROOM FIX)
    // ==========================================
    socket.on('join-world', (data) => {
        const roomName = data.gameRoomId || 'GLOBAL-ROOM';
        data.roomName = roomName; // ✅ Store player's current room
        worldPlayers[socket.id] = data;
        
        socket.join(roomName);
        
        socket.emit('current-players', worldPlayers);
        socket.broadcast.to(roomName).emit('player-joined', data);
    });

    socket.on('player-moved', (data) => {
        const player = worldPlayers[socket.id];
        if(player) {
            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
            player.rot = data.rot;
            player.action = data.action;
            player.env = data.env;
            
            // ✅ Send movement ONLY to the room the player is in
            socket.broadcast.to(player.roomName).emit('player-moved', data);
        }
    });

    socket.on('chat-message', (data) => {
        const player = worldPlayers[socket.id];
        const roomName = player ? player.roomName : 'GLOBAL-ROOM';
        // ✅ Send chat ONLY to the specific map
        socket.broadcast.to(roomName).emit('chat-message', data);
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

        // 3D World Cleanup 
        if (worldPlayers[socket.id]) {
            const uid = worldPlayers[socket.id].uid;
            const roomName = worldPlayers[socket.id].roomName; // ✅ Get exact room
            delete worldPlayers[socket.id];
            
            io.to(roomName).emit('player-left', uid);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`✅ SERVER LIVE ON PORT: ${PORT}`));


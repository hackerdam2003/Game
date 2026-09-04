// core/roommanager.js

const userPartyCache = new Map(); 
const publicLobbies = new Map();  

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // --- 1. CREATE PRIVATE PARTY ---
    socket.on('createPartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        // 🛑 BUG FIX: Block Unregistered/Loading players from creating a room
        if (!player || !player.uid) return; 

        const roomId = 'PARTY_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        socket.join(roomId);
        
        player.partyRoom = roomId;
        player.isPartyHost = true;
        player.partyMaxSize = data.maxSize || 4; 

        userPartyCache.set(player.uid, { roomId: roomId, isHost: true }); 
        updatePartyMembers(roomId, io, connectedPlayers);
    });

    socket.on('sendPartyInvite', (data) => {
        const hostPlayer = connectedPlayers.get(socket.id);
        const room = io.sockets.adapter.rooms.get(data.roomId);
        if (room && hostPlayer && room.size >= hostPlayer.partyMaxSize) {
            socket.emit('partyError', `Lobby is Full! (Limit: ${hostPlayer.partyMaxSize})`);
            return;
        }
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
    });

    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        // 🛑 BUG FIX: Block Ghost from joining
        if (!player || !player.uid) return;
        
        const room = io.sockets.adapter.rooms.get(data.roomId);
        let maxSize = 4;
        if (room) {
            for (const sId of room) {
                const p = connectedPlayers.get(sId);
                if (p && p.isPartyHost && p.partyMaxSize) maxSize = p.partyMaxSize;
            }
        }

        if (room && room.size >= maxSize) {
            socket.emit('partyError', 'Lobby is already full!');
            return;
        }

        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;
        userPartyCache.set(player.uid, { roomId: data.roomId, isHost: false }); 
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            socket.leave(data.roomId);
            player.partyRoom = null;
            player.isPartyHost = false;

            userPartyCache.delete(player.uid); 
            handleHostMigration(data.roomId, player.uid, io, connectedPlayers, socket.id);
            updatePartyMembers(data.roomId, io, connectedPlayers);
            
            socket.to(data.roomId).emit('voice-disconnected', { uid: player.uid });
        }
    });

    // 🚀 4. RANDOM AUTO-JOIN & START MATCH 
    socket.on('startMatchmaking', () => {
        const player = connectedPlayers.get(socket.id);
        // 🛑 BUG FIX: Block Ghost from Auto-Joining
        if (!player || !player.uid) return;

        if (player.partyRoom && player.isPartyHost) {
            const gameRoomId = 'GAME_' + Math.floor(Math.random() * 999999);
            io.to(player.partyRoom).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: player.uid });
            publicLobbies.delete(player.partyRoom); 
            return;
        }

        if (player.partyRoom && !player.isPartyHost) return;

        let joinedExisting = false;

        for (const [roomId, roomInfo] of publicLobbies.entries()) {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (room && room.size < 4) { 
                socket.join(roomId);
                player.partyRoom = roomId;
                player.isPartyHost = false;
                joinedExisting = true;
                
                userPartyCache.set(player.uid, { roomId: roomId, isHost: false });
                socket.emit('joinedParty', { roomId: roomId });
                updatePartyMembers(roomId, io, connectedPlayers);
                break; 
            }
        }

        if (!joinedExisting) {
            const newRoomId = 'PUBLIC_' + Math.random().toString(36).substr(2, 6).toUpperCase();
            socket.join(newRoomId);
            player.partyRoom = newRoomId;
            player.isPartyHost = true;
            player.partyMaxSize = 4;
            
            publicLobbies.set(newRoomId, { hostId: socket.id });
            userPartyCache.set(player.uid, { roomId: newRoomId, isHost: true });

            updatePartyMembers(newRoomId, io, connectedPlayers);
        }
    });

    // --- 🎙️ 5. WEBRTC LIVE VOICE SIGNALING ---
    socket.on('voice-ready', () => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.partyRoom) {
            socket.to(player.partyRoom).emit('voice-ready', { uid: player.uid });
        }
    });

    socket.on('voice-disconnected', () => {
        const player = connectedPlayers.get(socket.id);
        if (player && player.partyRoom) {
            socket.to(player.partyRoom).emit('voice-disconnected', { uid: player.uid });
        }
    });

    socket.on('webrtc-signal', (data) => {
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) {
            io.to(targetSocketId).emit('webrtc-signal', {
                senderUid: data.senderUid,
                signalData: data.signalData
            });
        }
    });
}

// 🛑 REFRESH FIX LOGIC (Auto Rejoin)
export function checkAutoRejoin(socket, io, connectedPlayers) {
    const player = connectedPlayers.get(socket.id);
    if (!player || !player.uid) return;

    const cached = userPartyCache.get(player.uid);
    if (cached) {
        socket.join(cached.roomId);
        player.partyRoom = cached.roomId;
        player.isPartyHost = cached.isHost;
        updatePartyMembers(cached.roomId, io, connectedPlayers);
    }
}

// 🛑 DISCONNECT & HOST MIGRATION
export function handlePlayerDisconnect(socket, io, connectedPlayers) {
    const player = connectedPlayers.get(socket.id);
    if (player) {
        if (player.partyRoom) {
            socket.to(player.partyRoom).emit('voice-disconnected', { uid: player.uid });

            handleHostMigration(player.partyRoom, player.uid, io, connectedPlayers, socket.id);
            socket.leave(player.partyRoom);
            updatePartyMembers(player.partyRoom, io, connectedPlayers);
        }
        connectedPlayers.delete(socket.id);
    }
}

function handleHostMigration(roomId, oldHostUid, io, connectedPlayers, disconnectedSocketId) {
    const cachedOld = userPartyCache.get(oldHostUid);
    if (cachedOld && cachedOld.isHost) {
        cachedOld.isHost = false; 
        const room = io.sockets.adapter.rooms.get(roomId);
        
        if (!room || room.size === 0) {
            publicLobbies.delete(roomId);
            return;
        }

        for (const sId of room) {
            if (sId === disconnectedSocketId) continue;
            const nextPlayer = connectedPlayers.get(sId);
            // 🛑 BUG FIX: Make sure the new Host is a REAL player, not a Ghost
            if (nextPlayer && nextPlayer.uid && nextPlayer.gameName !== 'Loading...') {
                nextPlayer.isPartyHost = true;
                const cachedNext = userPartyCache.get(nextPlayer.uid);
                if (cachedNext) cachedNext.isHost = true;
                if (publicLobbies.has(roomId)) publicLobbies.set(roomId, { hostId: sId });
                break;
            }
        }
    }
}

// 🛑 BULLETPROOF UPDATE FUNCTION (Fixes the Screenshot issue 100%)
function updatePartyMembers(roomId, io, connectedPlayers) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) {
        publicLobbies.delete(roomId);
        return;
    }
    
    const membersList = [];
    let max = 4;
    let hasHost = false;
    let firstValidPlayer = null;

    for (const sId of room) {
        const p = connectedPlayers.get(sId);
        // 1. GHOST FILTER: Only real, registered players pass through
        if (p && p.uid && p.gameName && p.gameName !== 'Loading...') {
            if (!firstValidPlayer) firstValidPlayer = p;
            
            if (p.isPartyHost) {
                hasHost = true;
                if (p.partyMaxSize) max = p.partyMaxSize;
            }
            membersList.push(p);
        }
    }

    // 2. FORCE HOST FALLBACK: If real players are stuck with NO host, force the first one to be host
    if (membersList.length > 0 && !hasHost && firstValidPlayer) {
        firstValidPlayer.isPartyHost = true; 
        hasHost = true;
        
        const cached = userPartyCache.get(firstValidPlayer.uid);
        if (cached) cached.isHost = true;
        
        if (publicLobbies.has(roomId)) publicLobbies.set(roomId, { hostId: firstValidPlayer.id });
        console.log(`👑 Forced Host Migration triggered! New Host: ${firstValidPlayer.gameName}`);
    }

    // 3. Clean JSON for the Client
    const cleanList = membersList.map(p => ({
        uid: p.uid, name: p.gameName, gender: p.gender, age: p.age, 
        playerTag: p.playerTag, location: p.location, isHost: p.isPartyHost
    }));

    io.to(roomId).emit('partyUpdated', { roomId: roomId, members: cleanList, maxSize: max });
}


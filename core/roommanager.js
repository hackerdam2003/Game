// core/roommanager.js

// 🛑 Track Lobbies that are open for Auto-Join
const publicLobbies = new Map(); 

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // --- 1. PRIVATE PARTY (Invite Only) ---
    socket.on('createPartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;
        const roomId = 'PARTY_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        socket.join(roomId);
        player.partyRoom = roomId;
        player.isPartyHost = true;
        const hostData = { uid: data.hostUid, name: data.hostName, gender: player.gender || 'Boy', age: player.age || 20, isHost: true };
        io.to(socket.id).emit('partyCreated', { roomId: roomId, members: [hostData] });
    });

    socket.on('sendPartyInvite', (data) => {
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
    });

    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;
        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;
        if (data.gender) player.gender = data.gender;
        if (data.age) player.age = data.age;
        socket.emit('joinedParty', { roomId: data.roomId });
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            socket.leave(data.roomId);
            player.partyRoom = null;
            player.isPartyHost = false;
            updatePartyMembers(data.roomId, io, connectedPlayers);
        }
    });

    // --- 2. GENSHIN STYLE MATCHMAKING (AUTO-JOIN LOBBY) ---
    socket.on('startMatchmaking', () => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        // SCENARIO A: Player is already a Host -> START THE RACE FOR EVERYONE
        if (player.partyRoom && player.isPartyHost) {
            const gameRoomId = 'GAME_' + Math.floor(Math.random() * 999999);
            io.to(player.partyRoom).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: player.uid });
            publicLobbies.delete(player.partyRoom); // Remove from public search
            return;
        }

        // SCENARIO B: Player is in lobby but NOT Host -> Ignore button (Wait for host)
        if (player.partyRoom && !player.isPartyHost) return;

        // SCENARIO C: Solo Player clicking "Find Match" -> AUTO JOIN A LOBBY
        let joinedExisting = false;

        // Find an open room
        for (const [roomId, roomInfo] of publicLobbies.entries()) {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (room && room.size < 4) { 
                socket.join(roomId);
                player.partyRoom = roomId;
                player.isPartyHost = false;
                joinedExisting = true;
                
                socket.emit('joinedParty', { roomId: roomId });
                updatePartyMembers(roomId, io, connectedPlayers);
                break; // Stop searching, joined successfully
            }
        }

        // If no rooms available, create a new Public Lobby and become Host
        if (!joinedExisting) {
            const newRoomId = 'PUBLIC_' + Math.random().toString(36).substr(2, 6).toUpperCase();
            socket.join(newRoomId);
            player.partyRoom = newRoomId;
            player.isPartyHost = true;
            
            publicLobbies.set(newRoomId, { hostId: socket.id });

            const hostData = { uid: player.uid, name: player.gameName, gender: player.gender || 'Boy', age: player.age || 20, isHost: true };
            socket.emit('partyCreated', { roomId: newRoomId, members: [hostData] });
        }
    });
}

function updatePartyMembers(roomId, io, connectedPlayers) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;
    const membersList = [];
    for (const sId of room) {
        const p = connectedPlayers.get(sId);
        if (p) membersList.push({ uid: p.uid, name: p.gameName, gender: p.gender || 'Boy', age: p.age || 20, isHost: p.isPartyHost });
    }
    io.to(roomId).emit('partyUpdated', { members: membersList });
}

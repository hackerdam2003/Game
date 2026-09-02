// core/roommanager.js
export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 1. HOST SQUAD BANAYEGA
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

    // 2. DOST KO INVITE BHEJNA
    socket.on('sendPartyInvite', (data) => {
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) {
            io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
        }
    });

    // 3. DOST NE ACCEPT KIYA (AVATAR POPUP HOGA)
    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;

        // Squad update karo sabki screen par
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    // 4. SQUAD CHHODNA
    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            socket.leave(data.roomId);
            player.partyRoom = null;
            player.isPartyHost = false;
            updatePartyMembers(data.roomId, io, connectedPlayers);
        }
    });

    // 5. HOST NE START DABAYA -> SABKO GAME ME BHEJO
    socket.on('startMatchmaking', () => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        const gameRoomId = 'GAME_' + Math.floor(Math.random() * 999999);

        if (player.partyRoom && player.isPartyHost) {
            // Puri team ko teleport karo
            io.to(player.partyRoom).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: player.uid });
        } else if (!player.partyRoom) {
            // Solo player ko teleport karo
            io.to(socket.id).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: player.uid });
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

// core/roommanager.js

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 🏠 1. HOST NE SQUAD (PARTY) BANAYI
    socket.on('createPartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        const roomId = 'PARTY_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        socket.join(roomId);
        
        player.partyRoom = roomId;
        player.isPartyHost = true;
        
        // Host ka data turant bhej do
        const hostData = { uid: data.hostUid, name: data.hostName, gender: player.gender || 'Boy', age: player.age || 20, isHost: true };
        io.to(socket.id).emit('partyCreated', { roomId: roomId, members: [hostData] });
    });

    // ✉️ 2. DOST KO INVITE BHEJA
    socket.on('sendPartyInvite', (data) => {
        let targetSocketId = null;
        for (const [sId, p] of connectedPlayers.entries()) {
            if (p.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) {
            io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
        }
    });

    // ✅ 3. DOST NE INVITE ACCEPT KIYA (SQUAD JOIN)
    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;

        // Squad me jo-jo hai, sabki screen par naya Avatar Pop-up karo
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    // ❌ 4. LEAVE SQUAD
    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (player) {
            socket.leave(data.roomId);
            player.partyRoom = null;
            player.isPartyHost = false;
            updatePartyMembers(data.roomId, io, connectedPlayers);
        }
    });

    // 🚀 5. HOST NE RACE START KI (TELEPORT FULL SQUAD)
    socket.on('startMatchmaking', () => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        const gameRoomId = 'GAME_' + Math.floor(Math.random() * 999999);

        // Agar player Squad (Party) me hai aur HOST hai
        if (player.partyRoom && player.isPartyHost) {
            console.log(`🚀 SQUAD LAUNCHING: ${player.partyRoom}`);
            io.to(player.partyRoom).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: player.uid });
        } 
        // Agar player akela (Solo) khel raha hai
        else if (!player.partyRoom) {
            console.log(`🚀 SOLO LAUNCHING: ${player.uid}`);
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
    // Puri team ko updated list bhejo taaki Avatars dikhein aur UI update ho
    io.to(roomId).emit('partyUpdated', { members: membersList });
}

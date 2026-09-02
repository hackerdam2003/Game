// core/roommanager.js
export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // MATCHMAKING QUEUE (Duniya bhar ke log jo match dhoondh rahe hain)
    const matchmakingQueue = [];

    // 1. HOST NE PARTY BANAYI (Fixed ID Generator)
    socket.on('createPartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        // Custom ID (No external package needed)
        const roomId = 'PARTY_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        socket.join(roomId);
        
        player.partyRoom = roomId;
        player.isPartyHost = true;
        
        const hostData = {
            uid: data.hostUid,
            name: data.hostName,
            gender: player.gender || 'Boy',
            age: player.age || 20,
            isHost: true
        };

        io.to(socket.id).emit('partyCreated', { roomId: roomId, members: [hostData] });
    });

    socket.on('sendPartyInvite', (data) => {
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) {
            io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
        }
    });

    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        const room = io.sockets.adapter.rooms.get(data.roomId);
        if (!room) { socket.emit('partyError', 'Party does not exist.'); return; }

        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;

        socket.emit('joinedParty', { roomId: data.roomId, maxSize: 4 });
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;
        socket.leave(data.roomId);
        player.partyRoom = null;
        player.isPartyHost = false;
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    // 🚦 MATCHMAKING LOGIC
    socket.on('startMatchmaking', (data) => {
        console.log(`${data.name} is searching for a match!`);
        
        // Queue me add karo
        matchmakingQueue.push({
            socketId: socket.id,
            roomId: data.roomId, // Agar party me hai to roomId aayega
            uid: data.uid,
            location: data.location
        });

        // Agar queue me 2 log/parties ho gaye, toh dono ko match kar do!
        if (matchmakingQueue.length >= 2) {
            const team1 = matchmakingQueue.shift();
            const team2 = matchmakingQueue.shift();

            // Match Found! Dono ko game start ka signal bhejo
            io.to(team1.socketId).emit('matchFound', { opponent: team2.uid });
            io.to(team2.socketId).emit('matchFound', { opponent: team1.uid });
            
            // Agar party me hain toh puri party ko signal bhejo
            if(team1.roomId) io.to(team1.roomId).emit('matchFound', { opponent: team2.uid });
            if(team2.roomId) io.to(team2.roomId).emit('matchFound', { opponent: team1.uid });
        }
    });
}

function updatePartyMembers(roomId, io, connectedPlayers) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;
    const membersList = [];
    for (const sId of room) {
        const p = connectedPlayers.get(sId);
        if (p) {
            membersList.push({ uid: p.uid, name: p.gameName || 'Racer', gender: p.gender || 'Boy', age: p.age || 20, isHost: p.isPartyHost || false });
        }
    }
    io.to(roomId).emit('partyUpdated', { members: membersList });
}

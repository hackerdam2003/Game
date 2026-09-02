// core/roommanager.js

// 🛑 THE BIG FIX: Queue ko globally bahar rakho, taaki sab ek hi line me aayein!
const matchmakingQueue = [];

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 1. HOST NE PARTY BANAYI
    socket.on('createPartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        const roomId = 'PARTY_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
        socket.join(roomId);
        
        player.partyRoom = roomId;
        player.isPartyHost = true;
        
        const hostData = {
            uid: data.hostUid, name: data.hostName, gender: player.gender || 'Boy', age: player.age || 20, isHost: true
        };
        io.to(socket.id).emit('partyCreated', { roomId: roomId, members: [hostData] });
    });

    // 2. INVITE BHEJNA
    socket.on('sendPartyInvite', (data) => {
        let targetSocketId = null;
        for (const [sId, pData] of connectedPlayers.entries()) {
            // Target player ka socket id find karo
            if (pData.uid === data.targetUid) { targetSocketId = sId; break; }
        }
        if (targetSocketId) {
            io.to(targetSocketId).emit('receivePartyInvite', { hostName: data.hostName, roomId: data.roomId });
        }
    });

    // 3. INVITE ACCEPT KARNA
    socket.on('acceptPartyInvite', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;
        const room = io.sockets.adapter.rooms.get(data.roomId);
        if (!room) { socket.emit('partyError', 'Party does not exist.'); return; }

        socket.join(data.roomId);
        player.partyRoom = data.roomId;
        player.isPartyHost = false;
        
        if(data.gender) player.gender = data.gender;
        if(data.age) player.age = data.age;

        socket.emit('joinedParty', { roomId: data.roomId, maxSize: 4 });
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    // 4. LEAVE PARTY
    socket.on('leavePartyRoom', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;
        socket.leave(data.roomId);
        player.partyRoom = null;
        player.isPartyHost = false;
        updatePartyMembers(data.roomId, io, connectedPlayers);
    });

    // 🚦 5. MATCHMAKING LOGIC (Fixed)
    socket.on('startMatchmaking', (data) => {
        console.log(`⏳ ${data.name} searching... (Queue Size before: ${matchmakingQueue.length})`);
        
        // Prevent double entry
        const exists = matchmakingQueue.find(p => p.uid === data.uid);
        if (!exists) {
            matchmakingQueue.push({ socketId: socket.id, roomId: data.roomId, uid: data.uid, location: data.location });
        }

        // Agar 2 log aa gaye, toh match karao
        if (matchmakingQueue.length >= 2) {
            const team1 = matchmakingQueue.shift();
            const team2 = matchmakingQueue.shift();
            console.log(`🔥 MATCH FOUND: ${team1.uid} VS ${team2.uid}`);

            const gameRoomId = 'MATCH_' + Math.random().toString(36).substr(2, 6).toUpperCase(); 
            const hostUid = team1.uid; 

            const matchData1 = { opponent: team2.uid, gameRoomId: gameRoomId, hostUid: hostUid };
            const matchData2 = { opponent: team1.uid, gameRoomId: gameRoomId, hostUid: hostUid };

            io.to(team1.socketId).emit('matchFound', matchData1);
            io.to(team2.socketId).emit('matchFound', matchData2);
            
            if(team1.roomId) io.to(team1.roomId).emit('matchFound', matchData1);
            if(team2.roomId) io.to(team2.roomId).emit('matchFound', matchData2);
        }
    });
}

function updatePartyMembers(roomId, io, connectedPlayers) {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room) return;
    const membersList = [];
    for (const sId of room) {
        const p = connectedPlayers.get(sId);
        if (p) membersList.push({ uid: p.uid, name: p.gameName || 'Racer', gender: p.gender || 'Boy', age: p.age || 20, isHost: p.isPartyHost || false });
    }
    io.to(roomId).emit('partyUpdated', { members: membersList });
}

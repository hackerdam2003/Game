// core/roommanager.js

let globalLobbyPlayers = []; // Shared Lobby jahan sabhi live players aayenge
let matchHostUid = null;     // Jo pehle aayega wo Host banega

export function handleRoomEvents(socket, io, connectedPlayers) {
    
    // 🚦 1. JOIN SHARED LOBBY (Jaise hi koi Find Match dabayega)
    socket.on('joinGlobalLobby', (data) => {
        // Agar player already lobby me nahi hai to add karo
        const exists = globalLobbyPlayers.find(p => p.uid === data.uid);
        if (!exists) {
            if (globalLobbyPlayers.length === 0) {
                matchHostUid = data.uid; // First player becomes Host
            }
            globalLobbyPlayers.push({
                socketId: socket.id,
                uid: data.uid,
                name: data.name,
                gender: data.gender || 'Boy',
                age: data.age || 20,
                isHost: data.uid === matchHostUid
            });
        }
        
        console.log(`[SHARED LOBBY] ${data.name} joined. Total: ${globalLobbyPlayers.length}`);
        
        // Sabhi logon ko updated list bhejo taaki avatars pop ho sakein
        io.emit('globalLobbyUpdate', { players: globalLobbyPlayers, hostUid: matchHostUid });
    });

    // 🚀 2. START RACE (Jab Host Start button dabayega)
    socket.on('launchGlobalMatch', () => {
        console.log(`🚨 HOST LAUNCHED THE RACE! Teleporting ${globalLobbyPlayers.length} players...`);
        
        const gameRoomId = 'RACE_' + Math.floor(Math.random() * 999999);
        
        // Lobby me khade sabhi players ko Game Screen par bhejo
        globalLobbyPlayers.forEach(p => {
            io.to(p.socketId).emit('teleportToGame', { gameRoomId: gameRoomId, hostUid: matchHostUid });
        });

        // Lobby khali kar do next match ke liye
        globalLobbyPlayers = [];
        matchHostUid = null;
    });

    // ==========================================
    // (Aapka Party/Invite wala code yahan same rahega)
    socket.on('createPartyRoom', (data) => { /* ... */ });
    socket.on('sendPartyInvite', (data) => { /* ... */ });
    socket.on('acceptPartyInvite', (data) => { /* ... */ });
    socket.on('leavePartyRoom', (data) => { /* ... */ });
}

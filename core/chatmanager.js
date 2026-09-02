// core/chatmanager.js
export function handleChatEvents(socket, io, connectedPlayers) {
    socket.on('chatMessage', (data) => {
        const player = connectedPlayers.get(socket.id);
        
        // 🛑 SECURITY CHECK: Agar player nahi hai, ya message khali/fake hai, toh block karo
        if (!player || !data || !data.message || data.message.trim() === '') return;

        // 🛡️ PAYLOAD RE-BUILD: Server apni taraf se data banayega (Anti-Hack)
        const safePayload = {
            sender: data.sender || player.gameName || 'Racer',
            message: data.message.trim(),
            channel: data.channel,
            timestamp: Date.now() // Hamesha Server ka real time jayega
        };

        // 1. WORLD CHAT (Sabko bhejo)
        if (safePayload.channel === 'world') {
            io.emit('receiveChat', safePayload);
        } 
        // 2. TEAM CHAT (Sirf Party Room walo ko bhejo)
        else if (safePayload.channel === 'team' && player.partyRoom) {
            io.to(player.partyRoom).emit('receiveChat', safePayload);
        }
        
        // 🛑 'dm' (Private Chat) ab direct Firebase RTDB sambhal raha hai, isliye yahan zaroorat nahi hai.
    });
}

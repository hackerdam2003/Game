// core/chatManager.js

export function handleChatEvents(socket, io, connectedPlayers) {
    socket.on('chatMessage', (data) => {
        
        // 1. WORLD CHAT: Agar message 'world' me bheja gaya hai, toh server sabko dikhayega
        if (data.channel === 'world') {
            io.emit('receiveChat', {
                senderId: socket.id,
                message: data.message,
                channel: 'world',
                timestamp: Date.now()
            });
        } 
        
        // 2. TEAM CHAT: Agar message 'team' ka hai, toh sirf usi room/party me dikhega
        else {
            const player = connectedPlayers.get(socket.id);
            if (player && player.room) {
                io.to(player.room).emit('receiveChat', {
                    senderId: socket.id,
                    message: data.message,
                    channel: 'team',
                    timestamp: Date.now()
                });
            }
        }
    });
}

// core/chatmanager.js
export function handleChatEvents(socket, io, connectedPlayers) {
    socket.on('chatMessage', (data) => {
        const player = connectedPlayers.get(socket.id);
        if (!player) return;

        if (data.channel === 'world') {
            io.emit('receiveChat', data);
        } 
        else if (data.channel === 'team' && player.room) {
            io.to(player.room).emit('receiveChat', data);
        }
        else if (data.channel === 'dm' && data.targetUid) {
            let targetSocketId = null;
            
            for (const [sId, pData] of connectedPlayers.entries()) {
                if (pData.uid === data.targetUid) {
                    targetSocketId = sId;
                    break;
                }
            }
            
            const payload = {
                sender: data.sender,
                senderUid: player.uid || data.senderUid,
                message: data.message,
                channel: 'dm'
            };

            // Send to target recipient if online
            if (targetSocketId) {
                io.to(targetSocketId).emit('receiveChat', payload);
            }
            
            // Also send back confirmation copy to sender's other tabs if needed (optional)
        }
    });
}

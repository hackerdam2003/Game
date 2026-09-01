// core/chatManager.js

export function handleChatEvents(socket, io, connectedPlayers) {
    socket.on('chatMessage', (data) => {
        // Frontend se aane wala data extract kar rahe hain
        const { channel, sender, text } = data;

        // Basic Anti-Crash Validation: Agar text ya sender nahi hai toh message drop kar do
        if (!text || !sender) return;

        // 1. WORLD CHAT: Agar message 'world' me bheja gaya hai, toh server sabko dikhayega
        if (channel === 'world') {
            io.emit('receiveChat', {
                sender: sender,       // Frontend isko as `data.sender` read karega
                text: text,           // Frontend isko as `data.text` read karega
                channel: 'world',
                timestamp: Date.now()
            });
        } 
        
        // 2. TEAM CHAT: Agar message 'team' ka hai, toh sirf usi room/party me dikhega
        else if (channel === 'team') {
            const player = connectedPlayers.get(socket.id);
            
            // Check agar player kisi room me hai
            if (player && player.room && player.room !== 'GLOBAL-ROOM') {
                io.to(player.room).emit('receiveChat', {
                    sender: sender,
                    text: text,
                    channel: 'team',
                    timestamp: Date.now()
                });
            } else {
                // Agar player akele hai (solo), toh server usko error bhej dega
                socket.emit('receiveChat', {
                    sender: "System",
                    text: "You are currently solo. Create or join a party to use Team Chat.",
                    channel: 'team',
                    timestamp: Date.now()
                });
            }
        }

        // 3. DM CHAT: Direct Messages (Friends ke liye)
        else if (channel === 'dm') {
            // Abhi ke liye safe logic taaki crash na ho. Future me hum target UID par send karenge.
            socket.emit('receiveChat', {
                sender: "System",
                text: "Select a friend from the Friends List to send private messages.",
                channel: 'dm',
                timestamp: Date.now()
            });
        }
    });
}

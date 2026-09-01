// js/chat.js
console.log("💬 [Chat] Module Loaded!");

window.switchChatTab = function(type, el) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const introMsg = document.getElementById('chat-intro-msg');
    if(type === 'world') introMsg.innerText = "[World Chat]: Connected to global server.";
    else if(type === 'team') introMsg.innerText = "[Team Chat]: Connected to active room.";
    else if(type === 'dm') introMsg.innerText = "[Friend DMs]: Select a friend to chat.";
};

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    if(!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    const senderName = window.myProfileData ? window.myProfileData.gameName : "Racer";

    // Socket ke zariye server ko bhejo
    if (window.socket) {
        window.socket.emit('chatMessage', {
            sender: senderName,
            message: messageText,
            channel: 'world' // Ya team room id
        });
    }
    input.value = '';
};

// 🛑 MASTER INITIALIZER: Yeh tabhi chalega jab Lobby isko permission degi (Socket ready hone ke baad)
window.initChatSystem = function() {
    if (window.socket) {
        // Purane listeners clear karo taaki double message na aaye
        window.socket.off('receiveChat');
        
        window.socket.on('receiveChat', (data) => {
            const box = document.getElementById('active-chat-box');
            if(!box) return;
            const p = document.createElement('p');
            p.style.margin = "4px 0";
            p.style.fontSize = "12px";
            p.innerHTML = `<b style="color: #38bdf8;">${data.sender}:</b> ${data.message}`;
            box.appendChild(p);
            box.scrollTop = box.scrollHeight; // Auto-scroll to bottom
        });
        console.log("✅ Chat System Successfully Bound to Socket!");
    } else {
        console.error("❌ Chat System Failed: Socket not found.");
    }
};

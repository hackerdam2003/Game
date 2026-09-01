// js/chat.js

console.log("💬 Chat Module Linked Safely!");

// UI Elements matching lobby.html
const chatBox = document.getElementById('active-chat-box');
const chatInput = document.getElementById('chat-input-field');

// State Variables
window.currentChannel = 'world'; // Global tracking
let lastMessageTime = 0;
const SPAM_COOLDOWN = 3000; // 3 Seconds ka cooldown spam rokne ke liye

// 🌟 1. TAB SWITCHING LOGIC
window.switchChatTab = function(type, el) {
    // UI Update
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    // Set Channel
    window.currentChannel = type;
    
    // Clear Chat Box
    chatBox.innerHTML = '';
    
    // Show System Message
    if(type === 'world') appendSystemMessage("Connected to Global Server.", "#10b981");
    else if(type === 'team') appendSystemMessage("Connected to your Private Party room.", "#10b981");
    else if(type === 'dm') appendSystemMessage("Private messaging channel.", "#10b981");
};

// 🛡️ 2. SEND MESSAGE LOGIC (WITH ANTI-SPAM RULE)
window.sendChatMessage = function() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Ensure Profile is loaded from Firebase
    if (!window.myProfileData) {
        appendSystemMessage("Profile loading, please wait...", "#ef4444");
        return;
    }

    const now = Date.now();
    
    // THE ANTI-SPAM FILTER 🛡️
    if (now - lastMessageTime < SPAM_COOLDOWN) {
        const timeLeft = Math.ceil((SPAM_COOLDOWN - (now - lastMessageTime)) / 1000);
        appendSystemMessage(`Spam filter active. Wait ${timeLeft}s.`, '#ef4444');
        return;
    }

    // Send to Server (Matches core/chatManager.js format)
    window.socket.emit('chatMessage', {
        channel: window.currentChannel,
        sender: window.myProfileData.gameName,
        text: text
    });

    // Reset cooldown timer and clear input
    lastMessageTime = now;
    chatInput.value = '';
};

// Trigger send on 'Enter' key press
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendChatMessage();
    });
}

// 📡 3. RECEIVE MESSAGES FROM SERVER
// Delay lagaya hai taaki socket.io properly initialize ho jaye
setTimeout(() => {
    if (window.socket) {
        window.socket.on('receiveChat', (data) => {
            // Sirf wahi message dikhao jis tab par user abhi hai
            if (data.channel === window.currentChannel) {
                // Agar message Server (System) ne bheja hai
                if (data.sender === "System") {
                    appendSystemMessage(data.text, "#ef4444");
                } else {
                    // Normal User Message
                    appendUserMessage(data.sender, data.text, '#3b82f6');
                }
            }
        });
    } else {
        console.warn("Socket not found in window object.");
    }
}, 1500);

// 🔧 Helper Functions for UI Rendering
function appendUserMessage(sender, text, color) {
    if (!chatBox) return;
    const p = document.createElement('p');
    p.style.margin = "4px 0";
    p.style.fontSize = "12px";
    p.innerHTML = `<b style="color: ${color};">${sender}:</b> <span style="color: #f8fafc;">${text}</span>`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

function appendSystemMessage(text, color) {
    if (!chatBox) return;
    const p = document.createElement('p');
    p.style.margin = "4px 0";
    p.style.fontSize = "12px";
    p.style.color = color;
    p.innerText = `[System] ${text}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// js/chat.js

// 1. Socket.io Connection
const socket = io(); 

// UI Elements
const chatTabs = document.querySelectorAll('.tab');
const chatBox = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

// State Variables
let currentChannel = 'world'; // Default chat tab
let lastMessageTime = 0;
const SPAM_COOLDOWN = 5000; // 5 seconds in milliseconds

// 🌟 1. TAB SWITCHING LOGIC (World / Team / Friends)
chatTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        chatTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        currentChannel = tab.getAttribute('data-target');
        
        // Notify user about channel switch
        appendSystemMessage(`Switched to ${currentChannel.toUpperCase()} channel.`, '#94a3b8');
        chatBox.innerHTML = ''; // Clear chat box temporarily on switch (can be modified later to keep history)
        appendSystemMessage(`You are viewing ${currentChannel.toUpperCase()} chat.`, '#3b82f6');
    });
});

// 🛡️ 2. SEND MESSAGE LOGIC (WITH ANTI-SPAM RULE)
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    const now = Date.now();
    
    // THE ANTI-SPAM FILTER
    if (now - lastMessageTime < SPAM_COOLDOWN) {
        const timeLeft = Math.ceil((SPAM_COOLDOWN - (now - lastMessageTime)) / 1000);
        appendSystemMessage(`Spam filter active. Please wait ${timeLeft}s.`, '#ef4444');
        return;
    }

    // Get Player Name from LocalStorage (Set during auth)
    const playerName = localStorage.getItem('gameName') || "Player";

    // Send to Server
    socket.emit('chatMessage', {
        channel: currentChannel,
        sender: playerName,
        text: text
    });

    // Reset cooldown timer and clear input
    lastMessageTime = now;
    chatInput.value = '';
}

// Trigger send on button click or 'Enter' key
sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// 📡 3. RECEIVE MESSAGES FROM SERVER
socket.on('receiveChat', (data) => {
    // Only show message if user is on the correct tab
    if (data.channel === currentChannel) {
        appendUserMessage(data.sender, data.text, data.color || '#fbbf24');
    }
});

// 🔧 Helper Functions for UI
function appendUserMessage(sender, text, color) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '10px';
    msgDiv.style.fontSize = '13px';
    msgDiv.style.lineHeight = '1.4';
    
    // Auto-Destruct UI logic for Race Chat will be handled server-side
    msgDiv.innerHTML = `<strong style="color: ${color};">${sender}:</strong> <span style="color: #f8fafc;">${text}</span>`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}

function appendSystemMessage(text, color) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '10px';
    msgDiv.style.fontSize = '12px';
    msgDiv.style.fontStyle = 'italic';
    msgDiv.style.color = color;
    msgDiv.innerText = `[System] ${text}`;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

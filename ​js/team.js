// js/team.js

// 1. Socket.io Connection (Baad me yahan apne live server ka link dalenge)
// Abhi ke liye yeh automatically current domain ya local server se connect karega
const socket = io(); 

// UI Elements
const createTeamBtn = document.getElementById('create-team-btn');
const roomCodeDisplay = document.getElementById('room-code-display');
const codeVal = document.getElementById('code-val');
const partyList = document.getElementById('party-list');
const worldToggle = document.getElementById('world-toggle');
const startMatchBtn = document.getElementById('start-match-btn');
const playerNameDisplay = document.getElementById('player-name');

// State Variables
let currentRoom = null;
let isLeader = false;
let allowWorldPlayers = true; // Default toggle state

// 🌟 Initialize Dashboard Data (Auth check se)
// (Yahan hum Firebase se player ka naam fetch karke UI me dikhayenge - yeh logic auth.js se sync hoga)
document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('gameName') || "Pro Racer"; 
    playerNameDisplay.innerText = `👤 ${savedName}`;
    
    // Toggle Event Listener
    worldToggle.addEventListener('change', (e) => {
        allowWorldPlayers = e.target.checked;
        if(allowWorldPlayers) {
            console.log("🌍 World Matchmaking ON: Random players can join.");
        } else {
            console.log("🔒 Private Mode ON: Only friends with code can join.");
        }
        
        // Agar pehle se room me hai, toh server ko update bhej do
        if(currentRoom && isLeader) {
            socket.emit('updateRoomSettings', { room: currentRoom, allowWorld: allowWorldPlayers });
        }
    });
});

// 🛠️ Create Private Team Logic
if(createTeamBtn) {
    createTeamBtn.addEventListener('click', () => {
        // Generate a random 6-character room code
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        currentRoom = roomCode;
        isLeader = true;
        
        // Update UI
        createTeamBtn.style.display = 'none';
        roomCodeDisplay.style.display = 'block';
        codeVal.innerText = roomCode;
        
        partyList.innerHTML = `
            <div style="background: #1e293b; padding: 10px; border-radius: 8px; margin-bottom: 5px; border-left: 3px solid #fbbf24;">
                👑 You (Leader)
            </div>
            <p style="text-align: center; color: #64748b; font-size: 11px; margin-top: 10px;">Waiting for friends to join using code...</p>
        `;

        // Tell Server to create this room
        socket.emit('createRoom', { roomCode: roomCode, leader: true, allowWorld: allowWorldPlayers });
    });
}

// 🏁 Start Race (The Matchmaking Trigger)
if(startMatchBtn) {
    startMatchBtn.addEventListener('click', () => {
        startMatchBtn.innerText = "🔄 FINDING PLAYERS...";
        startMatchBtn.style.background = "#fbbf24";
        startMatchBtn.style.color = "#000";
        startMatchBtn.disabled = true;

        if(!currentRoom) {
            // SOLO PLAYER: Direct World Matchmaking
            console.log("Starting Solo World Matchmaking...");
            socket.emit('findMatch', { type: 'solo' });
        } else {
            // TEAM PLAYER
            if(isLeader) {
                console.log(`Starting Team Match. Allow World: ${allowWorldPlayers}`);
                socket.emit('startTeamMatch', { roomCode: currentRoom, allowWorld: allowWorldPlayers });
            } else {
                alert("Only the Team Leader can start the race!");
                startMatchBtn.innerText = "▶ START RACE";
                startMatchBtn.style.background = "#10b981";
                startMatchBtn.style.color = "#fff";
                startMatchBtn.disabled = false;
            }
        }
    });
}

// 📡 Server Responses (Listening to backend)
socket.on('matchFound', (data) => {
    startMatchBtn.innerText = "✅ MATCH FOUND!";
    startMatchBtn.style.background = "#3b82f6";
    
    // 3 seconds baad game screen par bhej do
    setTimeout(() => {
        window.location.href = `game.html?matchId=${data.matchId}`;
    }, 2000);
});

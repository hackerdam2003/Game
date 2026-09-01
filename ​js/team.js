// js/team.js

console.log("🏠 Team/Party Management Module Loaded!");

// UI Elements (From Lobby.html Party Drawer)
const createTeamBtn = document.getElementById('btn-create-team'); // Yeh id aapko lobby.html ke drawer button me deni padegi
const partyListContainer = document.getElementById('party-list-container');
const partyStatusText = document.getElementById('party-status-text');
const startMatchBtn = document.getElementById('start-match-btn'); // Bottom bar button

// State Variables
window.currentRoomCode = null;
window.isPartyLeader = false;
window.allowWorldPlayers = false; // By default strictly private for teams

// ==========================================
// 1. Create Private Team (Leader Action)
// ==========================================
if (createTeamBtn) {
    createTeamBtn.addEventListener('click', () => {
        if (!window.socket || !window.myProfileData) return;

        // Generate 6 character Room ID
        const roomCode = "PTY-" + Math.random().toString(36).substring(2, 6).toUpperCase();
        window.currentRoomCode = roomCode;
        window.isPartyLeader = true;
        
        // Update UI Drawer
        partyStatusText.innerText = `Party Code: ${roomCode}`;
        partyStatusText.style.color = "#fbbf24";
        createTeamBtn.style.display = "none";
        
        // Show Leader in List
        updatePartyUI([{
            id: window.socket.id,
            name: window.myProfileData.gameName,
            isLeader: true
        }]);

        // Tell Server (roomManager.js)
        window.socket.emit('createRoom', { 
            roomCode: roomCode, 
            allowWorld: window.allowWorldPlayers 
        });

        // Change Main Play Button to "Start Party Race"
        startMatchBtn.innerText = "▶ Start Party Race";
        startMatchBtn.style.background = "#3b82f6";
    });
}

// ==========================================
// 2. Join a Team (Friend Action)
// ==========================================
window.joinPrivateTeam = function(roomCodeToJoin) {
    if (!window.socket || !window.myProfileData) return;

    window.socket.emit('joinRoom', { roomCode: roomCodeToJoin });
    
    // UI Update -> Let server confirm joining first
    partyStatusText.innerText = "Joining party...";
    partyStatusText.style.color = "#94a3b8";
    if (createTeamBtn) createTeamBtn.style.display = "none";
};

// ==========================================
// 3. Start Race Trigger (Solo or Team)
// ==========================================
if (startMatchBtn) {
    startMatchBtn.addEventListener('click', () => {
        
        // A. SOLO MATCHMAKING (Agar kisi team me nahi hai)
        if (!window.currentRoomCode) {
            startMatchBtn.innerText = "Searching Server...";
            startMatchBtn.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    window.socket.emit('startMatchmaking', {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => { alert("GPS needed for Solo Matchmaking."); startMatchBtn.disabled = false; }
            );
        } 
        
        // B. TEAM MATCHMAKING (Agar team me hai)
        else {
            if (window.isPartyLeader) {
                startMatchBtn.innerText = "Setting up Race...";
                startMatchBtn.disabled = true;
                window.socket.emit('startTeamMatch', { roomCode: window.currentRoomCode });
            } else {
                alert("Only the Party Leader can start the race!");
            }
        }
    });
}

// ==========================================
// 4. Server Event Listeners (Syncing UI)
// ==========================================

// When someone joins your room (Host or Client gets this)
if (window.socket) {
    window.socket.on('playerJoinedRoom', (data) => {
        console.log("A friend joined the room!", data);
        // Realistic scenario me yahan sabhi players ka naam server bhejega
        // Abhi ke liye bas UI message update karenge
        partyStatusText.innerText = `Party Code: ${window.currentRoomCode} (${data.playerCount}/4)`;
        
        // Agar aap client/dost ho
        if (!window.isPartyLeader) {
            window.currentRoomCode = data.roomCode;
            startMatchBtn.innerText = "Waiting for Leader...";
            startMatchBtn.style.background = "#64748b";
            startMatchBtn.disabled = true;
        }
    });

    window.socket.on('roomError', (data) => {
        alert(data.message);
        partyStatusText.innerText = "You are currently Solo.";
        if (createTeamBtn) createTeamBtn.style.display = "block";
    });
}

// ==========================================
// Helper: Render Party List in Drawer
// ==========================================
function updatePartyUI(players) {
    if (!partyListContainer) return;
    partyListContainer.innerHTML = "";
    
    players.forEach(p => {
        partyListContainer.innerHTML += `
            <div style="display:flex; justify-content:space-between; background:#0f172a; padding:10px; border-radius:8px; margin-bottom:5px; border-left:3px solid ${p.isLeader ? '#fbbf24' : '#10b981'};">
                <span style="font-size:12px; font-weight:bold;">${p.isLeader ? '👑' : '🚗'} ${p.name}</span>
            </div>
        `;
    });
}

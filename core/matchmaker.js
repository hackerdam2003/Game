// js/matchmaking.js
console.log("🚨 [Global-Matchmaking] Auto-Pull Module Loaded!");

window.startMatchmakingProcess = function() {
    const matchBtn = document.getElementById('start-match-btn');
    if (matchBtn) {
        matchBtn.style.background = '#ef4444'; // Red color for Global Launch
        matchBtn.style.color = '#fff';
        matchBtn.innerHTML = "🚨 LAUNCHING GLOBAL MATCH... 🚨";
    }
    
    // Server ko force-start ka command bhejo
    if (window.socket) {
        window.socket.emit('startMatchmaking', {
            uid: window.localUser ? window.localUser.uid : socket.id
        });
    }
};

window.initMatchmaking = function() {
    if (window.socket) {
        window.socket.off('matchFound'); 
        window.socket.on('matchFound', (data) => {
            console.log("Forced into Match:", data);
            
            const matchBtn = document.getElementById('start-match-btn');
            if (matchBtn) {
                matchBtn.style.background = '#3b82f6';
                matchBtn.style.color = '#fff';
                matchBtn.innerHTML = "🔥 RACE STARTING! TELEPORTING... 🔥";
            }
            
            // 1.5 Second me sabke browser apne aap game.html par chale jayenge
            setTimeout(() => {
                const amIHost = (window.localUser && data.hostUid === window.localUser.uid);
                window.location.href = `game.html?roomId=${data.gameRoomId}&isHost=${amIHost}`;
            }, 1500);
        });
    }
};


// js/matchmaking.js
window.startMatchmakingProcess = function() {
    const matchBtn = document.getElementById('start-match-btn');
    if (matchBtn && !window.currentRoomId) {
        matchBtn.style.background = '#fbbf24'; 
        matchBtn.style.color = '#000';
        matchBtn.innerHTML = "⏳ JOINING LOBBY... ⏳";
        matchBtn.disabled = true;
    } else if (matchBtn && window.currentRoomId) {
        matchBtn.style.background = '#fbbf24';
        matchBtn.innerHTML = "⏳ LAUNCHING MATCH... ⏳";
        matchBtn.disabled = true;
    }
    
    if (window.socket) {
        window.socket.emit('startMatchmaking');
    }
};

window.initMatchmaking = function() {}; 

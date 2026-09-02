// js/matchmaking.js
console.log("🚀 [Squad Matchmaking] Button Module Loaded!");

window.startMatchmakingProcess = function() {
    if (window.socket) {
        window.socket.emit('startMatchmaking');
    }
};

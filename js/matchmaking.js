// js/matchmaking.js
console.log("🚀 [Squad Matchmaking] Module Loaded Successfully!");

// 1. JAB HOST 'START MATCH' DABAYEGA
window.startMatchmakingProcess = function() {
    const matchBtn = document.getElementById('start-match-btn');
    
    // UI Update: Button ko loading state me dalo taaki double-click na ho
    if (matchBtn) {
        matchBtn.style.background = '#fbbf24'; // Yellow Loading Color
        matchBtn.style.color = '#000';
        matchBtn.innerHTML = "⏳ LAUNCHING SQUAD... ⏳";
        matchBtn.disabled = true; // Spam click rokne ke liye
    }
    
    // Server ko command bhejo ki puri team ko Game me teleport kare
    if (window.socket) {
        window.socket.emit('startMatchmaking');
    } else {
        alert("❌ Error: Server connection lost!");
        // Agar net chala jaye toh button wapas normal kar do
        if (matchBtn) {
            matchBtn.style.background = '#ef4444';
            matchBtn.style.color = '#fff';
            matchBtn.innerHTML = "▶ START SQUAD MATCH";
            matchBtn.disabled = false;
        }
    }
};

// 2. BOOT SEQUENCE INITIALIZER
// Lobby.html ka boot sequence is function ko dhoondhta hai. 
// Teleport logic ab team.js sambhal raha hai, isliye yahan sirf ready state rakhi hai.
window.initMatchmaking = function() {
    console.log("✅ Matchmaking System Ready. Waiting for Host command...");
    
    // Agar future me koi extra matchmaking animation lagani ho, toh yahan aayegi
};

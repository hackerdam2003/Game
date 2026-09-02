// js/matchmaking.js
console.log("🚨 [Shared-Lobby] Dynamic Avatar Pop-up Module Loaded!");

window.isInGlobalLobby = false;

window.startMatchmakingProcess = function() {
    const matchBtn = document.getElementById('start-match-btn');
    
    // Agar player already shared lobby me hai, toh button 'START RACE' ka kaam karega
    if (window.isInGlobalLobby) {
        if (window.socket) window.socket.emit('launchGlobalMatch');
        return;
    }

    // Agar lobby me nahi hai, toh join karne ki request bhejo
    if (window.socket && window.localUser && window.myProfileData) {
        matchBtn.style.background = '#fbbf24';
        matchBtn.style.color = '#000';
        matchBtn.innerHTML = "⏳ JOINING SHARED LOBBY... ⏳";

        window.socket.emit('joinGlobalLobby', {
            uid: window.localUser.uid,
            name: window.myProfileData.gameName,
            gender: window.myProfileData.gender,
            age: window.myProfileData.age
        });
    }
};

window.initMatchmaking = function() {
    if (window.socket) {
        
        // JAB BHI KOI NAYA PLAYER JUDTA HAI (AVATAR POP-UP LOGIC)
        window.socket.on('globalLobbyUpdate', (data) => {
            window.isInGlobalLobby = true;
            const stage = document.getElementById('party-stage-container');
            const matchBtn = document.getElementById('start-match-btn');
            
            // Screen clear karo naye grid ke liye
            stage.innerHTML = '';
            
            // Har player ka Avatar Card generate karo (Jaise screenshot me hai)
            data.players.forEach(p => {
                const isMe = p.uid === window.localUser.uid;
                const role = p.isHost ? "Host" : "Player";
                
                // Card size thoda chhota kiya taaki 4-6 log aaram se fit ho jayein
                stage.innerHTML += `
                    <div class="character-stage" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}; width: 130px; height: 170px; margin: 5px;">
                        <div class="avatar-icon-big" style="font-size:45px;">${p.gender === 'Girl' ? '👧' : '👦'}</div>
                        <div class="char-name" style="color: ${isMe ? '#3b82f6' : '#10b981'}; font-size:12px;">${p.name}</div>
                        <div class="char-sub" style="font-size:10px;">${p.gender} • Age: ${p.age}</div>
                        <div class="char-sub" style="font-weight:bold; color:${p.isHost ? '#fbbf24' : '#94a3b8'}; margin-top:4px;">${role}</div>
                    </div>
                `;
            });

            // Button Control: Host race start kar sakta hai, baaki log wait karenge
            const amIHost = data.hostUid === window.localUser.uid;
            if (amIHost) {
                matchBtn.style.background = '#ef4444'; // Red Launch Button
                matchBtn.style.color = '#fff';
                matchBtn.disabled = false;
                matchBtn.innerHTML = `🚀 START RACE (${data.players.length} Players) 🚀`;
            } else {
                matchBtn.style.background = '#64748b'; // Grey Waiting Button
                matchBtn.style.color = '#fff';
                matchBtn.disabled = true;
                matchBtn.innerHTML = `⏳ Waiting for Host to Start... ⏳`;
            }
        });

        // JAB HOST START DABAYE (TELEPORT LOGIC)
        window.socket.on('teleportToGame', (data) => {
            const matchBtn = document.getElementById('start-match-btn');
            if (matchBtn) {
                matchBtn.style.background = '#10b981';
                matchBtn.innerHTML = "🔥 TELEPORTING TO MATCH... 🔥";
            }
            
            // 1 Second me sab log race track par!
            setTimeout(() => {
                const amIHost = (window.localUser && data.hostUid === window.localUser.uid);
                window.location.href = `game.html?roomId=${data.gameRoomId}&isHost=${amIHost}`;
            }, 1000);
        });
    }
};

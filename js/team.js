// js/team.js
console.log("🛡️ [Squad/Team] Master Module Loaded!");

window.partySizeLimit = 4;
window.currentRoomId = null;
window.partyMembers = [];

// 🛑 NAYA: Party Size Change Logic UI
window.setPartySize = function(size) {
    if (window.currentRoomId) {
        alert("Cannot change size while in an active party!");
        return;
    }
    window.partySizeLimit = size;
    document.getElementById('btn-size-2').style.background = size === 2 ? '#3b82f6' : '#1e293b';
    document.getElementById('btn-size-4').style.background = size === 4 ? '#3b82f6' : '#1e293b';
};

window.createParty = function() {
    if (window.socket && window.localUser) {
        window.socket.emit('createPartyRoom', { 
            maxSize: window.partySizeLimit 
        });
    }
};

window.leaveParty = function() {
    if (window.socket && window.currentRoomId) {
        window.socket.emit('leavePartyRoom', { roomId: window.currentRoomId });
        window.currentRoomId = null;
        window.partyMembers = [];
        updatePartyUI();
        const tabs = document.querySelectorAll('.chat-tab');
        if (tabs.length > 0) window.switchChatTab('world', tabs[0]);
    }
};

window.inviteToTeam = function(targetUid) {
    if (!window.currentRoomId) { alert("Please 'Create Party' first!"); return; }
    if (window.partyMembers.length >= window.partySizeLimit) { 
        alert(`Squad is full! (${window.partySizeLimit} Limit)`); 
        return; 
    }
    if (window.socket) {
        window.socket.emit('sendPartyInvite', { 
            targetUid: targetUid, 
            hostName: window.myProfileData.gameName, 
            roomId: window.currentRoomId 
        });
        alert("Invite Sent Successfully!");
    }
};

window.initTeamSystem = function() {
    if (!window.socket) return;

    window.socket.off('partyCreated');
    window.socket.off('partyUpdated');
    window.socket.off('joinedParty');
    window.socket.off('receivePartyInvite');
    window.socket.off('partyError');
    window.socket.off('teleportToGame');

    window.socket.on('partyCreated', (data) => {
        window.currentRoomId = data.roomId;
        window.partyMembers = data.members;
        if (data.maxSize) window.partySizeLimit = data.maxSize;
        updatePartyUI();
        const tabs = document.querySelectorAll('.chat-tab');
        if (tabs.length > 1) window.switchChatTab('team', tabs[1]);
    });

    window.socket.on('joinedParty', (data) => {
        if (!window.currentRoomId && data.roomId) {
            window.currentRoomId = data.roomId;
        }
    });

    window.socket.on('partyUpdated', (data) => {
        // 🛑 REFRESH FIX: Restore Room ID if page was reloaded
        if (!window.currentRoomId && data.roomId) {
            window.currentRoomId = data.roomId;
        }
        window.partyMembers = data.members;
        if (data.maxSize) window.partySizeLimit = data.maxSize;
        updatePartyUI(); 
    });

    window.socket.on('receivePartyInvite', (data) => {
        if (window.currentRoomId) return;
        if (confirm(`🛡️ ${data.hostName} invited you to join their Squad! Accept?`)) {
            window.socket.emit('acceptPartyInvite', { roomId: data.roomId });
            const tabs = document.querySelectorAll('.chat-tab');
            if (tabs.length > 1) window.switchChatTab('team', tabs[1]);
        }
    });

    window.socket.on('partyError', (msg) => {
        alert("❌ " + msg);
        const matchBtn = document.getElementById('start-match-btn');
        if (matchBtn && matchBtn.disabled && !window.currentRoomId) {
            matchBtn.style.background = '#10b981';
            matchBtn.innerHTML = "▶ Find Match (Auto-Join Lobby)";
            matchBtn.disabled = false;
        }
    });

    window.socket.on('teleportToGame', (data) => {
        const matchBtn = document.getElementById('start-match-btn');
        if (matchBtn) {
            matchBtn.style.background = '#10b981';
            matchBtn.innerHTML = "🔥 TELEPORTING... 🔥";
        }
        setTimeout(() => {
            const amIHost = (window.localUser && data.hostUid === window.localUser.uid);
            window.location.href = `game.html?roomId=${data.gameRoomId}&isHost=${amIHost}`;
        }, 1000);
    });
};

function updatePartyUI() {
    const statusText = document.getElementById('party-status-text');
    const createBtn = document.getElementById('btn-create-party');
    const leaveBtn = document.getElementById('btn-leave-party');
    const listContainer = document.getElementById('party-list-container');
    const centerStage = document.getElementById('party-stage-container');
    const matchBtn = document.getElementById('start-match-btn');

    // --- SOLO MODE ---
    if (!window.currentRoomId) {
        if(statusText) statusText.innerText = "You are Solo.";
        if(createBtn) createBtn.style.display = 'block';
        if(leaveBtn) leaveBtn.style.display = 'none';
        if(listContainer) listContainer.innerHTML = '';

        if(matchBtn) {
            matchBtn.innerHTML = "▶ Find Match (Auto-Join Lobby)";
            matchBtn.style.background = '#10b981';
            matchBtn.disabled = false;
        }

        if (centerStage && window.myProfileData) {
            // 🛑 NAYA: Clickable Profile directly on Solo Avatar
            centerStage.innerHTML = `
                <div class="character-stage" style="border-color: #3b82f6; cursor: pointer;" onclick="window.showMyProfile()">
                    <div class="avatar-icon-big">${window.myProfileData.gender === 'Girl' ? '👧' : '👦'}</div>
                    <div class="char-name" style="color: #3b82f6;">${window.myProfileData.gameName}</div>
                    <div class="char-sub">${window.myProfileData.gender} • Age: ${window.myProfileData.age || 20}</div>
                    <div class="char-sub" style="font-weight:bold; color: #fbbf24; margin-top:5px;">Solo</div>
                </div>
            `;
        }
        return;
    }

    // --- SQUAD MODE (In Lobby) ---
    if(statusText) statusText.innerText = `Squad Active (${window.partyMembers.length}/${window.partySizeLimit})`;
    if(createBtn) createBtn.style.display = 'none';
    if(leaveBtn) leaveBtn.style.display = 'block';

    let amIHost = false;
    if(listContainer) listContainer.innerHTML = '';
    if(centerStage) centerStage.innerHTML = '';

    window.partyMembers.forEach(member => {
        const isMe = member.uid === window.localUser.uid;
        const roleText = member.isHost ? "Host" : "Member";
        if (isMe && member.isHost) amIHost = true;

        // 🛑 NAYA: Profile click for all connected users with Real Data
        const clickEvent = `window.openUserProfile('${member.name}', '${member.age || 20}', '${member.location || 'India'}', '${member.gender}', '${member.playerTag || '000000'}', '${member.uid}', ${isMe})`;

        if (listContainer) {
            listContainer.innerHTML += `
                <div style="background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="font-size: 12px; font-weight:bold; color: ${isMe ? '#38bdf8' : '#f1f5f9'};">👤 ${member.name} ${isMe ? '(You)' : ''}</span>
                    <span style="font-size: 10px; color: ${member.isHost ? '#fbbf24' : '#94a3b8'};">${roleText}</span>
                </div>
            `;
        }

        if (centerStage) {
            centerStage.innerHTML += `
                <div class="character-stage" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}; width: 140px; height: 190px; margin: 10px; cursor: pointer;" onclick="${clickEvent}">
                    <div class="avatar-icon-big" style="font-size: 55px;">${member.gender === 'Girl' ? '👧' : '👦'}</div>
                    <div class="char-name" style="color: ${isMe ? '#3b82f6' : '#10b981'};">${member.name}</div>
                    <div class="char-sub">${member.gender} • Age: ${member.age || 20}</div>
                    <div class="char-sub" style="font-weight:bold; color:${member.isHost ? '#fbbf24' : '#94a3b8'}; margin-top:5px;">${roleText}</div>
                </div>
            `;
        }
    });

    if (matchBtn) {
        if (amIHost) {
            matchBtn.innerHTML = `▶ START MATCH (${window.partyMembers.length}/${window.partySizeLimit})`;
            matchBtn.style.background = '#ef4444';
            matchBtn.disabled = false;
        } else {
            matchBtn.innerHTML = "⏳ WAITING FOR HOST...";
            matchBtn.style.background = '#64748b';
            matchBtn.disabled = true;
        }
    }
}


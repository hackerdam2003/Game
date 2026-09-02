// js/team.js
console.log("🛡️ [Squad/Team] Genshin Co-Op Module Loaded!");

window.partySizeLimit = 4;
window.currentRoomId = null;
window.partyMembers = [];

window.createParty = function() {
    if (window.socket && window.localUser) {
        window.socket.emit('createPartyRoom', { hostUid: window.localUser.uid, hostName: window.myProfileData.gameName });
    }
};

window.leaveParty = function() {
    if (window.socket && window.currentRoomId) {
        window.socket.emit('leavePartyRoom', { roomId: window.currentRoomId });
        window.currentRoomId = null;
        window.partyMembers = [];
        updatePartyUI();
    }
};

window.inviteToTeam = function(targetUid) {
    if (!window.currentRoomId) { alert("Please 'Create Party' first!"); return; }
    if (window.socket) {
        window.socket.emit('sendPartyInvite', { targetUid: targetUid, hostName: window.myProfileData.gameName, roomId: window.currentRoomId });
        alert("Invite Sent Successfully!");
    }
};

window.initTeamSystem = function() {
    if (!window.socket) return;

    window.socket.off('partyCreated');
    window.socket.off('partyUpdated');
    window.socket.off('joinedParty');
    window.socket.off('receivePartyInvite');
    window.socket.off('teleportToGame');

    window.socket.on('partyCreated', (data) => {
        window.currentRoomId = data.roomId;
        window.partyMembers = data.members;
        updatePartyUI();
    });

    window.socket.on('joinedParty', (data) => {
        window.currentRoomId = data.roomId;
        // The rest is handled by partyUpdated which fires immediately after
    });

    window.socket.on('partyUpdated', (data) => {
        window.partyMembers = data.members;
        updatePartyUI(); 
    });

    window.socket.on('receivePartyInvite', (data) => {
        if (window.currentRoomId) return;
        const accept = confirm(`🛡️ ${data.hostName} invited you to join their Squad! Accept?`);
        if (accept) {
            window.socket.emit('acceptPartyInvite', { roomId: data.roomId, gender: window.myProfileData.gender, age: window.myProfileData.age });
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
            centerStage.innerHTML = `
                <div class="character-stage" style="border-color: #3b82f6;">
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
    if(statusText) statusText.innerText = `Squad Active (${window.partyMembers.length}/4)`;
    if(createBtn) createBtn.style.display = 'none';
    if(leaveBtn) leaveBtn.style.display = 'block';

    let amIHost = false;
    if(listContainer) listContainer.innerHTML = '';
    if(centerStage) centerStage.innerHTML = '';

    window.partyMembers.forEach(member => {
        const isMe = member.uid === window.localUser.uid;
        const roleText = member.isHost ? "Host" : "Member";
        if (isMe && member.isHost) amIHost = true;

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
                <div class="character-stage" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}; width: 140px; height: 190px; margin: 10px;">
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
            matchBtn.innerHTML = `▶ START MATCH (${window.partyMembers.length}/4)`;
            matchBtn.style.background = '#ef4444';
            matchBtn.disabled = false;
        } else {
            matchBtn.innerHTML = "⏳ WAITING FOR HOST...";
            matchBtn.style.background = '#64748b';
            matchBtn.disabled = true;
        }
    }
}


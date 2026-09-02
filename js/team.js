// js/team.js
console.log("🛡️ [Team] Party Management Module Loaded!");

window.partySizeLimit = 2; // Default 2 players
window.currentRoomId = null;
window.partyMembers = []; 

// 1. Party Size Select UI Update
window.setPartySize = function(size) {
    if (window.currentRoomId) {
        alert("You cannot change size while in an active party!");
        return;
    }
    window.partySizeLimit = size;
    document.getElementById('btn-size-2').style.background = size === 2 ? '#3b82f6' : '#1e293b';
    document.getElementById('btn-size-4').style.background = size === 4 ? '#3b82f6' : '#1e293b';
};

// 2. Host Creates the Party
window.createParty = function() {
    if (!window.socket || !window.localUser) return;
    window.socket.emit('createPartyRoom', {
        hostUid: window.localUser.uid,
        hostName: window.myProfileData.gameName,
        maxSize: window.partySizeLimit
    });
};

// 3. Leave the Party
window.leaveParty = function() {
    if (!window.socket || !window.currentRoomId) return;
    
    window.socket.emit('leavePartyRoom', { roomId: window.currentRoomId });
    
    window.currentRoomId = null;
    window.partyMembers = [];
    updatePartyUI(false);
    
    // Team Chat history clear karke World Chat par wapas bhej do
    if(window.clearTeamChat) window.clearTeamChat();
    const chatTabs = document.querySelectorAll('.chat-tab');
    if (chatTabs.length > 0) {
        window.switchChatTab('world', chatTabs[0]); 
    }
};

// 4. Send Invite to Friend (Called from Friends List)
window.sendTeamInvite = function(targetUid) {
    if (!window.currentRoomId) {
        alert("Please 'Create Party' first before inviting friends!");
        const drawer = document.getElementById('party-drawer');
        if(drawer) drawer.classList.add('open');
        return;
    }
    
    if (window.partyMembers.length >= window.partySizeLimit) {
        alert("Your party is already full!");
        return;
    }

    if (window.socket) {
        window.socket.emit('sendPartyInvite', {
            targetUid: targetUid,
            hostName: window.myProfileData.gameName,
            roomId: window.currentRoomId
        });
        alert("Invite Sent!");
    }
};

// 5. Update Center Stage & Drawer UI
function updatePartyUI(isHost) {
    const statusText = document.getElementById('party-status-text');
    const createBtn = document.getElementById('btn-create-party');
    const leaveBtn = document.getElementById('btn-leave-party');
    const listContainer = document.getElementById('party-list-container');
    const centerStage = document.getElementById('party-stage-container');

    // Agar Solo hai
    if (!window.currentRoomId) {
        if(statusText) statusText.innerText = "You are Solo.";
        if(createBtn) createBtn.style.display = 'block';
        if(leaveBtn) leaveBtn.style.display = 'none';
        if(listContainer) listContainer.innerHTML = '';
        
        if(centerStage && window.myProfileData) {
            centerStage.innerHTML = `
                <div class="character-stage" onclick="showMyProfile()">
                    <div class="avatar-icon-big" id="main-avatar-icon">${window.myProfileData.gender === 'Girl' ? '👧' : '👦'}</div>
                    <div class="char-name" id="main-char-name">${window.myProfileData.gameName}</div>
                    <div class="char-sub" id="main-char-info">Host (You)</div>
                </div>
            `;
        }
        return;
    }

    // Agar Party me hai
    if(statusText) statusText.innerText = `Party Active (${window.partyMembers.length}/${window.partySizeLimit})`;
    if(createBtn) createBtn.style.display = 'none';
    if(leaveBtn) leaveBtn.style.display = 'block';
    
    if(listContainer) listContainer.innerHTML = '';
    if(centerStage) centerStage.innerHTML = '';

    window.partyMembers.forEach(member => {
        const isMe = member.uid === window.localUser.uid;
        const roleText = member.isHost ? "Host" : "Member";
        
        // Drawer List UI
        if(listContainer) {
            listContainer.innerHTML += `
                <div style="background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; font-weight:bold; color: ${isMe ? '#38bdf8' : '#f1f5f9'};">👤 ${member.name} ${isMe ? '(You)' : ''}</span>
                    <span style="font-size: 10px; color: ${member.isHost ? '#fbbf24' : '#94a3b8'};">${roleText}</span>
                </div>
            `;
        }

        // Center Stage UI (Avatar Boxes)
        if(centerStage) {
            centerStage.innerHTML += `
                <div class="character-stage" style="border-color: ${isMe ? '#3b82f6' : '#10b981'};">
                    <div class="avatar-icon-big">${member.gender === 'Girl' ? '👧' : '👦'}</div>
                    <div class="char-name" style="color: ${isMe ? '#3b82f6' : '#10b981'};">${member.name}</div>
                    <div class="char-sub">${member.gender} • Age: ${member.age || '20'}</div>
                    <div class="char-sub" style="font-weight:bold; margin-top:5px; color:${member.isHost ? '#fbbf24' : '#94a3b8'};">${roleText}</div>
                </div>
            `;
        }
    });
}

// 6. Socket Listeners for Team Events
window.initTeamSystem = function() {
    if (window.socket) {
        // Purane listeners hatao (Memory leak prevent karne ke liye)
        window.socket.off('partyCreated');
        window.socket.off('partyUpdated');
        window.socket.off('receivePartyInvite');
        window.socket.off('joinedParty');
        window.socket.off('partyError');

        window.socket.on('partyCreated', (data) => {
            window.currentRoomId = data.roomId;
            window.partyMembers = data.members;
            updatePartyUI(true);
            
            const chatTabs = document.querySelectorAll('.chat-tab');
            if(chatTabs.length > 1) window.switchChatTab('team', chatTabs[1]); // Auto switch to Team Chat
        });

        window.socket.on('partyUpdated', (data) => {
            window.partyMembers = data.members;
            updatePartyUI(false);
        });

        window.socket.on('receivePartyInvite', (data) => {
            if (window.currentRoomId) return; 
            
            const accept = confirm(`🛡️ ${data.hostName} invited you to join their party! Accept?`);
            if (accept) {
                window.socket.emit('acceptPartyInvite', { 
                    roomId: data.roomId,
                    userUid: window.localUser.uid,
                    userName: window.myProfileData.gameName,
                    gender: window.myProfileData.gender,
                    age: window.myProfileData.age
                });
            }
        });

        window.socket.on('joinedParty', (data) => {
            window.currentRoomId = data.roomId;
            window.partySizeLimit = data.maxSize;
            
            const chatTabs = document.querySelectorAll('.chat-tab');
            if(chatTabs.length > 1) window.switchChatTab('team', chatTabs[1]);
            
            alert("Joined Party Successfully!");
        });

        window.socket.on('partyError', (msg) => {
            alert("❌ " + msg);
        });
    }
};

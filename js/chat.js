// js/chat.js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("💬 [Chat] WhatsApp Style DM & World Chat Module Loaded!");

window.currentChatChannel = 'world';
window.currentChatTarget = null; 
window.currentChatTargetName = "";
window.unsubscribeDM = null; // 🛑 GHOST LISTENER KILLER

window.worldChatHistory = [];
window.teamChatHistory = [];

function renderTemporaryChat(channel) {
    const box = document.getElementById('active-chat-box');
    if (!box || window.currentChatChannel !== channel) return;
    
    const introMsg = document.getElementById('chat-intro-msg');
    box.innerHTML = '';
    if(introMsg) box.appendChild(introMsg);

    const history = channel === 'world' ? window.worldChatHistory : window.teamChatHistory;
    
    history.forEach(msg => {
        const p = document.createElement('p');
        p.style.margin = "4px 0";
        p.style.fontSize = "12px";
        p.innerHTML = `<span style="color:#94a3b8; font-size:9px;">[${msg.time}]</span> <b style="color: #38bdf8;">${msg.sender}:</b> ${msg.text}`;
        box.appendChild(p);
    });
    box.scrollTop = box.scrollHeight;
}

window.switchChatTab = async function(type, el) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    const chatBox = document.getElementById('active-chat-box');
    window.currentChatChannel = type;
    window.currentChatTarget = null; 
    
    // Purana chat listener band karo taaki duplicate message na aaye
    if (window.unsubscribeDM) {
        window.unsubscribeDM();
        window.unsubscribeDM = null;
    }
    
    chatBox.innerHTML = '<p id="chat-intro-msg" style="color: #10b981; font-size:12px; margin-bottom:10px;"></p>';
    const introMsg = document.getElementById('chat-intro-msg');

    if(type === 'world') {
        introMsg.innerText = "[🌍 World Chat]: Messages auto-delete after 60s.";
        renderTemporaryChat('world'); 
    } 
    else if(type === 'team') {
        introMsg.innerText = "[🛡️ Team Chat]: Connected to active room.";
        renderTemporaryChat('team'); 
    } 
    else if(type === 'dm') {
        introMsg.innerText = "[👥 Friend DMs]: Loading your friends...";
        
        if (window.localUser && window.db) {
            try {
                const myDocSnap = await getDoc(doc(window.db, "Users", window.localUser.uid));
                if (myDocSnap.exists()) {
                    const friends = myDocSnap.data().friendsList || [];
                    if (friends.length === 0) {
                        introMsg.innerText = "You have no friends added yet.";
                    } else {
                        introMsg.innerText = "Select a friend to chat (Messages are permanent):";
                        friends.forEach(async (friendUid) => {
                            const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                            if (fSnap.exists()) {
                                const fData = fSnap.data();
                                const name = fData.gameName || fData.name || 'Racer';
                                
                                // 🛑 DOT GLOW & SIZE UPGRADE
                                const statusObj = window.userStatuses ? window.userStatuses[friendUid] : null;
                                const isOnline = statusObj && statusObj.state === 'online';
                                const statusColor = isOnline ? '#00ff00' : '#ff0000'; 
                                const shadow = isOnline ? '0 0 10px #00ff00' : '0 0 10px #ff0000';
                                
                                chatBox.innerHTML += `
                                    <div style="background: #1e293b; padding: 8px 12px; border-radius: 6px; margin-top: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
                                         onclick="openPrivateChat('${friendUid}', '${name}')">
                                        <span style="color: #f1f5f9; font-size: 12px; display:flex; align-items:center;">
                                            👤 ${name} 
                                            <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${statusColor}; margin-left:8px; box-shadow:${shadow}; border:1px solid #fff;"></span>
                                        </span>
                                        <button style="background: #3b82f6; border: none; color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">Chat</button>
                                    </div>
                                `;
                            }
                        });
                    }
                }
            } catch(e) { introMsg.innerText = "Failed to load friends."; }
        }
    }
};

window.closePrivateChat = function() {
    if (window.unsubscribeDM) {
        window.unsubscribeDM();
        window.unsubscribeDM = null;
    }
    window.switchChatTab('dm', document.querySelectorAll('.chat-tab')[2]);
};

window.openPrivateChat = function(friendUid, friendName) {
    window.currentChatTarget = friendUid;
    window.currentChatTargetName = friendName;
    window.currentChatChannel = 'dm';
    
    // Purana chat listener kill karo
    if (window.unsubscribeDM) {
        window.unsubscribeDM();
        window.unsubscribeDM = null;
    }
    
    const statusObj = window.userStatuses ? window.userStatuses[friendUid] : null;
    const isOnline = statusObj && statusObj.state === 'online';
    const statusTxt = isOnline ? `<span style="color:#00ff00;">Online</span>` : `<span style="color:#ff0000;">Offline</span>`;

    const chatBox = document.getElementById('active-chat-box');
    
    // 🛑 KHALI SPACE FIX: Removed max-height and overflow-y from the inner div
    chatBox.innerHTML = `
        <div style="background: #334155; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #f1f5f9; font-size: 11px; font-weight:bold;">Chatting with: ${friendName} <br>${statusTxt}</span>
            <button onclick="closePrivateChat()" style="background:transparent; border:none; color:#ef4444; font-size:10px; cursor:pointer;">✖ Back</button>
        </div>
        <div id="dm-message-list" style="display:flex; flex-direction:column; gap:6px; padding-bottom:10px; width:100%;"></div>
    `;

    const uid1 = window.localUser.uid;
    const uid2 = friendUid;
    const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

    const chatRef = ref(window.rtdb, 'PrivateChats/' + chatId);
    
    window.unsubscribeDM = onValue(chatRef, (snap) => {
        const list = document.getElementById('dm-message-list');
        if (!list || window.currentChatChannel !== 'dm') return;
        
        list.innerHTML = ''; 
        let lastDate = "";

        if (snap.exists()) {
            snap.forEach((childSnap) => {
                const key = childSnap.key;
                const msg = childSnap.val();
                
                if (msg.senderUid !== window.localUser.uid && msg.status !== 'read') {
                    update(ref(window.rtdb, `PrivateChats/${chatId}/${key}`), { status: 'read' });
                }

                const msgDate = new Date(msg.timestamp);
                const dateStr = msgDate.toLocaleDateString();
                const timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                if (dateStr !== lastDate) {
                    list.innerHTML += `<div style="text-align:center; margin: 10px 0;"><span style="background:#0f172a; padding:2px 8px; border-radius:10px; font-size:9px; color:#64748b; border: 1px solid #334155;">${dateStr}</span></div>`;
                    lastDate = dateStr;
                }

                if (msg.senderUid === window.localUser.uid) {
                    const ticks = msg.status === 'read' ? '<span style="color:#38bdf8; font-weight:bold;">✓✓</span>' : '<span style="color:#94a3b8;">✓</span>';
                    list.innerHTML += `
                        <div style="align-self: flex-end; max-width: 80%; margin-bottom: 2px;">
                            <span style="background:#3b82f6; color:white; padding:6px 10px; border-radius:8px 0 8px 8px; display:inline-block; font-size:12px;">
                                ${msg.text} 
                                <span style="font-size:9px; color:#cbd5e1; margin-left:6px;">${timeStr} ${ticks}</span>
                            </span>
                        </div>
                    `;
                } else {
                    list.innerHTML += `
                        <div style="align-self: flex-start; max-width: 80%; margin-bottom: 2px;">
                            <span style="background:#1e293b; color:white; padding:6px 10px; border-radius:0 8px 8px 8px; display:inline-block; border: 1px solid #334155; font-size:12px;">
                                <b>${msg.senderName}:</b> ${msg.text}
                                <br><span style="font-size:9px; color:#64748b; float:right; margin-top:2px;">${timeStr}</span>
                            </span>
                        </div>
                    `;
                }
            });
            chatBox.scrollTop = chatBox.scrollHeight; 
        } else {
            list.innerHTML = '<p style="color:#64748b; font-size:11px; text-align:center;">No messages yet. Say hi!</p>';
        }
    });
};

window.sendChatMessage = async function() {
    const input = document.getElementById('chat-input-field');
    if(!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    const senderName = window.myProfileData ? window.myProfileData.gameName : "Racer";
    input.value = ''; 

    if (window.currentChatChannel === 'dm') {
        if (!window.currentChatTarget) return;

        const uid1 = window.localUser.uid;
        const uid2 = window.currentChatTarget;
        const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

        push(ref(window.rtdb, 'PrivateChats/' + chatId), {
            senderUid: window.localUser.uid,
            senderName: senderName,
            text: messageText,
            timestamp: Date.now(),
            status: 'sent'
        });
    } 
    else {
        if (window.socket) {
            window.socket.emit('chatMessage', {
                sender: senderName,
                message: messageText,
                channel: window.currentChatChannel,
                timestamp: Date.now() 
            });
        }
    }
};

window.initChatSystem = function() {
    if (window.socket) {
        window.socket.off('receiveChat'); 
        window.socket.on('receiveChat', (data) => {
            if(data.channel === 'dm') return; 

            const timeStr = new Date(data.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const msgObj = {
                sender: data.sender,
                text: data.message,
                time: timeStr,
                id: Date.now() + Math.random()
            };

            if (data.channel === 'world') {
                window.worldChatHistory.push(msgObj);
                setTimeout(() => {
                    window.worldChatHistory = window.worldChatHistory.filter(m => m.id !== msgObj.id);
                    renderTemporaryChat('world'); 
                }, 60000); 
                renderTemporaryChat('world');
            } 
            else if (data.channel === 'team') {
                window.teamChatHistory.push(msgObj);
                renderTemporaryChat('team');
            }
        });
    }
};

window.clearTeamChat = function() {
    window.teamChatHistory = [];
    if(window.currentChatChannel === 'team') {
        renderTemporaryChat('team');
    }
};

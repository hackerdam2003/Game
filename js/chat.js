// js/chat.js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("💬 [Chat] Fast RTDB DM Module Loaded!");

window.currentChatChannel = 'world';
window.currentChatTarget = null; 
window.currentChatTargetName = "";
window.unsubscribeDM = null; 

window.switchChatTab = async function(type, el) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    const chatBox = document.getElementById('active-chat-box');
    window.currentChatChannel = type;
    window.currentChatTarget = null; 
    
    chatBox.innerHTML = '<p id="chat-intro-msg" style="color: #10b981; font-size:12px; margin-bottom:10px;"></p>';
    const introMsg = document.getElementById('chat-intro-msg');

    if(type === 'world') {
        introMsg.innerText = "[🌍 World Chat]: Connected to global server.";
    } 
    else if(type === 'team') {
        introMsg.innerText = "[🛡️ Team Chat]: Connected to active room.";
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
                        introMsg.innerText = "Select a friend to chat (Messages are now permanent):";
                        
                        friends.forEach(async (friendUid) => {
                            const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                            if (fSnap.exists()) {
                                const fData = fSnap.data();
                                const name = fData.gameName || fData.name || 'Racer';
                                
                                const statusObj = window.userStatuses ? window.userStatuses[friendUid] : null;
                                const isOnline = statusObj && statusObj.state === 'online';
                                const statusColor = isOnline ? '#10b981' : '#64748b';
                                
                                chatBox.innerHTML += `
                                    <div style="background: #1e293b; padding: 8px 12px; border-radius: 6px; margin-top: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
                                         onclick="openPrivateChat('${friendUid}', '${name}')">
                                        <span style="color: #f1f5f9; font-size: 12px;">👤 ${name} <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${statusColor}; margin-left:5px;"></span></span>
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
    window.switchChatTab('dm', document.querySelectorAll('.chat-tab')[2]);
};

window.openPrivateChat = function(friendUid, friendName) {
    window.currentChatTarget = friendUid;
    window.currentChatTargetName = friendName;
    window.currentChatChannel = 'dm';
    
    const statusObj = window.userStatuses ? window.userStatuses[friendUid] : null;
    const isOnline = statusObj && statusObj.state === 'online';
    const statusTxt = isOnline ? `<span style="color:#10b981;">Online</span>` : `<span style="color:#64748b;">Offline (Message will save)</span>`;

    const chatBox = document.getElementById('active-chat-box');
    chatBox.innerHTML = `
        <div style="background: #334155; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #f1f5f9; font-size: 11px; font-weight:bold;">Chatting with: ${friendName} <br>${statusTxt}</span>
            <button onclick="closePrivateChat()" style="background:transparent; border:none; color:#ef4444; font-size:10px; cursor:pointer;">✖ Back</button>
        </div>
        <div id="dm-message-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; max-height:220px; padding-bottom:10px;"></div>
    `;

    // 🛑 HOTFAKE MAGIC: Read Chat direct from RTDB (Fast & Permanent)
    const uid1 = window.localUser.uid;
    const uid2 = friendUid;
    const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

    const chatRef = ref(window.rtdb, 'PrivateChats/' + chatId);
    
    // Auto-load previous chats and listen for new ones
    onValue(chatRef, (snap) => {
        const list = document.getElementById('dm-message-list');
        if (!list || window.currentChatChannel !== 'dm') return;
        
        list.innerHTML = ''; 
        if (snap.exists()) {
            snap.forEach((childSnap) => {
                const msg = childSnap.val();
                if (msg.senderUid === window.localUser.uid) {
                    list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:right;"><span style="background:#3b82f6; color:white; padding:6px 10px; border-radius:8px 0 8px 8px; display:inline-block;">${msg.text}</span></p>`;
                } else {
                    list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:left;"><span style="background:#1e293b; color:white; padding:6px 10px; border-radius:0 8px 8px 8px; display:inline-block; border: 1px solid #334155;"><b>${msg.senderName}:</b> ${msg.text}</span></p>`;
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

    // 🛑 AGAR DM HAI TOH SEEDHA DATABASE ME SAVE KARO
    if (window.currentChatChannel === 'dm') {
        if (!window.currentChatTarget) return;

        const uid1 = window.localUser.uid;
        const uid2 = window.currentChatTarget;
        const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

        // Save to RTDB (Instant & Permanent)
        push(ref(window.rtdb, 'PrivateChats/' + chatId), {
            senderUid: window.localUser.uid,
            senderName: senderName,
            text: messageText,
            timestamp: Date.now()
        });
    } 
    else {
        // WORLD / TEAM CHAT goes through Socket (for temporary fast chat)
        if (window.socket) {
            window.socket.emit('chatMessage', {
                sender: senderName,
                message: messageText,
                channel: window.currentChatChannel
            });
        }
    }
};

window.initChatSystem = function() {
    if (window.socket) {
        window.socket.off('receiveChat'); 
        window.socket.on('receiveChat', (data) => {
            const box = document.getElementById('active-chat-box');
            if(!box || data.channel === 'dm') return; // DMs are handled by RTDB directly

            if (data.channel === window.currentChatChannel) {
                const p = document.createElement('p');
                p.style.margin = "4px 0";
                p.style.fontSize = "12px";
                p.innerHTML = `<b style="color: #38bdf8;">${data.sender}:</b> ${data.message}`;
                box.appendChild(p);
                box.scrollTop = box.scrollHeight;
            }
        });
    }
};


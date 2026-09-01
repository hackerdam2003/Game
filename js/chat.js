// js/chat.js
import { doc, getDoc, setDoc, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("💬 [Chat] Permanent Offline/Online DM Module Loaded!");

window.currentChatChannel = 'world';
window.currentChatTarget = null; 
window.currentChatTargetName = "";
window.unsubscribeDM = null; // Chat listener ko handle karne ke liye

window.switchChatTab = async function(type, el) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    const chatBox = document.getElementById('active-chat-box');
    window.currentChatChannel = type;
    window.currentChatTarget = null; 
    if (window.unsubscribeDM) window.unsubscribeDM(); // Purani chat band karo
    
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
                        introMsg.innerText = "Select a friend to start chatting:";
                        
                        friends.forEach(async (friendUid) => {
                            const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                            if (fSnap.exists()) {
                                const fData = fSnap.data();
                                const name = fData.gameName || fData.name || 'Racer';
                                
                                const isOnline = window.onlineUserUids && window.onlineUserUids.includes(friendUid);
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
            } catch(e) {
                introMsg.innerText = "Failed to load friends.";
            }
        }
    }
};

window.closePrivateChat = function() {
    if (window.unsubscribeDM) window.unsubscribeDM();
    window.switchChatTab('dm', document.querySelectorAll('.chat-tab')[2]);
};

window.openPrivateChat = function(friendUid, friendName) {
    window.currentChatTarget = friendUid;
    window.currentChatTargetName = friendName;
    window.currentChatChannel = 'dm';
    
    const isOnline = window.onlineUserUids && window.onlineUserUids.includes(friendUid);
    const statusTxt = isOnline ? `<span style="color:#10b981;">Online</span>` : `<span style="color:#64748b;">Offline</span>`;

    const chatBox = document.getElementById('active-chat-box');
    chatBox.innerHTML = `
        <div style="background: #334155; padding: 5px 10px; border-radius: 4px; margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #f1f5f9; font-size: 11px; font-weight:bold;">Chatting with: ${friendName} (${statusTxt})</span>
            <button onclick="closePrivateChat()" style="background:transparent; border:none; color:#ef4444; font-size:10px; cursor:pointer;">✖ Back</button>
        </div>
        <div id="dm-message-list" style="display:flex; flex-direction:column; gap:6px; overflow-y:auto; max-height:220px; padding-bottom:10px;"></div>
    `;

    // 🛑 DATABASE SE REAL-TIME CHAT LOAD KARNA (WhatsApp Style)
    const uid1 = window.localUser.uid;
    const uid2 = friendUid;
    const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

    if (window.unsubscribeDM) window.unsubscribeDM();
    
    window.unsubscribeDM = onSnapshot(doc(window.db, "Chats", chatId), (docSnap) => {
        const list = document.getElementById('dm-message-list');
        if (!list) return;
        
        list.innerHTML = ''; // Clear purani list
        if (docSnap.exists()) {
            const messages = docSnap.data().messages || [];
            messages.forEach(msg => {
                if (msg.senderUid === window.localUser.uid) {
                    list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:right;"><span style="background:#3b82f6; color:white; padding:6px 10px; border-radius:8px 0 8px 8px; display:inline-block;">${msg.text}</span></p>`;
                } else {
                    list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:left;"><span style="background:#1e293b; color:white; padding:6px 10px; border-radius:0 8px 8px 8px; display:inline-block; border: 1px solid #334155;"><b>${msg.senderName}:</b> ${msg.text}</span></p>`;
                }
            });
            chatBox.scrollTop = chatBox.scrollHeight; // Auto scroll niche
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
    input.value = ''; // UI turant clean

    // 🛑 AGAR DM HAI TOH SEEDHA DATABASE ME SAVE KARO (Offline delivery works!)
    if (window.currentChatChannel === 'dm') {
        if (!window.currentChatTarget) return;

        const uid1 = window.localUser.uid;
        const uid2 = window.currentChatTarget;
        const chatId = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

        const newMsg = {
            senderUid: window.localUser.uid,
            senderName: senderName,
            text: messageText,
            timestamp: Date.now()
        };

        const chatRef = doc(window.db, "Chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
            await setDoc(chatRef, { messages: [newMsg] });
        } else {
            await updateDoc(chatRef, { messages: arrayUnion(newMsg) });
        }
    } 
    // 🛑 AGAR WORLD/TEAM CHAT HAI TOH SOCKET USE KARO
    else {
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
            if(!box || data.channel === 'dm') return; // DMs are handled by database now

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


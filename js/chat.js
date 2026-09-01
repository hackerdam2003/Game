// js/chat.js
console.log("💬 [Chat] Private DM Module Loaded!");

window.currentChatChannel = 'world';
window.currentChatTarget = null; 
window.currentChatTargetName = "";

window.switchChatTab = async function(type, el) {
    document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    
    const chatBox = document.getElementById('active-chat-box');
    window.currentChatChannel = type;
    window.currentChatTarget = null; // Reset target on tab switch
    
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
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
                const myDocSnap = await getDoc(doc(window.db, "Users", window.localUser.uid));
                
                if (myDocSnap.exists()) {
                    const friends = myDocSnap.data().friendsList || [];
                    if (friends.length === 0) {
                        introMsg.innerText = "You have no friends added yet. Add friends from the Global list!";
                    } else {
                        introMsg.innerText = "Select a friend to start chatting:";
                        
                        friends.forEach(async (friendUid) => {
                            const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                            if (fSnap.exists()) {
                                const fData = fSnap.data();
                                const name = fData.gameName || fData.name || 'Racer';
                                
                                chatBox.innerHTML += `
                                    <div style="background: #1e293b; padding: 8px 12px; border-radius: 6px; margin-top: 6px; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
                                         onclick="openPrivateChat('${friendUid}', '${name}')">
                                        <span style="color: #f1f5f9; font-size: 12px;">👤 ${name}</span>
                                        <button style="background: #3b82f6; border: none; color: white; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">Chat</button>
                                    </div>
                                `;
                            }
                        });
                    }
                }
            } catch(e) {
                introMsg.innerText = "Failed to load friends.";
                console.error(e);
            }
        }
    }
};

// 🛑 NAYA FUNCTION: Dost par click karne se Private Chat UI open hoga
window.openPrivateChat = function(friendUid, friendName) {
    window.currentChatTarget = friendUid;
    window.currentChatTargetName = friendName;
    window.currentChatChannel = 'dm';
    
    const chatBox = document.getElementById('active-chat-box');
    chatBox.innerHTML = `
        <div style="background: #334155; padding: 5px 10px; border-radius: 4px; margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="color: #f1f5f9; font-size: 11px; font-weight:bold;">Chatting with: ${friendName}</span>
            <button onclick="switchChatTab('dm', document.querySelectorAll('.chat-tab')[2])" style="background:transparent; border:none; color:#ef4444; font-size:10px; cursor:pointer;">✖ Back</button>
        </div>
        <div id="dm-message-list" style="display:flex; flex-direction:column; gap:4px;"></div>
    `;
};

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    if(!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    const senderName = window.myProfileData ? window.myProfileData.gameName : "Racer";

    // Agar DM mode me hai par koi dost select nahi kiya, toh roko
    if (window.currentChatChannel === 'dm' && !window.currentChatTarget) {
        alert("Please select a friend from the list first!");
        return;
    }

    if (window.socket) {
        window.socket.emit('chatMessage', {
            sender: senderName,
            senderUid: window.localUser.uid, 
            message: messageText,
            channel: window.currentChatChannel,
            targetUid: window.currentChatTarget // Server ko batao kisko bhejna hai
        });
        
        // Khud ka bheja hua message khud ki screen par turant dikhao (Right Side)
        if (window.currentChatChannel === 'dm') {
            const list = document.getElementById('dm-message-list');
            if(list) {
                list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:right;"><span style="background:#3b82f6; color:white; padding:4px 8px; border-radius:8px 0 8px 8px; display:inline-block;">${messageText}</span></p>`;
                const box = document.getElementById('active-chat-box');
                box.scrollTop = box.scrollHeight;
            }
        }
    }
    input.value = '';
};

// MASTER INITIALIZER
window.initChatSystem = function() {
    if (window.socket) {
        window.socket.off('receiveChat'); 
        
        window.socket.on('receiveChat', (data) => {
            const box = document.getElementById('active-chat-box');
            if(!box) return;

            // 🛑 PRIVATE DM HANDLING (Left Side)
            if (data.channel === 'dm') {
                // Agar hum usi dost ki chat me baithe hain, tabhi message print karo
                if (window.currentChatChannel === 'dm' && window.currentChatTarget === data.senderUid) {
                    const list = document.getElementById('dm-message-list');
                    if(list) {
                        list.innerHTML += `<p style="margin: 0; font-size: 12px; text-align:left;"><span style="background:#1e293b; color:white; padding:4px 8px; border-radius:0 8px 8px 8px; display:inline-block; border: 1px solid #334155;"><b>${data.sender}:</b> ${data.message}</span></p>`;
                        box.scrollTop = box.scrollHeight;
                    }
                }
                return;
            }

            // World / Team Chat Handling
            if (data.channel === window.currentChatChannel) {
                const p = document.createElement('p');
                p.style.margin = "4px 0";
                p.style.fontSize = "12px";
                p.innerHTML = `<b style="color: #38bdf8;">${data.sender}:</b> ${data.message}`;
                box.appendChild(p);
                box.scrollTop = box.scrollHeight;
            }
        });
        console.log("✅ Private Chat System Successfully Bound to Socket!");
    } else {
        console.error("❌ Chat System Failed: Socket not found.");
    }
};

// js/lobby.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./firebase-config.js"; // Aapka single unified DB

console.log("🏠 Lobby Main Module Loaded!");

// Global variables set kar rahe hain taaki friends.js aur chat.js iska use kar sakein
window.db = db;
window.socket = io(); // Real-time server se connection
window.localUser = null;
window.myProfileData = null;

// UI Elements
const playerNameEl = document.getElementById("player-name");
const playerCoinsEl = document.getElementById("player-coins");
const mainCharName = document.getElementById("main-char-name");
const mainCharInfo = document.getElementById("main-char-info");
const mainAvatarIcon = document.getElementById("main-avatar-icon");
const gpsStatusText = document.getElementById("gps-status-text");
const startMatchBtn = document.getElementById("start-match-btn");

// ==========================================
// 1. Check Login & Load Database Profile
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.localUser = user;
        try {
            const docSnap = await getDoc(doc(db, "Users", user.uid));
            if (docSnap.exists()) {
                window.myProfileData = docSnap.data();
                
                // Update Top HUD
                playerNameEl.innerText = `${window.myProfileData.gameName} (${window.myProfileData.playerTag})`;
                playerCoinsEl.innerText = `${window.myProfileData.wallet_balance || 0} 🪙`;
                
                // Update Center Party Stage Host Card
                mainCharName.innerText = window.myProfileData.gameName;
                mainCharInfo.innerText = `${window.myProfileData.gender} • Age: ${window.myProfileData.age}`;
                mainAvatarIcon.innerText = window.myProfileData.gender === 'Girl' ? '👧' : '👦';

                // Tell the Socket Server who we are (Taaki Matchmaker use kar sake)
                window.socket.emit('registerPlayer', {
                    uid: user.uid,
                    gameName: window.myProfileData.gameName,
                    gender: window.myProfileData.gender,
                    age: window.myProfileData.age,
                    location: window.myProfileData.location
                });
            } else {
                window.location.href = "profile.html";
            }
        } catch (err) {
            console.error("Profile load error", err);
        }
    } else {
        window.location.href = "index.html";
    }
});

// ==========================================
// 2. REAL-TIME SOCKET.IO MATCHMAKING
// ==========================================
if (startMatchBtn) {
    startMatchBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            gpsStatusText.innerText = "📍 Requesting GPS Location...";
            gpsStatusText.style.color = "#fbbf24";

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    gpsStatusText.innerText = `✅ GPS Locked! Finding 1:1 Match...`;
                    gpsStatusText.style.color = "#10b981";
                    startMatchBtn.innerText = "Searching Server...";
                    startMatchBtn.disabled = true;
                    
                    // Naya Tarika: Server ko request bhejo (matchmaker.js handle karega)
                    window.socket.emit('startMatchmaking', {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    gpsStatusText.innerText = "❌ GPS Permission Denied!";
                    gpsStatusText.style.color = "#ef4444";
                    alert("Please allow Location permission to search nearby players!");
                }
            );
        } else {
            alert("GPS not supported on your browser.");
        }
    });
}

// 🚀 Jab backend ka `matchmaker.js` room banakar signal bhejega
window.socket.on('matchFound', (data) => {
    gpsStatusText.innerText = `🚀 Match Found! Connecting...`;
    gpsStatusText.style.color = "#3b82f6";
    setTimeout(() => {
        // Redirect to Game Arena with Room ID and Host Status
        window.location.href = `game.html?roomId=${data.matchId}&isHost=${data.isHost}`;
    }, 1000);
});

// ==========================================
// 3. UI CONTROLS (Drawers & Modals)
// ==========================================
const setupDrawer = (btnId, drawerId, closeId) => {
    const btn = document.getElementById(btnId);
    const drawer = document.getElementById(drawerId);
    const closeBtn = document.getElementById(closeId);
    if(btn && drawer && closeBtn) {
        btn.addEventListener('click', () => drawer.classList.add('open'));
        closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }
};

setupDrawer('btn-chat', 'chat-drawer', 'close-chat');
setupDrawer('btn-friends', 'friends-drawer', 'close-friends');
setupDrawer('btn-party-create', 'party-drawer', 'close-party');

// Show My Own Profile
window.showMyProfile = function() {
    if (!window.myProfileData || !window.localUser) return;
    window.openUserProfile(
        window.myProfileData.gameName, 
        window.myProfileData.age, 
        window.myProfileData.location || "India, CG", 
        window.myProfileData.gender, 
        window.myProfileData.playerTag || "--------", 
        window.localUser.uid, 
        true
    );
};

// Universal Profile Viewer Modal
window.openUserProfile = function(name, age, location, gender, uidTag, targetUid, isSelf = false) {
    window.activeTargetUid = targetUid;
    document.getElementById('modal-gamename').innerText = name;
    document.getElementById('modal-realname').innerText = isSelf ? `UID: ${uidTag} (You)` : `Real Identity Verified`;
    document.getElementById('modal-uid').innerText = uidTag;
    document.getElementById('modal-age').innerText = age;
    document.getElementById('modal-location').innerText = location;
    document.getElementById('modal-gender').innerText = gender;
    document.getElementById('modal-avatar').innerText = gender === 'Girl' ? '👧' : '👦';
    
    const actionsWrapper = document.getElementById('modal-actions-wrapper');
    actionsWrapper.innerHTML = '';
    
    if (!isSelf) {
        actionsWrapper.innerHTML = `
            <button class="modal-action-btn" onclick="window.sendFriendReq('${targetUid}', '${name}')">Send Friend Request</button>
            <button class="modal-team-btn" onclick="alert('Party invite coming soon!')">Team Join Request</button>
        `;
    }

    document.getElementById('profile-modal').style.display = 'flex';
};

window.closeProfileModal = function() {
    document.getElementById('profile-modal').style.display = 'none';
};

window.copyUID = function() {
    const uidText = document.getElementById('modal-uid').innerText;
    if (uidText && uidText !== '--') {
        navigator.clipboard.writeText(uidText).then(() => {
            alert("📋 UID Copied: " + uidText);
        });
    }
};


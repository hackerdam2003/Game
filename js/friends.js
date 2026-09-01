// js/friends.js
import { collection, query, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("👥 [Friends] True Status Module Loaded!");

let unsubscribeFriends = null;
window.onlineUserUids = window.onlineUserUids || [];

// Socket dwara online users ki list update karna
if (window.socket) {
    window.socket.on('updateOnlineUsers', (uids) => {
        window.onlineUserUids = uids;
        if (window.loadGlobalPlayers) window.loadGlobalPlayers();
        if (window.loadMyFriendsData) window.loadMyFriendsData(); // Update badges in friends list too
    });
}

// 1. GLOBAL LIVE PLAYERS
window.loadGlobalPlayers = function() {
    const container = document.getElementById('global-live-players-container');
    if (!container || !window.db) return;
    
    container.innerHTML = '<p style="color: #64748b; font-size: 11px;">Scanning Global Server...</p>';
    
    try {
        const q = query(collection(window.db, "Users"), limit(15));
        
        onSnapshot(q, (querySnapshot) => {
            container.innerHTML = '';
            let count = 0;
            const seenUids = new Set();

            querySnapshot.forEach((docSnap) => {
                const targetUid = docSnap.id;
                if (!window.localUser || targetUid === window.localUser.uid || seenUids.has(targetUid)) return;
                
                seenUids.add(targetUid);
                count++;
                
                const data = docSnap.data();
                const name = data.gameName || data.name || 'Racer';
                const icon = data.gender === 'Girl' ? '👧' : '👦';
                const location = data.location || 'India';
                const tag = data.playerTag || 'Old-Account'; // Changed from 00000000
                const age = data.age || 20;

                const isOnline = window.onlineUserUids.includes(targetUid);
                const badgeHtml = isOnline 
                    ? '<span class="live-badge" style="background: #10b981;">Online</span>' 
                    : '<span class="live-badge" style="background: #64748b;">Offline</span>';
                
                container.innerHTML += `
                    <div class="list-card-item" onclick="openUserProfile('${name}', '${age}', '${location}', '${data.gender}', '${tag}', '${targetUid}', false)">
                        <span style="font-size: 12px; color: #f1f5f9;">${icon} ${name} ${badgeHtml}</span>
                        <button class="action-btn-small" onclick="event.stopPropagation(); sendFriendReq('${targetUid}', '${name}')">Add</button>
                    </div>
                `;
            });

            if (count === 0) {
                container.innerHTML = '<p style="color: #64748b; font-size: 11px;">No players found.</p>';
            }
        });
    } catch(e) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 11px;">Error loading players.</p>';
    }
};

// 2. MY FRIENDS & REQUESTS
window.loadMyFriendsData = function() {
    if (!window.localUser || !window.db) return;

    if (unsubscribeFriends) unsubscribeFriends();

    const reqContainer = document.getElementById('incoming-requests-container');
    const friendsContainer = document.getElementById('friends-list-container');

    unsubscribeFriends = onSnapshot(doc(window.db, "Users", window.localUser.uid), async (myDocSnap) => {
        if (!myDocSnap.exists()) return;

        const myData = myDocSnap.data();
        const requests = myData.incomingRequests || [];
        const friends = myData.friendsList || [];

        // --- Render Incoming Requests ---
        if (reqContainer) {
            reqContainer.innerHTML = '';
            if (requests.length === 0) {
                reqContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No pending requests.</p>';
            } else {
                for (let reqUid of requests) {
                    try {
                        const reqSnap = await getDoc(doc(window.db, "Users", reqUid));
                        if (reqSnap.exists()) {
                            const reqData = reqSnap.data();
                            const icon = reqData.gender === 'Girl' ? '👧' : '👦';
                            const name = reqData.gameName || reqData.name || 'Racer';
                            const tag = reqData.playerTag || 'Old-Account';
                            const loc = reqData.location || 'India';
                            const age = reqData.age || 20;

                            // 🛑 FIX: Added onclick to open profile from requests!
                            reqContainer.innerHTML += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${age}', '${loc}', '${reqData.gender || 'Boy'}', '${tag}', '${reqUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">${icon} ${name}</span>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="action-btn-small" style="background: #10b981;" onclick="event.stopPropagation(); acceptFriend('${reqUid}')">✔</button>
                                        <button class="action-btn-small" style="background: #ef4444;" onclick="event.stopPropagation(); rejectFriend('${reqUid}')">✖</button>
                                    </div>
                                </div>
                            `;
                        }
                    } catch(e) { console.error(e); }
                }
            }
        }

        // --- Render Friends List ---
        if (friendsContainer) {
            friendsContainer.innerHTML = '';
            if (friends.length === 0) {
                friendsContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No friends added yet.</p>';
            } else {
                for (let friendUid of friends) {
                    try {
                        const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                        if (fSnap.exists()) {
                            const fData = fSnap.data();
                            const icon = fData.gender === 'Girl' ? '👧' : '👦';
                            const name = fData.gameName || fData.name || 'Racer';
                            const tag = fData.playerTag || 'Old-Account';
                            const loc = fData.location || 'India';
                            const age = fData.age || 20;
                            
                            const isOnline = window.onlineUserUids.includes(friendUid);
                            const badgeHtml = isOnline 
                                ? '<span class="live-badge" style="background: #10b981;">Online</span>' 
                                : '<span class="live-badge" style="background: #64748b;">Offline</span>';

                            friendsContainer.innerHTML += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${age}', '${loc}', '${fData.gender}', '${tag}', '${friendUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">${icon} ${name} ${badgeHtml}</span>
                                    <button class="action-btn-small" style="background: #8b5cf6;" onclick="event.stopPropagation(); inviteToTeam('${friendUid}')">Invite</button>
                                </div>
                            `;
                        }
                    } catch(e) { console.error(e); }
                }
            }
        }
    });
};

// ACTIONS
window.sendFriendReq = async function(targetUid, targetName) {
    if (!window.localUser) return;
    try {
        const targetRef = doc(window.db, "Users", targetUid);
        await updateDoc(targetRef, { incomingRequests: arrayUnion(window.localUser.uid) });
        alert(`✅ Friend request sent to ${targetName}!`);
        if(window.closeProfileModal) window.closeProfileModal();
    } catch (err) { alert("❌ Failed to send request."); }
};

window.acceptFriend = async function(targetUid) {
    if (!window.localUser) return;
    try {
        const myRef = doc(window.db, "Users", window.localUser.uid);
        const targetRef = doc(window.db, "Users", targetUid);
        await updateDoc(myRef, { incomingRequests: arrayRemove(targetUid), friendsList: arrayUnion(targetUid) });
        await updateDoc(targetRef, { friendsList: arrayUnion(window.localUser.uid) });
    } catch (e) {}
};

window.rejectFriend = async function(targetUid) {
    if (!window.localUser) return;
    try {
        const myRef = doc(window.db, "Users", window.localUser.uid);
        await updateDoc(myRef, { incomingRequests: arrayRemove(targetUid) });
    } catch (e) {}
};

window.inviteToTeam = function(targetUid) {
    alert("🚀 Party invite sent to friend!");
};

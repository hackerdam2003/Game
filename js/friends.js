// js/friends.js
import { collection, query, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("👥 [Friends] HotFake Status Module Loaded!");

window.userStatuses = {};

window.initFriendsSystem = function() {
    if (window.rtdb) {
        // Hamesha track karega kaun sach me online hai
        onValue(ref(window.rtdb, 'status'), (snap) => {
            window.userStatuses = snap.val() || {};
            if (window.loadGlobalPlayers) window.loadGlobalPlayers();
            if (window.loadMyFriendsData) window.loadMyFriendsData(); 
        });
    }
};

window.loadGlobalPlayers = function() {
    const container = document.getElementById('global-live-players-container');
    if (!container || !window.db) return;
    
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
                
                // 🛑 READ TRUE STATUS
                const statusObj = window.userStatuses[targetUid];
                const isOnline = statusObj && statusObj.state === 'online';
                const badgeHtml = isOnline ? '<span class="live-badge" style="background: #10b981;">Online</span>' : '<span class="live-badge" style="background: #64748b;">Offline</span>';
                
                container.innerHTML += `
                    <div class="list-card-item" onclick="openUserProfile('${name}', '${data.age}', '${data.location}', '${data.gender}', '${data.playerTag}', '${targetUid}', false)">
                        <span style="font-size: 12px; color: #f1f5f9;">${icon} ${name} ${badgeHtml}</span>
                        <button class="action-btn-small" onclick="event.stopPropagation(); sendFriendReq('${targetUid}', '${name}')">Add</button>
                    </div>
                `;
            });
            if (count === 0) container.innerHTML = '<p style="color: #64748b; font-size: 11px;">No players found.</p>';
        });
    } catch(e) { console.error(e); }
};

window.loadMyFriendsData = function() {
    if (!window.localUser || !window.db) return;
    const reqContainer = document.getElementById('incoming-requests-container');
    const friendsContainer = document.getElementById('friends-list-container');

    onSnapshot(doc(window.db, "Users", window.localUser.uid), async (myDocSnap) => {
        if (!myDocSnap.exists()) return;
        const myData = myDocSnap.data();
        const requests = myData.incomingRequests || [];
        const friends = myData.friendsList || [];

        if (reqContainer) {
            reqContainer.innerHTML = '';
            if (requests.length === 0) reqContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No pending requests.</p>';
            else {
                for (let reqUid of requests) {
                    try {
                        const reqSnap = await getDoc(doc(window.db, "Users", reqUid));
                        if (reqSnap.exists()) {
                            const reqData = reqSnap.data();
                            const name = reqData.gameName || reqData.name || 'Racer';
                            reqContainer.innerHTML += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${reqData.age}', '${reqData.location}', '${reqData.gender}', '${reqData.playerTag}', '${reqUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">👦 ${name}</span>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="action-btn-small" style="background: #10b981;" onclick="event.stopPropagation(); acceptFriend('${reqUid}')">✔</button>
                                        <button class="action-btn-small" style="background: #ef4444;" onclick="event.stopPropagation(); rejectFriend('${reqUid}')">✖</button>
                                    </div>
                                </div>
                            `;
                        }
                    } catch(e) {}
                }
            }
        }

        if (friendsContainer) {
            friendsContainer.innerHTML = '';
            if (friends.length === 0) friendsContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No friends added yet.</p>';
            else {
                for (let friendUid of friends) {
                    try {
                        const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                        if (fSnap.exists()) {
                            const fData = fSnap.data();
                            const name = fData.gameName || fData.name || 'Racer';
                            
                            // 🛑 READ TRUE STATUS FOR FRIENDS
                            const statusObj = window.userStatuses[friendUid];
                            const isOnline = statusObj && statusObj.state === 'online';
                            const badgeHtml = isOnline ? '<span class="live-badge" style="background: #10b981;">Online</span>' : '<span class="live-badge" style="background: #64748b;">Offline</span>';
                            
                            friendsContainer.innerHTML += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${fData.age}', '${fData.location}', '${fData.gender}', '${fData.playerTag}', '${friendUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">👦 ${name} ${badgeHtml}</span>
                                    <button class="action-btn-small" style="background: #8b5cf6;" onclick="event.stopPropagation(); inviteToTeam('${friendUid}')">Invite</button>
                                </div>
                            `;
                        }
                    } catch(e) {}
                }
            }
        }
    });
};

window.sendFriendReq = async function(targetUid, targetName) {
    if (!window.localUser) return;
    try {
        await updateDoc(doc(window.db, "Users", targetUid), { incomingRequests: arrayUnion(window.localUser.uid) });
        alert(`✅ Friend request sent to ${targetName}!`);
        if(window.closeProfileModal) window.closeProfileModal();
    } catch (err) {}
};

window.acceptFriend = async function(targetUid) {
    try {
        await updateDoc(doc(window.db, "Users", window.localUser.uid), { incomingRequests: arrayRemove(targetUid), friendsList: arrayUnion(targetUid) });
        await updateDoc(doc(window.db, "Users", targetUid), { friendsList: arrayUnion(window.localUser.uid) });
    } catch (e) {}
};

window.rejectFriend = async function(targetUid) {
    try { await updateDoc(doc(window.db, "Users", window.localUser.uid), { incomingRequests: arrayRemove(targetUid) }); } catch (e) {}
};

window.searchPlayerByUID = async function() {
    const tag = document.getElementById('search-uid-input').value.trim();
    if(!tag) return;
    try {
        const q = query(collection(window.db, "Users"), where("playerTag", "==", tag));
        const querySnapshot = await getDocs(q);
        if(querySnapshot.empty) { alert("Player not found!"); return; }
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(docSnap.id === window.localUser.uid) { alert("You cannot add yourself!"); return; }
            window.openUserProfile(data.gameName, data.age, data.location, data.gender, data.playerTag, docSnap.id, false);
        });
    } catch (err) { alert("Error: " + err.message); }
};

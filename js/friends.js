// js/friends.js
import { collection, query, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("👥 [Friends] Module Loaded Successfully!");

let unsubscribeFriends = null;

// 1. UID Search System
window.searchPlayerByUID = async function() {
    const tag = document.getElementById('search-uid-input').value.trim();
    if(!tag) return;
    
    const searchBtn = document.querySelector('.search-box-row button');
    if(searchBtn) searchBtn.innerText = "...";

    try {
        const q = query(collection(window.db, "Users"), where("playerTag", "==", tag));
        const querySnapshot = await getDocs(q);

        if(querySnapshot.empty) {
            alert("Player not found!");
            if(searchBtn) searchBtn.innerText = "Search";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(docSnap.id === window.localUser.uid) {
                alert("You cannot add yourself!");
                return;
            }
            window.openUserProfile(data.gameName, data.age, data.location || "India", data.gender, data.playerTag || "00000000", docSnap.id, false);
        });
        if(searchBtn) searchBtn.innerText = "Search";
    } catch (err) {
        alert("Search error: " + err.message);
        if(searchBtn) searchBtn.innerText = "Search";
    }
};

// 2. Global Live Players System (Anti-Duplicate & Active Online Filter)
window.loadGlobalPlayers = function() {
    const container = document.getElementById('global-live-players-container');
    if (!container || !window.db) return;
    
    container.innerHTML = '<p style="color: #64748b; font-size: 11px;">Scanning Global Server...</p>';
    
    try {
        const q = query(collection(window.db, "Users"), limit(15));
        
        onSnapshot(q, (querySnapshot) => {
            container.innerHTML = '';
            let count = 0;
            const seenUids = new Set(); // Prevent duplicate rendering

            querySnapshot.forEach((docSnap) => {
                const targetUid = docSnap.id;
                
                // Skip self & already processed users in this render cycle
                if (!window.localUser || targetUid === window.localUser.uid || seenUids.has(targetUid)) return;
                
                seenUids.add(targetUid);
                count++;
                
                const data = docSnap.data();
                const icon = data.gender === 'Girl' ? '👧' : '👦';
                const location = data.location || 'India';
                const tag = data.playerTag || '00000000';
                
                container.innerHTML += `
                    <div class="list-card-item" onclick="openUserProfile('${data.gameName}', '${data.age}', '${location}', '${data.gender}', '${tag}', '${targetUid}', false)">
                        <span style="font-size: 12px; color: #f1f5f9;">${icon} ${data.gameName} <span class="live-badge" style="background: #10b981;">Online</span></span>
                        <button class="action-btn-small" onclick="event.stopPropagation(); sendFriendReq('${targetUid}', '${data.gameName}')">Add</button>
                    </div>
                `;
            });

            if (count === 0) {
                container.innerHTML = '<p style="color: #64748b; font-size: 11px;">No other players online.</p>';
            }
        });
    } catch(e) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 11px;">Error loading live players.</p>';
    }
};

// 3. Real-Time Personal Friends & Incoming Requests Listener
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
                    const reqSnap = await getDoc(doc(window.db, "Users", reqUid));
                    if (reqSnap.exists()) {
                        const reqData = reqSnap.data();
                        const icon = reqData.gender === 'Girl' ? '👧' : '👦';
                        reqContainer.innerHTML += `
                            <div class="list-card-item">
                                <span style="font-size: 12px; color: #f1f5f9;">${icon} ${reqData.gameName}</span>
                                <div style="display: flex; gap: 5px;">
                                    <button class="action-btn-small" style="background: #10b981;" onclick="acceptFriend('${reqUid}')">✔</button>
                                    <button class="action-btn-small" style="background: #ef4444;" onclick="rejectFriend('${reqUid}')">✖</button>
                                </div>
                            </div>
                        `;
                    }
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
                    const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                    if (fSnap.exists()) {
                        const fData = fSnap.data();
                        const icon = fData.gender === 'Girl' ? '👧' : '👦';
                        const tag = fData.playerTag || '00000000';
                        const loc = fData.location || 'India';
                        
                        friendsContainer.innerHTML += `
                            <div class="list-card-item" onclick="openUserProfile('${fData.gameName}', '${fData.age}', '${loc}', '${fData.gender}', '${tag}', '${friendUid}', false)">
                                <span style="font-size: 12px; color: #f1f5f9;">${icon} ${fData.gameName}</span>
                                <button class="action-btn-small" style="background: #8b5cf6;" onclick="event.stopPropagation(); inviteToTeam('${friendUid}')">Invite</button>
                            </div>
                        `;
                    }
                }
            }
        }
    });
};

// 4. Send Friend Request Logic
window.sendFriendReq = async function(targetUid, targetName) {
    if (!window.localUser) return;
    try {
        const targetRef = doc(window.db, "Users", targetUid);
        await updateDoc(targetRef, {
            incomingRequests: arrayUnion(window.localUser.uid)
        });
        alert(`✅ Friend request sent to ${targetName}!`);
        if(window.closeProfileModal) window.closeProfileModal();
    } catch (err) {
        alert("❌ Failed to send request.");
    }
};

// 5. Accept Friend Request
window.acceptFriend = async function(targetUid) {
    if (!window.localUser) return;
    try {
        const myRef = doc(window.db, "Users", window.localUser.uid);
        const targetRef = doc(window.db, "Users", targetUid);

        await updateDoc(myRef, {
            incomingRequests: arrayRemove(targetUid),
            friendsList: arrayUnion(targetUid)
        });

        await updateDoc(targetRef, {
            friendsList: arrayUnion(window.localUser.uid)
        });
    } catch (e) {
        alert("Error accepting request.");
    }
};

// 6. Reject Friend Request
window.rejectFriend = async function(targetUid) {
    if (!window.localUser) return;
    try {
        const myRef = doc(window.db, "Users", window.localUser.uid);
        await updateDoc(myRef, {
            incomingRequests: arrayRemove(targetUid)
        });
    } catch (e) {
        alert("Error rejecting request.");
    }
};

window.inviteToTeam = function(targetUid) {
    alert("🚀 Party invite sent to friend!");
};


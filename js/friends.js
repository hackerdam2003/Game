// js/friends.js
import { collection, query, limit, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("👥 [Friends] Anti-Ghosting & Anti-Spam Module Loaded!");

window.userStatuses = {};
window.myFriendsList = []; 

// 🛑 GHOST LISTENER KILLERS
let unsubscribeGlobal = null; 
let unsubscribeFriends = null;

window.initFriendsSystem = function() {
    if (window.rtdb) {
        onValue(ref(window.rtdb, 'status'), (snap) => {
            window.userStatuses = snap.val() || {};
            // Refresh data safely when status changes
            if (window.loadGlobalPlayers) window.loadGlobalPlayers();
            if (window.loadMyFriendsData) window.loadMyFriendsData(); 
        });
    }
};

window.loadGlobalPlayers = function() {
    const container = document.getElementById('global-live-players-container');
    if (!container || !window.db) return;
    
    // 🛑 BUG FIX: Purane duplicate scanner ko hamesha kill karo
    if (unsubscribeGlobal) unsubscribeGlobal(); 
    
    try {
        const q = query(collection(window.db, "Users"), limit(25));
        unsubscribeGlobal = onSnapshot(q, (querySnapshot) => {
            let tempHtml = ''; // 🛑 UI Duplication rokne ke liye Temp String
            let count = 0;
            const seenUids = new Set();

            querySnapshot.forEach((docSnap) => {
                const targetUid = docSnap.id;
                
                if (!window.localUser || targetUid === window.localUser.uid || seenUids.has(targetUid)) return;

                const statusObj = window.userStatuses[targetUid];
                const isOnline = statusObj && statusObj.state === 'online';
                
                if (!isOnline) return; // Sirf online dikhaye

                seenUids.add(targetUid);
                count++;
                
                const data = docSnap.data();
                const name = data.gameName || data.name || 'Racer';
                const icon = data.gender === 'Girl' ? '👧' : '👦';
                
                let buttonHtml = '';
                if (window.myFriendsList && window.myFriendsList.includes(targetUid)) {
                    buttonHtml = `<button class="action-btn-small" style="background: #475569; cursor: default;" onclick="event.stopPropagation();">Friend</button>`;
                } else {
                    buttonHtml = `<button class="action-btn-small" onclick="event.stopPropagation(); this.disabled=true; this.innerText='Sent'; this.style.background='#64748b'; sendFriendReq('${targetUid}', '${name}')">Add</button>`;
                }
                
                tempHtml += `
                    <div class="list-card-item" onclick="openUserProfile('${name}', '${data.age}', '${data.location}', '${data.gender}', '${data.playerTag}', '${targetUid}', false)">
                        <span style="font-size: 12px; color: #f1f5f9;">${icon} ${name} <span class="live-badge" style="background: #10b981;">Online</span></span>
                        ${buttonHtml}
                    </div>
                `;
            });

            if (count === 0) {
                container.innerHTML = '<p style="color: #64748b; font-size: 11px;">No other players are currently online.</p>';
            } else {
                container.innerHTML = tempHtml; // Ek sath screen par daalo, loop me nahi
            }
        });
    } catch(e) { console.error(e); }
};

window.loadMyFriendsData = function() {
    if (!window.localUser || !window.db) return;
    const reqContainer = document.getElementById('incoming-requests-container');
    const friendsContainer = document.getElementById('friends-list-container');

    // 🛑 BUG FIX: Purane Friend list scanner ko kill karo
    if (unsubscribeFriends) unsubscribeFriends(); 

    unsubscribeFriends = onSnapshot(doc(window.db, "Users", window.localUser.uid), async (myDocSnap) => {
        if (!myDocSnap.exists()) return;
        const myData = myDocSnap.data();
        
        const requests = [...new Set(myData.incomingRequests || [])];
        const friends = [...new Set(myData.friendsList || [])];
        window.myFriendsList = friends; 

        // -- RENDER REQUESTS --
        if (reqContainer) {
            if (requests.length === 0) {
                reqContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No pending requests.</p>';
            } else {
                let reqHtml = '';
                for (let reqUid of requests) {
                    try {
                        const reqSnap = await getDoc(doc(window.db, "Users", reqUid));
                        if (reqSnap.exists()) {
                            const reqData = reqSnap.data();
                            const name = reqData.gameName || reqData.name || 'Racer';
                            reqHtml += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${reqData.age}', '${reqData.location}', '${reqData.gender}', '${reqData.playerTag}', '${reqUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">👦 ${name}</span>
                                    <div style="display: flex; gap: 5px;">
                                        <button class="action-btn-small" style="background: #10b981;" onclick="event.stopPropagation(); this.disabled=true; this.style.opacity='0.5'; acceptFriend('${reqUid}')">✔</button>
                                        <button class="action-btn-small" style="background: #ef4444;" onclick="event.stopPropagation(); this.disabled=true; this.style.opacity='0.5'; rejectFriend('${reqUid}')">✖</button>
                                    </div>
                                </div>
                            `;
                        }
                    } catch(e) {}
                }
                reqContainer.innerHTML = reqHtml; // Ek sath load karega
            }
        }

        // -- RENDER FRIENDS --
        if (friendsContainer) {
            if (friends.length === 0) {
                friendsContainer.innerHTML = '<p style="color: #64748b; font-size: 11px;">No friends added yet.</p>';
            } else {
                let friendHtml = '';
                for (let friendUid of friends) {
                    try {
                        const fSnap = await getDoc(doc(window.db, "Users", friendUid));
                        if (fSnap.exists()) {
                            const fData = fSnap.data();
                            const name = fData.gameName || fData.name || 'Racer';
                            
                            const statusObj = window.userStatuses[friendUid];
                            const isOnline = statusObj && statusObj.state === 'online';
                            const badgeHtml = isOnline ? '<span class="live-badge" style="background: #10b981;">Online</span>' : '<span class="live-badge" style="background: #64748b;">Offline</span>';
                            
                            friendHtml += `
                                <div class="list-card-item" onclick="openUserProfile('${name}', '${fData.age}', '${fData.location}', '${fData.gender}', '${fData.playerTag}', '${friendUid}', false)">
                                    <span style="font-size: 12px; color: #f1f5f9;">👦 ${name} ${badgeHtml}</span>
                                    <button class="action-btn-small" style="background: #8b5cf6;" onclick="event.stopPropagation(); this.disabled=true; this.innerText='...'; inviteToTeam('${friendUid}')">Invite</button>
                                </div>
                            `;
                        }
                    } catch(e) {}
                }
                friendsContainer.innerHTML = friendHtml; // Ek sath load karega
            }
        }
    });
};

window.sendFriendReq = async function(targetUid, targetName) {
    if (!window.localUser) return;
    if (window.myFriendsList && window.myFriendsList.includes(targetUid)) {
        alert(`You are already friends with ${targetName}!`);
        return;
    }
    try {
        await updateDoc(doc(window.db, "Users", targetUid), { incomingRequests: arrayUnion(window.localUser.uid) });
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
    const searchBtn = document.querySelector('.search-box-row button');
    if(searchBtn) { searchBtn.disabled = true; searchBtn.innerText = "..."; }
    
    try {
        const q = query(collection(window.db, "Users"), where("playerTag", "==", tag));
        const querySnapshot = await getDocs(q);
        if(searchBtn) { searchBtn.disabled = false; searchBtn.innerText = "Search"; }
        
        if(querySnapshot.empty) { alert("Player not found!"); return; }
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(docSnap.id === window.localUser.uid) { alert("You cannot add yourself!"); return; }
            window.openUserProfile(data.gameName, data.age, data.location, data.gender, data.playerTag, docSnap.id, false);
        });
    } catch (err) { 
        alert("Error: " + err.message); 
        if(searchBtn) { searchBtn.disabled = false; searchBtn.innerText = "Search"; }
    }
};

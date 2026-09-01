// js/friends.js
import { collection, getDocs, query, where, limit, doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("👥 Friends Module Linked Safely!");

// 1. UID Search System
window.searchPlayerByUID = async function() {
    const tag = document.getElementById('search-uid-input').value.trim();
    if(!tag) return;
    
    const searchBtn = document.querySelector('.search-box-row button');
    searchBtn.innerText = "...";

    try {
        // window.db is passed safely from lobby.html
        const q = query(collection(window.db, "Users"), where("playerTag", "==", tag));
        const querySnapshot = await getDocs(q);

        if(querySnapshot.empty) {
            alert("Player not found!");
            searchBtn.innerText = "Search";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if(docSnap.id === window.localUser.uid) {
                alert("You cannot add yourself!");
                return;
            }
            window.openUserProfile(data.gameName, data.age, data.location || "India", data.gender, data.playerTag, docSnap.id);
        });
        searchBtn.innerText = "Search";
    } catch (err) {
        alert("Search error: " + err.message);
        searchBtn.innerText = "Search";
    }
};

// 2. Global Live Players System
window.loadGlobalPlayers = async function() {
    const container = document.getElementById('friends-list-container');
    if (!container) return;
    
    container.innerHTML = '<p style="color: #64748b; font-size: 11px;">Scanning Global Server...</p>';
    
    try {
        const q = query(collection(window.db, "Users"), limit(10));
        const querySnapshot = await getDocs(q);
        container.innerHTML = '';
        
        querySnapshot.forEach((docSnap) => {
            if (docSnap.id === window.localUser.uid) return;
            const data = docSnap.data();
            const icon = data.gender === 'Girl' ? '👧' : '👦';
            
            container.innerHTML += `
                <div class="list-card-item" onclick="openUserProfile('${data.gameName}', '${data.age}', 'India', '${data.gender}', '${data.playerTag}', '${docSnap.id}')">
                    <span style="font-size: 12px;">${icon} ${data.gameName}</span>
                    <button class="action-btn-small" onclick="event.stopPropagation(); sendFriendReq('${docSnap.id}', '${data.gameName}')">Add</button>
                </div>
            `;
        });
    } catch(e) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 11px;">Error loading players.</p>';
    }
};

// 3. Send Friend Request Logic
window.sendFriendReq = async function(targetUid, targetName) {
    try {
        const targetRef = doc(window.db, "Users", targetUid);
        await updateDoc(targetRef, {
            incomingRequests: arrayUnion(window.localUser.uid)
        });
        alert(`Friend request sent to ${targetName}!`);
        if(window.closeProfileModal) window.closeProfileModal();
    } catch (err) {
        alert("Failed to send request.");
    }
};

// Trigger Global Load when clicking Friends button
document.getElementById('btn-friends').addEventListener('click', () => {
    window.loadGlobalPlayers();
});

// js/friends.js
import { collection, getDocs, query, limit, doc, updateDoc, arrayUnion, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log("👥 Friends Module Linked Safely!");

// 1. UID Search System
window.searchPlayerByUID = async function() {
    const tag = document.getElementById('search-uid-input').value.trim();
    if(!tag) return;
    
    const searchBtn = document.querySelector('.search-box-row button');
    searchBtn.innerText = "...";

    try {
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
                searchBtn.innerText = "Search";
                return;
            }
            window.openUserProfile(data.gameName, data.age, data.location || "India", data.gender, data.playerTag || "00000000", docSnap.id, false);
        });
        searchBtn.innerText = "Search";
    } catch (err) {
        alert("Search error: " + err.message);
        searchBtn.innerText = "Search";
    }
};

// 2. Global Live Players System
window.loadGlobalPlayers = async function() {
    const container = document.getElementById('global-live-players-container');
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
            const location = data.location || 'India';
            const tag = data.playerTag || '00000000';
            
            container.innerHTML += `
                <div class="list-card-item" onclick="openUserProfile('${data.gameName}', '${data.age}', '${location}', '${data.gender}', '${tag}', '${docSnap.id}', false)">
                    <span style="font-size: 12px; color: #f1f5f9;">${icon} ${data.gameName} <span class="live-badge" style="background: #ef4444; color: white; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Live</span></span>
                    <button class="action-btn-small" onclick="event.stopPropagation(); sendFriendReq('${docSnap.id}', '${data.gameName}')">Add</button>
                </div>
            `;
        });

        if (container.innerHTML === '') {
            container.innerHTML = '<p style="color: #64748b; font-size: 11px;">No other players online.</p>';
        }
    } catch(e) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 11px;">Error loading live players.</p>';
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
const btnFriends = document.getElementById('btn-friends');
if (btnFriends) {
    btnFriends.addEventListener('click', () => {
        window.loadGlobalPlayers();
    });
}

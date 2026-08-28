// js/lobby.js
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Dono DB import karein
import { auth, bankDB, engineDB } from "./firebase-config.js";

// UI Elements (lobby.html se connect)
const playerNameEl = document.getElementById("playerName");
const playerWalletEl = document.getElementById("playerWallet");
const createRoomBtn = document.getElementById("createRoomBtn");
const roomsListEl = document.getElementById("roomsList");

let currentUser = null;
let currentUserName = "Racer";

// ==========================================
// 1. Check Login & Load Wallet from HFC Bank
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        currentUserName = user.displayName || "Racer";
        
        // HFC Bank se player ka wallet data nikaalo
        const userRef = doc(bankDB, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            if(playerNameEl) playerNameEl.innerText = `👤 ${userData.gameName || currentUserName}`;
            if(playerWalletEl) playerWalletEl.innerText = `🪙 ${userData.wallet_balance || 0}`;
        }
    } else {
        // Agar login nahi hai toh wapas index.html (Login page) par bhej do
        window.location.href = "index.html";
    }
});

// ==========================================
// 2. Fetch Active Rooms from Racing Engine
// ==========================================
if (roomsListEl) {
    const roomsCollectionRef = collection(engineDB, "GameRooms");

    // onSnapshot real-time data lata hai bina page refresh kiye
    onSnapshot(roomsCollectionRef, (snapshot) => {
        roomsListEl.innerHTML = ""; // Purani list saaf karein
        let hasRooms = false;

        snapshot.forEach((docSnap) => {
            const roomData = docSnap.data();
            // Sirf 'waiting' wale rooms dikhayein jo abhi start nahi hue
            if (roomData.status === "waiting") {
                hasRooms = true;
                const li = document.createElement("li");
                li.className = "room-item";
                li.innerHTML = `
                    <span>🏁 Room ID: ${docSnap.id.substring(0, 5).toUpperCase()}... (Host: ${roomData.hostName})</span>
                    <button class="join-btn" onclick="joinRoom('${docSnap.id}')">Join Race</button>
                `;
                roomsListEl.appendChild(li);
            }
        });

        if (!hasRooms) {
            roomsListEl.innerHTML = "<li>No active rooms available. Create a new one!</li>";
        }
    });
}

// ==========================================
// 3. Create New Game Room (In Racing Engine)
// ==========================================
if (createRoomBtn) {
    createRoomBtn.addEventListener("click", async () => {
        if (!currentUser) {
            alert("Please login first!");
            return;
        }

        createRoomBtn.disabled = true;
        createRoomBtn.innerText = "Creating Room...";

        try {
            // Racing Engine wale DB me naya room banayen
            const newRoomRef = await addDoc(collection(engineDB, "GameRooms"), {
                hostUid: currentUser.uid,
                hostName: currentUserName,
                status: "waiting", // waiting, racing, completed
                createdAt: serverTimestamp(),
                players: [currentUser.uid], // Pehla player khud host hai
                winnerUid: null
            });

            // Room banne ke baad seedha game screen par bhej dein
            window.location.href = `game.html?roomId=${newRoomRef.id}`;
        } catch (error) {
            console.error("Error creating room:", error);
            alert("Failed to create room!");
            createRoomBtn.disabled = false;
            createRoomBtn.innerText = "➕ Create New Race Room";
        }
    });
}

// ==========================================
// 4. Join Room Button Logic
// ==========================================
// Is function ko window par daal rahe hain taaki HTML ka onclick button ise dhoond sake
window.joinRoom = function(roomId) {
    window.location.href = `game.html?roomId=${roomId}`;
};


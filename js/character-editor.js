// js/character-editor.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Aapki wahi purani Firebase Config
const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};

const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let profileGender = "Boy"; // Default

// Character State (Defaults)
const charData = {
    skin: "#fcd34d",
    hair: "#451a03",
    shirt: "#3b82f6",
    height: 1.0,
    width: 1.0,
    eyes: 2,
    lips: 2
};

// Canvas Setup
const canvas = document.getElementById('char-preview');
const ctx = canvas.getContext('2d');

// --- 1. FIREBASE AUTH & GENDER LOCK ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = doc(db, "Users", user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const data = snap.data();
            profileGender = data.gender || "Boy";
            document.getElementById('gender-lock-status').innerText = `Locked to: ${profileGender}`;
            
            // Agar pehle se customize kiya hua hai, toh wo load karo
            if (data.avatarConfig) {
                Object.assign(charData, data.avatarConfig);
                updateUIFromData();
            }
            drawCharacter();
        }
    } else {
        window.location.href = "index.html"; // Not logged in
    }
});

// --- 2. LISTEN TO SLIDERS ---
const inputs = ['skin', 'hair', 'shirt', 'height', 'width', 'eyes', 'lips'];
inputs.forEach(id => {
    document.getElementById(`val-${id}`).addEventListener('input', (e) => {
        // Height/Width numbers hain, baaki strings
        charData[id] = (id === 'height' || id === 'width' || id === 'eyes' || id === 'lips') 
            ? parseFloat(e.target.value) 
            : e.target.value;
        drawCharacter();
    });
});

function updateUIFromData() {
    inputs.forEach(id => {
        document.getElementById(`val-${id}`).value = charData[id];
    });
}

// --- 3. LIVE RENDER ENGINE ---
function drawCharacter() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Center point of canvas
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 + 50; 

    // Apply Dimensions (Multipliers)
    const bodyHeight = 50 * charData.height;
    const bodyWidth = 30 * charData.width;
    
    // 1. Draw Legs
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(cx - (bodyWidth/2) + 2, cy, 10, bodyHeight * 0.8); // Left Leg
    ctx.fillRect(cx + (bodyWidth/2) - 12, cy, 10, bodyHeight * 0.8); // Right Leg

    // 2. Draw Body (Chest)
    ctx.fillStyle = charData.shirt;
    ctx.fillRect(cx - bodyWidth/2, cy - bodyHeight, bodyWidth, bodyHeight);

    // Gender specific chest adjustment
    if (profileGender === 'Girl') {
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; // Shadow curve
        ctx.beginPath(); ctx.arc(cx - 5, cy - bodyHeight + 15, 8, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 5, cy - bodyHeight + 15, 8, 0, Math.PI*2); ctx.fill();
    }

    // 3. Draw Arms
    ctx.fillStyle = charData.skin;
    ctx.fillRect(cx - bodyWidth/2 - 12, cy - bodyHeight, 10, bodyHeight * 0.7); // Left Arm
    ctx.fillRect(cx + bodyWidth/2 + 2, cy - bodyHeight, 10, bodyHeight * 0.7); // Right Arm

    // 4. Draw Head
    const headRadius = 22;
    const headY = cy - bodyHeight - headRadius - 5;
    
    ctx.fillStyle = charData.skin;
    ctx.beginPath(); ctx.arc(cx, headY, headRadius, 0, Math.PI*2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx - 7, headY - 3, charData.eyes, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 7, headY - 3, charData.eyes, 0, Math.PI*2); ctx.fill();

    // Lips
    ctx.fillStyle = profileGender === 'Girl' ? '#ef4444' : '#94a3b8'; // Girl = Red lips
    ctx.fillRect(cx - charData.lips, headY + 10, charData.lips * 2, 3);

    // Hair
    ctx.fillStyle = charData.hair;
    if (profileGender === 'Boy') {
        // Short Hair
        ctx.beginPath(); ctx.arc(cx, headY - 5, headRadius + 2, Math.PI, Math.PI*2); ctx.fill();
    } else {
        // Long Hair
        ctx.beginPath(); ctx.arc(cx, headY - 2, headRadius + 3, Math.PI, Math.PI*2); ctx.fill();
        ctx.fillRect(cx - headRadius - 3, headY - 2, 8, 30);
        ctx.fillRect(cx + headRadius - 5, headY - 2, 8, 30);
    }
}

// --- 4. SAVE TO FIREBASE ---
window.saveCharacter = async function() {
    if (!currentUser) return;
    
    const btn = document.querySelector('.btn-save');
    btn.innerText = "⏳ SAVING...";
    
    try {
        const userRef = doc(db, "Users", currentUser.uid);
        // Save the exact configuration to Database
        await updateDoc(userRef, {
            avatarConfig: charData
        });
        
        alert("✅ Character Saved Successfully!");
        window.location.href = "lobby.html"; // Wapas lobby me bhej do
    } catch (err) {
        console.error(err);
        alert("❌ Error saving character!");
        btn.innerText = "💾 SAVE & GO TO LOBBY";
    }
};

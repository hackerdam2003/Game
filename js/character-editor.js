// js/character-editor.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};

const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let profileGender = "Boy"; 

// Complete Customization Data State
const charData = {
    skin: "#ffdeb3", hair: "#1e293b", shirt: "#0284c7", pants: "#0f172a",
    height: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, 
    faceShape: 1.0, eyes: 2, lips: 2, hairStyle: 1
};

const canvas = document.getElementById('char-preview');
const ctx = canvas.getContext('2d');

// --- 1. INITIALIZATION & GENDER LOGIC ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const snap = await getDoc(doc(db, "Users", user.uid));
        
        if (snap.exists()) {
            const data = snap.data();
            profileGender = data.gender || "Boy";
            document.getElementById('gender-lock-status').innerText = `[ DNA Locked: ${profileGender.toUpperCase()} ]`;
            
            // Gender Specific UI & Defaults
            if (profileGender === 'Girl') {
                document.getElementById('chest-control').classList.remove('hidden');
                if(!data.avatarConfig) { charData.pelvis = 1.1; charData.torso = 0.9; charData.chest = 1.0; }
            } else {
                document.getElementById('chest-control').classList.add('hidden');
                if(!data.avatarConfig) { charData.pelvis = 0.9; charData.torso = 1.15; charData.chest = 0.8; }
            }

            if (data.avatarConfig) Object.assign(charData, data.avatarConfig);
            
            updateUIFromData();
            drawRealisticCharacter();
        }
    } else {
        window.location.href = "index.html";
    }
});

// --- 2. LISTENERS ---
const inputs = ['skin', 'hair', 'shirt', 'pants', 'height', 'torso', 'chest', 'pelvis', 'faceShape', 'eyes', 'lips', 'hairStyle'];
inputs.forEach(id => {
    const el = document.getElementById(`val-${id}`);
    if(el) {
        el.addEventListener('input', (e) => {
            charData[id] = (e.target.type === 'range') ? parseFloat(e.target.value) : e.target.value;
            drawRealisticCharacter();
        });
    }
});

function updateUIFromData() {
    inputs.forEach(id => {
        const el = document.getElementById(`val-${id}`);
        if(el) el.value = charData[id];
    });
}

// --- 3. HIGH-PERFORMANCE REALISTIC VECTOR RENDERER ---
function drawRealisticCharacter() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale everything based on height slider
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 60);
    ctx.scale(charData.height, charData.height);
    
    const isGirl = (profileGender === 'Girl');

    // Dimensions Map
    const shoulderW = 20 * charData.torso * (isGirl ? 0.9 : 1.2);
    const hipW = 18 * charData.pelvis * (isGirl ? 1.2 : 0.9);
    const chestDepth = 12 * charData.chest;
    const bodyHeight = 55;

    // --- 1. LEGS (Pants) ---
    ctx.fillStyle = charData.pants;
    // Left Leg Curve
    ctx.beginPath(); ctx.ellipse(-hipW/2 - 2, 40, hipW/1.8, 45, 0, 0, Math.PI*2); ctx.fill();
    // Right Leg Curve
    ctx.beginPath(); ctx.ellipse(hipW/2 + 2, 40, hipW/1.8, 45, 0, 0, Math.PI*2); ctx.fill();
    
    // Pelvis/Glute Connection
    ctx.beginPath(); ctx.ellipse(0, 10, hipW + 4, 15, 0, 0, Math.PI*2); ctx.fill();

    // --- 2. TORSO (Shirt) ---
    ctx.fillStyle = charData.shirt;
    ctx.beginPath();
    ctx.moveTo(-hipW, 10); // Left hip
    ctx.quadraticCurveTo(-shoulderW, -bodyHeight/2, -shoulderW, -bodyHeight); // Left waist curve
    ctx.lineTo(shoulderW, -bodyHeight); // Shoulders line
    ctx.quadraticCurveTo(shoulderW, -bodyHeight/2, hipW, 10); // Right waist curve
    ctx.fill();

    // 🛑 CHEST / BREAST PHYSICS (Girls Only)
    if (isGirl) {
        ctx.fillStyle = charData.shirt;
        // Left Chest
        ctx.beginPath(); ctx.ellipse(-8 - (chestDepth*0.1), -bodyHeight + 25, 12 + (chestDepth*0.3), 10 + (chestDepth*0.5), -0.2, 0, Math.PI*2); ctx.fill();
        // Right Chest
        ctx.beginPath(); ctx.ellipse(8 + (chestDepth*0.1), -bodyHeight + 25, 12 + (chestDepth*0.3), 10 + (chestDepth*0.5), 0.2, 0, Math.PI*2); ctx.fill();
        
        // Chest Shadow/Cleavage depth
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, -bodyHeight + 22, 3, 8 + (chestDepth*0.2), 0, 0, Math.PI*2); ctx.fill();
    } else {
        // Boy Pectoral Lines
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-15, -bodyHeight + 20); ctx.quadraticCurveTo(0, -bodyHeight + 25, 15, -bodyHeight + 20); ctx.stroke();
    }

    // --- 3. ARMS ---
    ctx.fillStyle = charData.skin;
    ctx.beginPath(); ctx.ellipse(-shoulderW - 5, -bodyHeight + 15, 6, 25, 0.2, 0, Math.PI*2); ctx.fill(); // L Arm
    ctx.beginPath(); ctx.ellipse(shoulderW + 5, -bodyHeight + 15, 6, 25, -0.2, 0, Math.PI*2); ctx.fill(); // R Arm

    // --- 4. NECK & HEAD ---
    ctx.fillStyle = charData.skin;
    ctx.fillRect(-5, -bodyHeight - 10, 10, 15); // Neck

    const headY = -bodyHeight - 25;
    const faceW = 16 * charData.faceShape;
    const faceH = 22;

    // Jawline & Face Shape (Oval/Square based on slider)
    ctx.beginPath(); ctx.ellipse(0, headY, faceW, faceH, 0, 0, Math.PI*2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(-faceW/2 + 2, headY - 2, charData.eyes, charData.eyes/1.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceW/2 - 2, headY - 2, charData.eyes, charData.eyes/1.2, 0, 0, Math.PI*2); ctx.fill();

    // Lips (Plumpness)
    ctx.fillStyle = isGirl ? '#f43f5e' : '#94a3b8'; // Red for girls, natural for boys
    ctx.beginPath(); ctx.ellipse(0, headY + 12, charData.lips + 2, charData.lips/1.5, 0, 0, Math.PI*2); ctx.fill();

    // --- 5. HAIRSTYLES ---
    ctx.fillStyle = charData.hair;
    const style = parseInt(charData.hairStyle);

    if (isGirl) {
        if (style === 1) { // Long Straight
            ctx.beginPath(); ctx.ellipse(0, headY - 10, faceW + 4, 15, 0, Math.PI, Math.PI*2); ctx.fill(); // Top
            ctx.fillRect(-faceW - 4, headY - 10, 8, 40); // L fall
            ctx.fillRect(faceW - 4, headY - 10, 8, 40); // R fall
        } else if (style === 2) { // Ponytail
            ctx.beginPath(); ctx.ellipse(0, headY - 12, faceW + 2, 12, 0, 0, Math.PI*2); ctx.fill(); // Bun
            ctx.beginPath(); ctx.ellipse(-faceW, headY, 8, 20, 0.5, 0, Math.PI*2); ctx.fill(); // Tail
        } else { // Bob Cut
            ctx.beginPath(); ctx.ellipse(0, headY - 8, faceW + 6, 20, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-faceW - 2, headY, 6, 15, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(faceW + 2, headY, 6, 15, 0, 0, Math.PI*2); ctx.fill();
        }
    } else {
        if (style === 1) { // Short Fade
            ctx.beginPath(); ctx.ellipse(0, headY - 15, faceW, 10, 0, Math.PI, Math.PI*2); ctx.fill();
        } else if (style === 2) { // Spiky
            ctx.beginPath(); ctx.moveTo(-faceW, headY-10); ctx.lineTo(-faceW/2, headY-25); ctx.lineTo(0, headY-15); ctx.lineTo(faceW/2, headY-25); ctx.lineTo(faceW, headY-10); ctx.fill();
        } else { // Messy Mop
            ctx.beginPath(); ctx.ellipse(0, headY - 12, faceW + 4, 14, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(faceW/2, headY-5, 8, 8, 0, 0, Math.PI*2); ctx.fill();
        }
    }

    ctx.restore(); // Reset transform
}

// --- 4. SAVE ---
window.saveCharacter = async function() {
    if (!currentUser) return;
    const btn = document.querySelector('.btn-save');
    btn.innerText = "⏳ SAVING TO GENETICS...";
    
    try {
        await updateDoc(doc(db, "Users", currentUser.uid), { avatarConfig: charData });
        alert("🧬 Character Setup Complete!");
        window.location.href = "lobby.html"; 
    } catch (err) {
        alert("❌ Error saving character!");
        btn.innerText = "💾 Confirm & Enter";
    }
};

// js/character-editor.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
});
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let profileGender = "Boy"; 

// The Master Anatomy Object
const charData = {
    ageGroup: "adult", // 'adult' or 'kid'
    skin: "#ffcc99", hair: "#27272a", eyeColor: "#0ea5e9", 
    topColor: "#3b82f6", bottomColor: "#1e293b",
    height: 1.0, headSize: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, limbs: 1.0,
    faceShape: 1.0, hairStyle: 1
};

const canvas = document.getElementById('char-preview');
const ctx = canvas.getContext('2d');

// --- 1. INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const snap = await getDoc(doc(db, "Users", user.uid));
        
        if (snap.exists()) {
            const data = snap.data();
            profileGender = data.gender || "Boy";
            document.getElementById('dna-lock').innerText = `DNA: ${profileGender}`;
            
            setupGenderUI();

            if (data.avatarConfig) Object.assign(charData, data.avatarConfig);
            
            updateUIFromData();
            renderEngine();
        }
    }
});

function setupGenderUI() {
    if (profileGender === 'Girl') {
        document.getElementById('girl-chest').classList.remove('hidden');
        if(!charData.initialized) { charData.pelvis = 1.2; charData.torso = 0.9; charData.chest = 1.2; }
    } else {
        document.getElementById('boy-muscles').classList.remove('hidden');
        if(!charData.initialized) { charData.pelvis = 0.9; charData.torso = 1.3; charData.chest = 1.0; }
    }
    charData.initialized = true;
}

window.setAge = function(age) {
    charData.ageGroup = age;
    document.getElementById('btn-adult').classList.toggle('active', age === 'adult');
    document.getElementById('btn-kid').classList.toggle('active', age === 'kid');
    
    // Kids have huge heads and stubby bodies automatically
    if(age === 'kid') { charData.headSize = 1.4; charData.height = 0.8; charData.torso = 1.0; charData.pelvis = 1.0; }
    else { charData.headSize = 1.0; charData.height = 1.0; setupGenderUI(); }
    
    updateUIFromData();
    renderEngine();
};

const inputs = ['skin', 'hair', 'eyeColor', 'topColor', 'bottomColor', 'height', 'headSize', 'torso', 'chest', 'pelvis', 'limbs', 'faceShape', 'hairStyle'];
inputs.forEach(id => {
    const el = document.getElementById(`val-${id}`);
    if(el) {
        el.addEventListener('input', (e) => {
            charData[id] = (e.target.type === 'range') ? parseFloat(e.target.value) : e.target.value;
            renderEngine();
        });
    }
});

function updateUIFromData() {
    inputs.forEach(id => {
        const el = document.getElementById(`val-${id}`);
        if(el) el.value = charData[id];
    });
}

// ==========================================
// 🚀 HIGH-PERFORMANCE 3D SHADER ENGINE
// ==========================================

function getGradient(color1, color2, y1, y2) {
    let grad = ctx.createLinearGradient(0, y1, 0, y2);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    return grad;
}

function adjustColor(color, amount) {
    return color; // Helper function stub for shading (keep it simple for now, use rgba overlays)
}

function renderEngine() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // Center Bottom Anchor
    ctx.translate(canvas.width / 2, canvas.height - 50);
    ctx.scale(charData.height, charData.height);
    
    const isGirl = (profileGender === 'Girl');
    const isKid = (charData.ageGroup === 'kid');

    // Base Anatomy Calcs
    const bodyH = isKid ? 80 : 130;
    const legH = isKid ? 60 : 120;
    const shoulderW = 30 * charData.torso * (isGirl ? 0.85 : 1.2) * (isKid ? 0.9 : 1);
    const hipW = 25 * charData.pelvis * (isGirl ? 1.25 : 0.9) * (isKid ? 1.1 : 1);
    const limbThick = 10 * charData.limbs * (isKid ? 1.2 : 1);

    const waistY = -legH;
    const neckY = waistY - bodyH;

    // --- 1. LEGS (Bottom Color) ---
    ctx.fillStyle = charData.bottomColor;
    // Left Leg
    ctx.beginPath(); ctx.ellipse(-hipW/2, waistY + legH/2, limbThick*1.2, legH/2, 0.1, 0, Math.PI*2); ctx.fill();
    // Right Leg
    ctx.beginPath(); ctx.ellipse(hipW/2, waistY + legH/2, limbThick*1.2, legH/2, -0.1, 0, Math.PI*2); ctx.fill();
    
    // Pelvis Sphere (Realistic hips connection)
    let pelvisGrad = ctx.createRadialGradient(0, waistY+10, 5, 0, waistY+10, hipW);
    pelvisGrad.addColorStop(0, charData.bottomColor);
    pelvisGrad.addColorStop(1, 'rgba(0,0,0,0.5)'); // Pseudo 3D curve shading
    ctx.fillStyle = pelvisGrad;
    ctx.beginPath(); ctx.ellipse(0, waistY + 10, hipW + 2, 25 * (isGirl ? 1.2 : 1), 0, 0, Math.PI*2); ctx.fill();

    // --- 2. TORSO (Top Color) ---
    ctx.fillStyle = charData.topColor;
    ctx.beginPath();
    ctx.moveTo(-hipW, waistY); // L Hip
    ctx.quadraticCurveTo(-shoulderW*0.9, waistY - bodyH/2, -shoulderW, neckY); // L Waist
    ctx.lineTo(shoulderW, neckY); // Shoulders
    ctx.quadraticCurveTo(shoulderW*0.9, waistY - bodyH/2, hipW, waistY); // R Waist
    ctx.fill();

    // 3D Shading on Torso
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, waistY, hipW, 10, 0, 0, Math.PI*2); ctx.fill(); // Waist fold shadow

    // --- 3. CHEST / MUSCLES ---
    if (!isKid) {
        if (isGirl) {
            // Realistic Breasts using Bezier & Radial Gradients for 3D pop
            const cSize = 14 * charData.chest;
            const cY = neckY + bodyH * 0.35;
            
            ctx.fillStyle = charData.topColor;
            ctx.beginPath(); ctx.ellipse(-10 - cSize*0.1, cY, cSize, cSize*0.8, -0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(10 + cSize*0.1, cY, cSize, cSize*0.8, 0.2, 0, Math.PI*2); ctx.fill();
            
            // Cleavage & Under-boob shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(-10, cY+cSize*0.6, cSize*0.8, 4, -0.2, 0, Math.PI); ctx.fill();
            ctx.beginPath(); ctx.ellipse(10, cY+cSize*0.6, cSize*0.8, 4, 0.2, 0, Math.PI); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, cY, 2, cSize*0.8, 0, 0, Math.PI*2); ctx.fill(); // Center
        } else {
            // Boy Pecs & Abs
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
            const pecY = neckY + bodyH * 0.3;
            ctx.beginPath(); ctx.moveTo(-shoulderW*0.6, pecY); ctx.quadraticCurveTo(0, pecY+15*charData.chest, shoulderW*0.6, pecY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, pecY); ctx.lineTo(0, waistY - 20); ctx.stroke(); // Center ab line
        }
    }

    // --- 4. ARMS ---
    ctx.fillStyle = charData.skin;
    ctx.beginPath(); ctx.ellipse(-shoulderW - limbThick/2, neckY + bodyH/2.5, limbThick, bodyH/2.2, 0.15, 0, Math.PI*2); ctx.fill(); // L Arm
    ctx.beginPath(); ctx.ellipse(shoulderW + limbThick/2, neckY + bodyH/2.5, limbThick, bodyH/2.2, -0.15, 0, Math.PI*2); ctx.fill(); // R Arm

    // --- 5. HEAD & NECK ---
    const headScale = charData.headSize;
    ctx.fillStyle = charData.skin;
    ctx.fillRect(-6 * headScale, neckY - 15 * headScale, 12 * headScale, 20 * headScale); // Neck

    const headY = neckY - 35 * headScale;
    const faceW = 20 * charData.faceShape * headScale;
    const faceH = 26 * headScale;

    // 3D Head Base
    let faceGrad = ctx.createRadialGradient(0, headY, 5, 0, headY, faceW*1.2);
    faceGrad.addColorStop(0, charData.skin);
    faceGrad.addColorStop(1, 'rgba(0,0,0,0.15)'); // Shadow edges
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.ellipse(0, headY, faceW, faceH, 0, 0, Math.PI*2); ctx.fill();

    // Eyes
    ctx.fillStyle = 'white'; // Sclera
    ctx.beginPath(); ctx.ellipse(-faceW/2.2, headY - 2, 5*headScale, 3*headScale, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceW/2.2, headY - 2, 5*headScale, 3*headScale, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = charData.eyeColor; // Iris
    ctx.beginPath(); ctx.arc(-faceW/2.2, headY - 2, 2.5*headScale, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceW/2.2, headY - 2, 2.5*headScale, 0, Math.PI*2); ctx.fill();

    // Lips
    ctx.fillStyle = isGirl ? '#f43f5e' : 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, headY + 12*headScale, 5*headScale, 2*headScale, 0, 0, Math.PI*2); ctx.fill();

    // --- 6. HAIRSTYLES (Modular Component) ---
    drawHair(ctx, headY, faceW, faceH, headScale, isGirl, isKid);

    ctx.restore(); 
}

function drawHair(ctx, headY, faceW, faceH, scale, isGirl, isKid) {
    ctx.fillStyle = charData.hair;
    const style = parseInt(charData.hairStyle);

    if (isGirl) {
        if (style === 1) { // Cute Buns (Like Kid ref)
            ctx.beginPath(); ctx.arc(-faceW, headY - faceH, 12*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(faceW, headY - faceH, 12*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 5, faceW+2, 10*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        } else if (style === 2) { // Sexy High Bun (Like Adult ref)
            ctx.beginPath(); ctx.ellipse(0, headY - faceH - 5, 15*scale, 12*scale, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 8, faceW+5, 15*scale, 0, Math.PI, Math.PI*2); ctx.fill();
            // Side strands
            ctx.beginPath(); ctx.moveTo(-faceW, headY); ctx.quadraticCurveTo(-faceW-10, headY+20, -faceW+5, headY+25); ctx.stroke();
        } else { // Long Flowing
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 5, faceW+4, 15*scale, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.fillRect(-faceW - 5*scale, headY - faceH, 10*scale, 50*scale);
            ctx.fillRect(faceW - 5*scale, headY - faceH, 10*scale, 50*scale);
        }
    } else {
        if (style === 1) { // Clean Spikes (Like Adult ref)
            ctx.beginPath(); ctx.moveTo(-faceW, headY - faceH + 5); 
            ctx.lineTo(-faceW/2, headY - faceH - 10*scale); 
            ctx.lineTo(0, headY - faceH + 2); 
            ctx.lineTo(faceW/2, headY - faceH - 15*scale); 
            ctx.lineTo(faceW, headY - faceH + 5); ctx.fill();
        } else if (style === 2) { // Comb Over
            ctx.beginPath(); ctx.ellipse(5, headY - faceH + 5, faceW+5, 12*scale, 0.2, Math.PI, Math.PI*2); ctx.fill();
        } else { // Buzz Cut
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 8, faceW, 8*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        }
    }
}

// --- 7. SAVE DATA TO DB ---
window.saveCharacter = async function() {
    if (!currentUser) return;
    const btn = document.querySelector('.btn-save');
    btn.innerText = "⏳ ENCODING DNA...";
    
    try {
        await updateDoc(doc(db, "Users", currentUser.uid), { avatarConfig: charData });
        alert("🧬 Character Setup Complete!");
        window.location.href = "lobby.html"; 
    } catch (err) {
        alert("❌ Error saving character!");
        btn.innerText = "💾 Save DNA & Enter";
    }
};

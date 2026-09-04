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
    faceShape: 1.0, hairStyle: 1, initialized: false
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
            
            const dnaLockEl = document.getElementById('dna-lock');
            if (dnaLockEl) dnaLockEl.innerText = `DNA: ${profileGender}`;
            
            setupGenderUI();

            if (data.avatarConfig) Object.assign(charData, data.avatarConfig);
            
            updateUIFromData();
            renderEngine();
        }
    }
});

function setupGenderUI() {
    const girlChestEl = document.getElementById('girl-chest');
    const boyMusclesEl = document.getElementById('boy-muscles');

    if (profileGender === 'Girl') {
        if (girlChestEl) girlChestEl.classList.remove('hidden');
        if (boyMusclesEl) boyMusclesEl.classList.add('hidden');
        if(!charData.initialized) { charData.pelvis = 1.2; charData.torso = 0.9; charData.chest = 1.2; }
    } else {
        if (boyMusclesEl) boyMusclesEl.classList.remove('hidden');
        if (girlChestEl) girlChestEl.classList.add('hidden');
        if(!charData.initialized) { charData.pelvis = 0.9; charData.torso = 1.3; charData.chest = 1.0; }
    }
    charData.initialized = true;
}

window.setAge = function(age) {
    charData.ageGroup = age;
    const btnAdult = document.getElementById('btn-adult');
    const btnKid = document.getElementById('btn-kid');
    
    if (btnAdult) btnAdult.classList.toggle('active', age === 'adult');
    if (btnKid) btnKid.classList.toggle('active', age === 'kid');
    
    // Kids have larger relative head proportions and compact bodies
    if(age === 'kid') { 
        charData.headSize = 1.4; 
        charData.height = 0.8; 
        charData.torso = 1.0; 
        charData.pelvis = 1.0; 
    } else { 
        charData.headSize = 1.0; 
        charData.height = 1.0; 
        setupGenderUI(); 
    }
    
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
// 🚀 HIGH-PERFORMANCE 2.5D VECTOR SHADER ENGINE
// ==========================================

function renderEngine() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // Center Bottom Anchor
    ctx.translate(canvas.width / 2, canvas.height - 40);
    ctx.scale(charData.height, charData.height);
    
    const isGirl = (profileGender === 'Girl');
    const isKid = (charData.ageGroup === 'kid');

    // Base Anatomy Proportions
    const bodyH = isKid ? 75 : 120;
    const legH = isKid ? 55 : 110;
    const shoulderW = 28 * charData.torso * (isGirl ? 0.85 : 1.2) * (isKid ? 0.9 : 1);
    const hipW = 24 * charData.pelvis * (isGirl ? 1.25 : 0.9) * (isKid ? 1.1 : 1);
    const limbThick = 9 * charData.limbs * (isKid ? 1.2 : 1);

    const waistY = -legH;
    const neckY = waistY - bodyH;

    // --- 1. LEGS (Bottom Color) ---
    ctx.fillStyle = charData.bottomColor;
    ctx.beginPath(); ctx.ellipse(-hipW/2, waistY + legH/2, limbThick*1.2, legH/2, 0.08, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hipW/2, waistY + legH/2, limbThick*1.2, legH/2, -0.08, 0, Math.PI*2); ctx.fill();
    
    // Pelvis Shading Gradient
    let pelvisGrad = ctx.createRadialGradient(0, waistY+8, 5, 0, waistY+8, hipW);
    pelvisGrad.addColorStop(0, charData.bottomColor);
    pelvisGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = pelvisGrad;
    ctx.beginPath(); ctx.ellipse(0, waistY + 8, hipW + 2, 22 * (isGirl ? 1.2 : 1), 0, 0, Math.PI*2); ctx.fill();

    // --- 2. TORSO (Top Color) ---
    ctx.fillStyle = charData.topColor;
    ctx.beginPath();
    ctx.moveTo(-hipW, waistY); 
    ctx.quadraticCurveTo(-shoulderW*0.9, waistY - bodyH/2, -shoulderW, neckY); 
    ctx.lineTo(shoulderW, neckY); 
    ctx.quadraticCurveTo(shoulderW*0.9, waistY - bodyH/2, hipW, waistY); 
    ctx.fill();

    // Waist fold shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, waistY, hipW, 8, 0, 0, Math.PI*2); ctx.fill();

    // --- 3. CHEST / MUSCLES ---
    if (!isKid) {
        if (isGirl) {
            const cSize = 13 * charData.chest;
            const cY = neckY + bodyH * 0.38;
            
            ctx.fillStyle = charData.topColor;
            ctx.beginPath(); ctx.ellipse(-9 - cSize*0.1, cY, cSize, cSize*0.8, -0.15, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9 + cSize*0.1, cY, cSize, cSize*0.8, 0.15, 0, Math.PI*2); ctx.fill();
            
            // Cleavage shadow
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath(); ctx.ellipse(0, cY, 2, cSize*0.7, 0, 0, Math.PI*2); ctx.fill();
        } else {
            // Boy Pecs
            ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
            const pecY = neckY + bodyH * 0.3;
            ctx.beginPath(); ctx.moveTo(-shoulderW*0.5, pecY); ctx.quadraticCurveTo(0, pecY+12*charData.chest, shoulderW*0.5, pecY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, pecY); ctx.lineTo(0, waistY - 15); ctx.stroke();
        }
    }

    // --- 4. ARMS ---
    ctx.fillStyle = charData.skin;
    ctx.beginPath(); ctx.ellipse(-shoulderW - limbThick/2, neckY + bodyH/2.3, limbThick, bodyH/2.3, 0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(shoulderW + limbThick/2, neckY + bodyH/2.3, limbThick, bodyH/2.3, -0.12, 0, Math.PI*2); ctx.fill();

    // --- 5. HEAD & NECK ---
    const headScale = charData.headSize;
    ctx.fillStyle = charData.skin;
    ctx.fillRect(-5 * headScale, neckY - 14 * headScale, 10 * headScale, 18 * headScale);

    const headY = neckY - 32 * headScale;
    const faceW = 18 * charData.faceShape * headScale;
    const faceH = 24 * headScale;

    // Head Shading Gradient
    let faceGrad = ctx.createRadialGradient(0, headY, 4, 0, headY, faceW*1.3);
    faceGrad.addColorStop(0, charData.skin);
    faceGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.ellipse(0, headY, faceW, faceH, 0, 0, Math.PI*2); ctx.fill();

    // Eyes
    ctx.fillStyle = 'white'; 
    ctx.beginPath(); ctx.ellipse(-faceW/2.3, headY - 2, 4.5*headScale, 2.5*headScale, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceW/2.3, headY - 2, 4.5*headScale, 2.5*headScale, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = charData.eyeColor; 
    ctx.beginPath(); ctx.arc(-faceW/2.3, headY - 2, 2*headScale, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceW/2.3, headY - 2, 2*headScale, 0, Math.PI*2); ctx.fill();

    // Lips
    ctx.fillStyle = isGirl ? '#f43f5e' : 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, headY + 11*headScale, 4.5*headScale, 1.8*headScale, 0, 0, Math.PI*2); ctx.fill();

    // --- 6. HAIRSTYLES ---
    drawHair(ctx, headY, faceW, faceH, headScale, isGirl, isKid);

    ctx.restore(); 
}

function drawHair(ctx, headY, faceW, faceH, scale, isGirl, isKid) {
    ctx.fillStyle = charData.hair;
    const style = parseInt(charData.hairStyle);

    if (isGirl) {
        if (style === 1) { 
            ctx.beginPath(); ctx.arc(-faceW, headY - faceH, 11*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(faceW, headY - faceH, 11*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 4, faceW+2, 9*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        } else if (style === 2) { 
            ctx.beginPath(); ctx.ellipse(0, headY - faceH - 4, 14*scale, 11*scale, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 7, faceW+4, 14*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        } else { 
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 4, faceW+3, 13*scale, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.fillRect(-faceW - 4*scale, headY - faceH, 9*scale, 45*scale);
            ctx.fillRect(faceW - 4*scale, headY - faceH, 9*scale, 45*scale);
        }
    } else {
        if (style === 1) { 
            ctx.beginPath(); ctx.moveTo(-faceW, headY - faceH + 4); 
            ctx.lineTo(-faceW/2, headY - faceH - 9*scale); 
            ctx.lineTo(0, headY - faceH + 2); 
            ctx.lineTo(faceW/2, headY - faceH - 12*scale); 
            ctx.lineTo(faceW, headY - faceH + 4); ctx.fill();
        } else if (style === 2) { 
            ctx.beginPath(); ctx.ellipse(4, headY - faceH + 4, faceW+4, 11*scale, 0.2, Math.PI, Math.PI*2); ctx.fill();
        } else { 
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 6, faceW, 7*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        }
    }
}

// --- 7. SAVE DATA TO DB ---
window.saveCharacter = async function() {
    if (!currentUser) return;
    const btn = document.querySelector('.btn-save');
    if (btn) btn.innerText = "⏳ ENCODING DNA...";
    
    try {
        await updateDoc(doc(db, "Users", currentUser.uid), { avatarConfig: charData });
        alert("🧬 Character Setup Complete!");
        window.location.href = "lobby.html"; 
    } catch (err) {
        console.error(err);
        alert("❌ Error saving character!");
        if (btn) btn.innerText = "💾 Save DNA & Enter";
    }
};

// Initial trigger load render on start if elements are ready
window.addEventListener('DOMContentLoaded', () => {
    renderEngine();
});

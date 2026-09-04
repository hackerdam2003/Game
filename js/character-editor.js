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

// Complete Master Anatomy State
const charData = {
    ageGroup: "adult", 
    skin: "#ffcc99", hair: "#27272a", eyeColor: "#0ea5e9", 
    topColor: "#3b82f6", bottomColor: "#1e293b",
    height: 1.0, headSize: 1.0, torso: 1.0, waist: 0.85, chest: 1.2, 
    pelvis: 1.2, limbs: 1.1, faceShape: 1.0, jaw: 1.0, lips: 1.0, hairStyle: 1, 
    initialized: false
};

const canvas = document.getElementById('char-preview');
const ctx = canvas ? canvas.getContext('2d') : null;

// --- 1. INITIALIZATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const snap = await getDoc(doc(db, "Users", user.uid));
        
        if (snap.exists()) {
            const data = snap.data();
            profileGender = data.gender || "Boy";
            
            const dnaLockEl = document.getElementById('dna-lock');
            if (dnaLockEl) dnaLockEl.innerText = `DNA: ${profileGender.toUpperCase()}`;
            
            setupGenderUI();

            if (data.avatarConfig) Object.assign(charData, data.avatarConfig);
            
            updateUIFromData();
            renderEngine();
        }
    }
});

function setupGenderUI() {
    const girlChestEl = document.getElementById('girl-chest');
    if (profileGender === 'Girl') {
        if (girlChestEl) girlChestEl.classList.remove('hidden');
        if(!charData.initialized) { charData.pelvis = 1.3; charData.waist = 0.75; charData.chest = 1.3; }
    } else {
        if (girlChestEl) girlChestEl.classList.add('hidden');
        if(!charData.initialized) { charData.pelvis = 0.9; charData.waist = 1.0; charData.chest = 1.0; }
    }
    charData.initialized = true;
}

window.setAge = function(age) {
    charData.ageGroup = age;
    const btnAdult = document.getElementById('btn-adult');
    const btnKid = document.getElementById('btn-kid');
    if (btnAdult) btnAdult.classList.toggle('active', age === 'adult');
    if (btnKid) btnKid.classList.toggle('active', age === 'kid');
    
    if(age === 'kid') { 
        charData.headSize = 1.35; charData.height = 0.8; charData.waist = 1.0; charData.pelvis = 1.0; 
    } else { 
        charData.headSize = 1.0; charData.height = 1.0; setupGenderUI(); 
    }
    updateUIFromData();
    renderEngine();
};

const inputs = ['skin', 'hair', 'eyeColor', 'topColor', 'bottomColor', 'height', 'headSize', 'torso', 'waist', 'chest', 'pelvis', 'limbs', 'faceShape', 'jaw', 'lips', 'hairStyle'];
inputs.forEach(id => {
    const el = document.getElementById(`val-${id}`);
    if(el) {
        el.addEventListener('input', (e) => {
            charData[id] = (e.target.type === 'range') ? parseFloat(e.target.value) : e.target.value;
            const disp = document.getElementById(`disp-${id}`);
            if(disp && e.target.type === 'range') disp.innerText = charData[id];
            renderEngine();
        });
    }
});

function updateUIFromData() {
    inputs.forEach(id => {
        const el = document.getElementById(`val-${id}`);
        if(el) {
            el.value = charData[id];
            const disp = document.getElementById(`disp-${id}`);
            if(disp && el.type === 'range') disp.innerText = charData[id];
        }
    });
}

// ==========================================
// 🚀 ULTRA-REALISTIC 2.5D SHADER & ANATOMY ENGINE
// ==========================================

function renderEngine() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height - 40);
    ctx.scale(charData.height, charData.height);
    
    const isGirl = (profileGender === 'Girl');
    const isKid = (charData.ageGroup === 'kid');

    const bodyH = isKid ? 75 : 120;
    const legH = isKid ? 55 : 110;
    const shoulderW = 26 * charData.torso * (isGirl ? 0.85 : 1.25) * (isKid ? 0.9 : 1);
    const waistW = 18 * charData.waist * (isKid ? 1.0 : 1);
    const hipW = 24 * charData.pelvis * (isGirl ? 1.4 : 0.95) * (isKid ? 1.1 : 1);
    const limbThick = 9 * charData.limbs * (isKid ? 1.2 : 1);

    const waistY = -legH;
    const neckY = waistY - bodyH;

    // --- 1. THIGHS & LEGS (Volumetric 3D Shading) ---
    let legGradL = ctx.createRadialGradient(-hipW/2, waistY + legH/2, 5, -hipW/2, waistY + legH/2, hipW);
    legGradL.addColorStop(0, charData.bottomColor);
    legGradL.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = legGradL;
    ctx.beginPath(); ctx.ellipse(-hipW/1.8, waistY + legH/2, limbThick*1.3, legH/2.1, 0.05, 0, Math.PI*2); ctx.fill();

    let legGradR = ctx.createRadialGradient(hipW/2, waistY + legH/2, 5, hipW/2, waistY + legH/2, hipW);
    legGradR.addColorStop(0, charData.bottomColor);
    legGradR.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = legGradR;
    ctx.beginPath(); ctx.ellipse(hipW/1.8, waistY + legH/2, limbThick*1.3, legH/2.1, -0.05, 0, Math.PI*2); ctx.fill();
    
    // Pelvis Volume Shading
    let pelvisGrad = ctx.createRadialGradient(0, waistY+10, 5, 0, waistY+10, hipW*1.2);
    pelvisGrad.addColorStop(0, charData.bottomColor);
    pelvisGrad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = pelvisGrad;
    ctx.beginPath(); ctx.ellipse(0, waistY + 10, hipW + 4, 26 * (isGirl ? 1.3 : 1), 0, 0, Math.PI*2); ctx.fill();

    // --- 2. TORSO / HOURGLASS SHAPE (Top Color) ---
    let torsoGrad = ctx.createLinearGradient(-shoulderW, neckY, shoulderW, waistY);
    torsoGrad.addColorStop(0, charData.topColor);
    torsoGrad.addColorStop(0.7, charData.topColor);
    torsoGrad.addColorStop(1, 'rgba(0,0,0,0.350)');
    ctx.fillStyle = torsoGrad;

    ctx.beginPath();
    ctx.moveTo(-hipW*0.9, waistY); 
    ctx.quadraticCurveTo(-waistW * 1.1, waistY - bodyH/2, -shoulderW, neckY); 
    ctx.lineTo(shoulderW, neckY); 
    ctx.quadraticCurveTo(waistW * 1.1, waistY - bodyH/2, hipW*0.9, waistY); 
    ctx.fill();

    // Waist fold shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, waistY, waistW * 1.2, 7, 0, 0, Math.PI*2); ctx.fill();

    // --- 3. BUST / CHEST / MUSCLES (3D Spherical Volume) ---
    if (!isKid) {
        if (isGirl) {
            const cSize = 12 * charData.chest;
            const cY = neckY + bodyH * 0.38;
            
            // Left Breast 3D Radial Shading
            let breastGradL = ctx.createRadialGradient(-8, cY-2, 2, -8, cY, cSize*1.2);
            breastGradL.addColorStop(0, charData.topColor);
            breastGradL.addColorStop(0.7, 'rgba(0,0,0,0.15)');
            breastGradL.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = breastGradL;
            ctx.beginPath(); ctx.ellipse(-9 - cSize*0.05, cY, cSize, cSize*0.85, -0.15, 0, Math.PI*2); ctx.fill();

            // Right Breast 3D Radial Shading
            let breastGradR = ctx.createRadialGradient(8, cY-2, 2, 8, cY, cSize*1.2);
            breastGradR.addColorStop(0, charData.topColor);
            breastGradR.addColorStop(0.7, 'rgba(0,0,0,0.15)');
            breastGradR.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = breastGradR;
            ctx.beginPath(); ctx.ellipse(9 + cSize*0.05, cY, cSize, cSize*0.85, 0.15, 0, Math.PI*2); ctx.fill();
            
            // Deep Cleavage Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.ellipse(0, cY, 2.5, cSize*0.75, 0, 0, Math.PI*2); ctx.fill();
        } else {
            // Boy Pecs
            ctx.strokeStyle = 'rgba(0,0,0,0.25);'; ctx.lineWidth = 2.5;
            const pecY = neckY + bodyH * 0.3;
            ctx.beginPath(); ctx.moveTo(-shoulderW*0.55, pecY); ctx.quadraticCurveTo(0, pecY+14*charData.chest, shoulderW*0.55, pecY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, pecY); ctx.lineTo(0, waistY - 15); ctx.stroke();
        }
    }

    // --- 4. ARMS ---
    let armGrad = ctx.createLinearGradient(-shoulderW, neckY, -shoulderW - limbThick, neckY + bodyH/2);
    armGrad.addColorStop(0, charData.skin);
    armGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = armGrad;
    ctx.beginPath(); ctx.ellipse(-shoulderW - limbThick/2, neckY + bodyH/2.2, limbThick, bodyH/2.2, 0.12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(shoulderW + limbThick/2, neckY + bodyH/2.2, limbThick, bodyH/2.2, -0.12, 0, Math.PI*2); ctx.fill();

    // --- 5. HEAD & FACIAL MORPHING ---
    const headScale = charData.headSize;
    ctx.fillStyle = charData.skin;
    ctx.fillRect(-5 * headScale, neckY - 14 * headScale, 10 * headScale, 18 * headScale);

    const headY = neckY - 32 * headScale;
    const faceW = 18 * charData.faceShape * headScale;
    const faceH = 24 * headScale;
    const jawW = faceW * charData.jaw;

    // 3D Head Base Shading
    let faceGrad = ctx.createRadialGradient(0, headY, 5, 0, headY, faceW*1.3);
    faceGrad.addColorStop(0, charData.skin);
    faceGrad.addColorStop(0.7, charData.skin);
    faceGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); 
    ctx.moveTo(-jawW/1.2, headY);
    ctx.quadraticCurveTo(-jawW, headY + 12, 0, headY + 18);
    ctx.quadraticCurveTo(jawW, headY + 12, jawW/1.2, headY);
    ctx.arc(0, headY, faceW, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white'; 
    ctx.beginPath(); ctx.ellipse(-faceW/2.3, headY - 2, 4.5*headScale, 2.5*headScale, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceW/2.3, headY - 2, 4.5*headScale, 2.5*headScale, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = charData.eyeColor; 
    ctx.beginPath(); ctx.arc(-faceW/2.3, headY - 2, 2*headScale, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceW/2.3, headY - 2, 2*headScale, 0, Math.PI*2); ctx.fill();

    // Plump Lips (Customizable)
    ctx.fillStyle = isGirl ? '#f43f5e' : '#b45309';
    let lipH = 1.8 * charData.lips;
    ctx.beginPath(); ctx.ellipse(0, headY + 11*headScale, 5*headScale, lipH, 0, 0, Math.PI*2); ctx.fill();

    // --- 6. HAIRSTYLES ---
    drawHair(ctx, headY, faceW, faceH, headScale, isGirl, isKid);

    ctx.restore(); 
}

function drawHair(ctx, headY, faceW, faceH, scale, isGirl, isKid) {
    ctx.fillStyle = charData.hair;
    const style = parseInt(charData.hairStyle);

    if (isGirl) {
        if (style === 1) { // High Buns
            ctx.beginPath(); ctx.arc(-faceW, headY - faceH, 11*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(faceW, headY - faceH, 11*scale, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 4, faceW+2, 9*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        } else if (style === 2) { // Voluminous High Ponytail Bun
            ctx.beginPath(); ctx.ellipse(0, headY - faceH - 6, 15*scale, 13*scale, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 6, faceW+4, 14*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        } else { // Long Flowing Hair Strands
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 4, faceW+3, 13*scale, 0, Math.PI, Math.PI*2); ctx.fill();
            ctx.fillRect(-faceW - 4*scale, headY - faceH, 9*scale, 50*scale);
            ctx.fillRect(faceW - 4*scale, headY - faceH, 9*scale, 50*scale);
        }
    } else {
        if (style === 1) { // Modern Spikes
            ctx.beginPath(); ctx.moveTo(-faceW, headY - faceH + 4); 
            ctx.lineTo(-faceW/2, headY - faceH - 10*scale); 
            ctx.lineTo(0, headY - faceH + 2); 
            ctx.lineTo(faceW/2, headY - faceH - 14*scale); 
            ctx.lineTo(faceW, headY - faceH + 4); ctx.fill();
        } else if (style === 2) { // Clean Side Sweep
            ctx.beginPath(); ctx.ellipse(4, headY - faceH + 4, faceW+4, 11*scale, 0.2, Math.PI, Math.PI*2); ctx.fill();
        } else { // Structured Buzz Cut
            ctx.beginPath(); ctx.ellipse(0, headY - faceH + 6, faceW, 7*scale, 0, Math.PI, Math.PI*2); ctx.fill();
        }
    }
}

// --- 7. SAVE DATA TO DB ---
window.saveCharacter = async function() {
    if (!currentUser) return;
    const btn = document.querySelector('.btn-save');
    if (btn) btn.innerText = "⏳ ENCODING ULTRA DNA...";
    
    try {
        await updateDoc(doc(db, "Users", currentUser.uid), { avatarConfig: charData });
        alert("🧬 Ultra-Realistic Character DNA Saved Successfully!");
        window.location.href = "lobby.html"; 
    } catch (err) {
        console.error(err);
        alert("❌ Error saving character data!");
        if (btn) btn.innerText = "💾 Save DNA & Enter World";
    }
};

window.addEventListener('DOMContentLoaded', () => {
    renderEngine();
});

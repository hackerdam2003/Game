// js/engine.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { renderMinimap } from './minimap.js'; // 🛑 Import minimap module

const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};
const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🎮 [Game Engine] Advanced Open World & Physics Module Loaded!");

const gameSocket = io('/world'); 

const urlParams = new URLSearchParams(window.location.search);
const gameRoomId = urlParams.get('roomId') || "GLOBAL-ROOM";

let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Racer";
let myAvatarConfig = { 
    gender: "Boy", skin: "#ffcc99", hair: "#1e293b", 
    topColor: "#3b82f6", bottomColor: "#0f172a", 
    height: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, 
    faceShape: 1.0, eyes: 2, hairStyle: 1 
}; 
let players = {}; 

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (err) { console.warn("Fullscreen API skipped"); }

    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';
    
    // 🛑 Fetch user profile and custom avatar config from Firebase safely
    if (auth.currentUser) {
        myUid = auth.currentUser.uid;
        try {
            const snap = await getDoc(doc(db, "Users", myUid));
            if (snap.exists()) {
                const data = snap.data();
                myName = data.gameName || "Racer";
                
                // Properly map gender and avatar configuration
                if (data.gender) myAvatarConfig.gender = data.gender;
                if (data.avatarConfig) {
                    myAvatarConfig = { ...myAvatarConfig, ...data.avatarConfig };
                    if (data.gender) myAvatarConfig.gender = data.gender;
                }
            }
        } catch(e) { console.warn("Firebase fetch warning, using defaults"); }
    } else {
        myUid = window.localStorage.getItem('temp_uid') || myUid;
        myName = window.localStorage.getItem('temp_name') || "Racer";
    }

    if(window.initVoiceSystem) window.initVoiceSystem();

    startGameEngine();
};

function startGameEngine() {
    gameSocket.emit('join-world', { gameRoomId, uid: myUid, name: myName, avatarConfig: myAvatarConfig });

    gameSocket.on('world-state', (serverPlayers) => {
        serverPlayers.forEach(p => { 
            players[p.uid] = p; 
            if(!players[p.uid].avatarConfig) players[p.uid].avatarConfig = myAvatarConfig;
            players[p.uid].chatBubble = null;
            players[p.uid].attackAnim = 0;
        });
        if (!players[myUid]) {
            players[myUid] = { uid: myUid, name: myName, x: 500, y: 500, avatarConfig: myAvatarConfig, attackAnim: 0 };
        }
        updateTeamHUD();
    });

    gameSocket.on('player-moved', (data) => {
        if (players[data.uid]) {
            players[data.uid].x = data.x;
            players[data.uid].y = data.y;
        } else {
            players[data.uid] = { uid: data.uid, name: "Racer", x: data.x, y: data.y, avatarConfig: { gender: "Boy" } };
        }
    });

    gameSocket.on('player-action', (data) => {
        if (players[data.uid]) {
            if (data.action === 'attack') {
                players[data.uid].attackAnim = 15; 
            }
        }
    });

    gameSocket.on('world-chat-broadcast', (data) => {
        if (players[data.uid]) {
            players[data.uid].chatBubble = data.message;
            setTimeout(() => { if(players[data.uid]) players[data.uid].chatBubble = null; }, 4000);
        }
    });

    gameSocket.on('player-left', (data) => {
        delete players[data.uid];
        updateTeamHUD();
    });

    setupJoystick();
    requestAnimationFrame(renderLoop);
}

function updateTeamHUD() {
    const container = document.getElementById('team-hud-list');
    if(!container) return;
    container.innerHTML = '';
    let index = 1;
    
    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;
        const genderIcon = p.avatarConfig?.gender === 'Girl' ? '👧' : '👦';
        container.innerHTML += `
            <div class="hud-profile" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}">
                <span style="font-size: 14px;">${genderIcon}</span>
                <div style="color: white;">
                    <div style="font-size: 11px; font-weight: bold;">[${index}p] ${p.name} ${isMe ? '(You)' : ''}</div>
                    <div class="hp-bar" style="width: 70px;"><div class="hp-fill"></div></div>
                </div>
            </div>
        `;
        index++;
    }
}

// --- JOYSTICK LOGIC ---
let moveVector = { x: 0, y: 0 };
let speed = 6; 

function setupJoystick() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    
    let isDragging = false;
    let center = { x: 0, y: 0 };

    base.addEventListener('touchstart', (e) => {
        isDragging = true;
        const rect = base.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleTouch(e);
    });
    base.addEventListener('touchmove', (e) => { if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', () => {
        isDragging = false;
        knob.style.transform = `translate(0px, 0px)`;
        moveVector = { x: 0, y: 0 };
    });

    function handleTouch(e) {
        const touch = e.touches[0];
        let dx = touch.clientX - center.x;
        let dy = touch.clientY - center.y;
        const maxDist = 45;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        moveVector = { x: dx/maxDist, y: dy/maxDist };
    }
}

// --- ATTACK / FIRE BUTTON ---
const btnAttack = document.getElementById('btn-attack');
if(btnAttack) {
    btnAttack.addEventListener('touchstart', () => {
        const myPlayer = players[myUid];
        if(myPlayer) {
            myPlayer.attackAnim = 15;
            gameSocket.emit('action', { action: 'attack' });
        }
    });
}

// --- RENDER LOOP ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let camX = 0, camY = 0;

function renderLoop() {
    if(!canvas || !ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const myPlayer = players[myUid];
    if (myPlayer) {
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            let nextX = myPlayer.x + moveVector.x * speed;
            let nextY = myPlayer.y + moveVector.y * speed;
            
            // 🛑 COLLISION PUSH LOGIC (Dhakka dena)
            for (const uid in players) {
                if (uid === myUid) continue;
                const other = players[uid];
                let dist = Math.hypot(nextX - other.x, nextY - other.y);
                if (dist < 40) { 
                    nextX -= moveVector.x * speed * 0.6;
                    nextY -= moveVector.y * speed * 0.6;
                }
            }

            myPlayer.x = nextX;
            myPlayer.y = nextY;
            gameSocket.emit('move', { x: myPlayer.x, y: myPlayer.y });
        }
        camX = myPlayer.x - canvas.width / 2;
        camY = myPlayer.y - canvas.height / 2;
    }

    ctx.save();
    ctx.translate(-camX, -camY);

    // 1. Grid Background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for(let i=-3000; i<3000; i+=80) { ctx.beginPath(); ctx.moveTo(i,-3000); ctx.lineTo(i,3000); ctx.stroke(); }
    for(let i=-3000; i<3000; i+=80) { ctx.beginPath(); ctx.moveTo(-3000,i); ctx.lineTo(3000,i); ctx.stroke(); }

    // 2. Environment
    drawEnvironment(ctx);

    // 3. Render Custom Characters with Correct Tags (Name on T-shirt, UID on Head)
    let pIndex = 1;
    for (const uid in players) {
        const p = players[uid];
        drawAdvancedAvatar(ctx, p, uid === myUid, pIndex);
        pIndex++;
    }

    ctx.restore();

    // 4. Render Minimap using modular js/minimap.js
    renderMinimap(players, myUid);

    requestAnimationFrame(renderLoop);
}

function drawEnvironment(ctx) {
    ctx.fillStyle = '#451a03'; 
    ctx.fillRect(200, 100, 250, 200);
    ctx.fillStyle = '#000'; 
    ctx.fillRect(300, 220, 60, 80);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 20px Arial';
    ctx.fillText("Safe House", 325, 90);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(700, 100, 400, 250);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.strokeRect(700, 100, 400, 250);
    
    ctx.fillStyle = '#ef4444'; 
    ctx.fillRect(750, 180, 120, 60); 
    ctx.fillStyle = '#000'; 
    ctx.fillRect(770, 170, 20, 15); ctx.fillRect(830, 170, 20, 15);
    ctx.fillRect(770, 235, 20, 15); ctx.fillRect(830, 235, 20, 15);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px Arial';
    ctx.fillText("Premium Cars Showroom", 750, 80);
}

// --- ADVANCED 2.5D VECTOR ANATOMY & TEXT PLACEMENT RENDERER ---
function drawAdvancedAvatar(ctx, p, isMe, index) {
    const cfg = p.avatarConfig || { gender: 'Boy', skin: '#ffcc99', hair: '#1e293b', topColor: '#3b82f6', bottomColor: '#0f172a', height: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, faceShape: 1.0, eyes: 2, hairStyle: 1 };
    const isGirl = (cfg.gender === 'Girl');

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(cfg.height || 1.0, cfg.height || 1.0);

    // 🛑 1. UID directly ABOVE HEAD (at y = -85)
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`UID: ${p.uid.substring(0,8)}`, 0, -85);

    // 🛑 2. Chat Bubble Popup (Above UID)
    if (p.chatBubble) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(-50, -125, 100, 30);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.strokeRect(-50, -125, 100, 30);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(p.chatBubble, 0, -106);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 35, 18, 8, 0, 0, Math.PI*2); ctx.fill();

    // Breathing / Jiggle Effect
    let time = Date.now() * 0.005;
    let breath = Math.sin(time + p.x) * 2;

    // Legs
    ctx.fillStyle = cfg.bottomColor || '#0f172a';
    ctx.beginPath(); ctx.ellipse(-10, 15, 7, 25, 0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 15, 7, 25, -0.05, 0, Math.PI*2); ctx.fill();

    // Torso / Hourglass Body
    ctx.fillStyle = cfg.topColor || '#3b82f6';
    let shoulderW = 22 * (cfg.torso || 1.0) * (isGirl ? 0.85 : 1.1);
    let hipW = 20 * (cfg.pelvis || 1.0) * (isGirl ? 1.2 : 0.9);
    
    ctx.beginPath();
    ctx.moveTo(-hipW, 0);
    ctx.quadraticCurveTo(-shoulderW, -35 + breath, -shoulderW, -55 + breath);
    ctx.lineTo(shoulderW, -55 + breath);
    ctx.quadraticCurveTo(shoulderW, -35 + breath, hipW, 0);
    ctx.fill();

    // 🛑 3. NAME DIRECTLY ON THE T-SHIRT (at y = -25)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`[${index}p] ${p.name}`, 0, -25);

    // Chest volume representation
    if (isGirl) {
        let cSize = 10 * (cfg.chest || 1.0);
        ctx.fillStyle = cfg.topColor || '#3b82f6';
        ctx.beginPath(); ctx.ellipse(-7, -40 + breath, cSize, cSize*0.8, -0.1, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(7, -40 + breath, cSize, cSize*0.8, 0.1, 0, Math.PI*2); ctx.fill();
    }

    // Arms & Sword Attack Animation
    ctx.fillStyle = cfg.skin || '#ffcc99';
    if (p.attackAnim > 0) {
        p.attackAnim--;
        ctx.beginPath(); ctx.ellipse(shoulderW + 12, -45, 6, 25, -0.8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(shoulderW + 15, -60, 6, 35);
    } else {
        ctx.beginPath(); ctx.ellipse(-shoulderW - 5, -35 + breath, 6, 22, 0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(shoulderW + 5, -35 + breath, 6, 22, -0.2, 0, Math.PI*2); ctx.fill();
    }

    // Head
    ctx.fillStyle = cfg.skin || '#ffcc99';
    let headY = -70 + breath;
    let faceW = 16 * (cfg.faceShape || 1.0);
    ctx.beginPath(); ctx.ellipse(0, headY, faceW, 20, 0, 0, Math.PI*2); ctx.fill();

    // Eyes & Mouth
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-5, headY - 2, cfg.eyes || 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, headY - 2, cfg.eyes || 2, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = p.chatBubble ? '#ef4444' : '#64748b';
    ctx.beginPath(); ctx.arc(0, headY + 8, p.chatBubble ? 3 : 2, 0, Math.PI*2); ctx.fill();

    // Hair (Correctly rendering Girl buns/hair vs Boy hair based on DNA)
    ctx.fillStyle = cfg.hair || '#1e293b';
    if(isGirl) {
        ctx.beginPath(); ctx.ellipse(0, headY - 12, faceW + 3, 12, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, headY - 22, 10, 8, 0, 0, Math.PI*2); ctx.fill(); // Bun
    } else {
        ctx.beginPath(); ctx.ellipse(0, headY - 12, faceW, 9, 0, Math.PI, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}

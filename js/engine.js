// js/engine.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};
const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🎮 [Game Engine] Advanced Open World Pro Module Loaded!");

const gameSocket = io('/world'); 

const urlParams = new URLSearchParams(window.location.search);
const gameRoomId = urlParams.get('roomId') || "GLOBAL-ROOM";

let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Racer";
let myAvatarConfig = {}; 
let players = {}; 

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
    } catch (err) { console.warn("Fullscreen API skipped"); }

    overlay.style.display = 'none';
    hud.style.display = 'block';
    
    // Fetch user profile and custom avatar config from Firebase before entering
    if (auth.currentUser) {
        myUid = auth.currentUser.uid;
        try {
            const snap = await getDoc(doc(db, "Users", myUid));
            if (snap.exists()) {
                const data = snap.data();
                myName = data.gameName || "Racer";
                if (data.avatarConfig) myAvatarConfig = data.avatarConfig;
                myAvatarConfig.gender = data.gender || "Boy";
            }
        } catch(e) { console.warn("Firebase fetch warning, using defaults"); }
    } else {
        myUid = window.localStorage.getItem('temp_uid') || myUid;
        myName = window.localStorage.getItem('temp_name') || "Racer";
        myAvatarConfig = { gender: "Boy", skin: "#ffcc99", hair: "#1e293b", topColor: "#3b82f6", bottomColor: "#0f172a", height: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, faceShape: 1.0, eyes: 2, hairStyle: 1 };
    }

    document.getElementById('player-name-hud').innerText = myName;
    if(window.initVoiceSystem) window.initVoiceSystem();

    startGameEngine();
};

function startGameEngine() {
    gameSocket.emit('join-world', { gameRoomId, uid: myUid, name: myName, avatarConfig: myAvatarConfig });

    gameSocket.on('world-state', (serverPlayers) => {
        serverPlayers.forEach(p => { 
            players[p.uid] = p; 
            players[p.uid].chatBubble = null;
            players[p.uid].attackAnim = 0;
        });
        if (!players[myUid]) players[myUid] = { uid: myUid, name: myName, x: 500, y: 500, avatarConfig: myAvatarConfig, attackAnim: 0 };
        updateTeamHUD();
    });

    gameSocket.on('player-moved', (data) => {
        if (players[data.uid]) {
            players[data.uid].x = data.x;
            players[data.uid].y = data.y;
        }
    });

    gameSocket.on('player-action', (data) => {
        if (players[data.uid]) {
            if (data.action === 'attack') {
                players[data.uid].attackAnim = 15; // Trigger sword swing frames
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
    container.innerHTML = '';
    let index = 1;
    
    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;
        container.innerHTML += `
            <div class="hud-profile" style="border-color: ${isMe ? '#3b82f6' : '#10b981'}">
                <span style="font-size: 14px;">${p.avatarConfig?.gender === 'Girl' ? '👧' : '👦'}</span>
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

// --- ATTACK / FIRE BUTTON LISTENER ---
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
const ctx = canvas.getContext('2d');
let camX = 0, camY = 0;

function renderLoop() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const myPlayer = players[myUid];
    if (myPlayer) {
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            let nextX = myPlayer.x + moveVector.x * speed;
            let nextY = myPlayer.y + moveVector.y * speed;
            
            // 🛑 COLLISION PUSH LOGIC (Dhakka dena / Touching barrier)
            for (const uid in players) {
                if (uid === myUid) continue;
                const other = players[uid];
                let dist = Math.hypot(nextX - other.x, nextY - other.y);
                if (dist < 40) { // Push back if too close
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

    // 2. Draw Environment
    drawEnvironment(ctx);

    // 3. Render All Customized Characters
    let pIndex = 1;
    for (const uid in players) {
        const p = players[uid];
        drawCustomizedAvatar(ctx, p, uid === myUid, pIndex);
        pIndex++;
    }

    ctx.restore();

    // 4. Render Minimap with Numbered Dots (`1p`, `2p`)
    renderMinimap();

    requestAnimationFrame(renderLoop);
}

function drawEnvironment(ctx) {
    // --- Safe House ---
    ctx.fillStyle = '#451a03'; 
    ctx.fillRect(200, 100, 250, 200);
    ctx.fillStyle = '#000'; 
    ctx.fillRect(300, 220, 60, 80);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 20px Arial';
    ctx.fillText("Safe House", 325, 90);

    // --- Car Showroom ---
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
    ctx.fillText("Premium Cars (Buy with Coins)", 750, 80);
}

// --- ADVANCED CUSTOMIZED AVATAR RENDERER (DNA Sync) ---
function drawCustomizedAvatar(ctx, p, isMe, index) {
    const cfg = p.avatarConfig || { gender: 'Boy', skin: '#ffcc99', hair: '#1e293b', topColor: '#3b82f6', bottomColor: '#0f172a', height: 1.0, torso: 1.0, chest: 1.0, pelvis: 1.0, faceShape: 1.0, eyes: 2, hairStyle: 1 };
    const isGirl = (cfg.gender === 'Girl');

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(cfg.height || 1.0, cfg.height || 1.0);

    // Name & [1p] Tag
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`[${index}p] ${p.name}`, 0, -55);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '10px Arial';
    ctx.fillText(p.uid.substring(0,8), 0, -43);

    // Speech / Chat Bubble Popup
    if (p.chatBubble) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(-45, -95, 90, 28);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.strokeRect(-45, -95, 90, 28);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(p.chatBubble, 0, -77);
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.ellipse(0, 20, 16, 8, 0, 0, Math.PI*2); ctx.fill();

    // Legs / Pants
    ctx.fillStyle = cfg.bottomColor || '#0f172a';
    ctx.fillRect(-10, 5, 8, 18);
    ctx.fillRect(2, 5, 8, 18);

    // Torso / Shirt
    ctx.fillStyle = cfg.topColor || '#3b82f6';
    let tW = 24 * (cfg.torso || 1.0);
    ctx.fillRect(-tW/2, -20, tW, 28);

    // Arms & Sword Attack Animation
    ctx.fillStyle = cfg.skin || '#ffcc99';
    if (p.attackAnim > 0) {
        p.attackAnim--;
        // Sword attack slash swing
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(tW/2 + 4, -30, 4, 30);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(tW/2 + 2, -10, 10, 4);
    } else {
        // Normal Arms
        ctx.fillRect(-tW/2 - 10, -18, 8, 22);
        ctx.fillRect(tW/2 + 2, -18, 8, 22);
    }

    // Head
    ctx.fillStyle = cfg.skin || '#ffcc99';
    ctx.beginPath(); ctx.arc(0, -30, 14, 0, Math.PI*2); ctx.fill();

    // Eyes & Mouth
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-4, -33, cfg.eyes || 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -33, cfg.eyes || 2, 0, Math.PI*2); ctx.fill();
    
    // Mouth open if chatting
    ctx.fillStyle = p.chatBubble ? '#ef4444' : '#64748b';
    ctx.beginPath(); ctx.arc(0, -23, p.chatBubble ? 3 : 2, 0, Math.PI*2); ctx.fill();

    // Hair
    ctx.fillStyle = cfg.hair || '#1e293b';
    if(isGirl) {
        ctx.beginPath(); ctx.arc(0, -36, 15, Math.PI, Math.PI*2); ctx.fill();
        ctx.fillRect(-14, -38, 6, 18); ctx.fillRect(8, -38, 6, 18);
    } else {
        ctx.beginPath(); ctx.arc(0, -36, 14, Math.PI*1.1, Math.PI*1.9); ctx.fill();
    }

    ctx.restore();
}

// --- MINIMAP WITH NUMBERED DOTS (`1p`, `2p`) ---
function renderMinimap() {
    let minimapHtml = '';
    const myPlayer = players[myUid];
    if(!myPlayer) return;

    let index = 1;
    for (const uid in players) {
        const p = players[uid];
        let relX = 50 + (p.x - myPlayer.x) * 0.08;
        let relY = 50 + (p.y - myPlayer.y) * 0.08;
        
        if (relX > 5 && relX < 95 && relY > 5 && relY < 95) {
            minimapHtml += `
                <div style="position: absolute; left: ${relX}px; top: ${relY}px; transform: translate(-50%, -50%); background: ${uid === myUid ? '#3b82f6' : '#10b981'}; color: white; font-size: 9px; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid white;">
                    ${index}p
                </div>
            `;
        }
        index++;
    }
    
    const minimapContainer = document.querySelector('.hud-minimap');
    if(minimapContainer) {
        minimapContainer.style.position = 'relative';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.innerHTML = minimapHtml;
    }
}


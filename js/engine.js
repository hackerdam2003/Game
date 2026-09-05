import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};
const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🌍 [Game Engine] Advanced Multiplayer MMO System Loaded!");

const gameSocket = io('/world'); 
let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Player_" + Math.floor(Math.random()*99);
let speed = 0.08; 
let moveVector = { x: 0, y: 0 };

let scene, camera, renderer, clock;
let my3DCharacter = null;
let monsterCharacter = null;
let mixer = null, monsterMixer = null;
let actions = {}; 
let currentAction = 'idle';

// --- MULTIPLAYER VARIABLES ---
const remotePlayers = {}; // Dusre players ka data store karega
let playerListUI = null;
let chatContainer = null;
let floatingLabels = document.createElement('div');
document.body.appendChild(floatingLabels);

// Health & World Stats
let playerHP = 100;
let monsterHP = 100;
let isMonsterDead = false;
let doorMesh = null, enterHouseBtn = null, isNearDoor = false;

const characterFiles = { 'man': './Man.fbx', 'girl': './Peasant%20Girl.fbx' };
let currentSelectedChar = 'man';

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (err) { console.warn("Fullscreen skipped"); }

    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';

    createUIElements();
    init3DWorld(); 
    setupJoystick();
    setupActionButtons();
    setupMultiplayer(); // 🌐 Socket sync start
    setupVoiceChat();   // 🎤 Voice setup
    
    gameSocket.emit('join-world', { gameRoomId: "GLOBAL-ROOM", uid: myUid, name: myName, char: currentSelectedChar });
};

// ==========================================
// 1. UI & OVERLAYS (Chat, Player List, Door)
// ==========================================
function createUIElements() {
    // Top Left - Player List
    playerListUI = document.createElement('div');
    playerListUI.style.cssText = 'position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 10px; z-index: 99999; border-radius: 8px; max-width: 150px; border: 1px solid #3b82f6;';
    document.body.appendChild(playerListUI);
    updatePlayerListUI();

    // Top Right - HUD
    const hpBarUI = document.createElement('div');
    hpBarUI.style.cssText = 'position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.85); color: #fff; font-size: 11px; padding: 10px; z-index: 99999; border-radius: 8px; width: 140px;';
    hpBarUI.innerHTML = `<b>❤️ HP:</b> <span id='p-hp'>100</span><br><b>🧟 Boss:</b> <span id='m-hp'>100</span>`;
    document.body.appendChild(hpBarUI);

    // Bottom Chat Input
    chatContainer = document.createElement('div');
    chatContainer.style.cssText = 'position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 99999; display: flex; gap: 5px;';
    chatContainer.innerHTML = `
        <input type="text" id="chat-input" placeholder="Type message..." style="padding: 8px; border-radius: 20px; border: none; outline: none; width: 200px; background: rgba(255,255,255,0.9);">
        <button id="chat-send" style="padding: 8px 15px; border-radius: 20px; border: none; background: #3b82f6; color: white; font-weight: bold;">Send</button>
        <button id="mic-btn" style="padding: 8px 15px; border-radius: 20px; border: none; background: #ef4444; color: white;">🎤</button>
    `;
    document.body.appendChild(chatContainer);

    document.getElementById('chat-send').addEventListener('click', sendChat);
    document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

    // House Teleport Button
    enterHouseBtn = document.createElement('button');
    enterHouseBtn.innerHTML = "🏠 Enter House";
    enterHouseBtn.style.cssText = "position: fixed; top: 25%; left: 50%; transform: translateX(-50%); padding: 12px 24px; font-size: 16px; font-weight: bold; background: #10b981; color: white; border: none; border-radius: 8px; display: none; z-index: 100000; box-shadow: 0px 4px 10px rgba(0,0,0,0.5);";
    document.body.appendChild(enterHouseBtn);
    enterHouseBtn.addEventListener('click', () => { window.location.href = "house.html"; });
}

function updatePlayerListUI() {
    let html = `<b style="color:#38bdf8;">🌐 Live Players</b><hr style="border-color:#333; margin:4px 0;">`;
    html += `<div style="color:#10b981;">⭐ 1p: ${myName} (You)</div>`;
    let count = 2;
    for(let uid in remotePlayers) {
        html += `<div style="color:#e2e8f0;">👤 ${count}p: ${remotePlayers[uid].name}</div>`;
        count++;
    }
    if(playerListUI) playerListUI.innerHTML = html;
}

// ==========================================
// 2. MULTIPLAYER NETWORKING (Socket.io)
// ==========================================
function setupMultiplayer() {
    // 1. Existing players jab hum join karein
    gameSocket.on('current-players', (players) => {
        for(let id in players) {
            if(id !== myUid && !remotePlayers[id]) addRemotePlayer(players[id]);
        }
    });

    // 2. Naya player join kare
    gameSocket.on('player-joined', (playerData) => {
        if(playerData.uid !== myUid) addRemotePlayer(playerData);
    });

    // 3. Movement Sync
    gameSocket.on('player-moved', (data) => {
        if(remotePlayers[data.uid]) {
            remotePlayers[data.uid].targetPos = new THREE.Vector3(data.x, data.y, data.z);
            remotePlayers[data.uid].targetRot = data.rot;
            remotePlayers[data.uid].action = data.action || 'run'; // Trigger animation
        }
    });

    // 4. Chat System
    gameSocket.on('chat-message', (data) => {
        showChatBubble(data.uid, data.msg);
    });

    // 5. Player Left
    gameSocket.on('player-left', (uid) => {
        if(remotePlayers[uid]) {
            scene.remove(remotePlayers[uid].mesh);
            if(remotePlayers[uid].label) remotePlayers[uid].label.remove();
            delete remotePlayers[uid];
            updatePlayerListUI();
        }
    });
}

function addRemotePlayer(data) {
    // Ek basic 3D representation dusre players ke liye (optimization ke liye BoxGeometry temporary)
    const geometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x || 0, 0.8, data.z || 0);
    scene.add(mesh);

    // Nametag UI
    const label = document.createElement('div');
    label.style.cssText = 'position: absolute; color: white; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; transform: translate(-50%, -100%); pointer-events: none; transition: 0.1s;';
    label.innerText = data.name;
    floatingLabels.appendChild(label);

    remotePlayers[data.uid] = { 
        mesh: mesh, 
        label: label,
        targetPos: mesh.position.clone(), 
        targetRot: 0, 
        name: data.name, 
        uid: data.uid,
        chatTimeout: null
    };
    updatePlayerListUI();
}

// ==========================================
// 3. CHAT & VOICE SYSTEM
// ==========================================
function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(msg !== "") {
        gameSocket.emit('chat-message', { uid: myUid, name: myName, msg: msg });
        showChatBubble(myUid, msg); // Show my own chat
        input.value = "";
    }
}

function showChatBubble(uid, msg) {
    let targetLabel = uid === myUid ? document.getElementById('my-label') : (remotePlayers[uid] ? remotePlayers[uid].label : null);
    
    if(!targetLabel && uid === myUid) {
        targetLabel = document.createElement('div');
        targetLabel.id = 'my-label';
        targetLabel.style.cssText = 'position: absolute; color: #3b82f6; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; transform: translate(-50%, -100%); pointer-events: none; transition: 0.1s;';
        floatingLabels.appendChild(targetLabel);
    }

    if(targetLabel) {
        targetLabel.innerHTML = `${uid === myUid ? 'You' : remotePlayers[uid].name}: <span style="color:#fff;">${msg}</span>`;
        if(uid !== myUid) {
            clearTimeout(remotePlayers[uid].chatTimeout);
            remotePlayers[uid].chatTimeout = setTimeout(() => { targetLabel.innerText = remotePlayers[uid].name; }, 5000);
        } else {
            setTimeout(() => { targetLabel.innerHTML = ''; }, 5000);
        }
    }
}

function setupVoiceChat() {
    const micBtn = document.getElementById('mic-btn');
    let isMicOn = false;
    micBtn.addEventListener('click', async () => {
        if(!isMicOn) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                micBtn.style.background = '#10b981'; // Green indicates ON
                isMicOn = true;
                // WebRTC audio broadcast setup goes here in production
                console.log("🎤 Voice Chat Active");
            } catch (err) {
                alert("Microphone permission denied.");
            }
        } else {
            micBtn.style.background = '#ef4444'; // Red OFF
            isMicOn = false;
        }
    });
}

// ==========================================
// 4. 3D WORLD & RENDER LOOP
// ==========================================
function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.4, 3.2); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);
    scene.add(new THREE.GridHelper(50, 50, 0x3b82f6, 0x1e293b));

    createDoorMarker();
    loadCharacter(currentSelectedChar);
    loadMonster();
    requestAnimationFrame(renderLoop);
}

function createDoorMarker() {
    doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 }));
    doorMesh.position.set(4, 1.25, -4);
    scene.add(doorMesh);
}

function loadCharacter(charKey) {
    const fbxLoader = new FBXLoader();
    if (my3DCharacter) scene.remove(my3DCharacter);
    fbxLoader.load(characterFiles[charKey], (object) => {
        my3DCharacter = object;
        my3DCharacter.scale.set(0.01, 0.01, 0.01);
        my3DCharacter.position.set(0, 0, 0);
        scene.add(my3DCharacter);
        mixer = new THREE.AnimationMixer(my3DCharacter);
        if (object.animations.length > 0) { actions.idle = mixer.clipAction(object.animations[0]); actions.idle.play(); }
        loadAnimations(fbxLoader);
    });
}

function loadAnimations(fbxLoader) {
    fbxLoader.load('./Running.fbx', (anim) => { if(anim.animations.length) actions.run = mixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Punching.fbx', (anim) => { if(anim.animations.length) { actions.punch = mixer.clipAction(anim.animations[0]); actions.punch.setLoop(THREE.LoopOnce); }});
    fbxLoader.load('./Hip%20Hop%20Dancing.fbx', (anim) => { if(anim.animations.length) actions.dance = mixer.clipAction(anim.animations[0]); });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    if(actions[currentAction]) actions[currentAction].fadeOut(0.2);
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
}

function playOneShotAnim(animName, returnToAnim = 'idle') {
    if (!mixer || !actions[animName]) return;
    if(actions[currentAction]) actions[currentAction].fadeOut(0.1);
    actions[animName].reset().fadeIn(0.1).play();
    currentAction = animName;
    mixer.addEventListener('finished', function listener(e) {
        if (e.action === actions[animName]) { mixer.removeEventListener('finished', listener); playAnim(returnToAnim); }
    });
}

function loadMonster() {
    new FBXLoader().load('./Mpc%20Skeletonzombie.fbx', (object) => {
        monsterCharacter = object;
        monsterCharacter.scale.set(0.01, 0.01, 0.01);
        monsterCharacter.position.set(-3, 0, -5);
        scene.add(monsterCharacter);
        monsterMixer = new THREE.AnimationMixer(monsterCharacter);
        if (object.animations.length > 0) monsterMixer.clipAction(object.animations[0]).play();
    });
}

function setupJoystick() {
    const base = document.getElementById('joystick-base'), knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    let isDragging = false, center = {x:0, y:0};

    base.addEventListener('touchstart', (e) => {
        isDragging = true;
        const rect = base.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleTouch(e);
    });
    base.addEventListener('touchmove', (e) => { if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', () => {
        isDragging = false; knob.style.transform = `translate(0, 0)`; moveVector = { x: 0, y: 0 };
        playAnim('idle'); 
        gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: 'idle' });
    });

    function handleTouch(e) {
        let dx = e.touches[0].clientX - center.x, dy = e.touches[0].clientY - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 45) { dx = (dx/dist)*45; dy = (dy/dist)*45; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        moveVector = { x: dx/45, y: dy/45 };
        if (dist > 5) playAnim('run'); 
    }
}

function setupActionButtons() {
    document.getElementById('btn-attack')?.addEventListener('touchstart', () => {
        if(actions.punch) playOneShotAnim('punch', 'idle');
        gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: 'punch' });
        if (my3DCharacter && monsterCharacter && !isMonsterDead && my3DCharacter.position.distanceTo(monsterCharacter.position) < 3.5) { 
            monsterHP -= 20;
            if (monsterHP <= 0) { isMonsterDead = true; scene.remove(monsterCharacter); alert("🏆 Monster Defeated!"); }
            document.getElementById('m-hp').innerText = monsterHP;
        }
    });
    document.getElementById('btn-skill')?.addEventListener('touchstart', () => {
        if(actions.dance) playAnim('dance');
        gameSocket.emit('player-moved', { uid: myUid, action: 'dance' });
    });
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;
    if (mixer) mixer.update(delta);
    if (monsterMixer) monsterMixer.update(delta);

    // --- MY PLAYER MOVEMENT ---
    if (my3DCharacter) {
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            my3DCharacter.rotation.y = Math.atan2(moveVector.x, moveVector.y);
            
            // Broadcast movement to others
            gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction });
        }

        if (doorMesh) {
            const dist = my3DCharacter.position.distanceTo(doorMesh.position);
            if (dist < 2.0 && !isNearDoor) { isNearDoor = true; enterHouseBtn.style.display = "block"; }
            else if (dist >= 2.0 && isNearDoor) { isNearDoor = false; enterHouseBtn.style.display = "none"; }
        }

        camera.position.set(my3DCharacter.position.x, my3DCharacter.position.y + 1.2, my3DCharacter.position.z + 2.5);
        camera.lookAt(my3DCharacter.position.x, my3DCharacter.position.y + 0.8, my3DCharacter.position.z);
        
        // Update my own chat bubble position
        const myLabel = document.getElementById('my-label');
        if(myLabel && myLabel.innerHTML !== "") {
            const pos = my3DCharacter.position.clone();
            pos.y += 1.8; pos.project(camera);
            myLabel.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
            myLabel.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
        }
    }

    // --- REMOTE PLAYERS SYNC & CHAT BUBBLES ---
    for(let uid in remotePlayers) {
        const rp = remotePlayers[uid];
        rp.mesh.position.lerp(rp.targetPos, 0.1); // Smooth Interpolation
        rp.mesh.rotation.y = rp.targetRot;
        
        // Float Names & Chat above remote players
        if(rp.label) {
            const pos = rp.mesh.position.clone();
            pos.y += 1.8; // Height above head
            pos.project(camera);
            const x = (pos.x * .5 + .5) * window.innerWidth;
            const y = -(pos.y * .5 - .5) * window.innerHeight;
            if(pos.z < 1) { // Visible on camera
                rp.label.style.display = 'block';
                rp.label.style.left = `${x}px`;
                rp.label.style.top = `${y}px`;
            } else {
                rp.label.style.display = 'none';
            }
        }
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}


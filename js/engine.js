import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { renderMinimap } from './minimap.js';

// Setup Firebase
const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};
const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🎮 [Game Engine] Fixed Single-Page Multiplayer Loaded!");

// 🚨 FIX 1: Default namespace par connect kiya taaki server link ho jaye
const gameSocket = io(); 

let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Player_" + Math.floor(Math.random()*99);
let speed = 0.08; 
let moveVector = { x: 0, y: 0 };

// Scene Management (World vs House)
let currentEnvironment = "world";
let scene, camera, renderer, clock;
let worldGroup, houseGroup; 

// Characters & Animations
let my3DCharacter = null;
let monsterCharacter = null;
let mixer = null, monsterMixer = null;
let actions = {}; 
let currentAction = 'idle';

// Multiplayer
const remotePlayers = {}; 
let allPlayersData = {}; 
let floatingLabels = document.createElement('div');
document.body.appendChild(floatingLabels);

// World Stats & Objects
let playerHP = 100, monsterHP = 100, isMonsterDead = false;
let doorMesh = null, exitDoorMesh = null;
let enterHouseBtn = null, actionUI = null, playerListUI = null, chatContainer = null;
let isBusy = false; 

// Furniture Pos
const CHAIR_POS = { x: -3, z: -2 };
const BED_POS = { x: 3, z: -4 };

const characterFiles = { 'man': './Man.fbx', 'girl': './Peasant%20Girl.fbx' };
let currentSelectedChar = 'man';

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (err) {}

    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';

    createUIElements();
    init3DWorld(); 
    setupJoystick();
    setupActionButtons();
    setupMultiplayer();
    
    gameSocket.emit('join-world', { 
        gameRoomId: "GLOBAL-ROOM", 
        uid: myUid, 
        name: myName, 
        char: currentSelectedChar,
        env: currentEnvironment
    });
};

// ==========================================
// 1. UI SETUP 
// ==========================================
function createUIElements() {
    // Top HUD
    const hudBar = document.createElement('div');
    hudBar.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; pointer-events: none;';
    hudBar.innerHTML = `<div style="background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 10px; border-radius: 8px; border: 1px solid #3b82f6;"><b>❤️ HP:</b> <span id='p-hp'>100</span> | <b>🧟 Boss:</b> <span id='m-hp'>100</span></div>`;
    document.body.appendChild(hudBar);

    // 🚨 FIX 3: Restored Player List UI
    playerListUI = document.createElement('div');
    playerListUI.style.cssText = 'position: fixed; top: 60px; left: 10px; background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 10px; z-index: 99999; border-radius: 8px; min-width: 120px; border: 1px solid #3b82f6;';
    document.body.appendChild(playerListUI);
    updatePlayerListUI();

    // 🚨 Restored Chat UI
    chatContainer = document.createElement('div');
    chatContainer.style.cssText = 'position: fixed; bottom: 10px; left: 50%; transform: translateX(-50%); z-index: 99999; display: flex; gap: 5px;';
    chatContainer.innerHTML = `
        <input type="text" id="chat-input" placeholder="Type message..." style="padding: 8px; border-radius: 20px; border: none; outline: none; width: 200px; background: rgba(255,255,255,0.9);">
        <button id="chat-send" style="padding: 8px 15px; border-radius: 20px; border: none; background: #3b82f6; color: white; font-weight: bold;">Send</button>
    `;
    document.body.appendChild(chatContainer);
    
    document.getElementById('chat-send').addEventListener('click', sendChat);
    document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChat(); });

    // Enter/Exit House Button
    enterHouseBtn = document.createElement('button');
    enterHouseBtn.style.cssText = "position: fixed; top: 20%; left: 50%; transform: translateX(-50%); padding: 12px 24px; font-size: 16px; font-weight: bold; background: #10b981; color: white; border: none; border-radius: 8px; display: none; z-index: 10000; box-shadow: 0px 4px 10px rgba(0,0,0,0.5); cursor: pointer;";
    document.body.appendChild(enterHouseBtn);

    // Furniture Actions UI
    actionUI = document.createElement('div');
    actionUI.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); display: none; gap: 10px; z-index: 10000;';
    actionUI.innerHTML = `
        <button id="btn-sit" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🪑 Sit</button>
        <button id="btn-sleep" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🛏️ Sleep</button>
        <button id="btn-stand" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🧍 Stand</button>
    `;
    document.body.appendChild(actionUI);
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
// 2. 3D SCENE MANAGEMENT 
// ==========================================
function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    
    // 🚨 FIX 2: Black Screen permanently fixed by forcing canvas width/height
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '-1';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.4, 3.2); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    worldGroup = new THREE.Group();
    houseGroup = new THREE.Group();
    scene.add(worldGroup);
    scene.add(houseGroup);

    const ambientW = new THREE.AmbientLight(0xffffff, 1.5);
    const dirLightW = new THREE.DirectionalLight(0xfff0dd, 2);
    dirLightW.position.set(5, 10, 5);
    worldGroup.add(ambientW);
    worldGroup.add(dirLightW);
    worldGroup.add(new THREE.GridHelper(50, 50, 0x3b82f6, 0x1e293b));

    doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.8 }));
    doorMesh.position.set(4, 1.25, -4);
    worldGroup.add(doorMesh);

    const ambientH = new THREE.AmbientLight(0xffffff, 1.2);
    const pointLightH = new THREE.PointLight(0xffddaa, 1.5, 20);
    pointLightH.position.set(0, 4, 0);
    houseGroup.add(ambientH);
    houseGroup.add(pointLightH);

    const houseFloor = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    houseFloor.rotation.x = -Math.PI / 2;
    houseGroup.add(houseFloor);

    const chairMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
    chairMesh.position.set(CHAIR_POS.x, 0.5, CHAIR_POS.z);
    houseGroup.add(chairMesh);

    const bedMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    bedMesh.position.set(BED_POS.x, 0.25, BED_POS.z);
    houseGroup.add(bedMesh);

    exitDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.5), new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 }));
    exitDoorMesh.position.set(0, 1.25, 6);
    houseGroup.add(exitDoorMesh);

    houseGroup.visible = false;

    loadCharacter(currentSelectedChar);
    loadMonster();
    requestAnimationFrame(renderLoop);
}

function switchEnvironment(targetEnv) {
    currentEnvironment = targetEnv;
    isBusy = false;
    
    if(targetEnv === "house") {
        worldGroup.visible = false;
        houseGroup.visible = true;
        scene.background = new THREE.Color(0x1e293b); 
        my3DCharacter.position.set(0, 0, 4); 
        enterHouseBtn.style.display = "none";
    } else {
        worldGroup.visible = true;
        houseGroup.visible = false;
        scene.background = new THREE.Color(0x0f172a); 
        my3DCharacter.position.set(4, 0, -2); 
        enterHouseBtn.style.display = "none";
    }
    
    gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: 'idle', env: currentEnvironment });
}

// ==========================================
// 3. CHARACTERS & ANIMATIONS
// ==========================================
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
    // ⚠️ Note: File names are case-sensitive on GitHub. Ensure they match exactly.
    fbxLoader.load('./Running.fbx', (anim) => { if(anim.animations.length) actions.run = mixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Punching.fbx', (anim) => { if(anim.animations.length) { actions.punch = mixer.clipAction(anim.animations[0]); actions.punch.setLoop(THREE.LoopOnce); }});
    fbxLoader.load('./Sitting.fbx', (anim) => { if(anim.animations.length) actions.sit = mixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Sleeping.fbx', (anim) => { if(anim.animations.length) actions.sleep = mixer.clipAction(anim.animations[0]); });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    if(actions[currentAction]) actions[currentAction].fadeOut(0.2);
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
    gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction, env: currentEnvironment });
}

function loadMonster() {
    new FBXLoader().load('./Mpc%20Skeletonzombie.fbx', (object) => {
        monsterCharacter = object;
        monsterCharacter.scale.set(0.01, 0.01, 0.01);
        monsterCharacter.position.set(-3, 0, -5);
        worldGroup.add(monsterCharacter); 
        monsterMixer = new THREE.AnimationMixer(monsterCharacter);
        if (object.animations.length > 0) monsterMixer.clipAction(object.animations[0]).play();
    });
}

// ==========================================
// 4. MULTIPLAYER SYNC & CHAT
// ==========================================
function setupMultiplayer() {
    gameSocket.on('current-players', (players) => {
        for(let id in players) {
            allPlayersData[id] = players[id];
            if(id !== myUid && !remotePlayers[id]) addRemotePlayer(players[id]);
        }
        renderMinimap(allPlayersData, myUid);
    });

    gameSocket.on('player-joined', (data) => {
        allPlayersData[data.uid] = data;
        if(data.uid !== myUid) addRemotePlayer(data);
        renderMinimap(allPlayersData, myUid);
    });

    gameSocket.on('player-moved', (data) => {
        allPlayersData[data.uid] = data;
        if(remotePlayers[data.uid]) {
            remotePlayers[data.uid].targetPos = new THREE.Vector3(data.x, data.y, data.z);
            remotePlayers[data.uid].targetRot = data.rot;
            remotePlayers[data.uid].env = data.env;
            
            if(remotePlayers[data.uid].mixer && remotePlayers[data.uid].actions[data.action]) {
                const actionToPlay = remotePlayers[data.uid].actions[data.action];
                if(remotePlayers[data.uid].currentAction !== data.action) {
                    if(remotePlayers[data.uid].actions[remotePlayers[data.uid].currentAction]) {
                        remotePlayers[data.uid].actions[remotePlayers[data.uid].currentAction].fadeOut(0.2);
                    }
                    actionToPlay.reset().fadeIn(0.2).play();
                    remotePlayers[data.uid].currentAction = data.action;
                }
            }
        }
        renderMinimap(allPlayersData, myUid);
    });

    gameSocket.on('chat-message', (data) => {
        showChatBubble(data.uid, data.msg);
    });

    gameSocket.on('player-left', (uid) => {
        if(remotePlayers[uid]) {
            scene.remove(remotePlayers[uid].mesh);
            if(remotePlayers[uid].label) remotePlayers[uid].label.remove();
            delete remotePlayers[uid];
            updatePlayerListUI();
        }
        delete allPlayersData[uid];
        renderMinimap(allPlayersData, myUid);
    });
}

function addRemotePlayer(data) {
    const geometry = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
    const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x || 0, 0.8, data.z || 0);
    scene.add(mesh);

    const label = document.createElement('div');
    label.style.cssText = 'position: absolute; color: white; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; transform: translate(-50%, -100%); pointer-events: none;';
    label.innerText = data.name;
    floatingLabels.appendChild(label);

    remotePlayers[data.uid] = { 
        mesh: mesh, 
        label: label,
        targetPos: mesh.position.clone(), 
        targetRot: 0,
        env: data.env || 'world',
        name: data.name,
        currentAction: 'idle',
        actions: {},
        chatTimeout: null
    };
    updatePlayerListUI();
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(msg !== "") {
        gameSocket.emit('chat-message', { uid: myUid, name: myName, msg: msg });
        showChatBubble(myUid, msg);
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

// ==========================================
// 5. CONTROLS & INTERACTION
// ==========================================
function setupJoystick() {
    const base = document.getElementById('joystick-base'), knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    let isDragging = false, center = {x:0, y:0};

    base.addEventListener('touchstart', (e) => {
        if(isBusy) return;
        isDragging = true;
        const rect = base.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleTouch(e);
    });
    base.addEventListener('touchmove', (e) => { if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', () => {
        isDragging = false; knob.style.transform = `translate(0, 0)`; moveVector = { x: 0, y: 0 };
        if(!isBusy) playAnim('idle'); 
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
        if(currentEnvironment !== 'world' || isBusy) return;
        if(actions.punch) { actions.punch.reset().fadeIn(0.1).play(); currentAction = 'punch'; }
        
        if (monsterCharacter && !isMonsterDead && my3DCharacter.position.distanceTo(monsterCharacter.position) < 3.5) { 
            monsterHP -= 20;
            if (monsterHP <= 0) { isMonsterDead = true; worldGroup.remove(monsterCharacter); alert("🏆 Monster Defeated!"); }
            document.getElementById('m-hp').innerText = monsterHP;
        }
    });

    document.getElementById('btn-sit').addEventListener('touchstart', () => {
        isBusy = true; my3DCharacter.position.set(CHAIR_POS.x, 0.5, CHAIR_POS.z); playAnim('sit');
    });
    document.getElementById('btn-sleep').addEventListener('touchstart', () => {
        isBusy = true; my3DCharacter.position.set(BED_POS.x, 0.5, BED_POS.z); my3DCharacter.rotation.y = Math.PI / 2; playAnim('sleep');
    });
    document.getElementById('btn-stand').addEventListener('touchstart', () => {
        isBusy = false; my3DCharacter.position.set(0, 0, 0); playAnim('idle');
    });
}

// ==========================================
// 6. RENDER LOOP & RESIZE FIX
// ==========================================
function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;
    if (mixer) mixer.update(delta);
    if (monsterMixer) monsterMixer.update(delta);

    if (my3DCharacter) {
        if (!isBusy && (moveVector.x !== 0 || moveVector.y !== 0)) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            my3DCharacter.rotation.y = Math.atan2(moveVector.x, moveVector.y);
            
            allPlayersData[myUid] = { x: my3DCharacter.position.x, y: my3DCharacter.position.z };
            gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction, env: currentEnvironment });
            renderMinimap(allPlayersData, myUid);
        }

        if (currentEnvironment === "world") {
            if (my3DCharacter.position.distanceTo(doorMesh.position) < 2.0) {
                enterHouseBtn.style.display = "block";
                enterHouseBtn.innerHTML = "🏠 Enter House";
                enterHouseBtn.onclick = () => switchEnvironment("house");
            } else {
                enterHouseBtn.style.display = "none";
            }
        } 
        else if (currentEnvironment === "house") {
            if (my3DCharacter.position.distanceTo(exitDoorMesh.position) < 2.0) {
                enterHouseBtn.style.display = "block";
                enterHouseBtn.innerHTML = "🚪 Exit House";
                enterHouseBtn.onclick = () => switchEnvironment("world");
            } else {
                enterHouseBtn.style.display = "none";
            }

            if(!isBusy) {
                const distToChair = Math.hypot(my3DCharacter.position.x - CHAIR_POS.x, my3DCharacter.position.z - CHAIR_POS.z);
                const distToBed = Math.hypot(my3DCharacter.position.x - BED_POS.x, my3DCharacter.position.z - BED_POS.z);
                
                actionUI.style.display = (distToChair < 1.5 || distToBed < 2.0) ? 'flex' : 'none';
                document.getElementById('btn-sit').style.display = distToChair < 1.5 ? 'block' : 'none';
                document.getElementById('btn-sleep').style.display = distToBed < 2.0 ? 'block' : 'none';
                document.getElementById('btn-stand').style.display = 'none';
            } else {
                actionUI.style.display = 'flex';
                document.getElementById('btn-sit').style.display = 'none';
                document.getElementById('btn-sleep').style.display = 'none';
                document.getElementById('btn-stand').style.display = 'block';
            }
        }

        camera.position.set(my3DCharacter.position.x, my3DCharacter.position.y + 1.5, my3DCharacter.position.z + 3.0);
        camera.lookAt(my3DCharacter.position.x, my3DCharacter.position.y + 0.8, my3DCharacter.position.z);
        
        const myLabel = document.getElementById('my-label');
        if(myLabel && myLabel.innerHTML !== "") {
            const pos = my3DCharacter.position.clone();
            pos.y += 1.8; pos.project(camera);
            myLabel.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
            myLabel.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
        }
    }

    for(let uid in remotePlayers) {
        const rp = remotePlayers[uid];
        if(rp.env === currentEnvironment) {
            rp.mesh.visible = true;
            rp.mesh.position.lerp(rp.targetPos, 0.1);
            rp.mesh.rotation.y = rp.targetRot;
            
            if(rp.label) {
                const pos = rp.mesh.position.clone();
                pos.y += 1.8; pos.project(camera);
                if(pos.z < 1) {
                    rp.label.style.display = 'block';
                    rp.label.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
                    rp.label.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
                } else {
                    rp.label.style.display = 'none';
                }
            }
        } else {
            rp.mesh.visible = false;
            if(rp.label) rp.label.style.display = 'none';
        }
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // 🚨 FIX: Force canvas width update on resize
        const canvas = renderer.domElement;
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
    }
});


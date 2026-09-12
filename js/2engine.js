import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
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

console.log("🏝️ [Island Engine] Full Body Camera, Solid Ground, Pool Fix & True Joystick Active!");

const gameSocket = io(); 

let myUid = localStorage.getItem('playerUID') || "UID_" + Math.floor(Math.random()*99999);
let myName = localStorage.getItem('gameName') || localStorage.getItem('playerName') || "Guest_" + Math.floor(Math.random()*999);
let speed = 0.08; 
let moveVector = { x: 0, y: 0 };

let currentEnvironment = "island";
let scene, camera, renderer, clock, controls;
let worldGroup; 

let my3DCharacter = null;
let mixer = null;
let actions = {}; 
let currentAction = 'dance'; 

const remotePlayers = {}; 
let allPlayersData = {}; 
let floatingLabels = document.createElement('div');
document.body.appendChild(floatingLabels);

let isBusy = false; 
let inWater = false; 

// 🚀 FIXED HEIGHTS (Ground aur Pool dono neeche kiye gaye hain)
const GROUND_Y = -1.5; 
const POOL_Y = -1.6;
const WATER_Y = -2.5; 
const POOL_CENTER_X = 0;
const POOL_CENTER_Z = -10;
const POOL_RADIUS = 9;

const characterFiles = { 
    'man': './Man.fbx', 
    'girl': './Peasant%20Girl.fbx',
    'hotgirl': './Hotgirl.fbx', 
    'mymodel': 'assets/all_animations.glb'
};
let currentSelectedChar = localStorage.getItem('selectedCharacter') || 'man';

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (err) {}

    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';

    createCharSwitcherUI(); 
    createPoseUI(); 
    init3DWorld(); 
    setupJoystick();
    setupActionButtons();
    setupMultiplayer();
    setupChatAndVoice();
    
    gameSocket.emit('join-world', { 
        gameRoomId: "ISLAND-MAP", 
        uid: myUid, 
        name: myName, 
        char: currentSelectedChar, 
        env: currentEnvironment
    });
};

function createCharSwitcherUI() {
    if(document.getElementById('char-switch-menu')) return;
    const charSwitchMenu = document.createElement('div');
    charSwitchMenu.id = 'char-switch-menu';
    charSwitchMenu.style.cssText = 'position: fixed; top: 50%; left: 15px; transform: translateY(-50%); z-index: 100000; pointer-events: auto; display: flex; flex-direction: column; gap: 15px;';
    
    charSwitchMenu.innerHTML = `
        <button onclick="window.switchGameCharacter('man')" style="background: rgba(30,41,59,0.8); border: 2px solid #3b82f6; color: white; border-radius: 50%; width: 45px; height: 45px; font-size: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">👦</button>
        <button onclick="window.switchGameCharacter('girl')" style="background: rgba(30,41,59,0.8); border: 2px solid #ec4899; color: white; border-radius: 50%; width: 45px; height: 45px; font-size: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">👧</button>
        <button onclick="window.switchGameCharacter('hotgirl')" style="background: rgba(30,41,59,0.8); border: 2px solid #10b981; color: white; border-radius: 50%; width: 45px; height: 45px; font-size: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">💃</button>
    `;
    document.body.appendChild(charSwitchMenu);
}

window.switchGameCharacter = function(charKey) {
    currentSelectedChar = charKey;
    localStorage.setItem('selectedCharacter', charKey);
    loadCharacter(charKey);
};

function createPoseUI() {
    if(document.getElementById('pose-menu')) return;
    const poseMenu = document.createElement('div');
    poseMenu.id = 'pose-menu';
    poseMenu.style.cssText = 'position: fixed; bottom: 160px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 10000; pointer-events: auto; align-items: flex-end;';
    poseMenu.innerHTML = `
        <button id="btn-sitDazed" style="padding: 6px 12px; background: rgba(59,130,246,0.8); color: white; border: 1px solid #fff; border-radius: 8px; font-weight: bold; cursor: pointer;">🧘 Sit</button>
        <button id="btn-lieDown" style="padding: 6px 12px; background: rgba(139,92,246,0.8); color: white; border: 1px solid #fff; border-radius: 8px; font-weight: bold; cursor: pointer;">🛌 Lie</button>
        <button id="btn-layM" style="padding: 6px 12px; background: rgba(6,182,212,0.8); color: white; border: 1px solid #fff; border-radius: 8px; font-weight: bold; cursor: pointer;">🧍‍♂️ Pose</button>
        <button id="btn-stand" style="padding: 8px 16px; background: #ef4444; color: white; border: 2px solid #fff; border-radius: 8px; font-weight: bold; cursor: pointer; display: none;">🧍 Stand</button>
    `;
    document.body.appendChild(poseMenu);
}

function resetPoseUI() {
    isBusy = false;
    document.getElementById('btn-sitDazed').style.display = 'block';
    document.getElementById('btn-lieDown').style.display = 'block';
    document.getElementById('btn-layM').style.display = 'block';
    document.getElementById('btn-stand').style.display = 'none';
}

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';

    scene = new THREE.Scene();
    // 🚀 FIXED: Clean Sky without 3D model load
    scene.background = new THREE.Color(0x87CEEB); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 15000); 
    camera.position.set(0, 5, 8); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    renderer.domElement.style.touchAction = 'none'; 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8; 
    controls.enablePan = false; 
    controls.minDistance = 3.0; 
    controls.maxDistance = 15; 
    controls.maxPolarAngle = Math.PI / 2; 

    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const ambientW = new THREE.AmbientLight(0xffffff, 1.2);
    const dirLightW = new THREE.DirectionalLight(0xfff0dd, 2.5);
    dirLightW.position.set(100, 200, 50);
    dirLightW.castShadow = true;
    worldGroup.add(ambientW);
    worldGroup.add(dirLightW);
    
    loadIslandMap(); 

    loadCharacter(currentSelectedChar);
    requestAnimationFrame(renderLoop);
}

function loadIslandMap() {
    // 🏝️ FLAT GROUND 
    const islandGeo = new THREE.PlaneGeometry(1500, 1500);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0xe6c280, roughness: 0.9 }); 
    const ground = new THREE.Mesh(islandGeo, islandMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y; // Locked Ground Level
    worldGroup.add(ground);

    // 🏊 POOL
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('https://hackerdam2003.github.io/Game/Pool.glb', (gltf) => {
        const pool = gltf.scene;
        const box = new THREE.Box3().setFromObject(pool);
        const maxDim = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
        const scaleFactor = 30 / maxDim; 
        pool.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        pool.position.set(POOL_CENTER_X, POOL_Y, POOL_CENTER_Z); 
        worldGroup.add(pool);
    });
}

function loadCharacter(charKey) {
    const fbxLoader = new FBXLoader();
    const gltfLoader = new GLTFLoader();
    if (my3DCharacter) scene.remove(my3DCharacter);
    
    const url = characterFiles[charKey] || characterFiles['man'];
    const isGLB = url.toLowerCase().endsWith('.glb');

    let scaleVal = 0.013;
    if(charKey === 'girl' || charKey === 'hotgirl') scaleVal = 0.025; // Girls scaled up properly
    
    if(isGLB) {
        gltfLoader.load(url, (gltf) => {
            my3DCharacter = gltf.scene;
            my3DCharacter.scale.set(1, 1, 1);
            my3DCharacter.position.set(0, GROUND_Y, 5); 
            scene.add(my3DCharacter);
            mixer = new THREE.AnimationMixer(my3DCharacter);
            if(gltf.animations.length > 0) {
                actions.dance = mixer.clipAction(gltf.animations[0]);
                actions.dance.play();
                currentAction = 'dance';
            }
            loadAdditionalAnimations(fbxLoader, mixer, actions);
        });
    } else {
        fbxLoader.load(url, (object) => {
            my3DCharacter = object;
            my3DCharacter.scale.set(scaleVal, scaleVal, scaleVal); 
            my3DCharacter.position.set(0, GROUND_Y, 5); 
            scene.add(my3DCharacter);
            mixer = new THREE.AnimationMixer(my3DCharacter);
            loadAnimations(fbxLoader, mixer, actions, object);
        });
    }
}

function loadAnimations(fbxLoader, targetMixer, targetActions, baseObject) {
    if (baseObject.animations.length > 0) targetActions.idle = targetMixer.clipAction(baseObject.animations[0]);
    loadAdditionalAnimations(fbxLoader, targetMixer, targetActions);
}

function loadAdditionalAnimations(fbxLoader, targetMixer, targetActions) {
    fbxLoader.load('./Running.fbx', (anim) => { if(anim.animations.length) targetActions.run = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Hip%20Hop%20Dancing.fbx', (anim) => { 
        if(anim.animations.length) { 
            targetActions.dance = targetMixer.clipAction(anim.animations[0]); 
            if(!isBusy && !targetActions.idle) { targetActions.dance.play(); currentAction = 'dance'; }
        }
    });
    
    fbxLoader.load('./Swimming.fbx', (anim) => { if(anim.animations.length) targetActions.swim = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Treading%20Water.fbx', (anim) => { if(anim.animations.length) targetActions.treadWater = targetMixer.clipAction(anim.animations[0]); });
    
    fbxLoader.load('./Sitting%20Dazed.fbx', (anim) => { if(anim.animations.length) targetActions.sitDazed = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Lying%20Down.fbx', (anim) => { if(anim.animations.length) targetActions.lieDown = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Male%20Laying%20Pose.fbx', (anim) => { if(anim.animations.length) targetActions.layMale = targetMixer.clipAction(anim.animations[0]); });
    
    fbxLoader.load('./Jump.fbx', (anim) => { 
        if(anim.animations.length) { 
            targetActions.jump = targetMixer.clipAction(anim.animations[0]); 
            targetActions.jump.setLoop(THREE.LoopOnce); 
            targetActions.jump.clampWhenFinished = true;
        }
    });
    fbxLoader.load('./Punching.fbx', (anim) => { 
        if(anim.animations.length) { 
            targetActions.punch = targetMixer.clipAction(anim.animations[0]); 
            targetActions.punch.setLoop(THREE.LoopOnce); 
            targetActions.punch.clampWhenFinished = true;
        }
    });

    targetMixer.addEventListener('finished', (e) => {
        if(e.action === targetActions.jump || e.action === targetActions.punch) {
            if(moveVector.x !== 0 || moveVector.y !== 0) playAnim(inWater ? 'swim' : 'run');
            else playAnim(inWater ? 'treadWater' : 'dance');
        }
    });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    if(actions[currentAction]) actions[currentAction].fadeOut(0.2);
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
    gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction, env: currentEnvironment });
}

function setupMultiplayer() {
    gameSocket.on('current-players', (players) => {
        for(let id in players) {
            if(players[id].env === "island") { 
                allPlayersData[id] = players[id];
                if(id !== myUid && !remotePlayers[id]) addRemotePlayer(players[id]);
            }
        }
        renderMinimap(allPlayersData, myUid);
    });
    gameSocket.on('player-joined', (data) => {
        if(data.env === "island") {
            allPlayersData[data.uid] = data;
            if(data.uid !== myUid) addRemotePlayer(data);
            renderMinimap(allPlayersData, myUid);
        }
    });
    gameSocket.on('player-moved', (data) => {
        if(data.env === "island") {
            allPlayersData[data.uid] = data;
            if(remotePlayers[data.uid]) {
                remotePlayers[data.uid].targetPos = new THREE.Vector3(data.x, data.y, data.z);
                remotePlayers[data.uid].targetRot = data.rot;
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
        }
    });
    gameSocket.on('chat-message', (data) => { showChatBubble(data.uid, data.msg); appendChatUI(data.name, data.msg, '#10b981'); });
    gameSocket.on('player-left', (uid) => {
        if(remotePlayers[uid]) { scene.remove(remotePlayers[uid].group); if(remotePlayers[uid].label) remotePlayers[uid].label.remove(); delete remotePlayers[uid]; }
        delete allPlayersData[uid]; renderMinimap(allPlayersData, myUid);
    });
}

function addRemotePlayer(data) {
    const fbxLoader = new FBXLoader();
    const group = new THREE.Group(); 
    group.position.set(data.x || 0, 0, data.z || 0); 
    scene.add(group);

    const label = document.createElement('div');
    label.style.cssText = 'position: absolute; color: white; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; transform: translate(-50%, -100%); pointer-events: none;';
    label.innerText = data.name;
    floatingLabels.appendChild(label);

    const rp = { group: group, label: label, targetPos: group.position.clone(), targetRot: 0, env: data.env, name: data.name, currentAction: 'dance', mixer: null, actions: {}, chatTimeout: null };
    remotePlayers[data.uid] = rp;

    let scaleVal = 0.013;
    if(data.char === 'girl' || data.char === 'hotgirl') scaleVal = 0.025;

    const charKey = data.char || 'man';
    fbxLoader.load(characterFiles[charKey] || characterFiles['man'], (object) => {
        object.scale.set(scaleVal, scaleVal, scaleVal);
        object.position.set(0, 0, 0);
        group.add(object);
        rp.mixer = new THREE.AnimationMixer(object);
        loadAnimations(fbxLoader, rp.mixer, rp.actions, object);
    });
}

function setupChatAndVoice() {
    const chatToggle = document.getElementById('btn-chat-toggle'), chatBox = document.getElementById('game-chat-box'), sendBtn = document.getElementById('btn-send-chat'), input = document.getElementById('game-chat-input');
    if(chatToggle && chatBox) { const toggleBox = () => { chatBox.style.display = chatBox.style.display === 'flex' ? 'none' : 'flex'; }; chatToggle.addEventListener('click', toggleBox); chatToggle.addEventListener('touchstart', toggleBox, {passive: true}); }
    const sendChatMsg = () => {
        if(!input) return;
        const msg = input.value.trim();
        if(msg !== "") {
            gameSocket.emit('chat-message', { uid: myUid, name: myName, msg: msg });
            showChatBubble(myUid, msg); appendChatUI('You', msg, '#3b82f6'); input.value = "";
        }
    };
    if(sendBtn) { sendBtn.addEventListener('click', sendChatMsg); sendBtn.addEventListener('touchstart', sendChatMsg, {passive: true}); }
    if(input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMsg(); });
}

function appendChatUI(name, msg, color) { const chatBox = document.getElementById('in-game-msgs'); if(chatBox) { chatBox.innerHTML += `<div><b style="color:${color}">${name}:</b> ${msg}</div>`; chatBox.scrollTop = chatBox.scrollHeight; } }

function showChatBubble(uid, msg) {
    let targetLabel = uid === myUid ? document.getElementById('my-label') : (remotePlayers[uid] ? remotePlayers[uid].label : null);
    if(!targetLabel && uid === myUid) {
        targetLabel = document.createElement('div'); targetLabel.id = 'my-label';
        targetLabel.style.cssText = 'position: absolute; color: #3b82f6; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; transform: translate(-50%, -100%); pointer-events: none; transition: 0.1s;';
        floatingLabels.appendChild(targetLabel);
    }
    if(targetLabel) {
        targetLabel.innerHTML = `${uid === myUid ? 'You' : remotePlayers[uid].name}: <span style="color:#fff;">${msg}</span>`;
        if(uid !== myUid) { clearTimeout(remotePlayers[uid].chatTimeout); remotePlayers[uid].chatTimeout = setTimeout(() => { targetLabel.innerText = remotePlayers[uid].name; }, 5000);
        } else { setTimeout(() => { targetLabel.innerHTML = ''; }, 5000); }
    }
}

// 🕹️ FIXED JOYSTICK (Left is Left, Right is Right)
function setupJoystick() {
    const base = document.getElementById('joystick-base'), knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    let isDragging = false, center = {x:0, y:0};

    base.addEventListener('touchstart', (e) => { e.stopPropagation(); if(isBusy) return; isDragging = true; center = { x: base.getBoundingClientRect().left + base.clientWidth / 2, y: base.getBoundingClientRect().top + base.clientHeight / 2 }; handleTouch(e); });
    base.addEventListener('touchmove', (e) => { e.stopPropagation(); if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', (e) => { 
        e.stopPropagation(); 
        isDragging = false; 
        knob.style.transform = `translate(0, 0)`; 
        moveVector = { x: 0, y: 0 }; 
        if(!isBusy && currentAction !== 'jump') playAnim(inWater ? 'treadWater' : 'dance'); 
    });

    function handleTouch(e) {
        let dx = e.touches[0].clientX - center.x, dy = e.touches[0].clientY - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = 45;
        if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
        
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        // 🚀 TRUE JOYSTICK DIRECTION FIX
        moveVector = { x: dx/maxDist, y: dy/maxDist }; 
        if (dist > 5 && !isBusy && currentAction !== 'jump') playAnim(inWater ? 'swim' : 'run'); 
    }
}

function setupActionButtons() {
    document.getElementById('btn-attack')?.addEventListener('touchstart', () => {
        if(actions.punch && !inWater) { isBusy=false; actions.punch.reset().fadeIn(0.1).play(); currentAction = 'punch'; resetPoseUI();}
    });
    document.getElementById('btn-skill')?.addEventListener('touchstart', () => {
        if(actions.jump && !inWater) { isBusy=false; actions.jump.reset().fadeIn(0.1).play(); currentAction = 'jump'; resetPoseUI();}
    });

    const triggerPose = (anim) => {
        if(inWater || currentAction === 'jump') return; 
        isBusy = true;
        playAnim(anim);
        const s1 = document.getElementById('btn-sitDazed');
        const s2 = document.getElementById('btn-lieDown');
        const s3 = document.getElementById('btn-layM');
        const s5 = document.getElementById('btn-stand');
        if(s1) s1.style.display = 'none';
        if(s2) s2.style.display = 'none';
        if(s3) s3.style.display = 'none';
        if(s5) s5.style.display = 'block';
    };

    document.getElementById('btn-sitDazed')?.addEventListener('touchstart', () => triggerPose('sitDazed'));
    document.getElementById('btn-lieDown')?.addEventListener('touchstart', () => triggerPose('lieDown'));
    document.getElementById('btn-layM')?.addEventListener('touchstart', () => triggerPose('layMale'));

    document.getElementById('btn-stand')?.addEventListener('touchstart', () => {
        resetPoseUI();
        my3DCharacter.position.y = GROUND_Y; // Lock to ground after stand
        playAnim(inWater ? 'treadWater' : 'dance');
    });
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    
    try {
        const delta = clock ? clock.getDelta() : 0;
        if (mixer) mixer.update(delta);

        if (my3DCharacter) {
            
            // ⚔️ 360° Left-Right Running
            if (!isBusy && (moveVector.x !== 0 || moveVector.y !== 0)) {
                
                const camForward = new THREE.Vector3();
                camera.getWorldDirection(camForward);
                camForward.y = 0; 
                camForward.normalize();

                const camRight = new THREE.Vector3();
                camRight.crossVectors(camera.up, camForward).normalize();

                const moveDirection = new THREE.Vector3()
                    .addScaledVector(camRight, moveVector.x)
                    .addScaledVector(camForward, -moveVector.y)
                    .normalize();

                const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
                let diff = targetRotation - my3DCharacter.rotation.y;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff)); 
                my3DCharacter.rotation.y += diff * 0.2; 

                const currentSpeed = Math.min(Math.sqrt(moveVector.x*moveVector.x + moveVector.y*moveVector.y), 1) * speed;
                
                my3DCharacter.position.addScaledVector(moveDirection, currentSpeed);
                
                allPlayersData[myUid] = { x: my3DCharacter.position.x, y: my3DCharacter.position.z };
                gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction, env: currentEnvironment });
                renderMinimap(allPlayersData, myUid);
            }

            // 🚀 ABSOLUTE HARD LOCK HEIGHT SYSTEM (Never Sink Again!)
            const distToPool = Math.hypot(my3DCharacter.position.x - POOL_CENTER_X, my3DCharacter.position.z - POOL_CENTER_Z);
            let wasInWater = inWater;

            if (distToPool < POOL_RADIUS) {
                inWater = true;
                my3DCharacter.position.y = WATER_Y; 
            } else {
                inWater = false;
                if(!isBusy) my3DCharacter.position.y = GROUND_Y; // Character strictly glued to ground
            }

            if (wasInWater !== inWater && !isBusy && currentAction !== 'jump') {
                if (moveVector.x !== 0 || moveVector.y !== 0) playAnim(inWater ? 'swim' : 'run');
                else playAnim(inWater ? 'treadWater' : 'dance');
            }

            if (inWater && isBusy) {
                resetPoseUI();
                playAnim('treadWater');
            }

            // 🎥 FULL BODY CAMERA FOLLOW
            if (controls) {
                const charTarget = new THREE.Vector3(my3DCharacter.position.x, my3DCharacter.position.y + 1.2, my3DCharacter.position.z);
                const posDelta = charTarget.clone().sub(controls.target);
                controls.target.add(posDelta);
                camera.position.add(posDelta);
                controls.update(); 
            }

            const myLabel = document.getElementById('my-label');
            if(myLabel && myLabel.innerHTML !== "") {
                const pos = my3DCharacter.position.clone();
                pos.y += 2.0; pos.project(camera);
                myLabel.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
                myLabel.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
            }
        }

        for(let uid in remotePlayers) {
            const rp = remotePlayers[uid];
            if(rp && rp.mixer) rp.mixer.update(delta);

            if(rp && rp.group) {
                rp.group.position.lerp(rp.targetPos, 0.1);
                rp.group.rotation.y = rp.targetRot;
                if(rp.label) {
                    const pos = rp.group.position.clone();
                    pos.y += 2.0; pos.project(camera);
                    if(pos.z < 1) {
                        rp.label.style.display = 'block';
                        rp.label.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
                        rp.label.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
                    } else { rp.label.style.display = 'none'; }
                }
            }
        }

        if (renderer && scene && camera) { renderer.render(scene, camera); }
    } catch (err) { console.error("❌ Render Error:", err); }
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

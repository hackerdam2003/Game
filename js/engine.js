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

console.log("🎮 [Game Engine] Fixed Black Screen, Ground Level, Chat Close & Genshin Character Switcher Active!");

const gameSocket = io(); 

let myUid = localStorage.getItem('playerUID') || "UID_" + Math.floor(Math.random()*99999);
let myName = localStorage.getItem('gameName') || localStorage.getItem('playerName') || "Guest_" + Math.floor(Math.random()*999);
let speed = 0.08; 
let moveVector = { x: 0, y: 0 };

let currentEnvironment = "world";
let scene, camera, renderer, clock, controls;
let worldGroup, houseGroup; 

let my3DCharacter = null;
let monsterCharacter = null;
let mixer = null, monsterMixer = null;
let actions = {}; 
let currentAction = 'dance'; 

const remotePlayers = {}; 
let allPlayersData = {}; 
let floatingLabels = document.createElement('div');
document.body.appendChild(floatingLabels);

let playerHP = 100, monsterHP = 100, isMonsterDead = false;
let doorMesh = null, exitDoorMesh = null;
let enterHouseBtn = null, actionUI = null, playerListUI = null;
let isBusy = false; 

const CHAIR_POS = { x: -3, z: -2 };
const BED_POS = { x: 3, z: -4 };

const downRaycaster = new THREE.Raycaster();
const forwardRaycaster = new THREE.Raycaster();
const downDirection = new THREE.Vector3(0, -1, 0);
let worldHouseRef = null;
let interiorHouseRef = null;
let currentHouseCollider = null; 

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

    createUIElements();
    init3DWorld(); 
    setupJoystick();
    setupActionButtons();
    setupChatAndVoice(); 
    setupMultiplayer();
    
    gameSocket.emit('join-world', { 
        gameRoomId: "GLOBAL-ROOM", 
        uid: myUid, 
        name: myName, 
        char: currentSelectedChar, 
        env: currentEnvironment
    });
};

function createUIElements() {
    // HP & Boss HUD
    const hudBar = document.createElement('div');
    hudBar.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 9999; pointer-events: none;';
    hudBar.innerHTML = `<div style="background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 10px; border-radius: 8px; border: 1px solid #3b82f6;"><b>❤️ HP:</b> <span id='p-hp'>100</span> | <b>🧟 Boss:</b> <span id='m-hp'>100</span></div>`;
    document.body.appendChild(hudBar);

    // Live Players List
    playerListUI = document.createElement('div');
    playerListUI.style.cssText = 'position: fixed; top: 60px; left: 10px; background: rgba(0,0,0,0.7); color: #fff; font-size: 11px; padding: 10px; z-index: 99999; border-radius: 8px; min-width: 120px; border: 1px solid #3b82f6;';
    document.body.appendChild(playerListUI);
    updatePlayerListUI();

    // Enter / Exit House Button
    enterHouseBtn = document.createElement('button');
    enterHouseBtn.style.cssText = "position: fixed; top: 20%; left: 50%; transform: translateX(-50%); padding: 12px 24px; font-size: 16px; font-weight: bold; background: #10b981; color: white; border: none; border-radius: 8px; display: none; z-index: 10000; box-shadow: 0px 4px 10px rgba(0,0,0,0.5); cursor: pointer;";
    document.body.appendChild(enterHouseBtn);

    // Action UI (Sit, Sleep, Stand)
    actionUI = document.createElement('div');
    actionUI.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); display: none; gap: 10px; z-index: 10000;';
    actionUI.innerHTML = `
        <button id="btn-sit" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🪑 Sit</button>
        <button id="btn-sleep" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🛏️ Sleep</button>
        <button id="btn-stand" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; display:none;">🧍 Stand</button>
    `;
    document.body.appendChild(actionUI);

    // 🌟 GENSHIN IMPACT STYLE CHARACTER SWITCHER BUTTON (Top Right Menu)
    const charSwitchMenu = document.createElement('div');
    charSwitchMenu.style.cssText = 'position: fixed; top: 15px; right: 180px; z-index: 100000; pointer-events: auto; display: flex; gap: 6px;';
    charSwitchMenu.innerHTML = `
        <button onclick="window.switchGameCharacter('man')" style="background: rgba(30,41,59,0.9); border: 2px solid #3b82f6; color: white; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">👦 Man</button>
        <button onclick="window.switchGameCharacter('girl')" style="background: rgba(30,41,59,0.9); border: 2px solid #ec4899; color: white; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">👧 Girl</button>
        <button onclick="window.switchGameCharacter('hotgirl')" style="background: rgba(30,41,59,0.9); border: 2px solid #10b981; color: white; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">💃 Hot</button>
        <button onclick="window.switchGameCharacter('mymodel')" style="background: rgba(30,41,59,0.9); border: 2px solid #fbbf24; color: white; padding: 5px 8px; border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;">⭐ Custom</button>
    `;
    document.body.appendChild(charSwitchMenu);

    // 🛑 CHAT CLOSE BUTTON FIX (Added inside #game-chat-box)
    const chatBox = document.getElementById('game-chat-box');
    if(chatBox && !document.getElementById('close-chat-btn')) {
        const closeChatBtn = document.createElement('button');
        closeChatBtn.id = 'close-chat-btn';
        closeChatBtn.innerText = '✕';
        closeChatBtn.style.cssText = 'position: absolute; top: 5px; right: 8px; background: none; border: none; color: #ef4444; font-size: 16px; font-weight: bold; cursor: pointer; z-index: 10001;';
        closeChatBtn.onclick = () => { chatBox.style.display = 'none'; };
        chatBox.style.position = 'absolute';
        chatBox.appendChild(closeChatBtn);
    }
}

// 🌟 Instant Character Switcher Function
window.switchGameCharacter = function(charKey) {
    currentSelectedChar = charKey;
    localStorage.setItem('selectedCharacter', charKey);
    loadCharacter(charKey);
    console.log("🔄 Switched character to:", charKey);
};

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

function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '0';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000); 
    camera.position.set(0, 1.4, -3.2); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    renderer.domElement.style.touchAction = 'none'; 
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false; 
    controls.minDistance = 1.5; 
    controls.maxDistance = 10; 
    controls.maxPolarAngle = Math.PI / 2 - 0.05; 

    worldGroup = new THREE.Group();
    houseGroup = new THREE.Group();
    scene.add(worldGroup);
    scene.add(houseGroup);

    const ambientW = new THREE.AmbientLight(0xffffff, 1.5);
    const dirLightW = new THREE.DirectionalLight(0xfff0dd, 2);
    dirLightW.position.set(5, 10, 5);
    worldGroup.add(ambientW);
    worldGroup.add(dirLightW);

    const ambientH = new THREE.AmbientLight(0xffffff, 1.5);
    const pointLightH = new THREE.PointLight(0xffddaa, 2, 30);
    pointLightH.position.set(0, 5, 0);
    houseGroup.add(ambientH);
    houseGroup.add(pointLightH);
    
    loadSkybox();
    loadAsliGhar();
    loadPoolAndProps(); 

    exitDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial({ visible: false }));
    exitDoorMesh.position.set(0, 1, 6); 
    houseGroup.add(exitDoorMesh);

    houseGroup.visible = false;

    loadCharacter(currentSelectedChar);
    loadMonster();
    requestAnimationFrame(renderLoop);
}

// ☁️ Skybox Fix
function loadSkybox() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    
    gltfLoader.load('https://hackerdam2003.github.io/Game/Sky.glb', (gltf) => {
        const sky = gltf.scene;
        sky.scale.set(2000, 2000, 2000);
        sky.position.set(0, 0, 0);
        
        sky.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = false;
                node.receiveShadow = false;
                if(node.material) node.material.side = THREE.BackSide;
            }
        });
        worldGroup.add(sky);
    }, undefined, (err) => { console.error("Skybox load error:", err); });
}

// 🏡 House Ground Level Fix ("Ghar ko ground me karo")
function loadAsliGhar() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    
    const houseUrl = 'https://hackerdam2003.github.io/Game/newhome.glb';

    gltfLoader.load(houseUrl, (gltf) => {
        const originalHouse = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(originalHouse);
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const scaleFactor = 30 / maxDim; 
            originalHouse.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        const scaledBox = new THREE.Box3().setFromObject(originalHouse);
        const center = scaledBox.getCenter(new THREE.Vector3());
        
        originalHouse.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.side = THREE.DoubleSide;
                    node.material.alphaTest = 0.3; 
                }
            }
        });

        worldHouseRef = originalHouse.clone();
        worldHouseRef.position.x = 2 - center.x;
        // 🚀 FIX: Exactly aligned to ground level Y = 0
        worldHouseRef.position.y = 0; 
        worldHouseRef.position.z = -10 - center.z; 
        worldGroup.add(worldHouseRef);
        
        currentHouseCollider = worldHouseRef; 

        doorMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshBasicMaterial({ visible: false }));
        doorMesh.position.set(2, 1.5, -4); 
        worldGroup.add(doorMesh);

        interiorHouseRef = originalHouse.clone();
        interiorHouseRef.position.x = -center.x;
        interiorHouseRef.position.y = 0; 
        interiorHouseRef.position.z = -center.z;
        houseGroup.add(interiorHouseRef);
    });
}

// 🏊 Pool, Chairs & Hotgirl Loader on Ground Level
function loadPoolAndProps() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const fbxLoader = new FBXLoader();

    // 1. Pool
    gltfLoader.load('https://hackerdam2003.github.io/Game/Pool.glb', (gltf) => {
        const pool = gltf.scene;
        const box = new THREE.Box3().setFromObject(pool);
        const scaleFactor = 18 / Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
        pool.scale.set(scaleFactor, scaleFactor, scaleFactor);
        pool.rotation.y = Math.PI / 2; 
        pool.position.set(18, 0, 2); 
        worldGroup.add(pool);
    });

    // 2. Chairs
    gltfLoader.load('https://hackerdam2003.github.io/Game/chair.glb', (chairGltf) => {
        const chairBase = chairGltf.scene;
        const chairPositions = [
            { x: 10, z: 8, rot: Math.PI / 4 },
            { x: 10, z: -6, rot: Math.PI / 3 },
            { x: 26, z: 8, rot: -Math.PI / 4 },
            { x: 26, z: -6, rot: -Math.PI / 3 }
        ];

        chairPositions.forEach(pos => {
            const chair = chairBase.clone();
            chair.scale.set(23.0, 23.0, 23.0);
            chair.position.set(pos.x, 0, pos.z); 
            chair.rotation.y = pos.rot;
            worldGroup.add(chair);
        });
    });

    // 3. Hotgirl FBX
    fbxLoader.load('./Hotgirl.fbx', (fbx) => {
        const hotgirl = fbx;
        hotgirl.scale.set(2.8, 2.8, 2.8);
        hotgirl.position.set(14, 0, 2); 
        hotgirl.rotation.y = -Math.PI / 2;

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('./texture.jpg', (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            hotgirl.traverse((child) => {
                if (child.isMesh && child.material) {
                    child.material.map = texture;
                    child.material.color.setHex(0xffffff);
                    child.material.needsUpdate = true;
                }
            });
        });
        worldGroup.add(hotgirl);
    }, undefined, (err) => { console.log("Hotgirl FBX skipped or missing"); });
}

function switchEnvironment(targetEnv) {
    currentEnvironment = targetEnv;
    isBusy = false;
    
    if(targetEnv === "house") {
        worldGroup.visible = false;
        houseGroup.visible = true;
        scene.background = new THREE.Color(0x1e293b); 
        my3DCharacter.position.set(0, 0, 4); 
        currentHouseCollider = interiorHouseRef; 
        enterHouseBtn.style.display = "none";
    } else {
        worldGroup.visible = true;
        houseGroup.visible = false;
        scene.background = new THREE.Color(0x87CEEB); 
        my3DCharacter.position.set(2, 0, 0); 
        currentHouseCollider = worldHouseRef; 
        enterHouseBtn.style.display = "none";
    }
    
    gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: 'dance', env: currentEnvironment });
}

function loadCharacter(charKey) {
    const fbxLoader = new FBXLoader();
    const gltfLoader = new GLTFLoader();
    if (my3DCharacter) scene.remove(my3DCharacter);
    
    const url = characterFiles[charKey] || characterFiles['man'];
    const isGLB = url.toLowerCase().endsWith('.glb');

    if(isGLB) {
        gltfLoader.load(url, (gltf) => {
            my3DCharacter = gltf.scene;
            my3DCharacter.scale.set(1, 1, 1);
            my3DCharacter.position.set(2, 0, 0);
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
            my3DCharacter.scale.set(0.013, 0.013, 0.013); 
            my3DCharacter.position.set(2, 0, 0); 
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
    fbxLoader.load('./Punching.fbx', (anim) => { if(anim.animations.length) { targetActions.punch = targetMixer.clipAction(anim.animations[0]); targetActions.punch.setLoop(THREE.LoopOnce); }});
    fbxLoader.load('./Sitting.fbx', (anim) => { if(anim.animations.length) targetActions.sit = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Sleeping.fbx', (anim) => { if(anim.animations.length) targetActions.sleep = targetMixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Hip%20Hop%20Dancing.fbx', (anim) => { 
        if(anim.animations.length) {
            targetActions.dance = targetMixer.clipAction(anim.animations[0]); 
            if(!isBusy) {
                targetActions.dance.play();
                currentAction = 'dance';
            }
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

function loadMonster() {
    new FBXLoader().load('./Mpc%20Skeletonzombie.fbx', (object) => {
        monsterCharacter = object;
        monsterCharacter.scale.set(0.01, 0.01, 0.01);
        monsterCharacter.position.set(-5, 0, -5);
        worldGroup.add(monsterCharacter); 
        monsterMixer = new THREE.AnimationMixer(monsterCharacter);
        if (object.animations.length > 0) monsterMixer.clipAction(object.animations[0]).play();
    });
}

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
    gameSocket.on('chat-message', (data) => { showChatBubble(data.uid, data.msg); appendChatUI(data.name, data.msg, '#10b981'); });
    gameSocket.on('player-left', (uid) => {
        if(remotePlayers[uid]) { scene.remove(remotePlayers[uid].group); if(remotePlayers[uid].label) remotePlayers[uid].label.remove(); delete remotePlayers[uid]; updatePlayerListUI(); }
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

    const rp = { group: group, label: label, targetPos: group.position.clone(), targetRot: 0, env: data.env || 'world', name: data.name, currentAction: 'dance', mixer: null, actions: {}, chatTimeout: null };
    remotePlayers[data.uid] = rp;

    const charKey = data.char || 'man';
    fbxLoader.load(characterFiles[charKey] || characterFiles['man'], (object) => {
        object.scale.set(0.01, 0.01, 0.01);
        object.position.set(0, 0, 0);
        group.add(object);
        rp.mixer = new THREE.AnimationMixer(object);
        loadAnimations(fbxLoader, rp.mixer, rp.actions, object);
    });
    updatePlayerListUI();
}

function setupChatAndVoice() {
    const chatToggle = document.getElementById('btn-chat-toggle'), chatBox = document.getElementById('game-chat-box'), sendBtn = document.getElementById('btn-send-chat'), input = document.getElementById('game-chat-input'), micToggle = document.getElementById('btn-mic-toggle');

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

    let isMicOn = false;
    if(micToggle) {
        const toggleMic = async () => {
            if(!isMicOn) { try { await navigator.mediaDevices.getUserMedia({ audio: true }); micToggle.innerText = '🎙️'; micToggle.style.background = 'rgba(16, 185, 129, 0.8)'; isMicOn = true; } catch(err) { alert("Mic permission denied!"); }
            } else { micToggle.innerText = '🔇'; micToggle.style.background = 'rgba(30,41,59,0.8)'; isMicOn = false; }
        };
        micToggle.addEventListener('click', toggleMic); micToggle.addEventListener('touchstart', toggleMic, {passive: true});
    }
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

function setupJoystick() {
    const base = document.getElementById('joystick-base'), knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    let isDragging = false, center = {x:0, y:0};

    base.addEventListener('touchstart', (e) => {
        e.stopPropagation(); 
        if(isBusy) return;
        isDragging = true;
        const rect = base.getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleTouch(e);
    });
    base.addEventListener('touchmove', (e) => { e.stopPropagation(); if(isDragging) handleTouch(e); });
    base.addEventListener('touchend', (e) => {
        e.stopPropagation(); 
        isDragging = false; knob.style.transform = `translate(0, 0)`; moveVector = { x: 0, y: 0 };
        if(!isBusy) playAnim('dance'); 
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

    document.getElementById('btn-sit').addEventListener('touchstart', () => { isBusy = true; my3DCharacter.position.set(CHAIR_POS.x, 0, CHAIR_POS.z); playAnim('sit'); });
    document.getElementById('btn-sleep').addEventListener('touchstart', () => { isBusy = true; my3DCharacter.position.set(BED_POS.x, 0, BED_POS.z); my3DCharacter.rotation.y = Math.PI / 2; playAnim('sleep'); });
    document.getElementById('btn-stand').addEventListener('touchstart', () => { isBusy = false; my3DCharacter.position.set(2, 0, 0); playAnim('dance'); });
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    
    try {
        const delta = clock ? clock.getDelta() : 0;
        if (mixer) mixer.update(delta);
        if (monsterMixer) monsterMixer.update(delta);

        if (my3DCharacter) {
            
            // ⚔️ MOVEMENT
            if (!isBusy && (moveVector.x !== 0 || moveVector.y !== 0)) {
                const camEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
                const joyAngle = Math.atan2(moveVector.x, moveVector.y);
                const targetRotation = joyAngle + camEuler.y;

                let diff = targetRotation - my3DCharacter.rotation.y;
                diff = Math.atan2(Math.sin(diff), Math.cos(diff)); 
                my3DCharacter.rotation.y += diff * 0.15; 

                const currentSpeed = Math.min(Math.sqrt(moveVector.x*moveVector.x + moveVector.y*moveVector.y), 1) * speed;
                
                let canMove = true;
                if (currentHouseCollider) {
                    const moveDir = new THREE.Vector3(Math.sin(targetRotation), 0, Math.cos(targetRotation)).normalize();
                    const chestPos = my3DCharacter.position.clone();
                    chestPos.y += 0.8; 
                    
                    forwardRaycaster.set(chestPos, moveDir);
                    const wallHits = forwardRaycaster.intersectObject(currentHouseCollider, true);
                    
                    if (wallHits.length > 0 && wallHits[0].distance < 0.5) {
                        canMove = false;
                    }
                }

                if (canMove) {
                    my3DCharacter.position.x += Math.sin(targetRotation) * currentSpeed;
                    my3DCharacter.position.z += Math.cos(targetRotation) * currentSpeed;
                }
                
                allPlayersData[myUid] = { x: my3DCharacter.position.x, y: my3DCharacter.position.z };
                gameSocket.emit('player-moved', { uid: myUid, x: my3DCharacter.position.x, y: my3DCharacter.position.y, z: my3DCharacter.position.z, rot: my3DCharacter.rotation.y, action: currentAction, env: currentEnvironment });
                renderMinimap(allPlayersData, myUid);
            }

            // 🧗 FLOOR DETECTION & GROUND LEVEL ALIGNMENT
            if (currentHouseCollider && !isBusy) {
                const rayOrigin = my3DCharacter.position.clone();
                rayOrigin.y += 5.0; 

                downRaycaster.set(rayOrigin, downDirection);
                const hits = downRaycaster.intersectObject(currentHouseCollider, true);

                if (hits.length > 0) {
                    const floorHeight = hits[0].point.y;
                    if (Math.abs(floorHeight - my3DCharacter.position.y) < 2.0) {
                        my3DCharacter.position.y = floorHeight; 
                    }
                } else {
                    if (my3DCharacter.position.y > 0) {
                        my3DCharacter.position.y = Math.max(0, my3DCharacter.position.y - 0.1);
                    }
                }
            }

            // 🎥 Smooth Camera Follow
            if (controls) {
                const charTarget = new THREE.Vector3(my3DCharacter.position.x, my3DCharacter.position.y + 1.2, my3DCharacter.position.z);
                const posDelta = charTarget.clone().sub(controls.target);
                
                controls.target.add(posDelta);
                camera.position.add(posDelta);
                controls.update(); 
            }

            // 🏠 Door Interaction
            if (currentEnvironment === "world" && doorMesh) {
                if (my3DCharacter.position.distanceTo(doorMesh.position) < 5.0) { 
                    enterHouseBtn.style.display = "block";
                    enterHouseBtn.innerHTML = "🏠 Enter House";
                    enterHouseBtn.onclick = () => switchEnvironment("house");
                } else { enterHouseBtn.style.display = "none"; }
            } 
            else if (currentEnvironment === "house" && exitDoorMesh) {
                if (my3DCharacter.position.distanceTo(exitDoorMesh.position) < 5.0) { 
                    enterHouseBtn.style.display = "block";
                    enterHouseBtn.innerHTML = "🚪 Exit House";
                    enterHouseBtn.onclick = () => switchEnvironment("world");
                } else { enterHouseBtn.style.display = "none"; }

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
            if(rp && rp.mixer) rp.mixer.update(delta);

            if(rp && rp.env === currentEnvironment && rp.group) {
                rp.group.visible = true;
                rp.group.position.lerp(rp.targetPos, 0.1);
                rp.group.rotation.y = rp.targetRot;
                if(rp.label) {
                    const pos = rp.group.position.clone();
                    pos.y += 1.8; pos.project(camera);
                    if(pos.z < 1) {
                        rp.label.style.display = 'block';
                        rp.label.style.left = `${(pos.x * .5 + .5) * window.innerWidth}px`;
                        rp.label.style.top = `${-(pos.y * .5 - .5) * window.innerHeight}px`;
                    } else { rp.label.style.display = 'none'; }
                }
            } else if(rp && rp.group) {
                rp.group.visible = false;
                if(rp.label) rp.label.style.display = 'none';
            }
        }

        if (renderer && scene && camera) { renderer.render(scene, camera); }
    } catch (err) { console.error("❌ Render Loop Error caught safely:", err); }
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});


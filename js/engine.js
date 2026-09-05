import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// 🛑 Import Three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const engineConfig = {
    apiKey: "AIzaSyCuYPugV4qIsu9ZT9E5l63bFLgIbte_S8I",
    authDomain: "racing-universe-engine.firebaseapp.com",
    projectId: "racing-universe-engine",
};
const app = initializeApp(engineConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("🎮 [Game Engine] 3D Open World Module Loaded!");

const gameSocket = io('/world'); 
let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Racer";
let players = {}; 
let speed = 0.08; // 3D speed adjusted
let moveVector = { x: 0, y: 0 };

// --- 3D ENGINE VARIABLES ---
let scene, camera, renderer, clock;
let my3DCharacter = null;
let mixer = null;
let actions = {}; // Store Idle, Run, Fight animations
let currentAction = 'idle';

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';

    init3DWorld(); // Start 3D Engine
    setupJoystick();
    
    // Fake joining for now (Firebase auth sync goes here)
    gameSocket.emit('join-world', { gameRoomId: "GLOBAL-ROOM", uid: myUid, name: myName });
};

// 🛑 3D WORLD SETUP 🛑
function init3DWorld() {
    const canvas = document.getElementById('game-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Dark night sky
    clock = new THREE.Clock();

    // Setup Camera (Top-down 2.5D angle like GTA 1 / Diablo)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 8); 
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Floor Grid (Safe House area)
    const gridHelper = new THREE.GridHelper(100, 100, 0x3b82f6, 0x1e293b);
    scene.add(gridHelper);

    // Load 3D Character & Animations
    loadMyCharacter();

    requestAnimationFrame(renderLoop);
}

function loadMyCharacter() {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();

    // Load Base Model
    gltfLoader.load('./Model prepared.glb', (gltf) => {
        my3DCharacter = gltf.scene;
        my3DCharacter.scale.set(1, 1, 1);
        scene.add(my3DCharacter);
        mixer = new THREE.AnimationMixer(my3DCharacter);

        // Load Idle/Fight Anim
        fbxLoader.load('./bouncing fight.fbx', (anim) => {
            actions.idle = mixer.clipAction(anim.animations[0]);
            actions.idle.play();
        });

        // Load Run Anim
        fbxLoader.load('./Running.fbx', (anim) => {
            actions.run = mixer.clipAction(anim.animations[0]);
        });
    });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    
    // Crossfade smoothly between animations
    if(actions[currentAction]) {
        actions[currentAction].fadeOut(0.2);
    }
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
}

// --- CONTROLS ---
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
        playAnim('idle'); // Stop running when joystick released
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
        
        if (dist > 5) playAnim('run'); // Play run anim if moving
    }
}

// ATTACK
const btnAttack = document.getElementById('btn-attack');
if(btnAttack) {
    btnAttack.addEventListener('touchstart', () => {
        // Since bouncing fight acts as both idle and fight, you can map specific attack FBX here later
        // For now, it just triggers the socket event
        gameSocket.emit('action', { action: 'attack' });
        
        // Add recoil/jump effect on attack
        if(my3DCharacter) my3DCharacter.position.y = 0.5;
        setTimeout(() => { if(my3DCharacter) my3DCharacter.position.y = 0; }, 200);
    });
}

// --- RENDER LOOP ---
function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;

    if (mixer) mixer.update(delta);

    if (my3DCharacter) {
        // 1. Move Character in 3D Space (X and Z axis)
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            
            // 2. Rotate character to face movement direction
            const angle = Math.atan2(moveVector.x, moveVector.y);
            my3DCharacter.rotation.y = angle;

            // Sync with multiplayer
            gameSocket.emit('move', { x: my3DCharacter.position.x, y: my3DCharacter.position.z });
        }

        // 3. Camera Follow (Keep camera above player)
        camera.position.x = my3DCharacter.position.x;
        camera.position.z = my3DCharacter.position.z + 8; // Offset behind
        camera.lookAt(my3DCharacter.position);
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});


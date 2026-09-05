import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

console.log("🎮 [Game Engine] Full Multi-Animation 3D Engine Loaded!");

const gameSocket = io('/world'); 
let myUid = "UID_" + Math.floor(Math.random()*9999);
let myName = "Racer";
let speed = 0.06; 
let moveVector = { x: 0, y: 0 };

let scene, camera, renderer, clock;
let my3DCharacter = null;
let mixer = null;
let actions = {}; 
let currentAction = 'idle';

let debugDiv = null;

window.enterWorld = async function() {
    const overlay = document.getElementById('enter-overlay');
    const hud = document.getElementById('hud');
    
    try {
        if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape').catch(() => {});
        }
    } catch (err) { console.warn("Fullscreen locked skipped"); }

    if(overlay) overlay.style.display = 'none';
    if(hud) hud.style.display = 'block';

    createMobileDebugger();
    init3DWorld(); 
    setupJoystick();
    setupActionButtons();
    
    gameSocket.emit('join-world', { gameRoomId: "GLOBAL-ROOM", uid: myUid, name: myName });
};

function createMobileDebugger() {
    debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #38bdf8; font-size: 10px; padding: 8px; z-index: 99999; border-radius: 6px; max-width: 220px; pointer-events: none; line-height: 1.3;';
    debugDiv.innerHTML = "<b>3D Engine Status:</b><br>Loading Assets...";
    document.body.appendChild(debugDiv);
}

function updateDebug(msg) {
    if(debugDiv) {
        debugDiv.innerHTML = "<b>3D Engine Status:</b><br>" + msg;
    }
    console.log(msg);
}

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

    const ambient = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xfff0dd, 2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(50, 50, 0x3b82f6, 0x1e293b);
    scene.add(gridHelper);

    loadMyCharacter();
    requestAnimationFrame(renderLoop);
}

function loadMyCharacter() {
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();

    updateDebug("Downloading Model...");

    gltfLoader.load('./Model prepared.glb', (gltf) => {
        my3DCharacter = gltf.scene;
        my3DCharacter.scale.set(1, 1, 1);
        my3DCharacter.position.set(0, 0, 0);
        scene.add(my3DCharacter);
        
        mixer = new THREE.AnimationMixer(my3DCharacter);
        updateDebug("✅ Model Loaded!<br>Loading Animations...");

        // 1. Idle Animation
        fbxLoader.load('./bouncing%20fight.fbx', (anim) => {
            if(anim.animations && anim.animations.length > 0) {
                actions.idle = mixer.clipAction(anim.animations[0]);
                actions.idle.play();
                currentAction = 'idle';
                updateDebug("✅ Idle Ready");
            }
        }, undefined, (err) => console.warn("Idle warning:", err));

        // 2. Running Animation
        fbxLoader.load('./Running.fbx', (anim) => {
            if(anim.animations && anim.animations.length > 0) {
                actions.run = mixer.clipAction(anim.animations[0]);
                updateDebug("✅ Run Ready");
            }
        }, undefined, (err) => console.warn("Run warning:", err));

        // 3. Punching Animation
        fbxLoader.load('./Punching.fbx', (anim) => {
            if(anim.animations && anim.animations.length > 0) {
                actions.punch = mixer.clipAction(anim.animations[0]);
                actions.punch.setLoop(THREE.LoopOnce);
                actions.punch.clampWhenFinished = true;
                updateDebug("✅ Punch Ready");
            }
        }, undefined, (err) => console.warn("Punch warning:", err));

        // 4. Hip Hop Dancing Animation
        fbxLoader.load('./Hip%20Hop%20Dancing.fbx', (anim) => {
            if(anim.animations && anim.animations.length > 0) {
                actions.dance = mixer.clipAction(anim.animations[0]);
                updateDebug("✅ Dance Ready");
            }
        }, undefined, (err) => console.warn("Dance warning:", err));

    }, undefined, (err) => {
        updateDebug("❌ Model Error: " + err.message);
    });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    
    if(actions[currentAction]) {
        actions[currentAction].fadeOut(0.2);
    }
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
}

function playOneShotAnim(animName, returnToAnim = 'idle') {
    if (!mixer || !actions[animName]) return;
    
    if(actions[currentAction]) {
        actions[currentAction].fadeOut(0.1);
    }
    
    const action = actions[animName];
    action.reset().fadeIn(0.1).play();
    currentAction = animName;

    const mixerFinishedListener = (e) => {
        if (e.action === action) {
            mixer.removeEventListener('finished', mixerFinishedListener);
            playAnim(returnToAnim);
        }
    };
    mixer.addEventListener('finished', mixerFinishedListener);
}

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
        playAnim('idle'); 
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
        
        if (dist > 5) playAnim('run'); 
    }
}

function setupActionButtons() {
    const btnAttack = document.getElementById('btn-attack');
    const btnSkill = document.getElementById('btn-skill');

    if(btnAttack) {
        btnAttack.addEventListener('touchstart', () => {
            gameSocket.emit('action', { action: 'attack' });
            playOneShotAnim('punch', 'idle');
        });
    }

    if(btnSkill) {
        btnSkill.addEventListener('touchstart', () => {
            gameSocket.emit('action', { action: 'skill' });
            playAnim('dance');
        });
    }
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;

    if (mixer) mixer.update(delta);

    if (my3DCharacter) {
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            
            const targetRotation = Math.atan2(moveVector.x, moveVector.y);
            my3DCharacter.rotation.y = targetRotation;

            gameSocket.emit('move', { x: my3DCharacter.position.x, y: my3DCharacter.position.z });
        }

        camera.position.x = my3DCharacter.position.x;
        camera.position.z = my3DCharacter.position.z + 2.5; 
        camera.position.y = my3DCharacter.position.y + 1.2;
        camera.lookAt(my3DCharacter.position.x, my3DCharacter.position.y + 0.8, my3DCharacter.position.z);
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


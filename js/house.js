import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

console.log("🏠 [House Engine] Interior Loaded!");

let scene, camera, renderer, clock;
let my3DCharacter = null;
let mixer = null;
let actions = {}; 
let currentAction = 'idle';

let moveVector = { x: 0, y: 0 };
let speed = 0.05;
let isBusy = false; // Check if player is currently sitting or sleeping

// Interactive Furniture Zones (x, z coordinates)
const CHAIR_POS = { x: -3, z: -2 };
const BED_POS = { x: 3, z: -4 };

// UI Elements
const btnSit = document.getElementById('btn-sit');
const btnSleep = document.getElementById('btn-sleep');
const btnStand = document.getElementById('btn-stand');
const actionUI = document.getElementById('action-ui');

initInterior();
setupJoystick();
setupInteractions();

function initInterior() {
    const canvas = document.getElementById('game-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); // Darker indoor vibe
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 4); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);
    const pointLight = new THREE.PointLight(0xffddaa, 1.5, 20);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);

    // Floor (Temp Floor until you add a House.fbx)
    const floorGeo = new THREE.PlaneGeometry(15, 15);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Temp Chair Marker (Blue)
    const chairMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
    chairMesh.position.set(CHAIR_POS.x, 0.5, CHAIR_POS.z);
    scene.add(chairMesh);

    // Temp Bed Marker (Red)
    const bedMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    bedMesh.position.set(BED_POS.x, 0.25, BED_POS.z);
    scene.add(bedMesh);

    loadCharacter();
    requestAnimationFrame(renderLoop);
}

function loadCharacter() {
    const fbxLoader = new FBXLoader();
    
    // Load Man Character as default
    fbxLoader.load('./Man.fbx', (object) => {
        my3DCharacter = object;
        my3DCharacter.scale.set(0.01, 0.01, 0.01);
        my3DCharacter.position.set(0, 0, 0);
        scene.add(my3DCharacter);
        
        mixer = new THREE.AnimationMixer(my3DCharacter);
        
        document.getElementById('loading').style.display = 'none';

        if (object.animations.length > 0) {
            actions.idle = mixer.clipAction(object.animations[0]);
            actions.idle.play();
            currentAction = 'idle';
        }
        loadAnimations(fbxLoader);
    });
}

function loadAnimations(fbxLoader) {
    fbxLoader.load('./Running.fbx', (anim) => { actions.run = mixer.clipAction(anim.animations[0]); });
    // Dhyan rakhein: Mixamo se Sitting.fbx aur Sleeping.fbx download karke folder me rakhein
    fbxLoader.load('./Sitting.fbx', (anim) => { actions.sit = mixer.clipAction(anim.animations[0]); });
    fbxLoader.load('./Sleeping.fbx', (anim) => { actions.sleep = mixer.clipAction(anim.animations[0]); });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    if(actions[currentAction]) actions[currentAction].fadeOut(0.2);
    actions[animName].reset().fadeIn(0.2).play();
    currentAction = animName;
}

function setupInteractions() {
    btnSit.addEventListener('touchstart', () => {
        isBusy = true;
        my3DCharacter.position.set(CHAIR_POS.x, 0.5, CHAIR_POS.z); // Snap to chair
        playAnim('sit');
        updateActionUI('stand');
    });

    btnSleep.addEventListener('touchstart', () => {
        isBusy = true;
        my3DCharacter.position.set(BED_POS.x, 0.5, BED_POS.z); // Snap to bed
        my3DCharacter.rotation.y = Math.PI / 2; // Lie down flat
        playAnim('sleep');
        updateActionUI('stand');
    });

    btnStand.addEventListener('touchstart', () => {
        isBusy = false;
        my3DCharacter.position.set(0, 0, 0); // Step away to center
        playAnim('idle');
        updateActionUI('none');
    });
}

function updateActionUI(type) {
    btnSit.style.display = type === 'sit' ? 'block' : 'none';
    btnSleep.style.display = type === 'sleep' ? 'block' : 'none';
    btnStand.style.display = type === 'stand' ? 'block' : 'none';
    actionUI.style.display = type === 'none' ? 'none' : 'flex';
}

function setupJoystick() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    if(!base || !knob) return;
    let isDragging = false, center = { x: 0, y: 0 };

    base.addEventListener('touchstart', (e) => {
        if(isBusy) return; // Baithne ya sone par joystick disable
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
        if(!isBusy) playAnim('idle'); 
    });

    function handleTouch(e) {
        const touch = e.touches[0];
        let dx = touch.clientX - center.x;
        let dy = touch.clientY - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 45) { dx = (dx/dist)*45; dy = (dy/dist)*45; }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        moveVector = { x: dx/45, y: dy/45 };
        if (dist > 5) playAnim('run'); 
    }
}

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;
    if (mixer) mixer.update(delta);

    if (my3DCharacter && !isBusy) {
        // Handle Movement
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            my3DCharacter.rotation.y = Math.atan2(moveVector.x, moveVector.y);
        }

        // Distance Check for Interactions
        const distToChair = Math.hypot(my3DCharacter.position.x - CHAIR_POS.x, my3DCharacter.position.z - CHAIR_POS.z);
        const distToBed = Math.hypot(my3DCharacter.position.x - BED_POS.x, my3DCharacter.position.z - BED_POS.z);

        if (distToChair < 1.5) updateActionUI('sit');
        else if (distToBed < 2.0) updateActionUI('sleep');
        else updateActionUI('none');
    }

    // Camera follow
    if(my3DCharacter) {
        camera.position.x = my3DCharacter.position.x;
        camera.position.z = my3DCharacter.position.z + 3.0;
        camera.lookAt(my3DCharacter.position.x, 1, my3DCharacter.position.z);
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
}

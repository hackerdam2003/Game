import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

console.log("💃 [Testing Lab] Girl Character Animation Tester Active!");

let scene, camera, renderer, clock, controls;
let my3DCharacter = null;
let mixer = null;
let actions = {}; 
let currentAction = null;

// 📜 SAARE ANIMATIONS KI LIST
const animationList = [
    "Agreeing", "Breakdance Uprock Var 1", "Cheering", "Chicken Dance", 
    "Crazy Gesture", "Defeat2", "Drunk Run Forward", "Dying", 
    "Fist Fight A", "Getting Up", "Hand Raising", "Happy Walk", 
    "Head Hit", "Hip Hop Dancing", "Idle", "Idle2", 
    "Idle_bouncing_fight", "Idle_combat_stance", "Idle_dwarf", 
    "Idle_fighting", "Idle_glance_around", "Idle_happy", "Idle_sad", 
    "Illegal Elbow Punch", "Injured Run", "Jogging Stumble", 
    "Joyful Jump", "Jump", "Jump_forward", "Jump_forward_run", 
    "Jump_hunched", "Kick To The Groin", "Kicking", "Look Around", 
    "Look Over Shoulder", "Northern Soul Spin", "Pointing Gesture", 
    "Punching", "Running", "Running2", "Running3", "Running_scared", 
    "Shake Fist", "Side Kick", "Silly Dancing", 
    "Standing 2H Magic Attack 02", "Standing 2H Magic Attack 04", 
    "Strut Walking", "Thoughtful Head Shake", "Twist Dance", 
    "Victory", "Walking_backwards", "Walking_backwards_happy", 
    "Walking_crouched", "Walking_drunk", "Walking_limp", 
    "Walking_lumber", "Walking_tiptoe", "Walking_zombie", 
    "Waving1", "Waving2", "Yelling", "Swimming", "Treading Water", 
    "Lying Down", "Female Laying Pose", "Male Laying Pose", "Sitting Dazed"
];

initLab();

function initLab() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x334155); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); 
    camera.position.set(0, 2.5, 6); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.2, 0); 

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x10b981, 0x475569);
    scene.add(gridHelper);

    // Pehle buttons generate karo, taaki UI aa jaye
    generateUIButtons();

    // Phir character load karo
    loadCharacter();

    requestAnimationFrame(renderLoop);
}

function generateUIButtons() {
    const container = document.getElementById('btn-container');
    if (!container) {
        console.error("Button container not found!");
        return;
    }
    
    container.innerHTML = ''; // Clear previous if any

    animationList.forEach(animName => {
        const btn = document.createElement('div');
        btn.className = 'anim-btn';
        btn.id = `btn-${animName.replace(/ /g, '-')}`; // Safe ID
        btn.innerHTML = `<span>${animName}</span> <span style="font-size:10px; color:#94a3b8;">▶</span>`;
        
        btn.onclick = () => loadAndPlayAnimation(animName);
        container.appendChild(btn);
    });
    console.log("✅ Animation Buttons Generated!");
}

function loadCharacter() {
    const fbxLoader = new FBXLoader();
    const loadingUI = document.getElementById('loading-overlay');
    if(loadingUI) {
        loadingUI.style.display = 'block';
        loadingUI.innerText = "⏳ Loading Character...";
    }

    // Attempting to load the character. If this fails, the screen will stay blank.
    // Replace 'Peasant Girl.fbx' with the EXACT filename you have on GitHub if it's different.
    const characterUrl = './Peasant%20Girl.fbx'; 

    fbxLoader.load(characterUrl, (object) => {
        my3DCharacter = object;
        my3DCharacter.scale.set(0.013, 0.013, 0.013); 
        my3DCharacter.position.set(0, 0, 0); 
        
        my3DCharacter.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(my3DCharacter);
        mixer = new THREE.AnimationMixer(my3DCharacter);

        if(loadingUI) loadingUI.style.display = 'none';
        console.log("✅ Character Loaded!");
        
        // Auto-play Idle
        loadAndPlayAnimation("Idle");

    }, undefined, (err) => {
        console.error("❌ Character Load Error. Make sure the file exists at:", characterUrl, err);
        if(loadingUI) {
            loadingUI.innerText = "❌ Error Loading Character!";
            setTimeout(() => loadingUI.style.display = 'none', 3000);
        }
    });
}

function loadAndPlayAnimation(animName) {
    if (!my3DCharacter || !mixer) {
        console.warn("Character not loaded yet. Cannot play animation.");
        return;
    }

    // UI Update
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    const btnId = `btn-${animName.replace(/ /g, '-')}`;
    const btn = document.getElementById(btnId);
    if(btn) btn.classList.add('active');

    if (actions[animName]) {
        playAnim(animName);
        return;
    }

    const loadingUI = document.getElementById('loading-overlay');
    if(loadingUI) {
        loadingUI.style.display = 'block';
        loadingUI.innerText = `⏳ Loading: ${animName}...`;
    }

    const fbxLoader = new FBXLoader();
    const fileUrl = `./${animName.replace(/ /g, '%20')}.fbx`;

    fbxLoader.load(fileUrl, (anim) => {
        if (anim.animations.length > 0) {
            const clipAction = mixer.clipAction(anim.animations[0]);
            
            if (animName.toLowerCase().includes("jump") || 
                animName.toLowerCase().includes("punch") || 
                animName.toLowerCase().includes("hit") || 
                animName.toLowerCase().includes("attack") || 
                animName.toLowerCase().includes("dying")) {
                clipAction.setLoop(THREE.LoopOnce);
                clipAction.clampWhenFinished = true;
            }

            actions[animName] = clipAction;
            playAnim(animName);
        } else {
            console.warn(`No animation found in ${fileUrl}`);
            alert(`⚠️ No animation track in ${animName}.fbx`);
        }
        if(loadingUI) loadingUI.style.display = 'none';
    }, undefined, (err) => {
        console.error(`Error loading ${fileUrl}:`, err);
        if(loadingUI) {
            loadingUI.innerText = `❌ Error: ${animName} not found!`;
            setTimeout(() => loadingUI.style.display = 'none', 3000);
        }
    });
}

function playAnim(animName) {
    if (!mixer || !actions[animName] || currentAction === animName) return;
    
    if (actions[currentAction]) {
        actions[currentAction].fadeOut(0.3);
    }
    
    actions[animName].reset().fadeIn(0.3).play();
    currentAction = animName;
    console.log("▶ Playing:", animName);
}

// Auto-return to Idle
setInterval(() => {
    if(mixer) {
        mixer.addEventListener('finished', (e) => {
            if(currentAction && !currentAction.toLowerCase().includes("dying")) {
                loadAndPlayAnimation("Idle");
            }
        });
    }
}, 1000);

function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;
    
    if (mixer) mixer.update(delta);
    if (controls) controls.update();
    
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});


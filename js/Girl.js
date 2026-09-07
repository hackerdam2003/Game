import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

console.log("💃 [Testing Lab] AI Bone Auto-Fixer Active! (GLB + FBX Sync)");

let scene, camera, renderer, clock, controls;
let my3DCharacter = null;
let mixer = null;
let actions = {}; 
let currentAction = null;
let characterBones = []; // 🚀 NAYA: Character ki haddiyon ko store karne ke liye

// 📜 EXACT FILES FROM YOUR FOLDER
const animationList = [
    "Agreeing", "Breakdance Uprock Var 1", "Cheering", "Chicken_Dance", 
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
    "Waving1", "Waving2", "Yelling", "e_Walking"
];

initLab();

function initLab() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b); 
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); 
    camera.position.set(0, 1.5, 3.5); 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.0, 0); 

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x10b981, 0x475569);
    scene.add(gridHelper);

    generateUIButtons();

    const charSelector = document.getElementById('char-selector');
    if (charSelector) {
        charSelector.addEventListener('change', () => {
            loadCharacter(charSelector.value);
        });
        loadCharacter(charSelector.value);
    }

    requestAnimationFrame(renderLoop);
}

function generateUIButtons() {
    const container = document.getElementById('btn-container');
    if (!container) return;
    container.innerHTML = ''; 

    animationList.sort().forEach(animName => {
        const btn = document.createElement('div');
        btn.className = 'anim-btn';
        btn.id = `btn-${animName.replace(/ /g, '-')}`; 
        btn.innerHTML = `<span>${animName}</span> <span style="font-size:10px; color:#94a3b8;">▶</span>`;
        
        btn.onclick = () => loadAndPlayAnimation(animName);
        container.appendChild(btn);
    });
}

function loadCharacter(filePath) {
    const loadingUI = document.getElementById('loading-overlay');
    if (loadingUI) {
        loadingUI.style.display = 'block';
        loadingUI.innerText = `⏳ Loading Character...`;
    }

    if (my3DCharacter) {
        scene.remove(my3DCharacter);
        mixer = null;
        actions = {};
        currentAction = null;
    }

    const isGLB = filePath.toLowerCase().endsWith('.glb');
    const characterUrl = `./${encodeURIComponent(filePath)}`; 

    const onLoadSuccess = (object) => {
        my3DCharacter = isGLB ? object.scene : object;
        
        const scaleSize = isGLB ? 1.0 : 0.013; 
        my3DCharacter.scale.set(scaleSize, scaleSize, scaleSize); 
        my3DCharacter.position.set(0, 0, 0); 
        
        characterBones = []; // Reset bones
        my3DCharacter.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
            // 🚀 Character ki saari parts/bones ka naam save kar lo
            if (child.name) {
                characterBones.push(child.name);
            }
        });

        scene.add(my3DCharacter);
        mixer = new THREE.AnimationMixer(my3DCharacter);

        // 🚀 AGAR GLB FILE ME PEHLE SE ANIMATION HAI TOH USKO SAVE KARLO
        const embeddedAnims = isGLB ? object.animations : object.animations;
        if (embeddedAnims && embeddedAnims.length > 0) {
            console.log(`✅ Found ${embeddedAnims.length} Built-in Animations!`);
            embeddedAnims.forEach(anim => {
                actions[anim.name] = mixer.clipAction(anim);
            });
        }

        if (loadingUI) loadingUI.style.display = 'none';
        
        loadAndPlayAnimation("Idle");
    };

    const onLoadError = (err) => {
        console.error("❌ Character Load Error:", characterUrl, err);
        if (loadingUI) {
            loadingUI.innerText = `❌ Character Not Found! Check path.`;
            setTimeout(() => loadingUI.style.display = 'none', 3000);
        }
    };

    if (isGLB) {
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(characterUrl, onLoadSuccess, undefined, onLoadError);
    } else {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(characterUrl, onLoadSuccess, undefined, onLoadError);
    }
}

function loadAndPlayAnimation(animName) {
    if (!my3DCharacter || !mixer) return;

    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    const btnId = `btn-${animName.replace(/ /g, '-')}`;
    const btn = document.getElementById(btnId);
    if(btn) btn.classList.add('active');

    if (actions[animName]) {
        playAnim(animName);
        return;
    }

    const loadingUI = document.getElementById('loading-overlay');
    if (loadingUI) {
        loadingUI.style.display = 'block';
        loadingUI.innerText = `⏳ Loading: ${animName}...`;
    }

    const fbxLoader = new FBXLoader();
    const fileUrl = `./First/${encodeURIComponent(animName)}.fbx`;

    fbxLoader.load(fileUrl, (anim) => {
        if (anim.animations.length > 0) {
            let clip = anim.animations[0];

            // 🚀 BONE AUTO-FIXER LOGIC (Yeh T-Pose fix karega)
            clip.tracks.forEach(track => {
                const parts = track.name.split('.');
                let boneName = parts[0];
                const property = parts[1];

                // Remove FBX specific prefixes like "Armature|"
                if (boneName.includes('|')) {
                    boneName = boneName.split('|').pop();
                }

                // Agar exact bone nahi mili, toh fuzzy matching karo
                if (!characterBones.includes(boneName)) {
                    const simpleTrackName = boneName.replace(/[^a-zA-Z]/g, '').toLowerCase();
                    const matchedBone = characterBones.find(b => {
                        const simpleBoneName = b.replace(/[^a-zA-Z]/g, '').toLowerCase();
                        return simpleBoneName === simpleTrackName || simpleBoneName.includes(simpleTrackName) || simpleTrackName.includes(simpleBoneName);
                    });
                    
                    if (matchedBone) {
                        track.name = `${matchedBone}.${property}`;
                    }
                }
            });

            const clipAction = mixer.clipAction(clip);
            
            if (animName.toLowerCase().includes("jump") || 
                animName.toLowerCase().includes("punch") || 
                animName.toLowerCase().includes("hit") || 
                animName.toLowerCase().includes("attack") || 
                animName.toLowerCase().includes("dying") ||
                animName.toLowerCase().includes("getting up")) {
                clipAction.setLoop(THREE.LoopOnce);
                clipAction.clampWhenFinished = true;
            }

            actions[animName] = clipAction;
            playAnim(animName);
        } else {
            console.warn(`No animation track found in ${fileUrl}`);
        }
        if (loadingUI) loadingUI.style.display = 'none';
    }, undefined, (err) => {
        console.error(`Error loading animation ${fileUrl}:`, err);
        if (loadingUI) {
            loadingUI.innerText = `❌ Animation Not Found!`;
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
}

setInterval(() => {
    if(mixer) {
        mixer.addEventListener('finished', (e) => {
            if(currentAction && !currentAction.toLowerCase().includes("dying") && !currentAction.toLowerCase().includes("pose")) {
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

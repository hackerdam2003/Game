import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.0, 3.5); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
scene.add(ambientLight);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(3, 5, 3);
keyLight.castShadow = true;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
fillLight.position.set(-3, 2, -3);
scene.add(fillLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.9, 0);

let characterModel = null;
let mixer = null;
const clock = new THREE.Clock();

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader(); 

let actions = {};
let currentActionName = 'idle';

const characterFiles = {
    'man': './Man.fbx',
    'girl': './Peasant%20Girl.fbx',
    'hotgirl': './Hotgirl.fbx', 
    'mymodel': 'assets/all_animations.glb' // 👈 Yahan sab pack wali file ka naam diya hai
};

const defaultMotionFiles = {
    'idle': './Idle.fbx',
    'run': './Running.fbx',
    'punch': './Punching.fbx',
    'dance': './Hip%20Hop%20Dancing.fbx',
    'bounce': './bouncing%20fight.fbx' 
};

let currentSelectedChar = 'mymodel'; 

function createEditorUI() {
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 8px; z-index: 10; max-width: 300px; border: 1px solid #3b82f6;';
    
    uiDiv.innerHTML = `
        <div style="margin-bottom: 10px;">
            <span style="color: #38bdf8; font-size: 13px; font-weight: bold; display: block; margin-bottom: 6px;">👤 Characters</span>
            <button class='ui-btn' id='char-man' style='background:#3b82f6;'>Man</button>
            <button class='ui-btn' id='char-girl' style='background:#ec4899;'>Girl</button>
            <button class='ui-btn' id='char-hotgirl' style='background:#f43f5e;'>Hot Girl</button> 
            <button class='ui-btn' id='char-mymodel' style='background:#10b981;'>My GLB Model</button>
        </div>
        <hr style="border-color:#334155; margin: 10px 0;">
        <div>
            <span style="color: #10b981; font-size: 13px; font-weight: bold; display: block; margin-bottom: 6px;">🎬 Test Motions</span>
            <div id="motion-buttons-container"></div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `.ui-btn { color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; cursor:pointer; margin: 0 4px 4px 0; font-weight:bold; } .ui-btn:active{ transform:scale(0.95); }`;
    document.head.appendChild(style);
    container.appendChild(uiDiv);

    document.getElementById('char-man').addEventListener('click', () => loadCharacter('man'));
    document.getElementById('char-girl').addEventListener('click', () => loadCharacter('girl'));
    document.getElementById('char-hotgirl').addEventListener('click', () => loadCharacter('hotgirl'));
    document.getElementById('char-mymodel').addEventListener('click', () => loadCharacter('mymodel'));
}

function loadCharacter(charKey) {
    if (currentSelectedChar === charKey && characterModel) return;
    currentSelectedChar = charKey;
    const url = characterFiles[charKey];
    const isGLB = charKey === 'mymodel';

    const loadingEl = document.getElementById('loading-text');
    if(loadingEl) { 
        loadingEl.style.color = '#3b82f6';
        loadingEl.style.display = 'block'; 
        loadingEl.innerText = "Loading Model & Motion..."; 
    }

    if (characterModel) { scene.remove(characterModel); characterModel = null; mixer = null; }

    const setupModel = (model, baseAnimations) => {
        characterModel = model;
        
        if (isGLB || charKey === 'hotgirl') {
            characterModel.scale.set(1, 1, 1);
        } else {
            characterModel.scale.set(0.01, 0.01, 0.01);
        }
        
        characterModel.position.set(0, 0, 0);
        
        characterModel.traverse((node) => { 
            if (node.isMesh) { 
                node.castShadow = true; 
                node.receiveShadow = true; 
                if (node.material) {
                    node.material.roughness = 0.6;
                    node.material.metalness = 0.1;
                    node.material.needsUpdate = true;
                }
            }
        });
        scene.add(characterModel);
        mixer = new THREE.AnimationMixer(characterModel);
        actions = {}; 
        
        const btnContainer = document.getElementById('motion-buttons-container');
        btnContainer.innerHTML = '';

        if (isGLB) {
            // GLB ki andar ki animations khud padh kar chalayega
            if (baseAnimations && baseAnimations.length > 0) {
                baseAnimations.forEach(clip => {
                    actions[clip.name] = mixer.clipAction(clip);
                    // Dynamically button banana
                    const btn = document.createElement('button');
                    btn.className = 'ui-btn';
                    btn.style.background = '#8b5cf6';
                    btn.innerText = clip.name;
                    btn.onclick = () => playMotion(clip.name);
                    btnContainer.appendChild(btn);
                });
                const firstAnim = baseAnimations[0].name;
                actions[firstAnim].play();
                currentActionName = firstAnim;
            } else {
                btnContainer.innerHTML = '<span style="color:red; font-size:11px;">No animations found inside GLB</span>';
            }
        } else {
            // Purane FBX characters ke default buttons
            const fbxButtons = [
                { id: 'idle', label: 'Idle', color: '#64748b' },
                { id: 'run', label: 'Run', color: '#f59e0b' },
                { id: 'punch', label: 'Punch', color: '#ef4444' },
                { id: 'dance', label: 'Dance', color: '#10b981' }
            ];
            fbxButtons.forEach(b => {
                const btn = document.createElement('button');
                btn.className = 'ui-btn';
                btn.style.background = b.color;
                btn.innerText = b.label;
                btn.onclick = () => playMotion(b.id);
                btnContainer.appendChild(btn);
            });
            loadExternalFbxMotions();
        }

        if(loadingEl) loadingEl.style.display = 'none';
    };

    if (isGLB) {
        gltfLoader.load(url, (gltf) => setupModel(gltf.scene, gltf.animations), undefined, (err) => {
            if(loadingEl) {
                loadingEl.style.color = '#ef4444';
                loadingEl.innerText = "❌ Error: 'assets/all_animations.glb' file nahi mili!";
            }
        });
    } else {
        fbxLoader.load(url, (fbx) => setupModel(fbx, fbx.animations), undefined, console.error);
    }
}

function loadExternalFbxMotions() {
    for (const [mKey, mUrl] of Object.entries(defaultMotionFiles)) {
        fbxLoader.load(mUrl, (animObj) => {
            if (animObj.animations && animObj.animations.length > 0) {
                const action = mixer.clipAction(animObj.animations[0]);
                if(mKey === 'punch') action.setLoop(THREE.LoopOnce); 
                actions[mKey] = action;
                if (mKey === 'idle') playMotion('idle');
            }
        });
    }
}

function playMotion(motionKey) {
    if (!mixer || !actions[motionKey] || currentActionName === motionKey) return;
    if (actions[currentActionName]) actions[currentActionName].fadeOut(0.2);
    actions[motionKey].reset().fadeIn(0.2).play();
    currentActionName = motionKey;
}

createEditorUI();
loadCharacter(currentSelectedChar);

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

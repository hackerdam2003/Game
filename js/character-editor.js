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

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff0dd, 2);
keyLight.position.set(2, 4, 2);
keyLight.castShadow = true;
scene.add(keyLight);

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

// SABHI CHARACTERS KI LIST
const characterFiles = {
    'man': './Man.fbx',
    'girl': './Peasant%20Girl.fbx',
    'hotgirl': './Hotgirl.fbx', 
    'mymodel': 'assets/all_animations.glb' // TUMHARA NAYA CHARACTER
};

// PURANE FBX CHARACTERS KE MOTIONS
const motionFiles = {
    'run': './Running.fbx',
    'punch': './Punching.fbx',
    'dance': './Hip%20Hop%20Dancing.fbx',
    'bounce': './bouncing%20fight.fbx' 
};

let currentSelectedChar = 'man';

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

function buildMotionButtons(isGLB, gltfAnimations = []) {
    const container = document.getElementById('motion-buttons-container');
    container.innerHTML = ''; 

    if (isGLB) {
        // Naye GLB model ke khud ke motions
        if (gltfAnimations.length > 0) {
            gltfAnimations.forEach((clip) => {
                const btn = document.createElement('button');
                btn.className = 'ui-btn';
                btn.style.background = '#8b5cf6';
                btn.innerText = clip.name;
                btn.onclick = () => playMotion(clip.name);
                container.appendChild(btn);
            });
        } else {
            container.innerHTML = '<span style="color:red; font-size:10px;">No animations in GLB</span>';
        }
    } else {
        // Purane FBX models ke standard motions
        const fbxButtons = [
            { id: 'idle', label: 'Idle', color: '#64748b' },
            { id: 'run', label: 'Run', color: '#f59e0b' },
            { id: 'punch', label: 'Punch', color: '#ef4444' },
            { id: 'dance', label: 'Dance', color: '#10b981' },
            { id: 'bounce', label: 'Bounce Fight', color: '#f97316' }
        ];
        
        fbxButtons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'ui-btn';
            btn.style.background = b.color;
            btn.innerText = b.label;
            btn.onclick = () => playMotion(b.id);
            container.appendChild(btn);
        });
    }
}

function loadCharacter(charKey) {
    if (currentSelectedChar === charKey && characterModel) return;
    currentSelectedChar = charKey;
    const url = characterFiles[charKey];
    const isGLB = charKey === 'mymodel';

    const loadingEl = document.getElementById('loading-text');
    if(loadingEl) { loadingEl.style.display = 'block'; loadingEl.innerText = "Loading Model..."; }

    if (characterModel) { scene.remove(characterModel); characterModel = null; mixer = null; }

    const setupModel = (model, baseAnimations) => {
        characterModel = model;
        
        if (isGLB || charKey === 'hotgirl') {
            characterModel.scale.set(1, 1, 1);
        } else {
            characterModel.scale.set(0.01, 0.01, 0.01);
        }
        
        characterModel.position.set(0, 0, 0);
        characterModel.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }});
        scene.add(characterModel);

        if (charKey === 'hotgirl') {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load('./texture.jpg', (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                characterModel.traverse((child) => {
                    if (child.isMesh && child.material) {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    }
                });
            });
        }

        mixer = new THREE.AnimationMixer(characterModel);
        actions = {}; 

        if (isGLB) {
            // GLB Motions Setup
            if (baseAnimations && baseAnimations.length > 0) {
                baseAnimations.forEach(clip => {
                    actions[clip.name] = mixer.clipAction(clip);
                });
                const firstAnim = baseAnimations[0].name;
                actions[firstAnim].play();
                currentActionName = firstAnim;
            }
            buildMotionButtons(true, baseAnimations);
        } else {
            // FBX Motions Setup
            if (baseAnimations && baseAnimations.length > 0) {
                actions['idle'] = mixer.clipAction(baseAnimations[0]);
                actions['idle'].play();
                currentActionName = 'idle';
            }
            buildMotionButtons(false);
            loadExternalFbxMotions();
        }

        if(loadingEl) loadingEl.style.display = 'none';
    };

    if (isGLB) {
        gltfLoader.load(url, (gltf) => setupModel(gltf.scene, gltf.animations), undefined, console.error);
    } else {
        fbxLoader.load(url, (fbx) => setupModel(fbx, fbx.animations), undefined, console.error);
    }
}

function loadExternalFbxMotions() {
    for (const [mKey, mUrl] of Object.entries(motionFiles)) {
        fbxLoader.load(mUrl, (animObj) => {
            if (animObj.animations && animObj.animations.length > 0) {
                const action = mixer.clipAction(animObj.animations[0]);
                if(mKey === 'punch') action.setLoop(THREE.LoopOnce); 
                actions[mKey] = action;
            }
        });
    }
}

function playMotion(motionKey) {
    if (!mixer || !actions[motionKey] || currentActionName === motionKey) return;
    if (actions[currentActionName]) actions[currentActionName].fadeOut(0.2);
    
    actions[motionKey].reset().fadeIn(0.2).play();
    currentActionName = motionKey;

    if(motionKey === 'punch') {
        mixer.addEventListener('finished', function listener(e) {
            if (e.action === actions['punch']) {
                mixer.removeEventListener('finished', listener);
                playMotion('idle');
            }
        });
    }
}

createEditorUI();
loadCharacter(currentSelectedChar);

const colorSkinInput = document.getElementById('color-skin');
if(colorSkinInput) {
    colorSkinInput.addEventListener('input', (e) => {
        if (characterModel) {
            characterModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(mat => mat.color.set(e.target.value));
                    else child.material.color.set(e.target.value);
                }
            });
        }
    });
}

window.save3DDNA = function() {
    localStorage.setItem('selectedCharacter', currentSelectedChar);
    alert('3D Character DNA Saved! Entering Game...');
    window.location.href = "game.html";
};

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

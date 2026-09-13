import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.4, 3.5); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
controls.target.set(0, 1.2, 0);

let characterModel = null;
let mixer = null;
const clock = new THREE.Clock();

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader(); 
const textureLoader = new THREE.TextureLoader();

let actions = {};
let currentActionName = 'idle';

const characterFiles = {
    'man': './Man.fbx',
    'girl': './Peasant%20Girl.fbx',
    'hotgirl': './Hotgirl.fbx', 
    'misaki': 'assets/character/misaki.fbx',
    'mymodel': 'assets/all_animations.glb' 
};

const defaultMotionFiles = {
    'idle': './Idle.fbx',
    'run': './Running.fbx',
    'punch': './Punching.fbx',
    'dance': './Hip%20Hop%20Dancing.fbx',
    'bounce': './bouncing%20fight.fbx' 
};

let currentSelectedChar = 'misaki'; 

function createEditorUI() {
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.85); padding: 12px; border-radius: 8px; z-index: 10; max-width: 260px; border: 1px solid #3b82f6; backdrop-filter: blur(5px);';
    
    uiDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
            <span style="color: #38bdf8; font-size: 11px; font-weight: bold; display: block; margin-bottom: 5px;">👤 Characters</span>
            <button class='ui-btn' id='char-man' style='background:#3b82f6;'>Man</button>
            <button class='ui-btn' id='char-girl' style='background:#ec4899;'>Girl</button>
            <button class='ui-btn' id='char-hotgirl' style='background:#f43f5e;'>Hot Girl</button> 
            <button class='ui-btn' id='char-misaki' style='background:#a855f7;'>Misaki</button>
            <button class='ui-btn' id='char-mymodel' style='background:#10b981;'>My GLB</button>
        </div>
        <hr style="border-color:#334155; margin: 8px 0;">
        <div>
            <span style="color: #10b981; font-size: 11px; font-weight: bold; display: block; margin-bottom: 5px;">🎬 Motions</span>
            <div id="motion-buttons-container"></div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `.ui-btn { color:#fff; border:none; padding:5px 8px; border-radius:4px; font-size:10px; cursor:pointer; margin: 0 3px 3px 0; font-weight:bold; } .ui-btn:active{ transform:scale(0.95); }`;
    document.head.appendChild(style);
    container.appendChild(uiDiv);

    document.getElementById('char-man').addEventListener('click', () => loadCharacter('man'));
    document.getElementById('char-girl').addEventListener('click', () => loadCharacter('girl'));
    document.getElementById('char-hotgirl').addEventListener('click', () => loadCharacter('hotgirl'));
    document.getElementById('char-misaki').addEventListener('click', () => loadCharacter('misaki'));
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
        loadingEl.innerText = "Loading Model & Parts..."; 
    }

    if (characterModel) { scene.remove(characterModel); characterModel = null; mixer = null; }

    const setupModel = (model, baseAnimations) => {
        characterModel = model;
        characterModel.scale.set(1.0, 1.0, 1.0);
        characterModel.position.set(0, 0, 0);
        
        const partsContainer = document.getElementById('parts-list-container');
        partsContainer.innerHTML = '';

        // 🚀 SMART TRAVERSAL: Handles Single and Multi-Material Meshes
        characterModel.traverse((node) => { 
            if (node.isMesh) { 
                node.castShadow = true; 
                node.receiveShadow = true; 
                
                const processMaterialForUI = (mat, index) => {
                    if(!mat) return;
                    mat.roughness = 0.6;
                    mat.metalness = 0.1;
                    mat.needsUpdate = true;

                    const partName = mat.name || `Part_${index}`;
                    const row = document.createElement('div');
                    row.className = 'part-row';
                    row.innerHTML = `
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;" title="${partName}">${partName}</span>
                        <button id="btn-part-${node.id}-${index}">Hide</button>
                    `;
                    partsContainer.appendChild(row);

                    setTimeout(() => {
                        const btn = document.getElementById(`btn-part-${node.id}-${index}`);
                        if(btn) {
                            btn.onclick = () => {
                                // Kapdo ko mesh hide karke nahi, balki material invisible karke hatayenge
                                mat.visible = !mat.visible;
                                btn.innerText = mat.visible ? "Hide" : "Show";
                                btn.className = mat.visible ? "" : "show";
                            };
                        }
                    }, 50);
                };

                // Check if material is an array (Multi-Material Mesh like Misaki)
                if (Array.isArray(node.material)) {
                    node.material.forEach((mat, idx) => {
                        processMaterialForUI(mat, idx);
                    });
                } else {
                    processMaterialForUI(node.material, 0);
                }
            }
        });

        scene.add(characterModel);
        mixer = new THREE.AnimationMixer(characterModel);
        actions = {}; 
        
        const btnContainer = document.getElementById('motion-buttons-container');
        btnContainer.innerHTML = '';

        if (isGLB) {
            if (baseAnimations && baseAnimations.length > 0) {
                baseAnimations.forEach(clip => {
                    actions[clip.name] = mixer.clipAction(clip);
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
                btnContainer.innerHTML = '<span style="color:red; font-size:10px;">No animations found</span>';
            }
        } else {
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
        gltfLoader.load(url, (gltf) => setupModel(gltf.scene, gltf.animations), undefined, () => {
            if(loadingEl) { loadingEl.style.color = '#ef4444'; loadingEl.innerText = "❌ Error loading GLB!"; }
        });
    } else {
        fbxLoader.load(url, (fbx) => setupModel(fbx, fbx.animations), undefined, (err) => {
            if(loadingEl) { loadingEl.style.color = '#ef4444'; loadingEl.innerText = "❌ Error loading Misaki FBX!"; }
        });
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

// 🚀 SMART MAGIC BUTTON: Automatically parses materials inside the mesh
window.addEventListener('applyMagicSkin', () => {
    if(!characterModel) return;

    textureLoader.load('assets/character/mis_body_base.png', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;

        const processMagicOnMaterial = (mat, meshNode, index) => {
            if(!mat) return;
            const name = (mat.name + " " + meshNode.name).toLowerCase();
            
            const isCloth = name.includes('shirt') || name.includes('panty') || name.includes('panties') || 
                            name.includes('cloth') || name.includes('skirt') || name.includes('dress') ||
                            name.includes('bra') || name.includes('bottom') || name.includes('top');

            if (isCloth) {
                // Sirf kapde wale material ko hide karega, poore mesh ko nahi
                mat.visible = false; 
                
                // UI Toggle button ko automatically 'Show' (Green) par set karega
                const btn = document.getElementById(`btn-part-${meshNode.id}-${index}`);
                if(btn) { btn.innerText = "Show"; btn.className = "show"; }
            } else {
                const isSkin = name.includes('body') || name.includes('skin') || name.includes('face') || 
                               name.includes('arm') || name.includes('leg') || name.includes('mis');
                               
                if (isSkin) {
                    mat.map = texture;
                    mat.needsUpdate = true;
                    mat.visible = true; // Ensure skin is visible
                }
            }
        };

        characterModel.traverse((node) => {
            if (node.isMesh) {
                if (Array.isArray(node.material)) {
                    node.material.forEach((mat, idx) => processMagicOnMaterial(mat, node, idx));
                } else {
                    processMagicOnMaterial(node.material, node, 0);
                }
            }
        });
    }, undefined, (err) => {
        console.error("Texture Load Failed:", err);
    });
});

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

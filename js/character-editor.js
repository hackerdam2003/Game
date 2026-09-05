import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.0, 2.5);

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

// Available Characters Map
const characterFiles = {
    'man': './Man.fbx',
    'girl': './Peasant%20Girl.fbx',
    'dance': './Hip%20Hop%20Dancing.fbx'
};
let currentKey = 'man';

// Create Editor UI for Character Switching
function createEditorUI() {
    const uiDiv = document.createElement('div');
    uiDiv.style.cssText = 'position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 8px; z-index: 10;';
    uiDiv.innerHTML = `
        <span style="color: #38bdf8; font-size: 12px; display: block; margin-bottom: 6px;"><b>Select Character:</b></span>
        <button id='edit-man' style='background:#3b82f6; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; cursor:pointer; margin-right:5px;'>Man</button>
        <button id='edit-girl' style='background:#ec4899; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; cursor:pointer; margin-right:5px;'>Girl</button>
        <button id='edit-dance' style='background:#10b981; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:11px; cursor:pointer;'>Dance Model</button>
    `;
    container.appendChild(uiDiv);

    document.getElementById('edit-man').addEventListener('click', () => switchEditorCharacter('man'));
    document.getElementById('edit-girl').addEventListener('click', () => switchEditorCharacter('girl'));
    document.getElementById('edit-dance').addEventListener('click', () => switchEditorCharacter('dance'));
}

function switchEditorCharacter(key) {
    if (currentKey === key) return;
    currentKey = key;
    loadCharacter(characterFiles[key]);
}

// Load Character Function
function loadCharacter(url) {
    const loadingEl = document.getElementById('loading-text');
    if(loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerText = "Loading Character...";
    }

    if (characterModel) {
        scene.remove(characterModel);
        characterModel = null;
        mixer = null;
    }

    fbxLoader.load(
        url,
        (object) => {
            characterModel = object;
            
            // Mixamo scale fix (centimeters to meters)
            characterModel.scale.set(0.01, 0.01, 0.01);
            characterModel.position.set(0, 0, 0);
            
            characterModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            scene.add(characterModel);
            
            if(loadingEl) loadingEl.style.display = 'none';

            // Play embedded animation if available
            if (object.animations && object.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterModel);
                const action = mixer.clipAction(object.animations[0]);
                action.play();
            }
        },
        (xhr) => {
            if (xhr.lengthComputable && loadingEl) {
                const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                loadingEl.innerText = `Loading... ${percent}%`;
            }
        },
        (error) => {
            console.error("FBX Load Error:", error);
            if(loadingEl) {
                loadingEl.innerText = "❌ Error Loading File";
                loadingEl.style.color = "#ef4444";
            }
        }
    );
}

// Initial Load
createEditorUI();
loadCharacter(characterFiles[currentKey]);

// Skin color change support
const colorSkinInput = document.getElementById('color-skin');
if(colorSkinInput) {
    colorSkinInput.addEventListener('input', (e) => {
        if (characterModel) {
            characterModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.color.set(e.target.value));
                    } else {
                        child.material.color.set(e.target.value);
                    }
                }
            });
        }
    });
}

window.save3DDNA = function() {
    alert('3D Character DNA Saved Successfully! Entering Game World...');
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


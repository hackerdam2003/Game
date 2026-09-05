import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'; // 🛑 Added FBXLoader back

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

// Camera setup for close-up view
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0.85, 1.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Game Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff0dd, 2);
keyLight.position.set(2, 2, 2);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x4444ff, 1.5);
rimLight.position.set(-2, 1, -2);
scene.add(rimLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.85, 0); 
controls.minDistance = 0.5;
controls.maxDistance = 4;

let characterModel = null;
let mixer = null; // 🛑 Mixer for Animation
const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// Correct Paths based on your GitHub Root
const modelURL = './Model prepared.glb';
const idleAnimURL = './bouncing fight.fbx';

gltfLoader.load(
    modelURL,
    (gltf) => {
        characterModel = gltf.scene;
        
        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        scene.add(characterModel);
        document.getElementById('loading-text').style.display = 'none';

        // 🛑 Load & Apply FBX Animation directly to the GLB Model
        fbxLoader.load(idleAnimURL, (animObj) => {
            if (animObj.animations && animObj.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterModel);
                const idleAction = mixer.clipAction(animObj.animations[0]);
                idleAction.play();
            }
        }, undefined, (err) => console.warn("Animation skipped:", err));
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-text').innerText = `Loading 3D Core... ${percent}%`;
        }
    },
    (error) => {
        console.error("Model Error:", error);
        document.getElementById('loading-text').innerText = "❌ Error Loading Model";
        document.getElementById('loading-text').style.color = "#ef4444";
    }
);

// UI Bone Scaling Logic
function updateMorphs() {
    if (!characterModel) return;
    
    const chestVal = parseFloat(document.getElementById('morph-chest').value);
    const waistVal = parseFloat(document.getElementById('morph-waist').value);
    const hipsVal = parseFloat(document.getElementById('morph-hips').value);
    
    const chestBone = characterModel.getObjectByName('spine_02.x');
    if (chestBone) {
        const scale = 0.8 + (chestVal * 0.4);
        chestBone.scale.set(scale, scale, scale);
    }

    const waistBone = characterModel.getObjectByName('spine_01.x');
    if (waistBone) {
        const scale = 1.2 - (waistVal * 0.4);
        waistBone.scale.set(scale, 1, scale);
    }

    const hipsBone = characterModel.getObjectByName('root.x');
    if (hipsBone) {
        const scale = 0.8 + (hipsVal * 0.4);
        hipsBone.scale.set(scale, scale, scale);
    }
}

document.getElementById('morph-chest').addEventListener('input', updateMorphs);
document.getElementById('morph-waist').addEventListener('input', updateMorphs);
document.getElementById('morph-hips').addEventListener('input', updateMorphs);

document.getElementById('color-skin').addEventListener('input', (e) => {
    if (characterModel) {
        characterModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.set(e.target.value);
            }
        });
    }
});

window.save3DDNA = function() {
    alert('3D Character DNA Saved Successfully! Entering Game World...');
    // Future integration: window.location.href = "game.html";
};

function animate() {
    requestAnimationFrame(animate);
    
    // 🛑 Update Animation Frame
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

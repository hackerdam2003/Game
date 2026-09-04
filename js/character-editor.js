import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// 1. Core 3D Engine Setup
const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 3); // Position camera looking at character

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ultra-realistic soft shadows
container.appendChild(renderer.domElement);

// 2. AAA Studio Lighting (For Subsurface Skin Glow)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffedd5, 1.5); // Warm sun light
keyLight.position.set(2, 3, 2);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.2); // Blue rim light for 3D pop
rimLight.position.set(-2, 2, -3);
scene.add(rimLight);

// 3. Mouse Camera Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.9, 0); // Look at chest/face level
controls.minDistance = 1;
controls.maxDistance = 5;

// Animation & Character Variables
let characterModel = null;
let bodyMesh = null; 
let mixer = null;
const clock = new THREE.Clock();

// 4. Load Custom 3D Model (.glb) and Default Animation (.fbx)
const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

const modelURL = 'assets/ee654438-4e51-4637-a703-1e2188cea38e.glb';
const idleAnimURL = 'assets/ee654438-4e51-4637-a703-1e2188cea38e_Idle_bouncing_fight.fbx';

gltfLoader.load(
    modelURL,
    (gltf) => {
        characterModel = gltf.scene;
        
        // Setup shadows and find the body mesh
        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Improve skin material realism
                if (node.material) {
                    node.material.roughness = 0.4;
                    node.material.metalness = 0.1;
                }
                
                if (node.morphTargetDictionary) {
                    bodyMesh = node; 
                }
            }
        });

        scene.add(characterModel);
        document.getElementById('loading-text').style.display = 'none';

        // Load and play Idle Animation once the character is ready
        fbxLoader.load(idleAnimURL, (object) => {
            mixer = new THREE.AnimationMixer(characterModel);
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        }, undefined, (error) => {
            console.error("Error loading animation file:", error);
        });

    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-text').innerText = `Loading Core... ${percent}%`;
        }
    },
    (error) => { console.error("Error loading 3D model:", error); }
);

// 5. Connect UI Sliders to 3D Morphs / Material Colors
function updateMorphs() {
    if (!bodyMesh || !bodyMesh.morphTargetDictionary) return;
    
    const chestVal = parseFloat(document.getElementById('morph-chest').value);
    const waistVal = parseFloat(document.getElementById('morph-waist').value);
    
    if (bodyMesh.morphTargetDictionary['BustSize'] !== undefined) {
        bodyMesh.morphTargetInfluences[bodyMesh.morphTargetDictionary['BustSize']] = chestVal;
    }
}

document.getElementById('morph-chest').addEventListener('input', updateMorphs);
document.getElementById('morph-waist').addEventListener('input', updateMorphs);

document.getElementById('color-skin').addEventListener('input', (e) => {
    if (characterModel) {
        characterModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.set(e.target.value);
            }
        });
    }
});

// Save 3D DNA Action
window.save3DDNA = function() {
    alert('3D Character DNA Saved Successfully! Entering Game World...');
};

// 6. Rendering Loop with Animation Mixer Update
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

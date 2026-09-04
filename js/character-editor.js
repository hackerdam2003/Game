import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

// 4. Load 3D Model (.glb file)
let characterModel = null;
let bodyMesh = null; // To target skin/blendshapes
const loader = new GLTFLoader();

// 🚨 IMPORTANT: You must provide a highly detailed .glb file here!
// The file must be rigged and contain "Blendshapes/MorphTargets" for chest, waist, etc.
const modelURL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb'; 

loader.load(
    modelURL,
    (gltf) => {
        characterModel = gltf.scene;
        
        // Setup shadows and find the body mesh
        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                // Improve skin material realism (Physical Material)
                if (node.material) {
                    node.material.roughness = 0.4;
                    node.material.metalness = 0.1;
                }
                
                // Assume the mesh with morph targets is the body
                if (node.morphTargetDictionary) {
                    bodyMesh = node; 
                }
            }
        });

        scene.add(characterModel);
        document.getElementById('loading-text').style.display = 'none';
    },
    undefined,
    (error) => { console.error("Error loading 3D model:", error); }
);

// 5. Connect UI Sliders to 3D Morph Targets
function updateMorphs() {
    if (!bodyMesh || !bodyMesh.morphTargetDictionary) return;
    
    // Example: Map sliders to model's exact Blendshape names (You must configure these names based on your .glb file)
    const chestVal = parseFloat(document.getElementById('morph-chest').value);
    const waistVal = parseFloat(document.getElementById('morph-waist').value);
    
    // If your 3D artist named the morphs 'BustSize' and 'WaistNarrow'
    if (bodyMesh.morphTargetDictionary['BustSize'] !== undefined) {
        bodyMesh.morphTargetInfluences[bodyMesh.morphTargetDictionary['BustSize']] = chestVal;
    }
}

// Attach event listeners
document.getElementById('morph-chest').addEventListener('input', updateMorphs);
document.getElementById('morph-waist').addEventListener('input', updateMorphs);

document.getElementById('color-skin').addEventListener('input', (e) => {
    if (bodyMesh && bodyMesh.material) {
        bodyMesh.material.color.set(e.target.value);
    }
});

// 6. Rendering Loop
function animate() {
    requestAnimationFrame(animate);
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


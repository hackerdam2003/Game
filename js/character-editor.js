import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 0.85, 1.8);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

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
let mixer = null;
const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

const modelURL = './Model prepared.glb';
const danceAnimURL = './Hip%20Hop%20Dancing.fbx';

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
        
        const loadingEl = document.getElementById('loading-text');
        if(loadingEl) loadingEl.style.display = 'none';

        fbxLoader.load(danceAnimURL, (animObj) => {
            if (animObj.animations && animObj.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterModel);
                const action = mixer.clipAction(animObj.animations[0]);
                action.play();
            }
        }, undefined, (err) => console.warn("Editor animation warning:", err));
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            const loadingEl = document.getElementById('loading-text');
            if(loadingEl) loadingEl.innerText = `Loading 3D Core... ${percent}%`;
        }
    },
    (error) => {
        console.error("Model Error:", error);
        const loadingEl = document.getElementById('loading-text');
        if(loadingEl) {
            loadingEl.innerText = "❌ Error Loading Model";
            loadingEl.style.color = "#ef4444";
        }
    }
);

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
    window.location.href = "game.html";
};

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (characterModel) {
        let time = Date.now() * 0.005;
        const chestBone = characterModel.getObjectByName('spine_02.x');
        if (chestBone) {
            chestBone.rotation.x = Math.sin(time) * 0.05;
        }
    }
    
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

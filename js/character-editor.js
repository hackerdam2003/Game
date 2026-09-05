import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
// Local paths hata kar yeh Direct Raw Links daal do
const modelURL = 'https://raw.githubusercontent.com/hackerdam2003/Game/main/assets/ee654438-4e51-4637-a703-1e2188cea38e_model_prepared.glb';
const idleAnimURL = 'https://raw.githubusercontent.com/hackerdam2003/Game/main/assets/ee654438-4e51-4637-a703-1e2188cea38e_Idle_bouncing_fight.fbx';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffedd5, 1.5);
keyLight.position.set(2, 3, 2);
keyLight.castShadow = true;
scene.add(keyLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.9, 0);

let characterModel = null;
let mixer = null;
const clock = new THREE.Clock();

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

// 👇 RELATIVE PATHS FIX FOR RENDER & GITHUB PAGES 👇
const modelURL = './assets/ee654438-4e51-4637-a703-1e2188cea38e_model_prepared.glb';
const idleAnimURL = './assets/ee654438-4e51-4637-a703-1e2188cea38e_Idle_bouncing_fight.fbx';

document.getElementById('loading-text').innerText = "Downloading Model...";

gltfLoader.load(
    modelURL,
    (gltf) => {
        characterModel = gltf.scene;
        
        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                if (node.material) {
                    node.material.roughness = 0.4;
                    node.material.metalness = 0.1;
                }
            }
        });

        scene.add(characterModel);
        
        // Model load hote hi loading screen hide karein
        document.getElementById('loading-text').style.display = 'none';

        // Safely Load Animation
        fbxLoader.load(idleAnimURL, (object) => {
            if (object.animations && object.animations.length > 0) {
                mixer = new THREE.AnimationMixer(characterModel);
                const action = mixer.clipAction(object.animations[0]);
                action.play();
            }
        }, undefined, (err) => {
            console.warn("Animation skipped due to load issue, but model is safe:", err);
        });
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-text').innerText = `Loading... ${percent}%`;
        } else {
            const mb = (xhr.loaded / (1024 * 1024)).toFixed(1);
            document.getElementById('loading-text').innerText = `Downloading... (${mb} MB)`;
        }
    },
    (error) => {
        console.error("Model Error:", error);
        document.getElementById('loading-text').innerText = "Error: " + error.message;
        document.getElementById('loading-text').style.color = "#ef4444";
    }
);

// Bone Scaling for Shape Morphing
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
        waistBone.scale.x = scale;
        waistBone.scale.z = scale;
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

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

const modelURL = 'https://raw.githubusercontent.com/hacker2003/Game/main/Game/assets/ee654438-4e51-4637-a703-1e2188cea38e_model_prepared.glb';
const idleAnimURL = 'https://raw.githubusercontent.com/hacker2003/Game/main/Game/assets/ee654438-4e51-4637-a703-1e2188cea38e_Idle_bouncing_fight.fbx';

document.getElementById('loading-text').innerText = "Downloading Model...";

gltfLoader.load(
    modelURL,
    (gltf) => {
        characterModel = gltf.scene;
        scene.add(characterModel);
        
        // Hide loading screen as soon as model appears
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

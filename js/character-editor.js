import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.getElementById('render-container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let characterModel = null;
const gltfLoader = new GLTFLoader();

// Updated with the new prepared rigged model URL
const modelURL = 'https://raw.githubusercontent.com/hacker2003/Game/main/Game/assets/ee654438-4e51-4637-a703-1e2188cea38e_model_prepared.glb';

document.getElementById('loading-text').innerText = "Loading 3D Model...";

gltfLoader.load(modelURL, (gltf) => {
    characterModel = gltf.scene;
    scene.add(characterModel);
    
    // Jaise hi model load hoga, loading text gayab ho jayega
    document.getElementById('loading-text').style.display = 'none';
}, (xhr) => {
    const percent = Math.floor((xhr.loaded / xhr.total) * 100);
    if(percent) document.getElementById('loading-text').innerText = `Loading... ${percent}%`;
}, (error) => {
    document.getElementById('loading-text').innerText = "Error: " + error.message;
    document.getElementById('loading-text').style.color = "#ef4444";
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

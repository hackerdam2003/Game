import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 1. Scene & Camera Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Lighting
const light = new THREE.AmbientLight(0xffffff, 2.5); 
scene.add(light);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(2, 2, 2);
scene.add(dirLight);

// 3. Orbit Controls (Mouse se rotate karne ke liye)
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;

// 4. Load Normal Model (Root directory wala path)
const loader = new GLTFLoader();

// PATH FIX: Kyunki file root me hai aur usme space hai
const modelPath = './Model prepared.glb';

loader.load(
    modelPath, 
    function (gltf) {
        scene.add(gltf.scene);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "✅ Model Loaded Successfully!";
            statusEl.style.color = "#10b981"; // Green
        }
    }, 
    undefined, 
    function (error) {
        console.error("Model Load Error:", error);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "❌ Error: Cannot find 'Model prepared.glb'!";
            statusEl.style.color = "#ef4444"; // Red
        }
    }
);

// 5. Render Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Window Resize Handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

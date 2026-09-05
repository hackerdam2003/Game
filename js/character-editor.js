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

// 🛑 Direct Mixamo FBX file load karenge jisme animation aur model dono sath hain!
const fbxCharacterURL = './Hip%20Hop%20Dancing.fbx'; 

fbxLoader.load(
    fbxCharacterURL,
    (object) => {
        characterModel = object;
        
        // Mixamo ki units centimeters me hoti hain, isliye scale down karke meters me laate hain
        characterModel.scale.set(0.01, 0.01, 0.01);
        
        characterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        scene.add(characterModel);
        
        const loadingEl = document.getElementById('loading-text');
        if(loadingEl) loadingEl.style.display = 'none';

        // Play embedded animation from FBX
        if (object.animations && object.animations.length > 0) {
            mixer = new THREE.AnimationMixer(characterModel);
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        }
    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            const loadingEl = document.getElementById('loading-text');
            if(loadingEl) loadingEl.innerText = `Loading FBX Animation... ${percent}%`;
        }
    },
    (error) => {
        console.error("FBX Load Error:", error);
        const loadingEl = document.getElementById('loading-text');
        if(loadingEl) {
            loadingEl.innerText = "❌ Error Loading FBX File";
            loadingEl.style.color = "#ef4444";
        }
    }
);

// Skin color change support
document.getElementById('color-skin').addEventListener('input', (e) => {
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

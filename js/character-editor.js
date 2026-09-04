import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

let scene, camera, renderer, controls;
let characterModel, mixer;
const clock = new THREE.Clock();

// Initialize Scene
function init() {
    const container = document.getElementById('render-container');
    const loadingText = document.getElementById('loading-text');

    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 3.5);

    // 2. WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 3. Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 4, 2);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 5. Load 3D Character GLB Model[span_2](start_span)[span_2](end_span)
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('assets/ee654438-4e51-4637-a703-1e2188cea38e.glb', (gltf) => {
        characterModel = gltf.scene;
        
        // Scale and Position Adjustments
        characterModel.position.set(0, 0, 0);
        scene.add(characterModel);

        // Hide loading text once loaded
        loadingText.style.display = 'none';

        // 6. Load Initial Idle Animation (FBX)[span_3](start_span)[span_3](end_span)
        loadAnimation('assets/ee654438-4e51-4637-a703-1e2188cea38e_Idle_bouncing_fight.fbx');

        // Setup UI Controls Listeners
        setupUIControls();

    }, (xhr) => {
        // Loading Progress
        const percent = Math.floor((xhr.loaded / xhr.total) * 100);
        if (percent) loadingText.innerText = `Loading 3D Core... ${percent}%`;
    }, (error) => {
        console.error('Error loading model:', error);
        loadingText.innerText = 'Failed to load 3D model!';
        loadingText.style.color = '#ef4444';
    });

    // Window Resize Handler
    window.addEventListener('resize', onWindowResize);
    
    // Start Animation Loop
    animate();
}

// Load FBX Animation and bind to Character Mixer
function animation(animPath) {
    const fbxLoader = new FBXLoader();
    fbxLoader.load(animPath, (object) => {
        if (!mixer) {
            mixer = new THREE.AnimationMixer(characterModel);
        }
        const action = mixer.clipAction(object.animations[0]);
        action.reset().play();
    });
}

function loadAnimation(path) {
    animation(path);
}

// Handle UI Sliders & Color Pickers for Morphing/Scaling
function setupUIControls() {
    const chestSlider = document.getElementById('morph-chest');
    const waistSlider = document.getElementById('morph-waist');
    const hipsSlider = document.getElementById('morph-hips');
    const skinColorPicker = document.getElementById('color-skin');

    // Bone/Mesh scaling fallback for morphing if blendshapes aren't embedded
    chestSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        // Find skeleton bone or scale mesh parts if needed, e.g., spine/chest bones
        const spine = characterModel.getObjectByName('spine_02.x'); //
        if (spine) {
            const scaleFactor = 0.8 + (val * 0.4);
            spine.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    });

    waistSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const spine1 = characterModel.getObjectByName('spine_01.x');
        if (spine1) {
            const scaleFactor = 1.2 - (val * 0.4);
            spine1.scale.x = scaleFactor;
            spine1.scale.z = scaleFactor;
        }
    });

    hipsSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        const hips = characterModel.getObjectByName('root.x') || characterModel.getObjectByName('hips');
        if (hips) {
            const scaleFactor = 0.8 + (val * 0.4);
            hips.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
    });

    // Skin Color Texturing Change
    skinColorPicker.addEventListener('input', (e) => {
        const hexColor = e.target.value;
        characterModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.color.set(hexColor);
            }
        });
    });
}

// Save / Enter World Action
window.save3DDNA = function() {
    alert('3D Character DNA Saved Successfully! Entering Game World...');
    // Redirect or transition to gameplay state here
};

function onWindowResize() {
    const container = document.getElementById('render-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (mixer) {
        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}

init();

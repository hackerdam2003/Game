<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic 3D Viewer</title>
    <style>
        body { margin: 0; overflow: hidden; background: #111; color: white; font-family: sans-serif; }
        #status { position: absolute; top: 20px; width: 100%; text-align: center; font-size: 20px; font-weight: bold; color: #3b82f6; z-index: 10; }
    </style>
</head>
<body>

    <div id="status">Loading Model...</div>

    <!-- Three.js Import Map -->
    <script type="importmap">
        {
            "imports": {
                "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
                "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
            }
        }
    </script>

    <!-- Basic 3D Logic -->
    <script type="module">
        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

        // 1. Scene & Camera
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 1.5, 3);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        // 2. Lights
        const light = new THREE.AmbientLight(0xffffff, 2.5); 
        scene.add(light);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(2, 2, 2);
        scene.add(dirLight);

        // 3. Controls (Mouse se ghumane ke liye)
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1, 0);
        controls.update();

        // 4. Load Normal Model (Simple Path)
        const loader = new GLTFLoader();
        
        loader.load('./assets/model.glb', 
            function (gltf) {
                scene.add(gltf.scene);
                document.getElementById('status').innerText = "✅ Model Loaded Successfully!";
                document.getElementById('status').style.color = "#10b981";
            }, 
            undefined, 
            function (error) {
                console.error(error);
                document.getElementById('status').innerText = "❌ Error: Model not found in /assets/ folder!";
                document.getElementById('status').style.color = "#ef4444";
            }
        );

        // 5. Render Loop
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();

        // Window Resize Handle
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>

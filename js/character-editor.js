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
                if (node.morphTargetDictionary) {
                    bodyMesh = node; 
                }
            }
        });

        scene.add(characterModel);
        document.getElementById('loading-text').style.display = 'none';

        // Load Idle Animation
        fbxLoader.load(idleAnimURL, (object) => {
            mixer = new THREE.AnimationMixer(characterModel);
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        }, undefined, (error) => {
            console.error("Animation error:", error);
            document.getElementById('loading-text').innerText = "Anim Error: " + error.message;
            document.getElementById('loading-text').style.display = 'block';
            document.getElementById('loading-text').style.color = '#ef4444';
        });

    },
    (xhr) => {
        if (xhr.lengthComputable) {
            const percent = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-text').innerText = `Loading Core... ${percent}%`;
        }
    },
    (error) => { 
        console.error("Model error:", error);
        // YE LINE ERROR KO SEEDHA PHONE SCREEN PAR DIKHAYEGI
        document.getElementById('loading-text').innerText = "Model Error: " + error.message;
        document.getElementById('loading-text').style.display = 'block';
        document.getElementById('loading-text').style.color = '#ef4444';
    }
);


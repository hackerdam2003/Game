function loadMyCharacter() {
    const gltfLoader = new GLTFLoader();

    updateDebug("Downloading 3D Model...");

    // Load Main GLB Model with correct scale
    gltfLoader.load('./Model prepared.glb', (gltf) => {
        my3DCharacter = gltf.scene;
        // Size fix: Standard scale taaki character bada aur saaf dikhe
        my3DCharacter.scale.set(1, 1, 1);
        my3DCharacter.position.set(0, 0, 0);
        
        my3DCharacter.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        scene.add(my3DCharacter);
        updateDebug("✅ Model Loaded Successfully!");

    }, undefined, (err) => {
        updateDebug("❌ Model Error: " + err.message);
    });
}

// --- ADVANCED PROCEDURAL ANIMATION RENDER LOOP ---
function renderLoop() {
    requestAnimationFrame(renderLoop);
    const delta = clock ? clock.getDelta() : 0;

    if (my3DCharacter) {
        let time = Date.now() * 0.015;

        // Agar Joystick chal rahi hai (Running state)
        if (moveVector.x !== 0 || moveVector.y !== 0) {
            my3DCharacter.position.x += moveVector.x * speed;
            my3DCharacter.position.z += moveVector.y * speed;
            
            // Daudte waqt natural running bounce & tilt
            my3DCharacter.position.y = Math.abs(Math.sin(time * 4)) * 0.12;
            
            const chestBone = my3DCharacter.getObjectByName('spine_02.x');
            if(chestBone) {
                chestBone.rotation.x = Math.sin(time * 8) * 0.15; // Running torso swing
            }

            const targetRotation = Math.atan2(moveVector.x, moveVector.y);
            my3DCharacter.rotation.y = targetRotation;

            gameSocket.emit('move', { x: my3DCharacter.position.x, y: my3DCharacter.position.z });
        } 
        else {
            // Khade rehne par Idle / Fighting / Breathing motion
            my3DCharacter.position.y = Math.sin(time * 1.5) * 0.03; // Gentle breathing height shift
            
            const chestBone = my3DCharacter.getObjectByName('spine_02.x');
            if(chestBone) {
                chestBone.rotation.x = Math.sin(time * 1.5) * 0.05; // Chest breathing
            }
        }

        // Camera follow behind character
        camera.position.x = my3DCharacter.position.x;
        camera.position.z = my3DCharacter.position.z + 2.5; 
        camera.position.y = my3DCharacter.position.y + 1.2;
        camera.lookAt(my3DCharacter.position.x, my3DCharacter.position.y + 0.8, my3DCharacter.position.z);
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==========================================
// 🏠 HOME.GLB ADVANCED LOADER (Fixed & Secure)
// ==========================================
function loadWorldHome() {
    const gltfLoader = new GLTFLoader();
    
    console.log("⏳ [World] Attempting to load Home.glb...");

    gltfLoader.load(
        './Home.glb', 
        (gltf) => {
            const house = gltf.scene;
            
            // 📐 Scale aur Position set karo taaki player ke saamne sahi jagah dikhe
            house.scale.set(1.5, 1.5, 1.5); 
            house.position.set(2, 0, -3); 

            house.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            // Agar pehle se koi fallback box ya purana ghar hai toh use hata do
            if (doorMesh && doorMesh.parent) {
                worldGroup.remove(doorMesh);
            }

            worldGroup.add(house);
            doorMesh = house; // 🚪 Isse "Enter House" button perfectly trigger hoga
            console.log("✅ [World] Home.glb Loaded and Rendered Successfully!");
        }, 
        (xhr) => {
            // Loading progress dekhne ke liye
            if (xhr.lengthComputable) {
                const percentComplete = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log(`📦 [Home.glb] Loading progress: ${percentComplete}%`);
            }
        }, 
        (error) => {
            console.error("❌ [World Error] Failed to load Home.glb from root folder:", error);
            
            // Fallback: Agar file na mile tabhi yellow box dikhega
            if (!doorMesh) {
                const geometry = new THREE.BoxGeometry(2, 3, 2);
                const material = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
                doorMesh = new THREE.Mesh(geometry, material);
                doorMesh.position.set(2, 1.5, -3);
                worldGroup.add(doorMesh);
                console.log("⚠️ [World] Fallback Yellow Door activated.");
            }
        }
    );
}


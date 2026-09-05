// 5. Connect UI Sliders to Bone Scaling (Since AI models don't have Blendshapes)
function updateMorphs() {
    if (!characterModel) return;
    
    const chestVal = parseFloat(document.getElementById('morph-chest').value);
    const waistVal = parseFloat(document.getElementById('morph-waist').value);
    const hipsVal = parseFloat(document.getElementById('morph-hips').value);
    
    // Chest / Bust scaling via spine bone
    const chestBone = characterModel.getObjectByName('spine_02.x');
    if (chestBone) {
        const scale = 0.8 + (chestVal * 0.4);
        chestBone.scale.set(scale, scale, scale);
    }

    // Waist narrowing via spine_01 bone
    const waistBone = characterModel.getObjectByName('spine_01.x');
    if (waistBone) {
        const scale = 1.2 - (waistVal * 0.4);
        waistBone.scale.x = scale;
        waistBone.scale.z = scale;
    }

    // Hips scaling via root/hips bone
    const hipsBone = characterModel.getObjectByName('root.x');
    if (hipsBone) {
        const scale = 0.8 + (hipsVal * 0.4);
        hipsBone.scale.set(scale, scale, scale);
    }
}

// Attach event listeners for all 3 sliders
document.getElementById('morph-chest').addEventListener('input', updateMorphs);
document.getElementById('morph-waist').addEventListener('input', updateMorphs);
document.getElementById('morph-hips').addEventListener('input', updateMorphs);

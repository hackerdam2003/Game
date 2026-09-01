// js/settings.js

import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase-config.js";

console.log("⚙️ [Settings] Configuration Module Loaded!");

// ==========================================
// 1. Default Settings State
// ==========================================
const DEFAULT_SETTINGS = {
    bgmVolume: 50,       // Background Music (0-100)
    sfxVolume: 80,       // Sound Effects (0-100)
    steeringSens: 1.0,   // Mobile Steering Sensitivity
    lowGraphics: false   // Battery Saver / Low end phone mode
};

// Global object jisko engine.js aur doosri files read kar sakti hain
window.gameSettings = { ...DEFAULT_SETTINGS };

// ==========================================
// 2. Load & Save Settings (Local Storage)
// ==========================================
export function loadSettings() {
    try {
        const saved = localStorage.getItem('racingUniverseSettings');
        if (saved) {
            window.gameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            console.log("⚙️ [Settings] Loaded from Device:", window.gameSettings);
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
}

export function saveSettings() {
    try {
        localStorage.setItem('racingUniverseSettings', JSON.stringify(window.gameSettings));
        console.log("⚙️ [Settings] Saved to Device!");
    } catch (e) {
        console.error("Failed to save settings", e);
    }
}

// Initial Load jab file run ho
loadSettings();

// ==========================================
// 3. UI Helper Functions (Callable from HTML)
// ==========================================

// Volume Update
window.updateVolume = function(type, value) {
    if (type === 'bgm') {
        window.gameSettings.bgmVolume = parseInt(value);
        // Agar game chal raha hai, toh Phaser ki audio turant update karein
        // if (game && game.sound) game.sound.volume = value / 100;
    } else if (type === 'sfx') {
        window.gameSettings.sfxVolume = parseInt(value);
    }
    saveSettings();
};

// Graphics Toggle
window.toggleGraphics = function(isLowEnd) {
    window.gameSettings.lowGraphics = isLowEnd;
    saveSettings();
    alert("Graphics mode updated! Changes will apply in the next race.");
};

// Steering Sensitivity
window.updateSteeringSensitivity = function(value) {
    window.gameSettings.steeringSens = parseFloat(value);
    saveSettings();
};

// ==========================================
// 4. Secure Logout Function
// ==========================================
window.logoutPlayer = async function() {
    const confirmLogout = confirm("Are you sure you want to log out?");
    if (!confirmLogout) return;

    try {
        await signOut(auth);
        console.log("🚪 [Settings] Player Logged Out.");
        
        // Clear session specific stuff if needed
        localStorage.removeItem('racingUniverseSettings');
        
        // Redirect to Login Page
        window.location.href = "index.html";
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Failed to log out. Please try again.");
    }
};

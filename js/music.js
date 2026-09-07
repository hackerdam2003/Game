// js/music.js
console.log("🎵 Universal Music & Volume System Loaded! (Bulletproof Version)");

// FIX: Volume 0 bug fixed. Ab properly local storage se data lega
let storedVol = localStorage.getItem('gameMusicVolume');
let currentVolume = storedVol !== null ? parseFloat(storedVol) : 0.4;
let isMusicPlaying = false;
let bgMusic = null;
let musicBtn = null;

export function initMusic() {
    bgMusic = document.getElementById('bg-music');
    musicBtn = document.getElementById('btn-music-toggle') || document.getElementById('music-toggle-btn');

    if (!bgMusic) {
        console.warn("⚠️ Music System: <audio id='bg-music'> not found on this page.");
        return;
    }

    bgMusic.volume = currentVolume;

    // 🚀 BULLETPROOF AUTOPLAY LOGIC (iOS & Android)
    const forcePlayMusic = () => {
        if (!isMusicPlaying && bgMusic.paused) {
            let playPromise = bgMusic.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    isMusicPlaying = true;
                    updateButtonUI();
                    // Event listeners hata do ek baar play hone ke baad
                    window.removeEventListener('click', forcePlayMusic);
                    window.removeEventListener('touchend', forcePlayMusic);
                }).catch(e => {
                    console.log("🎵 Autoplay waiting for direct screen tap...");
                });
            }
        }
    };

    // FIX: document.body ki jagah 'window' par listener lagaya (Puri screen cover)
    // FIX: 'touchstart' ki jagah 'touchend' lagaya (iPhone/Safari ke liye zaroori)
    window.addEventListener('click', forcePlayMusic);
    window.addEventListener('touchend', forcePlayMusic, { passive: true });

    // 🎛️ LONG PRESS & MANUAL TOGGLE BUTTON LOGIC
    if (musicBtn) {
        let pressTimer;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                musicBtn.dispatchEvent(new CustomEvent('longpress')); // Popup kholne ke liye
            }, 500); // 500ms hold
        };

        const cancelPress = () => clearTimeout(pressTimer);

        // Mobile Events
        musicBtn.addEventListener('touchstart', startPress, { passive: true });
        musicBtn.addEventListener('touchend', cancelPress);
        musicBtn.addEventListener('touchmove', cancelPress);

        // PC Events
        musicBtn.addEventListener('mousedown', startPress);
        musicBtn.addEventListener('mouseup', cancelPress);
        musicBtn.addEventListener('mouseleave', cancelPress);

        // Standard Click (Toggle)
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Screen tap ko double trigger hone se roko
            if (isLongPress) {
                isLongPress = false; 
                return; // Long press me pause nahi hoga
            }
            toggleMusic();
        });
    }
}

export function toggleMusic() {
    if (!bgMusic) return;
    
    // Agar gaana chal raha hai, toh pause karo
    if (isMusicPlaying || !bgMusic.paused) {
        bgMusic.pause();
        isMusicPlaying = false;
    } else {
        // Agar band hai, toh play karo
        bgMusic.play().then(() => {
            isMusicPlaying = true;
            updateButtonUI();
        }).catch(e => console.log("Manual play blocked:", e));
    }
    updateButtonUI();
}

export function setVolume(val) {
    currentVolume = parseFloat(val);
    localStorage.setItem('gameMusicVolume', currentVolume); // Game me save rahega
    if (bgMusic) bgMusic.volume = currentVolume;
}

export function getVolume() {
    return currentVolume;
}

function updateButtonUI() {
    if (!musicBtn) return;
    if (isMusicPlaying) {
        musicBtn.innerHTML = '🎵';
        musicBtn.classList.add('playing', 'music-playing');
    } else {
        musicBtn.innerHTML = '🔇';
        musicBtn.classList.remove('playing', 'music-playing');
    }
}

// Auto Init on Page Load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusic);
} else {
    initMusic();
}


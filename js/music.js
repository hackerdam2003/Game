// js/music.js
console.log("🎵 Universal Music & Volume System Loaded!");

// Local storage se purana volume nikalo (default 0.4 hai)
let currentVolume = parseFloat(localStorage.getItem('gameMusicVolume')) || 0.4;
let isMusicPlaying = false;
let bgMusic = null;
let musicBtn = null;

export function initMusic() {
    bgMusic = document.getElementById('bg-music');
    musicBtn = document.getElementById('btn-music-toggle') || document.getElementById('music-toggle-btn');

    if (!bgMusic) return;

    bgMusic.volume = currentVolume;

    const forcePlayMusic = () => {
        if (!isMusicPlaying) {
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                updateButtonUI();
                document.body.removeEventListener('click', forcePlayMusic);
                document.body.removeEventListener('touchstart', forcePlayMusic);
            }).catch(e => console.log("🎵 Autoplay waiting..."));
        }
    };

    document.body.addEventListener('click', forcePlayMusic);
    document.body.addEventListener('touchstart', forcePlayMusic, { passive: true });

    if (musicBtn) {
        // 🚀 LONG PRESS LOGIC (Touch & Mouse)
        let pressTimer;
        let isLongPress = false;

        const startPress = () => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                musicBtn.dispatchEvent(new CustomEvent('longpress')); // Custom event trigger kiya
            }, 500); // 500ms daba ke rakhne par volume khulega
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

        // Click Event (Agar long press hua hai toh click cancel ho jayega)
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            if (isLongPress) {
                isLongPress = false; 
                return; // Long press me gaana band nahi hoga, sirf slider aayega
            }
            toggleMusic();
        });
    }
}

export function toggleMusic() {
    if (!bgMusic) return;
    if (isMusicPlaying) {
        bgMusic.pause();
        isMusicPlaying = false;
    } else {
        bgMusic.play();
        isMusicPlaying = true;
    }
    updateButtonUI();
}

export function setVolume(val) {
    currentVolume = parseFloat(val);
    localStorage.setItem('gameMusicVolume', currentVolume); // Game me aage ke liye save ho gaya
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMusic);
} else {
    initMusic();
}

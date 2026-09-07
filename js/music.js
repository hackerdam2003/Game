// js/music.js
console.log("🎵 Universal Music System Loaded!");

export function initMusic() {
    // Check for the audio tag
    const bgMusic = document.getElementById('bg-music');
    
    // Check for both button IDs used in different HTML files (index vs lobby)
    const musicBtn = document.getElementById('btn-music-toggle') || document.getElementById('music-toggle-btn');

    if (!bgMusic) {
        console.warn("⚠️ Music System: <audio id='bg-music'> not found on this page.");
        return;
    }

    bgMusic.volume = 0.4; // Default volume
    let isMusicPlaying = false;

    // 🚀 BULLETPROOF AUTOPLAY LOGIC (Mobile & PC)
    const forcePlayMusic = () => {
        if (!isMusicPlaying) {
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                if (musicBtn) {
                    musicBtn.innerHTML = '🎵';
                    // Adds classes for both Genshin theme (playing) and Lobby theme (music-playing)
                    musicBtn.classList.add('playing', 'music-playing');
                }
                // Stop listening once music starts
                document.body.removeEventListener('click', forcePlayMusic);
                document.body.removeEventListener('touchstart', forcePlayMusic);
            }).catch(e => console.log("🎵 Autoplay waiting for user interaction..."));
        }
    };

    // Listen for the very first tap/click anywhere on the screen
    document.body.addEventListener('click', forcePlayMusic);
    document.body.addEventListener('touchstart', forcePlayMusic, { passive: true });

    // 🎛️ MANUAL TOGGLE BUTTON LOGIC
    if (musicBtn) {
        musicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents background click from firing twice
            
            if (isMusicPlaying) {
                bgMusic.pause();
                isMusicPlaying = false;
                musicBtn.innerHTML = '🔇';
                musicBtn.classList.remove('playing', 'music-playing');
            } else {
                bgMusic.play();
                isMusicPlaying = true;
                musicBtn.innerHTML = '🎵';
                musicBtn.classList.add('playing', 'music-playing');
            }
        });
    }
}

// Automatically start the system when the file is loaded
initMusic();


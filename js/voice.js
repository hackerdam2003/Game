// js/voice.js
console.log("🎙️ [Voice Chat] Pro Live Communication Module Loaded!");

window.isMicActive = false;
let mediaRecorder;
let audioStream = null; // 🛑 NAYA: Mic ko hardware level par band karne ke liye

window.toggleVoiceChat = async function() {
    const micBtn = document.getElementById('btn-mic-toggle');

    // --- TURN MIC OFF ---
    if (window.isMicActive) {
        window.isMicActive = false;
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        // 🛑 CRITICAL FIX: Mic permission aur hardware ko poori tarah band karo
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }

        if (micBtn) { 
            micBtn.innerText = '🔇'; 
            micBtn.style.background = '#1e293b'; 
        }
        console.log("Mic OFF - Hardware Released");
        return;
    }

    // --- TURN MIC ON ---
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && window.socket && window.currentRoomId) {
                const reader = new FileReader();
                reader.readAsDataURL(event.data);
                reader.onloadend = function() {
                    window.socket.emit('voiceStream', { audioData: reader.result });
                }
            }
        };

        // 🛑 NAYA: 1000ms ki jagah 500ms kiya hai taaki aawaz me delay kam ho (Fast Live Feel)
        mediaRecorder.start(500); 
        window.isMicActive = true;
        
        if (micBtn) { 
            micBtn.innerText = '🎙️'; 
            micBtn.style.background = '#10b981'; 
        }
        console.log("Mic ON - Transmitting Live...");

    } catch (err) {
        console.error(err);
        alert("❌ Microphone permission denied! Please allow Mic access in browser settings.");
    }
};

window.initVoiceSystem = function() {
    if (window.socket) {
        // 🛑 CRITICAL FIX: Audio Playback Queue System (Walkie-Talkie Style)
        // Aawaz overlap na ho, uske liye audio line me lagakar chalega
        let audioQueue = [];
        let isPlaying = false;

        function playNextAudio() {
            if (audioQueue.length === 0) {
                isPlaying = false;
                return;
            }
            
            isPlaying = true;
            const audioData = audioQueue.shift();
            const audio = new Audio(audioData);
            
            audio.onended = playNextAudio; // Jab ek tukda khatam ho, tabhi agla chale
            
            audio.play().catch(e => {
                console.error("Audio Play Error (Browser Auto-play Blocked):", e);
                playNextAudio(); // Agar error aaye toh skip karke agla chalao
            });
        }

        window.socket.on('receiveVoiceStream', (data) => {
            audioQueue.push(data.audioData);
            if (!isPlaying) {
                playNextAudio();
            }
        });
    }
};

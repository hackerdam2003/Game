// js/voice.js
console.log("🎙️ [Voice Chat] Live Communication Module Loaded!");

window.isMicActive = false;
let mediaRecorder;
let audioChunks = [];

window.toggleVoiceChat = async function() {
    const micBtn = document.getElementById('btn-mic-toggle');

    if (window.isMicActive) {
        // TURN MIC OFF
        window.isMicActive = false;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        if (micBtn) { micBtn.innerText = '🔇'; micBtn.style.background = '#1e293b'; }
        console.log("Mic OFF");
        return;
    }

    // TURN MIC ON
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && window.socket && window.currentRoomId) {
                // Audio data ko base64/blob format me server ko bhejo
                const reader = new FileReader();
                reader.readAsDataURL(event.data);
                reader.onloadend = function() {
                    window.socket.emit('voiceStream', { audioData: reader.result });
                }
            }
        };

        // Har 1 second me audio chunk bhejo (Live Feel)
        mediaRecorder.start(1000); 
        window.isMicActive = true;
        
        if (micBtn) { micBtn.innerText = '🎙️'; micBtn.style.background = '#10b981'; }
        console.log("Mic ON - Transmitting Live...");

    } catch (err) {
        alert("Microphone permission denied or not found!");
    }
};

window.initVoiceSystem = function() {
    if (window.socket) {
        window.socket.on('receiveVoiceStream', (data) => {
            // Jab dusre dost ki awaaz aaye toh use play karo
            const audio = new Audio(data.audioData);
            audio.play().catch(e => console.error("Audio Play Error:", e));
        });
    }
};


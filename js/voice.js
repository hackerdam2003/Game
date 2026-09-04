// js/voice.js
console.log("🎙️ [Voice Chat] WebRTC Peer-to-Peer Module Loaded!");

window.isMicActive = false;
window.localAudioStream = null;
window.peerConnections = {}; // Track all active calls in the squad

// Google's Free STUN servers for WebRTC connection
const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

window.toggleVoiceChat = async function() {
    const micBtn = document.getElementById('btn-mic-toggle');

    // --- TURN MIC OFF ---
    if (window.isMicActive) {
        window.isMicActive = false;
        
        // Stop Audio Hardware
        if (window.localAudioStream) {
            window.localAudioStream.getTracks().forEach(track => track.stop());
            window.localAudioStream = null;
        }

        // Drop all peer connections
        for (let uid in window.peerConnections) {
            window.peerConnections[uid].close();
            delete window.peerConnections[uid];
        }

        if (micBtn) { micBtn.innerText = '🔇'; micBtn.style.background = '#1e293b'; }
        console.log("🎙️ Mic OFF - Hardware Released");
        
        if (window.socket) window.socket.emit('voice-disconnected'); 
        return;
    }

    // --- TURN MIC ON ---
    try {
        // High Quality Audio Settings (Echo & Noise Cancellation)
        window.localAudioStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        
        window.isMicActive = true;
        if (micBtn) { micBtn.innerText = '🎙️'; micBtn.style.background = '#10b981'; }
        console.log("🎙️ Mic ON - WebRTC Broadcasting...");

        // Alert others in the lobby to connect to me
        if (window.socket) window.socket.emit('voice-ready'); 

    } catch (err) {
        console.error(err);
        alert("❌ Microphone permission denied! Please check browser settings.");
    }
};

window.initVoiceSystem = function() {
    if (!window.socket) return;

    // 1. KISI DUSRE DOST NE MIC ON KIYA (Make an Offer to them)
    window.socket.on('voice-ready', async (data) => {
        const senderUid = data.uid;
        if (senderUid === window.localUser.uid) return;

        // Reset connection for fresh handshake
        if (window.peerConnections[senderUid]) {
            window.peerConnections[senderUid].close();
        }

        const peer = createPeerConnection(senderUid);
        
        // Agar mera mic bhi on hai, toh apni aawaz bhi bhej do
        if (window.localAudioStream) {
            window.localAudioStream.getTracks().forEach(track => peer.addTrack(track, window.localAudioStream));
        }

        // Send Offer
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        
        window.socket.emit('webrtc-signal', {
            targetUid: senderUid,
            senderUid: window.localUser.uid,
            signalData: { type: 'offer', sdp: offer }
        });
    });

    // 2. CONNECTING THE CALL (Handling Offer/Answer/ICE)
    window.socket.on('webrtc-signal', async (data) => {
        const { senderUid, signalData } = data;
        
        let peer = window.peerConnections[senderUid];
        if (!peer) {
            peer = createPeerConnection(senderUid);
            if (window.localAudioStream) {
                window.localAudioStream.getTracks().forEach(track => peer.addTrack(track, window.localAudioStream));
            }
        }

        if (signalData.type === 'offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            window.socket.emit('webrtc-signal', {
                targetUid: senderUid,
                senderUid: window.localUser.uid,
                signalData: { type: 'answer', sdp: answer }
            });
        } else if (signalData.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        } else if (signalData.type === 'candidate') {
            await peer.addIceCandidate(new RTCIceCandidate(signalData.candidate));
        }
    });

    // 3. DOST NE MIC OFF KIYA
    window.socket.on('voice-disconnected', (data) => {
        const uid = data.uid;
        if (window.peerConnections[uid]) {
            window.peerConnections[uid].close();
            delete window.peerConnections[uid];
        }
        const audioEl = document.getElementById(`audio-${uid}`);
        if (audioEl) audioEl.remove();
    });
};

// HELPER: CREATE PEER & PLAY AUDIO
function createPeerConnection(targetUid) {
    const peer = new RTCPeerConnection(rtcConfig);
    window.peerConnections[targetUid] = peer;

    // Send connection details (ICE Candidates)
    peer.onicecandidate = (event) => {
        if (event.candidate) {
            window.socket.emit('webrtc-signal', {
                targetUid: targetUid,
                senderUid: window.localUser.uid,
                signalData: { type: 'candidate', candidate: event.candidate }
            });
        }
    };

    // JAISE HI AAWAZ AAYE, USKO PLAY KARO
    peer.ontrack = (event) => {
        console.log(`🎵 Real-Time Audio connected for UID: ${targetUid}`);
        let audioEl = document.getElementById(`audio-${targetUid}`);
        
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.id = `audio-${targetUid}`;
            audioEl.autoplay = true;
            audioEl.style.display = 'none';
            document.body.appendChild(audioEl);
        }
        
        audioEl.srcObject = event.streams[0];
    };

    return peer;
}

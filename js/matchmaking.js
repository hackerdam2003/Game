// js/matchmaking.js
console.log("🚦 [Matchmaking & GPS] Module Loaded!");

window.userLocation = null;

// 📍 GPS PERMISSION LOGIC
window.requestGPS = function(callback) {
    const gpsText = document.getElementById('gps-status-text');
    if (navigator.geolocation) {
        gpsText.innerHTML = "📍 Locating...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                window.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                gpsText.innerHTML = "<b style='color:#10b981;'>📍 GPS Active</b>";
                if(callback) callback();
            },
            (error) => {
                gpsText.innerHTML = "<b style='color:#ef4444;'>📍 GPS Denied</b>";
                alert("Please enable GPS Location to find nearby racers!");
            }
        );
    } else {
        alert("GPS is not supported by your device.");
    }
};

// 🚦 MATCHMAKING LOGIC
window.initMatchmaking = function() {
    const matchBtn = document.getElementById('start-match-btn');
    
    if (matchBtn) {
        matchBtn.addEventListener('click', () => {
            // Agar party me hai, toh check karo ki click karne wala Host hai ya nahi
            if (window.currentRoomId && window.partyMembers.length > 0) {
                const amIHost = window.partyMembers.find(m => m.uid === window.localUser.uid)?.isHost;
                if (!amIHost) {
                    alert("Only the Party Host can start matchmaking!");
                    return;
                }
            }

            // GPS Check
            if (!window.userLocation) {
                window.requestGPS(() => { window.startSearching(); });
            } else {
                window.startSearching();
            }
        });
    }

    if (window.socket) {
        window.socket.on('matchFound', (data) => {
            if(matchBtn) {
                matchBtn.style.background = '#3b82f6'; // Blue color
                matchBtn.style.color = '#fff';
                matchBtn.innerHTML = "🔥 MATCH FOUND! CONNECTING... 🔥";
            }
            // 2 Second baad Game Canvas par bhej do
            setTimeout(() => {
                alert("Ready to Race! (Next Phase: Game Canvas)");
                // window.location.href = "game.html"; // Ye aage banayenge
            }, 2000);
        });
    }
};

window.startSearching = function() {
    const matchBtn = document.getElementById('start-match-btn');
    matchBtn.style.background = '#fbbf24'; // Yellow loading color
    matchBtn.style.color = '#000';
    matchBtn.innerHTML = "⏳ SEARCHING FOR OPPONENTS... ⏳";
    
    window.socket.emit('startMatchmaking', {
        roomId: window.currentRoomId || null,
        uid: window.localUser.uid,
        name: window.myProfileData.gameName,
        location: window.userLocation
    });
};


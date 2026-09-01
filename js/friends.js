        // 🛑 BULLETPROOF MASTER BOOT SEQUENCE (Replace inside your lobby.html script)
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                window.localUser = user;
                try {
                    const userRef = doc(db, "Users", user.uid);
                    await updateDoc(userRef, { lastActive: serverTimestamp() });

                    const docSnap = await getDoc(userRef);
                    if (docSnap.exists()) {
                        window.myProfileData = docSnap.data();
                        
                        document.getElementById("player-name").innerText = `${window.myProfileData.gameName} (${window.myProfileData.playerTag || 'UID'})`;
                        document.getElementById("player-coins").innerText = `${window.myProfileData.wallet_balance || 0} 🪙`;

                        // 1. CONNECT SOCKET
                        window.socket = io(); 

                        // 2. WAIT SAFELY FOR MODULES TO LOAD
                        const bootInterval = setInterval(() => {
                            if (window.initChatSystem && window.initFriendsSystem) {
                                clearInterval(bootInterval);
                                
                                // 3. SET LISTENERS FIRST!
                                window.initChatSystem();
                                window.initFriendsSystem();
                                window.loadGlobalPlayers();
                                window.loadMyFriendsData();
                                
                                // 4. NOW REGISTER (Trigger server to send online list to us!)
                                window.socket.emit('registerPlayer', {
                                    uid: user.uid,
                                    gameName: window.myProfileData.gameName,
                                    gender: window.myProfileData.gender,
                                    age: window.myProfileData.age
                                });
                                
                                console.log("🚀 Modules Booted & Registered Successfully!");
                            }
                        }, 200);

                    } else {
                        window.location.href = "profile.html";
                    }
                } catch (err) {
                    console.error("Profile load error", err);
                }
            } else {
                window.location.href = "index.html";
            }
        });


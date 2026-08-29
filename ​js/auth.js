import { signInWithRedirect, getRedirectResult, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, bankDB, provider } from "./firebase-config.js";

let userLocation = null;
let currentUser = null;

const loginBtn = document.getElementById('googleLoginBtn');
const loginSection = document.getElementById('loginSection');
const profileForm = document.getElementById('profileForm');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const gpsStatus = document.getElementById('gpsStatus');
const loginStatus = document.getElementById('loginStatus');

function fetchLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                if(gpsStatus) {
                    gpsStatus.innerText = `📍 GPS Locked!`;
                    gpsStatus.style.color = "#4ade80"; 
                }
                if(saveProfileBtn) saveProfileBtn.disabled = false;
            },
            (error) => {
                if(gpsStatus) {
                    gpsStatus.innerText = "❌ Location required to play!";
                    gpsStatus.style.color = "#ff4757"; 
                }
            }
        );
    } else {
        if(gpsStatus) gpsStatus.innerText = "❌ GPS not supported!";
    }
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        if(loginStatus) loginStatus.innerText = "Redirecting to Google...";
        // Mobile popup block issue fix
        signInWithRedirect(auth, provider);
    });
}

getRedirectResult(auth).catch((error) => {
    if(loginStatus) loginStatus.innerText = "❌ Login Error: " + error.message;
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        if(loginStatus) loginStatus.innerText = "Checking HFC Bank Data...";
        
        try {
            const userRef = doc(bankDB, "Users", user.uid);
            const docSnap = await getDoc(userRef);

            if (docSnap.exists() && docSnap.data().gameName) {
                if(loginStatus) loginStatus.innerText = `Welcome back! Wallet: 🪙 ${docSnap.data().wallet_balance || 0}`;
                setTimeout(() => { window.location.href = "lobby.html"; }, 1000);
            } else {
                if(loginSection) loginSection.style.display = 'none';
                if(profileForm) profileForm.style.display = 'block';
                fetchLocation();
            }
        } catch (err) {
            if(loginStatus) loginStatus.innerText = "❌ Database Error: " + err.message;
        }
    }
});

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const gameName = document.getElementById('gameName').value;
        const gender = document.getElementById('genderSelect').value;
        const age = document.getElementById('ageInput').value;

        if (!gameName || !age || !userLocation) {
            alert("Please fill all details and allow GPS!");
            return;
        }

        saveProfileBtn.innerText = "Locking Profile & Syncing HFC...";
        saveProfileBtn.disabled = true;

        try {
            const userRef = doc(bankDB, "Users", currentUser.uid);
            
            await setDoc(userRef, {
                name: currentUser.displayName,
                email: currentUser.email,
                gameName: gameName,
                gender: gender,
                age: parseInt(age),
                location: userLocation,
                vehicle: "Padal", 
                role: "customer", 
            }, { merge: true });
            
            const updatedSnap = await getDoc(userRef);
            if (updatedSnap.data().wallet_balance === undefined) {
                await setDoc(userRef, { wallet_balance: 0, joined: new Date().toISOString() }, { merge: true });
            }

            window.location.href = "lobby.html";
        } catch (error) {
            alert("❌ Database Error! HFC Security Blocked the request.");
            saveProfileBtn.innerText = "Lock Profile & Enter Lobby";
            saveProfileBtn.disabled = false;
        }
    });
}

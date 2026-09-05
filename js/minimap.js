// js/minimap.js

// 🌍 Map Settings: Tumhara 3D world kitna bada hai? (-100 se 100 units tak)
const WORLD_MIN = -100;
const WORLD_MAX = 100;
const WORLD_SIZE = WORLD_MAX - WORLD_MIN;

// 🏢 Static Locations (Ghar, Bank, Mall)
// Yahan tum apne naye buildings add kar sakte ho!
const mapLocations = [
    { id: 'my-house', name: 'House', x: 4, y: -4, color: '#f59e0b', icon: '🏠' },
    { id: 'city-bank', name: 'Bank', x: 30, y: -20, color: '#eab308', icon: '🏦' },
    { id: 'mega-mall', name: 'Mall', x: -40, y: 25, color: '#a855f7', icon: '🏬' }
];

// Helper: 3D coordinate ko minimap percentage (0% to 100%) me badalna
function getMapPercent(value) {
    let percent = ((value - WORLD_MIN) / WORLD_SIZE) * 100;
    return Math.max(0, Math.min(100, percent)); // Map ke andar limit karo
}

export function renderMinimap(players, myUid) {
    let minimapHtml = '';

    // 1️⃣ Render Buildings / Landmarks (Ghar, Bank, etc.)
    mapLocations.forEach(loc => {
        const leftPercent = getMapPercent(loc.x);
        const topPercent = getMapPercent(loc.y); // y asal me 3D ka 'z' hai
        
        minimapHtml += `
            <div style="
                position: absolute; 
                left: ${leftPercent}%; 
                top: ${topPercent}%; 
                transform: translate(-50%, -50%);
                background: ${loc.color};
                border: 2px solid white;
                border-radius: 4px;
                width: 20px; height: 20px;
                display: flex; align-items: center; justify-content: center;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                z-index: 10;
            " title="${loc.name}">
                ${loc.icon}
            </div>
        `;
    });

    // 2️⃣ Render Live Players (1p, 2p, 3p)
    let index = 1;
    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;
        
        const leftPercent = getMapPercent(p.x);
        const topPercent = getMapPercent(p.y);

        minimapHtml += `
            <div style="
                position: absolute; 
                left: ${leftPercent}%; 
                top: ${topPercent}%; 
                transform: translate(-50%, -50%); 
                background: ${isMe ? '#3b82f6' : '#ef4444'}; 
                color: white; 
                font-size: 9px; 
                font-weight: bold; 
                width: 18px; 
                height: 18px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border: 2px solid white;
                box-shadow: 0 0 6px rgba(0,0,0,0.8);
                z-index: 20;
            ">
                ${index}p
            </div>
        `;
        index++;
    }
    
    // 3️⃣ Update Minimap Container
    const minimapContainer = document.querySelector('.hud-minimap');
    if (minimapContainer) {
        minimapContainer.style.position = 'relative';
        minimapContainer.style.background = 'rgba(15, 23, 42, 0.7)'; // Dark map background
        minimapContainer.style.border = '2px solid rgba(255,255,255,0.2)';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.style.width = '120px'; // Bada GPS view
        minimapContainer.style.height = '120px';
        minimapContainer.style.borderRadius = '12px';
        minimapContainer.innerHTML = minimapHtml;
    }
}

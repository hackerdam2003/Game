// js/minimap.js

// 🌍 Map Settings: Scale chota kiya hai taaki movement fast aur live dikhe
const WORLD_MIN = -50;
const WORLD_MAX = 50;
const WORLD_SIZE = WORLD_MAX - WORLD_MIN;

// 🏢 Static Locations (Ghar, Bank, Mall)
const mapLocations = [
    { id: 'my-house', name: 'House', x: 4, y: -4, color: '#10b981', icon: '🏠' }, 
    { id: 'city-bank', name: 'Bank', x: 20, y: -15, color: '#eab308', icon: '🏦' },
    { id: 'mega-mall', name: 'Mall', x: -25, y: 20, color: '#a855f7', icon: '🏬' }
];

// Coordinate ko Minimap ke andar lock karne ka function
function getMapPercent(value) {
    let percent = ((value - WORLD_MIN) / WORLD_SIZE) * 100;
    return Math.max(0, Math.min(100, percent)); 
}

export function renderMinimap(players, myUid) {
    let minimapHtml = '';

    // 1️⃣ Render Buildings (Ghar, Bank)
    mapLocations.forEach(loc => {
        const leftPercent = getMapPercent(loc.x);
        const topPercent = getMapPercent(loc.y); 
        
        minimapHtml += `
            <div style="
                position: absolute; 
                left: ${leftPercent}%; 
                top: ${topPercent}%; 
                transform: translate(-50%, -50%);
                background: ${loc.color};
                border: 1px solid white;
                border-radius: 4px;
                width: 18px; height: 18px;
                display: flex; align-items: center; justify-content: center;
                font-size: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.5);
                z-index: 10;
            " title="${loc.name}">
                ${loc.icon}
            </div>
        `;
    });

    // 2️⃣ Render Live Players
    let index = 1;
    for (const uid in players) {
        const p = players[uid];
        const isMe = uid === myUid;
        
        const leftPercent = getMapPercent(p.x);
        const topPercent = getMapPercent(p.y); // y asal me 3D world ka z-axis hai

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
                width: ${isMe ? '22px' : '16px'}; 
                height: ${isMe ? '22px' : '16px'}; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                border: 2px solid ${isMe ? '#fff' : '#fca5a5'};
                box-shadow: 0 0 8px ${isMe ? 'rgba(59, 130, 246, 0.8)' : 'rgba(239, 68, 68, 0.8)'};
                z-index: 20;
            ">
                ${isMe ? 'Me' : index + 'p'}
            </div>
        `;
        index++;
    }
    
    // 3️⃣ Update Minimap Container (🚨 MAP KO TOP-RIGHT ME SHIFT KIYA 🚨)
    const minimapContainer = document.querySelector('.hud-minimap');
    if (minimapContainer) {
        minimapContainer.style.position = 'fixed'; 
        minimapContainer.style.top = '15px';
        
        // YAHAN CHANGE HAI: Map right side me set hoga
        minimapContainer.style.right = '15px'; 
        minimapContainer.style.left = 'auto'; 
        minimapContainer.style.transform = 'none'; 
        
        minimapContainer.style.background = 'rgba(15, 23, 42, 0.85)'; 
        minimapContainer.style.border = '2px solid #38bdf8';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.style.width = '110px';
        minimapContainer.style.height = '110px';
        minimapContainer.style.borderRadius = '50%'; // 🟢 Gol (Round) Map
        minimapContainer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.6)';
        minimapContainer.style.zIndex = '99999';
        minimapContainer.innerHTML = minimapHtml;
    }
}


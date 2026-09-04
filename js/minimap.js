// js/minimap.js

export function renderMinimap(players, myUid) {
    const myPlayer = players[myUid];
    if (!myPlayer) return;

    let minimapHtml = '';
    let index = 1;

    for (const uid in players) {
        const p = players[uid];
        
        // Relative map offset calculation (Smooth tracking relative to local player)
        let relX = 50 + (p.x - myPlayer.x) * 0.08;
        let relY = 50 + (p.y - myPlayer.y) * 0.08;
        
        // Check if player is inside the minimap boundary
        if (relX > 5 && relX < 95 && relY > 5 && relY < 95) {
            const isMe = uid === myUid;
            minimapHtml += `
                <div style="
                    position: absolute; 
                    left: ${relX}px; 
                    top: ${relY}px; 
                    transform: translate(-50%, -50%); 
                    background: ${isMe ? '#3b82f6' : '#10b981'}; 
                    color: white; 
                    font-size: 9px; 
                    font-weight: bold; 
                    width: 16px; 
                    height: 16px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    border: 1px solid white;
                    box-shadow: 0 0 5px rgba(0,0,0,0.5);
                ">
                    ${index}p
                </div>
            `;
        }
        index++;
    }
    
    const minimapContainer = document.querySelector('.hud-minimap');
    if (minimapContainer) {
        minimapContainer.style.position = 'relative';
        minimapContainer.style.overflow = 'hidden';
        minimapContainer.innerHTML = minimapHtml;
    }
}


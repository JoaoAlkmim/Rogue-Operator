import re

def modify_ai():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    find_cover_func = """
    findCover(map, player) {
        // Simple cover finding: Look around 8 tiles in 2-3 block radius.
        // Pick one that is NOT visible from player.
        const cx = Math.floor(this.x / 48);
        const cy = Math.floor(this.y / 48);
        const px = player.x + 12;
        const py = player.y + 12;
        
        let bestDist = 9999;
        let bestCover = null;
        
        for(let r = 2; r <= 4; r++) {
            for(let dx = -r; dx <= r; dx++) {
                for(let dy = -r; dy <= r; dy++) {
                    if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                    
                    const testX = cx + dx;
                    const testY = cy + dy;
                    if (map.grid[testY] && map.grid[testY][testX] === 0) { // is floor
                        const wX = testX * 48 + 24;
                        const wY = testY * 48 + 24;
                        
                        // Check if this floor tile is hidden from player
                        if (!map.raycast(wX, wY, px, py)) {
                            const d = Math.hypot(wX - (this.x+12), wY - (this.y+12));
                            if (d < bestDist) {
                                bestDist = d;
                                bestCover = {x: wX, y: wY};
                            }
                        }
                    }
                }
            }
            if (bestCover) break; // found a cover ring
        }
        return bestCover;
    }

    """
    
    if "findCover(" not in content:
        content = content.replace("pickPatrolPoint(map) {", find_cover_func + "pickPatrolPoint(map) {")
        
    ai_old = "if (this.aiType === 'rush') {"
    
    ai_new = """
            // DECISÃO ESTRATÉGICA: Buscar Cover se recarregando ou morrendo
            const needsCover = (this.hp < this.maxHp * 0.3) || this.isReloading;
            
            if (needsCover && this.aiType !== 'rush') {
                if (!this.coverTarget || Math.random() < 0.02) { // recalc a cada 1 segundo (0.02 chance por frame)
                    this.coverTarget = this.findCover(map, player);
                }
                if (this.coverTarget) {
                    const cdx = this.coverTarget.x - cx;
                    const cdy = this.coverTarget.y - cy;
                    const d = Math.hypot(cdx, cdy);
                    if (d > 10) {
                        aiDx = cdx / d;
                        aiDy = cdy / d;
                    }
                } else {
                    // Tenta fugir da mira do player
                    aiDx = -Math.cos(this.angle); aiDy = -Math.sin(this.angle);
                }
            }
            else if (this.aiType === 'rush') {"""

    if "DECISÃO ESTRATÉGICA" not in content:
        content = content.replace(ai_old, ai_new)
        
    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    modify_ai()

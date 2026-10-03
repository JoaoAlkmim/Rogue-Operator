import re

def fix_entities():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # The buggy block injected in attack()
    buggy_block = """            // DECISÃO ESTRATÉGICA: Buscar Cover se recarregando ou morrendo
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

    # Replace it in attack() back to the original
    content = content.replace(buggy_block, "if (this.aiType === 'rush') {")
    
    # But wait, now both update() and attack() lost the cover logic!
    # I need to put the cover logic back ONLY in update().
    
    # In update, the code used to be:
    #             // Comportamentos de Combate
    #             if (this.aiType === 'rush') {
    
    # Currently it is:
    #             // Comportamentos de Combate
    #             if (this.aiType === 'rush') {
    # Because the first replace reverted ALL of them!
    
    update_old = """            // Comportamentos de Combate
            if (this.aiType === 'rush') {"""
            
    update_new = """            // Comportamentos de Combate
            // DECISÃO ESTRATÉGICA: Buscar Cover se recarregando ou morrendo
            const needsCover = (this.hp < this.maxHp * 0.3) || this.isReloading;
            
            if (needsCover && this.aiType !== 'rush') {
                if (!this.coverTarget || Math.random() < 0.02) { 
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
                    aiDx = -Math.cos(this.angle); aiDy = -Math.sin(this.angle);
                }
            }
            else if (this.aiType === 'rush') {"""
            
    # We must only replace the FIRST occurrence (which is in update, not attack)
    content = content.replace(update_old, update_new, 1)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_entities()

import re

def fix_visuals2():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # 1. Fix Client projectile inference (prevent trailing bullet holes)
    old_proj = """                            // If an old projectile is missing in the new state, it died (hit something)
                            const stillAlive = s.projectiles.some(newP => Math.abs(newP.x - oldP.x) < 30 && Math.abs(newP.y - oldP.y) < 30);
                            if (!stillAlive) {
                                ParticleSystem.spawn(oldP.x, oldP.y, 'bullet_hole');
                                for (let i = 0; i < 4; i++) ParticleSystem.spawn(oldP.x, oldP.y, 'spark');
                            }"""
    
    new_proj = """                            // Match by velocity to ensure we don't lose fast bullets
                            const stillAlive = s.projectiles.some(newP => newP.vx === oldP.vx && newP.vy === oldP.vy);
                            if (!stillAlive) {
                                // Projectile died. Check if it hit a wall by projecting it forward half a frame
                                const hitX = oldP.x + oldP.vx * 0.01;
                                const hitY = oldP.y + oldP.vy * 0.01;
                                if (this.map.isWall(hitX, hitY) || this.map.isWall(oldP.x, oldP.y)) {
                                    ParticleSystem.spawn(oldP.x, oldP.y, 'bullet_hole');
                                    for (let i = 0; i < 4; i++) ParticleSystem.spawn(oldP.x, oldP.y, 'spark');
                                }
                            }"""
    game = game.replace(old_proj, new_proj)


    # 2. Fix animTimer resetting (idle animation)
    old_rp = """                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            if (rp.isMoving) rp.animTimer += 0.016; else rp.animTimer = 0;"""
                            
    new_rp = """                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            rp.animTimer += 0.016; // Always increment so idle breathe works"""
    game = game.replace(old_rp, new_rp)

    old_lp = """                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            if (this.player.isMoving) this.player.animTimer += 0.016; else this.player.animTimer = 0;"""
                            
    new_lp = """                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            this.player.animTimer += 0.016; // Always increment"""
    game = game.replace(old_lp, new_lp)
    
    old_enemy = """                            if (e.animTimer === undefined || isNaN(e.animTimer)) e.animTimer = 0;
                            if (e.isMoving) e.animTimer += 0.016; else e.animTimer = 0;"""
    new_enemy = """                            if (e.animTimer === undefined || isNaN(e.animTimer)) e.animTimer = 0;
                            e.animTimer += 0.016;"""
    game = game.replace(old_enemy, new_enemy)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_visuals2()

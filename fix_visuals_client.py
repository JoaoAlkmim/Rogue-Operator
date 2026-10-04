import re

def fix_visuals():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # 1. Projectile Collision Inference on Client
    old_proj = """                    } else {
                        this.enemies = [];
                    }
                    this.projectiles = s.projectiles || [];"""
    
    new_proj = """                    } else {
                        this.enemies = [];
                    }
                    
                    // Infer projectile collisions for client visuals
                    if (s.projectiles) {
                        this.projectiles.forEach(oldP => {
                            // If an old projectile is missing in the new state, it died (hit something)
                            const stillAlive = s.projectiles.some(newP => Math.abs(newP.x - oldP.x) < 30 && Math.abs(newP.y - oldP.y) < 30);
                            if (!stillAlive) {
                                ParticleSystem.spawn(oldP.x, oldP.y, 'bullet_hole');
                                for (let i = 0; i < 4; i++) ParticleSystem.spawn(oldP.x, oldP.y, 'spark');
                            }
                        });
                    }
                    this.projectiles = s.projectiles || [];"""
    game = game.replace(old_proj, new_proj)


    # 2. Ammo Inference for Remote Players to trigger Muzzle Flash & Shells
    old_rp = """                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = sp.isMoving;
                            rp.recoilTimer = sp.recoilTimer;
                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            if (rp.isMoving) rp.animTimer += 0.016; else rp.animTimer = 0;
                            this.remotePlayers[peerId] = rp;"""
                            
    new_rp = """                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = sp.isMoving;
                            rp.recoilTimer = sp.recoilTimer;
                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            if (rp.isMoving) rp.animTimer += 0.016; else rp.animTimer = 0;
                            
                            // Detect if remote player fired
                            if (sp.ammo !== undefined) {
                                if (rp.weapon && rp.weapon.ammo !== undefined && sp.ammo < rp.weapon.ammo) {
                                    // Player fired!
                                    rp.flashTimer = 0.06;
                                    ParticleSystem.spawn(rp.x, rp.y, 'shell');
                                    // Optional: Play gun sound spatially here
                                }
                                if (rp.weapon) rp.weapon.ammo = sp.ammo;
                            }
                            rp.reloading = sp.reloading;
                            
                            this.remotePlayers[peerId] = rp;"""
    game = game.replace(old_rp, new_rp)


    # 3. Ammo Inference for Local Player (Client-side) to trigger Muzzle Flash & Shells
    old_lp = """                                if (this.player.weapon.ammo !== spData.ammo) {
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }"""
                                
    new_lp = """                                if (this.player.weapon.ammo !== spData.ammo) {
                                    if (spData.ammo < this.player.weapon.ammo) {
                                        this.player.flashTimer = 0.06;
                                        ParticleSystem.spawn(this.player.x, this.player.y, 'shell');
                                    }
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }"""
    game = game.replace(old_lp, new_lp)


    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_visuals()

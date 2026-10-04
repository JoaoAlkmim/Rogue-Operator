import re

def perfect_decals():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # 1. Host: send ParticleSystem.networkEvents and clear them
    old_host_broadcast = """                state.initWindows = this.windows.map(w => ({ x: w.x, y: w.y, w: w.w, rot: w.rot }));
                this.sendMapNextFrame = false;
            }
            Network.broadcast(state);"""
            
    new_host_broadcast = """                state.initWindows = this.windows.map(w => ({ x: w.x, y: w.y, w: w.w, rot: w.rot }));
                this.sendMapNextFrame = false;
            }
            state.particles = ParticleSystem.networkEvents;
            Network.broadcast(state);
            ParticleSystem.networkEvents = [];"""
    game = game.replace(old_host_broadcast, new_host_broadcast)


    # 2. Client: Receive state.particles and spawn them, then remove my fake visual inference
    old_client_sync = """                    // Infer projectile collisions for client visuals
                    if (s.projectiles) {
                        this.projectiles.forEach(oldP => {
                            // Match by velocity to ensure we don't lose fast bullets
                            const stillAlive = s.projectiles.some(newP => newP.vx === oldP.vx && newP.vy === oldP.vy);
                            if (!stillAlive) {
                                // Projectile died. Check if it hit a wall by projecting it forward half a frame
                                const hitX = oldP.x + oldP.vx * 0.01;
                                const hitY = oldP.y + oldP.vy * 0.01;
                                if (this.map.isWall(hitX, hitY) || this.map.isWall(oldP.x, oldP.y)) {
                                    ParticleSystem.spawn(oldP.x, oldP.y, 'bullet_hole');
                                    for (let i = 0; i < 4; i++) ParticleSystem.spawn(oldP.x, oldP.y, 'spark');
                                }
                            }
                        });
                    }
                    this.projectiles = s.projectiles || [];"""
                    
    new_client_sync = """                    // PERFECT SYNC: Spawn exactly the decals the Host spawned
                    if (s.particles && s.particles.length > 0) {
                        s.particles.forEach(p => {
                            // Ignore fog/dust from network, Client does it locally
                            if (p.type !== 'fog') {
                                ParticleSystem.spawn(p.x, p.y, p.type, p.ivx, p.ivy, { isNetwork: true, sprite: p.sprite });
                            }
                        });
                        s.particles = []; // Clear so we don't spawn them again next frame
                    }
                    this.projectiles = s.projectiles || [];"""
    game = game.replace(old_client_sync, new_client_sync)


    # 3. Client: Remove the fake Ammo Inference (keep the ammo sync, but remove the ParticleSystem.spawn('shell'))
    old_rp_ammo = """                            // Detect if remote player fired
                            if (sp.ammo !== undefined) {
                                if (rp.weapon && rp.weapon.ammo !== undefined && sp.ammo < rp.weapon.ammo) {
                                    // Player fired!
                                    rp.flashTimer = 0.06;
                                    ParticleSystem.spawn(rp.x, rp.y, 'shell');
                                    // Optional: Play gun sound spatially here
                                }
                                if (rp.weapon) rp.weapon.ammo = sp.ammo;
                            }"""
    new_rp_ammo = """                            // Sync remote ammo
                            if (sp.ammo !== undefined) {
                                if (rp.weapon && rp.weapon.ammo !== undefined && sp.ammo < rp.weapon.ammo) {
                                    rp.flashTimer = 0.06;
                                }
                                if (rp.weapon) rp.weapon.ammo = sp.ammo;
                            }"""
    game = game.replace(old_rp_ammo, new_rp_ammo)
    
    old_lp_ammo = """                                if (this.player.weapon.ammo !== spData.ammo) {
                                    if (spData.ammo < this.player.weapon.ammo) {
                                        this.player.flashTimer = 0.06;
                                        ParticleSystem.spawn(this.player.x, this.player.y, 'shell');
                                    }
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }"""
    new_lp_ammo = """                                if (this.player.weapon.ammo !== spData.ammo) {
                                    if (spData.ammo < this.player.weapon.ammo) {
                                        this.player.flashTimer = 0.06;
                                    }
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }"""
    game = game.replace(old_lp_ammo, new_lp_ammo)


    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    perfect_decals()

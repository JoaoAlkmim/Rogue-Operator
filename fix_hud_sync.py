import re

def fix_hud_sync():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # --- 1. Modify Host Broadcast payload ---
    # We need to get reloadPct for host
    host_payload_old = "players: { 'host': { x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp, angle: this.player.angle } }"
    
    host_payload_new = """players: { 
                    'host': { 
                        x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp, angle: this.player.angle,
                        ammo: this.player.weapon.ammo, reloading: this.player.reloading,
                        reloadPct: this.player.reloading ? (1 - (this.player.reloadTimer / (this.player.weapon.reload * this.player.mods.reloadMult))) * 100 : 0
                    } 
                }"""
    game = game.replace(host_payload_old, host_payload_new)

    # We need to get reloadPct for remotePlayers
    rp_payload_old = "state.players[peerId] = { x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, angle: rp.angle };"
    rp_payload_new = """state.players[peerId] = { 
                        x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, angle: rp.angle,
                        ammo: rp.weapon.ammo, reloading: rp.reloading,
                        reloadPct: rp.reloading ? (1 - (rp.reloadTimer / (rp.weapon.reload * rp.mods.reloadMult))) * 100 : 0
                    };"""
    game = game.replace(rp_payload_old, rp_payload_new)

    # --- 2. Modify Client parsing to update DOM ---
    client_parse_old = """                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                            this.player.renderAngle = s.players[Network.id].angle;
                            this.player.isMoving = true;
                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            this.player.animTimer += 0.016;
                        }"""
    
    client_parse_new = """                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                            this.player.renderAngle = s.players[Network.id].angle;
                            this.player.isMoving = true;
                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            this.player.animTimer += 0.016;

                            // HUD Sync for Client
                            const spData = s.players[Network.id];
                            if (spData.ammo !== undefined) {
                                if (this.player.weapon.ammo !== spData.ammo) {
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }
                                this.player.reloading = spData.reloading;
                                
                                const reloadInd = document.getElementById('reload-indicator');
                                const reloadFill = document.getElementById('reload-fill');
                                if (this.player.reloading && reloadInd) {
                                    reloadInd.style.display = 'block';
                                    if (reloadFill) reloadFill.style.setProperty('--p', `${spData.reloadPct}%`);
                                } else if (reloadInd) {
                                    reloadInd.style.display = 'none';
                                }
                            }
                        }"""
    
    game = game.replace(client_parse_old, client_parse_new)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_hud_sync()

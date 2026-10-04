import re

def fix_animations():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # 1. Add isMoving and recoilTimer to Host broadcast
    old_host_broadcast = """                    'host': { 
                        x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp, angle: this.player.angle,
                        ammo: this.player.weapon.ammo, reloading: this.player.reloading,"""
    new_host_broadcast = """                    'host': { 
                        x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp, angle: this.player.angle,
                        isMoving: this.player.isMoving, recoilTimer: this.player.recoilTimer || 0,
                        ammo: this.player.weapon.ammo, reloading: this.player.reloading,"""
    game = game.replace(old_host_broadcast, new_host_broadcast)

    old_rp_broadcast = """                    state.players[peerId] = { 
                        x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, angle: rp.angle,
                        ammo: rp.weapon.ammo, reloading: rp.reloading,"""
    new_rp_broadcast = """                    state.players[peerId] = { 
                        x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, angle: rp.angle,
                        isMoving: rp.isMoving, recoilTimer: rp.recoilTimer || 0,
                        ammo: rp.weapon.ammo, reloading: rp.reloading,"""
    game = game.replace(old_rp_broadcast, new_rp_broadcast)


    # 2. Add isMoving and recoilTimer to Client sync (Local player)
    old_client_sync_local = """                            this.player.angle = s.players[Network.id].angle;
                            this.player.renderAngle = s.players[Network.id].angle;
                            this.player.isMoving = true;
                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            this.player.animTimer += 0.016;"""
    new_client_sync_local = """                            this.player.angle = s.players[Network.id].angle;
                            this.player.renderAngle = s.players[Network.id].angle;
                            this.player.isMoving = s.players[Network.id].isMoving;
                            this.player.recoilTimer = s.players[Network.id].recoilTimer;
                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            if (this.player.isMoving) this.player.animTimer += 0.016; else this.player.animTimer = 0;"""
    game = game.replace(old_client_sync_local, new_client_sync_local)

    # 3. Add isMoving and recoilTimer to Client sync (Remote players)
    old_client_sync_remote = """                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = true;
                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            rp.animTimer += 0.016;"""
    new_client_sync_remote = """                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = sp.isMoving;
                            rp.recoilTimer = sp.recoilTimer;
                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            if (rp.isMoving) rp.animTimer += 0.016; else rp.animTimer = 0;"""
    game = game.replace(old_client_sync_remote, new_client_sync_remote)


    # 4. Add DustSystem to Client loop
    old_dust = """                try {
                    ParticleSystem.update(0.016, this.map.decalCtx);
                    this.trees.forEach(t => t.update(0.016));"""
    new_dust = """                try {
                    if (this.dust) this.dust.update(0.016);
                    ParticleSystem.update(0.016, this.map.decalCtx);
                    this.trees.forEach(t => t.update(0.016));"""
    game = game.replace(old_dust, new_dust)

    # 5. Fix Enemy animations on Client
    old_enemy_anim = """                            e.angle = se.angle; e.dead = se.dead; e.spriteName = se.spriteName;
                            // Fake movement values so animation works
                            e.isMoving = true;
                            if (e.animTimer === undefined || isNaN(e.animTimer)) e.animTimer = 0;
                            e.animTimer += 0.016; """
    new_enemy_anim = """                            e.angle = se.angle; e.dead = se.dead; e.spriteName = se.spriteName;
                            // Fake movement values so animation works
                            e.isMoving = se.hp > 0;
                            if (e.animTimer === undefined || isNaN(e.animTimer)) e.animTimer = 0;
                            if (e.isMoving) e.animTimer += 0.016; else e.animTimer = 0;"""
    game = game.replace(old_enemy_anim, new_enemy_anim)


    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_animations()

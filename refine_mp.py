import re

def refine_multiplayer():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add getClosestPlayer function to Game
    closest_func = """    triggerHitStop(duration) { this.hitStopTimer = duration; },

    getClosestPlayer(x, y) {
        let closest = this.player;
        let minDist = M.dist(x, y, this.player.x, this.player.y);
        
        if (this.remotePlayers) {
            for (let peerId in this.remotePlayers) {
                const rp = this.remotePlayers[peerId];
                if (rp.dead) continue;
                const d = M.dist(x, y, rp.x, rp.y);
                if (d < minDist) {
                    minDist = d;
                    closest = rp;
                }
            }
        }
        return closest;
    },

    // =========================================================================
"""
    if "getClosestPlayer(x, y)" not in content:
        content = content.replace("    triggerHitStop(duration) { this.hitStopTimer = duration; },\n\n    // =========================================================================", closest_func)

    # 2. Update Enemy AI targeting to use getClosestPlayer
    old_enemy_update = "e.update(dt, this.player, this.map, this);"
    new_enemy_update = "e.update(dt, this.getClosestPlayer(e.x, e.y), this.map, this);"
    content = content.replace(old_enemy_update, new_enemy_update)

    # 3. Client state hydration to maintain real instances instead of raw JSON
    # Find the block inside the client where s.players is processed
    old_client_sync = """                    if (s.players) {
                        if (s.players[Network.id]) {
                            this.player.x = s.players[Network.id].x;
                            this.player.y = s.players[Network.id].y;
                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                        }
                        this.remotePlayers = s.players;
                    }"""
    
    new_client_sync = """                    
                    // Hydrate Enemies (Keep real instances for rendering)
                    if (s.enemies) {
                        this.enemies = s.enemies.map((se, i) => {
                            let e = this.enemies[i];
                            if (!e || e.typeId !== se.typeId) {
                                e = new Enemy(se.x, se.y, se.typeId || 1, 1);
                            }
                            e.x = se.x; e.y = se.y; e.hp = se.hp; e.maxHp = se.maxHp;
                            e.angle = se.angle; e.dead = se.dead; e.spriteName = se.spriteName;
                            // Fake movement values so animation works
                            e.isMoving = true; 
                            return e;
                        });
                    } else {
                        this.enemies = [];
                    }
                    this.projectiles = s.projectiles || [];

                    if (s.players) {
                        if (s.players[Network.id]) {
                            this.player.x = s.players[Network.id].x;
                            this.player.y = s.players[Network.id].y;
                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                        }
                        
                        if (!this.remotePlayers) this.remotePlayers = {};
                        for (let peerId in s.players) {
                            if (peerId === Network.id) continue;
                            let rp = this.remotePlayers[peerId];
                            if (!rp) { rp = new Player(0, 0); rp.visualSize = 64; }
                            const sp = s.players[peerId];
                            rp.x = sp.x; rp.y = sp.y; rp.hp = sp.hp; rp.maxHp = sp.maxHp;
                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = true; // For animation
                            this.remotePlayers[peerId] = rp;
                        }
                    }"""
    
    # We need to replace the old assignment carefully
    # First, let's remove the old this.enemies assignment
    content = content.replace("this.enemies = s.enemies || [];", "")
    content = content.replace("this.projectiles = s.projectiles || [];", "")
    if "// Hydrate Enemies" not in content:
        content = content.replace(old_client_sync, new_client_sync)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    refine_multiplayer()

import re

def fix_mp_client():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject CLIENT LOGIC at the start of loop's play block
    old_block = "if (this.state === 'play' && !this.paused) {\n\n            // 1. Limpa a grade espacial"
    new_block = """if (this.state === 'play' && !this.paused) {
            
            if (typeof Input.updateGamepad === 'function') Input.updateGamepad(SCREEN.w, SCREEN.h);

            // --- CLIENT LOGIC ---
            if (this.isClient) {
                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };
                Network.sendToHost(localInput);
                
                if (this.networkState) {
                    const s = this.networkState;
                    this.enemies = s.enemies || [];
                    this.projectiles = s.projectiles || [];
                    
                    if (s.initMap && this.map) {
                        this.map.grid = s.initMap;
                        this.map.barrels = s.initBarrels || {};
                        delete s.initMap; // processa apenas uma vez
                    }
                    
                    if (s.players) {
                        if (s.players[Network.id]) {
                            this.player.x = s.players[Network.id].x;
                            this.player.y = s.players[Network.id].y;
                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                        }
                        this.remotePlayers = s.players;
                    }
                }
                
                this.cam.update(this.player, 0.016, Input);
                this.draw();
                requestAnimationFrame((ts) => this.loop(ts));
                return; // O Cliente aborta o calculo local!
            }
            // --- END CLIENT LOGIC ---

            // 1. Limpa a grade espacial"""
    if "// --- CLIENT LOGIC ---" not in content:
        content = content.replace(old_block, new_block, 1)

    # 2. In Host Broadcast, send Map if requested or just send it if a player is new.
    # Actually, sending mapGrid 60 times a second is bad.
    # Let's modify the host's onData to send map to new clients.
    old_ondata = """Network.onData = (peerId, data) => {
                    // Host recebendo inputs dos clientes
                    if (!this.remotePlayers[peerId]) {
                        this.remotePlayers[peerId] = new Player(this.map.getSpawnPoint().x, this.map.getSpawnPoint().y);
                    }
                    this.remotePlayers[peerId].networkInput = data;
                };"""
    new_ondata = """Network.onData = (peerId, data) => {
                    if (!this.remotePlayers[peerId]) {
                        this.remotePlayers[peerId] = new Player(this.map.getSpawnPoint().x, this.map.getSpawnPoint().y);
                        // Envia o mapa inteiro para o novo cliente no próximo frame
                        this.sendMapNextFrame = true;
                    }
                    this.remotePlayers[peerId].networkInput = data;
                };"""
    if "this.sendMapNextFrame = true;" not in content:
        content = content.replace(old_ondata, new_ondata, 1)

    # 3. Add sendMapNextFrame logic to Broadcast
    old_bc = "Network.broadcast(state);\n        }"
    new_bc = """if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                this.sendMapNextFrame = false;
            }
            Network.broadcast(state);
        }"""
    if "state.initMap = this.map.grid;" not in content:
        content = content.replace(old_bc, new_bc, 1)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_mp_client()

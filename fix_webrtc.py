import re

def fix_ammo_and_tickrate():
    # --- 1. Fix UI updates in entities.ts ---
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    # In startReload
    ent = ent.replace("UI.updateAmmo(this);", "if (this === game.player) UI.updateAmmo(this);")
    
    # In fire
    # Wait, in fire we don't see UI.updateAmmo(this); easily, let's just do a regex
    ent = re.sub(r'UI\.updateAmmo\(this\);', r'if (game && this === game.player) UI.updateAmmo(this);', ent)
    
    # In takeDamage
    ent = re.sub(r'UI\.updateHp\(this\);', r'if (game && this === game.player) UI.updateHp(this);', ent)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)


    # --- 2. Fix WebRTC flood (Tick Rate Limiting) in game.ts ---
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # Client Tick Rate
    old_client_send = """            // --- CLIENT LOGIC ---
            if (this.isClient) {
                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };
                Network.sendToHost(localInput);"""
    
    new_client_send = """            // --- CLIENT LOGIC ---
            if (this.isClient) {
                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };
                
                // Tickrate limit for Client (approx 40 FPS to avoid WebRTC buffer bloat)
                if (!this.netTimer) this.netTimer = 0;
                this.netTimer += dt;
                if (this.netTimer > 0.025) {
                    Network.sendToHost(localInput);
                    this.netTimer = 0;
                }"""
    if "Tickrate limit for Client" not in game:
        game = game.replace(old_client_send, new_client_send, 1)

    # Host Tick Rate
    old_host_bc = """        // --- HOST BROADCAST STATE ---
        if (this.isHost) {"""
    
    new_host_bc = """        // --- HOST BROADCAST STATE ---
        if (this.isHost) {
            // Tickrate limit for Host
            if (!this.netTimer) this.netTimer = 0;
            this.netTimer += dt;
            if (this.netTimer < 0.025) {
                // Skip broadcast this frame, but still draw
            } else {
                this.netTimer = 0;"""
    
    # We need to close the else block after Network.broadcast(state);
    old_bc_end = """            if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                this.sendMapNextFrame = false;
            }
            Network.broadcast(state);
        }

        if (this.state === 'play' || this.state === 'paused')"""
    
    new_bc_end = """            if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                this.sendMapNextFrame = false;
            }
            Network.broadcast(state);
            } // Close else
        }

        if (this.state === 'play' || this.state === 'paused')"""
    
    if "Tickrate limit for Host" not in game:
        game = game.replace(old_host_bc, new_host_bc, 1)
        game = game.replace(old_bc_end, new_bc_end, 1)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_ammo_and_tickrate()

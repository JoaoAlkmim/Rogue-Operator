import re

def fix_remote_bugs():
    # --- 1. Fix Camera shaking and explicit isLocal ---
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    # Prevent remote players from shaking the local camera
    old_cam_shake = """        // Empurra a C'MERA (Kick fsico)
        // Multiplicamos para ficar visvel na tela
        cam.recoilX += step[0] * 3; 
        cam.recoilY += step[1] * 3;
        cam.addTrauma(this.weapon.shake / 20); // Trauma adicional"""
    
    new_cam_shake = """        // Empurra a C'MERA (Kick fsico)
        // Multiplicamos para ficar visvel na tela
        if (this.isLocal) {
            cam.recoilX += step[0] * 3; 
            cam.recoilY += step[1] * 3;
            cam.addTrauma(this.weapon.shake / 20); // Trauma adicional
        }"""
    
    # We'll use a regex for the exact replacement to avoid encoding issues
    ent = re.sub(r'cam\.recoilX \+= step\[0\] \* 3;\s*cam\.recoilY \+= step\[1\] \* 3;\s*cam\.addTrauma\(this\.weapon\.shake / 20\);', r'if (this.isLocal) { cam.recoilX += step[0] * 3; cam.recoilY += step[1] * 3; cam.addTrauma(this.weapon.shake / 20); }', ent)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)

    # --- 2. Fix game.ts remotePlayer instantiation ---
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()
    
    old_rp_host = "this.remotePlayers[peerId] = new Player(this.map.getSpawnPoint().x, this.map.getSpawnPoint().y);"
    new_rp_host = "this.remotePlayers[peerId] = new Player(this.map.getSpawnPoint().x, this.map.getSpawnPoint().y); this.remotePlayers[peerId].isLocal = false;"
    game = game.replace(old_rp_host, new_rp_host)

    old_rp_client = "if (!rp) { rp = new Player(0, 0); rp.visualSize = 64; }"
    new_rp_client = "if (!rp) { rp = new Player(0, 0); rp.visualSize = 64; rp.isLocal = false; }"
    game = game.replace(old_rp_client, new_rp_client)

    # Make sure this.player.isLocal is set correctly during level restart too
    old_player_reset = """        if (!this.player) {
            this.player = new Player(start.x, start.y);
            this.player.isLocal = true;
        } else {"""
    
    # Oh wait, `Game.startRun` creates a new player if one doesn't exist, but it doesn't create one if it does!
    # Let's just find `this.player = new Player` and make sure it has isLocal = true.
    # We already did that in the previous script, but let's check `Game.startRun` and `Game.initMap`.

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_remote_bugs()

import re

def fix_visual_sync():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # --- 1. Save fIdx and wIdx to this.map ---
    old_start_level = """        const fIdx = M.randInt(1, TEXTURE_VARIATIONS.floors);
        const wIdx = M.randInt(1, TEXTURE_VARIATIONS.walls);
        this.map.floorTex = Assets[`floor${fIdx}`];
        this.map.wallTex = Assets[`wall${wIdx}`];"""
    new_start_level = """        const fIdx = M.randInt(1, TEXTURE_VARIATIONS.floors);
        const wIdx = M.randInt(1, TEXTURE_VARIATIONS.walls);
        this.map.fIdx = fIdx;
        this.map.wIdx = wIdx;
        this.map.floorTex = Assets[`floor${fIdx}`];
        this.map.wallTex = Assets[`wall${wIdx}`];"""
    game = game.replace(old_start_level, new_start_level)

    # --- 2. Broadcast these visual objects ONCE along with initMap ---
    old_init_map_send = """            if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                this.sendMapNextFrame = false;
            }"""
    new_init_map_send = """            if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                state.initFIdx = this.map.fIdx;
                state.initWIdx = this.map.wIdx;
                state.initTrees = this.trees.map(t => ({ x: t.x, y: t.y, size: t.size }));
                state.initWindows = this.windows.map(w => ({ x: w.x, y: w.y, w: w.w, rot: w.rot }));
                this.sendMapNextFrame = false;
            }"""
    game = game.replace(old_init_map_send, new_init_map_send)

    # --- 3. Client receives and applies these visual objects ---
    old_init_map_recv = """                    if (data.initMap && this.map) {
                        this.map.grid = data.initMap;
                        this.map.barrels = data.initBarrels || {};
                        console.log("Mapa sincronizado com sucesso do Host!");
                    }"""
    new_init_map_recv = """                    if (data.initMap && this.map) {
                        this.map.grid = data.initMap;
                        this.map.barrels = data.initBarrels || {};
                        if (data.initFIdx) this.map.floorTex = Assets[`floor${data.initFIdx}`];
                        if (data.initWIdx) this.map.wallTex = Assets[`wall${data.initWIdx}`];
                        if (data.initTrees) {
                            this.trees = [];
                            data.initTrees.forEach(t => this.trees.push(new Tree(t.x, t.y, t.size)));
                        }
                        if (data.initWindows) {
                            this.windows = data.initWindows;
                        }
                        console.log("Mapa sincronizado com sucesso do Host!");
                    }"""
    game = game.replace(old_init_map_recv, new_init_map_recv)

    # --- 4. Continual Particle & Decal Sync ---
    # To sync particles efficiently, we can have a global array in ParticleSystem called "networkEvents"
    # The Host drains this array every frame and sends it.
    
    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)


if __name__ == '__main__':
    fix_visual_sync()

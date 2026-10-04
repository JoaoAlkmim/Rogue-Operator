import re

def fix_crates():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # 1. Add destroyedCratesThisFrame to MapSystem.generate
    old_generate = """    generate() {
        this.grid = new Array(this.h).fill(0).map(() => new Array(this.w).fill(1));
        this.rooms = [];
        this.crateHp = {}; this.barrels = {};"""
    new_generate = """    generate() {
        this.grid = new Array(this.h).fill(0).map(() => new Array(this.w).fill(1));
        this.rooms = [];
        this.crateHp = {}; this.barrels = {};
        this.destroyedCratesThisFrame = [];"""
    game = game.replace(old_generate, new_generate)

    # 2. Add to destroyBox
    old_destroy = """    destroyBox(tx, ty) {
        if (this.grid[ty][tx] !== 2) return;
        this.grid[ty][tx] = 3;"""
    new_destroy = """    destroyBox(tx, ty) {
        if (this.grid[ty][tx] !== 2) return;
        this.grid[ty][tx] = 3;
        if (this.destroyedCratesThisFrame) this.destroyedCratesThisFrame.push({x: tx, y: ty});"""
    game = game.replace(old_destroy, new_destroy)

    # 3. Add to Host broadcast
    old_host = """            state.particles = ParticleSystem.networkEvents;
            Network.broadcast(state);
            ParticleSystem.networkEvents = [];"""
    new_host = """            state.particles = ParticleSystem.networkEvents;
            if (this.map.destroyedCratesThisFrame && this.map.destroyedCratesThisFrame.length > 0) {
                state.destroyedCrates = this.map.destroyedCratesThisFrame;
            }
            Network.broadcast(state);
            ParticleSystem.networkEvents = [];
            this.map.destroyedCratesThisFrame = [];"""
    game = game.replace(old_host, new_host)

    # 4. Add to Client sync
    old_client = """                    this.projectiles = s.projectiles || [];"""
    new_client = """                    this.projectiles = s.projectiles || [];
                    if (s.destroyedCrates && s.destroyedCrates.length > 0) {
                        s.destroyedCrates.forEach(c => this.map.destroyBox(c.x, c.y));
                        s.destroyedCrates = [];
                    }"""
    game = game.replace(old_client, new_client)


    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_crates()

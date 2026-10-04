import re

def fix_particles():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    # Add networkEvents array and hook spawn()
    old_ps = """export const ParticleSystem = {
    pool: [],
    spawn(x, y, type, ivx = 0, ivy = 0, props = {}) {"""
    
    new_ps = """export const ParticleSystem = {
    pool: [],
    networkEvents: [],
    spawn(x, y, type, ivx = 0, ivy = 0, props = {}) {
        // Ignora spawn duplicado de clientes (só o Host/Local deve gerar eventos de rede)
        // Se props.isNetwork === true, foi spawnado via rede, não precisa reenviar
        if (!props.isNetwork) {
            this.networkEvents.push({ x: Math.floor(x), y: Math.floor(y), type, ivx: Math.floor(ivx), ivy: Math.floor(ivy) });
        }"""
    
    ent = ent.replace(old_ps, new_ps)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)


    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # Host sends visualEvents
    old_state_def = """            const state = { 
                projectiles: this.projectiles.map(pr => ({ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, wepId: pr.wepId, explosiveRadius: pr.explosiveRadius, freezeTime: pr.freezeTime, rotSpeed: pr.rotSpeed, size: pr.size, width: pr.width, length: pr.length })),
                players: { 
                    'host': {"""
    
    new_state_def = """            const state = { 
                visualEvents: ParticleSystem.networkEvents.splice(0, ParticleSystem.networkEvents.length), // Drena a fila
                projectiles: this.projectiles.map(pr => ({ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, wepId: pr.wepId, explosiveRadius: pr.explosiveRadius, freezeTime: pr.freezeTime, rotSpeed: pr.rotSpeed, size: pr.size, width: pr.width, length: pr.length })),
                players: { 
                    'host': {"""
    game = game.replace(old_state_def, new_state_def)

    # Client receives visualEvents
    old_client_parse = """                if (this.networkState) {
                    const s = this.networkState;
                    if (s.projectiles) {"""
    
    new_client_parse = """                if (this.networkState) {
                    const s = this.networkState;
                    if (s.visualEvents) {
                        s.visualEvents.forEach(e => {
                            ParticleSystem.spawn(e.x, e.y, e.type, e.ivx, e.ivy, { isNetwork: true });
                        });
                    }
                    if (s.projectiles) {"""
    game = game.replace(old_client_parse, new_client_parse)

    # Client must call ParticleSystem.update to actually process and render particles and draw them to their decalCanvas!
    old_client_draw = """                try {
                    this.cam.update(this.player, 0.016, Input);
                    this.draw();
                } catch(err) {"""
    
    new_client_draw = """                try {
                    ParticleSystem.update(0.016, this.map.decalCtx);
                    this.trees.forEach(t => t.update(0.016));
                    this.cam.update(this.player, 0.016, Input);
                    this.draw();
                } catch(err) {"""
    game = game.replace(old_client_draw, new_client_draw)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_particles()

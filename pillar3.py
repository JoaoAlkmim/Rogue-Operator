import re

def implement_pillar3():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update explode SFX to be spatial
    explode_old = "explode: () => { AudioSys.init(); AudioSys.playTone(50, 'sawtooth', 0.3); }"
    explode_new = """explode: (x, y, game) => { 
            AudioSys.init();
            if (x !== undefined && game) {
                AudioSys.playSpatial('explode', x, y, game);
            } else {
                AudioSys.playTone(50, 'sawtooth', 0.3); 
            }
        }"""
    if "explode: (x, y, game)" not in content:
        content = content.replace(explode_old, explode_new)
        
    # 2. Update createExplosion to use spatial audio and dynamic screen shake
    # createExplosion(game, x, y, radius, damage)
    exp_old = """    game.audio.sfx.explode();
    game.cam.addTrauma(0.7);"""
    exp_new = """    game.audio.sfx.explode(x, y, game);
    // Variable screen shake based on distance
    const distToPlayer = M.dist(x, y, game.player.x + 12, game.player.y + 12);
    const trauma = Math.max(0, 1.2 - (distToPlayer / 600)); 
    game.cam.addTrauma(trauma);"""
    
    if "const distToPlayer = M.dist(x, y, game.player.x + 12, game.player.y + 12);" not in content:
        content = content.replace(exp_old, exp_new)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    implement_pillar3()

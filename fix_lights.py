import re

def fix_remote_lights():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # The block where lights are added:
    old_enemy_lights = """            // 5. Inimigos (Olhos brilhantes no escuro - Opcional)
            this.enemies.forEach(e => {
               // Apenas um brilho fraco vermelho para atmosfera
               if(!e.dead) this.lighting.addLight(e.x + 12, e.y + 12, 40, 'rgba(255, 0, 0, 0.15)', false);
            });"""
    
    new_enemy_lights = """            // 5. Inimigos (Olhos brilhantes no escuro - Opcional)
            this.enemies.forEach(e => {
               if(!e.dead) this.lighting.addLight(e.x + 12, e.y + 12, 40, 'rgba(255, 0, 0, 0.15)', false);
            });

            // 6. Remote Players (Os outros jogadores também precisam de lanterna e emitir luz)
            if (this.remotePlayers) {
                for (let peerId in this.remotePlayers) {
                    const skipId = this.isHost ? 'host' : Network.id;
                    if (peerId !== skipId) {
                        const rp = this.remotePlayers[peerId];
                        this.lighting.addLight(
                            rp.x + 12, 
                            rp.y + 12, 
                            LIGHT_SETTINGS.radius, 
                            'rgba(200, 230, 255, 0.4)', 
                            true, // Também geram sombras e iluminam o mapa do outro
                            2.0
                        );
                    }
                }
            }"""
    
    game = game.replace(old_enemy_lights, new_enemy_lights)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)


if __name__ == '__main__':
    fix_remote_lights()

import re

def add_debug_text():
    with open('src/lighting.ts', 'r', encoding='utf-8') as f:
        light = f.read()

    # Find where it renders to the game context
    old_render = """        // Renderiza no jogo
        gameCtx.save();"""
    
    new_render = """        // Renderiza no jogo
        gameCtx.save();
        
        // DEBUG TEXT ON CLIENT
        gameCtx.fillStyle = 'lime';
        gameCtx.font = '20px Arial';
        gameCtx.fillText("Lights: " + this.lights.length, 100, 100);
        gameCtx.fillText("CachedRays: " + this.cachedRays.length, 100, 130);
        if (this.lights.length > 0) {
            gameCtx.fillText("P1: " + Math.round(this.lights[0].x) + "," + Math.round(this.lights[0].y), 100, 160);
        }
        """
    
    light = light.replace(old_render, new_render)

    with open('src/lighting.ts', 'w', encoding='utf-8') as f:
        f.write(light)

if __name__ == '__main__':
    add_debug_text()

import re

def draw_red_polygon():
    with open('src/lighting.ts', 'r', encoding='utf-8') as f:
        light = f.read()

    old_fill = """                this.ctx.fillStyle = g;
                this.ctx.fill();
            } else {"""
    
    new_fill = """                this.ctx.fillStyle = g;
                this.ctx.fill();
                
                // DEBUG: Draw red outline of the polygon so we can see exactly where it is!
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {"""

    light = light.replace(old_fill, new_fill)

    with open('src/lighting.ts', 'w', encoding='utf-8') as f:
        f.write(light)

if __name__ == '__main__':
    draw_red_polygon()

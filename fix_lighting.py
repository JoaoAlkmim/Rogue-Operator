import re

def fix_lighting_and_crash():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix crash on barrel explosion
    if "this.createExplosion(" in content:
        content = content.replace("this.createExplosion(", "createExplosion(this, ")

    # 2. Fix ParticleSystem lighting iteration
    # Replace `this.particles.forEach(p => {` in draw()
    # It might appear twice, let's just replace all
    content = content.replace("this.particles.forEach(p => {", "ParticleSystem.pool.forEach(p => { if (p.life <= 0) return;")

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    fix_lighting_and_crash()

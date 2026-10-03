import re

def process_entities():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add init method to Particle class
    constructor_pattern = r'constructor\(x,\s*y,\s*type,\s*ivx\s*=\s*0,\s*ivy\s*=\s*0,\s*props\s*=\s*\{\}\)\s*\{'
    replacement = r'''constructor(x, y, type, ivx = 0, ivy = 0, props = {}) {
        this.init(x, y, type, ivx, ivy, props);
    }
    init(x, y, type, ivx = 0, ivy = 0, props = {}) {'''
    content = re.sub(constructor_pattern, replacement, content)

    # 2. Add ParticleSystem at the end of file
    particle_system_code = '''
export const ParticleSystem = {
    pool: [],
    spawn(x, y, type, ivx = 0, ivy = 0, props = {}) {
        let p = this.pool.find(p => p.life <= 0);
        if (!p) {
            p = new Particle(x, y, type, ivx, ivy, props);
            this.pool.push(p);
        } else {
            p.init(x, y, type, ivx, ivy, props);
        }
        return p;
    },
    update(dt, decalCtx) {
        for(let i=0; i<this.pool.length; i++) {
            if (this.pool[i].life > 0) this.pool[i].update(dt, decalCtx);
        }
    },
    drawType(ctx, cam, ...types) {
        for(let i=0; i<this.pool.length; i++) {
            if (this.pool[i].life > 0 && types.includes(this.pool[i].type)) this.pool[i].draw(ctx, cam);
        }
    },
    drawExclude(ctx, cam, ...types) {
        for(let i=0; i<this.pool.length; i++) {
            if (this.pool[i].life > 0 && !types.includes(this.pool[i].type)) this.pool[i].draw(ctx, cam);
        }
    },
    countType(type) {
        let c = 0;
        for(let i=0; i<this.pool.length; i++) if (this.pool[i].life > 0 && this.pool[i].type === type) c++;
        return c;
    },
    clear() {
        this.pool.forEach(p => p.life = 0);
    }
};
'''
    if 'ParticleSystem =' not in content:
        content += particle_system_code

    # 3. Replace game.particles.push(new Particle(...)) with ParticleSystem.spawn(...)
    content = re.sub(r'game\.particles\.push\(new Particle\((.*?)\)\);', r'ParticleSystem.spawn(\1);', content)
    content = re.sub(r'const p = new Particle\((.*?)\);', r'const p = ParticleSystem.spawn(\1);', content)
    
    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(content)


def process_game():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace("import { Player, Enemy, Particle, FloatingText, Tree, DustSystem } from './entities.js';", "import { Player, Enemy, Particle, FloatingText, Tree, DustSystem, ParticleSystem } from './entities.js';")
    content = content.replace("import { Player, Enemy, Particle, FloatingText, Tree, DustSystem } from './entities.ts';", "import { Player, Enemy, Particle, FloatingText, Tree, DustSystem, ParticleSystem } from './entities.ts';")

    # Change all pushing to ParticleSystem.spawn
    content = re.sub(r'this\.particles\.push\(new Particle\((.*?)\)\);', r'ParticleSystem.spawn(\1);', content)
    content = re.sub(r'game\.particles\.push\(new Particle\((.*?)\)\);', r'ParticleSystem.spawn(\1);', content)
    content = re.sub(r'const part = new Particle\((.*?)\); part\.life = 0\.1;', r'const part = ParticleSystem.spawn(\1); part.life = 0.1;', content)
    content = re.sub(r'const dust = new Particle\((.*?)\); dust\.life = (.*?); dust\.size = (.*?);', r'const dust = ParticleSystem.spawn(\1); dust.life = \2; dust.size = \3;', content)
    content = re.sub(r'const decal = new Particle\((.*?)\); this\.particles\.push\(decal\);', r'ParticleSystem.spawn(\1);', content)
    content = re.sub(r'const p = new Particle\((.*?)\); p\.life = 10;', r'const p = ParticleSystem.spawn(\1); p.life = 10;', content)

    # Eliminate `this.particles.push(...)` if anything remains
    content = re.sub(r'this\.particles\.push\(part\);', r'', content)
    content = re.sub(r'this\.particles\.push\(dust\);', r'', content)
    content = re.sub(r'this\.particles\.push\(p\);', r'', content)

    # Change updates and filtering
    content = content.replace('this.particles.forEach(pt => pt.update(dt, this.map.decalCtx));', 'ParticleSystem.update(dt, this.map.decalCtx);')
    content = content.replace('this.particles = this.particles.filter(pt => pt.life > 0);', '')
    content = content.replace('this.particles = this.particles.filter(p => p.life > 0);', '')

    # Change counts
    content = content.replace("const fogCount = this.particles.filter(p => p.type === 'fog').length;", "const fogCount = ParticleSystem.countType('fog');")

    # Change draw
    content = content.replace("this.particles.filter(p => p.type === 'blood').forEach(p => p.draw(this.ctx, this.cam));", "ParticleSystem.drawType(this.ctx, this.cam, 'blood');")
    content = content.replace("this.particles.filter(p => p.type === 'fog').forEach(p => p.draw(this.ctx, this.cam));", "ParticleSystem.drawType(this.ctx, this.cam, 'fog');")
    content = content.replace("this.particles.filter(p => p.type !== 'blood' && p.type !== 'fog').forEach(p => p.draw(this.ctx, this.cam));", "ParticleSystem.drawExclude(this.ctx, this.cam, 'blood', 'fog');")

    # Clear in init
    content = content.replace("this.particles = [];", "ParticleSystem.clear();")

    # We might have left over this.particles... in some places
    
    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    process_entities()
    process_game()

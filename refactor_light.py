import re

def modify_lighting():
    with open('src/lighting.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # Add worker import
    import_str = "import { SCREEN, TILE_SIZE } from './constants.js';\nimport RaycastWorker from './raycastWorker.ts?worker';\n"
    content = content.replace("import { SCREEN, TILE_SIZE } from './constants.js';", import_str)

    # Modify constructor
    cons_old = "this.lights = []; \n    }"
    cons_new = """this.lights = []; 
        this.worker = new RaycastWorker();
        this.worker.onmessage = (e) => {
            this.cachedRays = e.data.results;
            this.isComputing = false;
        };
        this.cachedRays = [];
        this.isComputing = false;
    }"""
    content = content.replace(cons_old, cons_new)

    # In render(), trigger worker before drawing
    render_old = "    render(gameCtx, map, cam, ambientLight = 0.95) {\n        // Prepara o canvas"
    render_new = """    render(gameCtx, map, cam, ambientLight = 0.95) {
        if (!this.isComputing) {
            this.isComputing = true;
            const lightsToCompute = this.lights.filter(l => l.castShadows).map((l, i) => ({ id: i, x: l.x, y: l.y, radius: l.radius }));
            if (lightsToCompute.length > 0) {
                this.worker.postMessage({ id: 0, lights: lightsToCompute, mapGrid: map.grid });
            } else {
                this.isComputing = false;
            }
        }
        // Prepara o canvas"""
    content = content.replace(render_old, render_new)

    # In render(), use cachedRays instead of castRaysDDA
    cast_old = "const points = this.castRaysDDA(l.x, l.y, finalRadius, map);"
    # We need to map the light index to the cachedRays id.
    # Since we filter `castShadows`, we need to know the index.
    # It's better to just replace the whole Ponto (Círculo) block.
    
    # Let's replace castRaysDDA logic directly
    # Wait, the `l` is from `this.lights.forEach((l, idx) => { ... })`
    content = content.replace("this.lights.forEach(l => {", "this.lights.forEach((l, idx) => {")
    
    cast_new = """let points = [];
                let cached = this.cachedRays.find(cr => cr.id === idx);
                if (cached) {
                    for(let i=0; i<cached.points.length; i+=2) {
                        points.push({ x: cached.points[i], y: cached.points[i+1] });
                    }
                } else {
                    points = this.castRaysDDA(l.x, l.y, finalRadius, map); // Fallback no primeiro frame
                }"""
    content = content.replace(cast_old, cast_new)

    with open('src/lighting.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    modify_lighting()

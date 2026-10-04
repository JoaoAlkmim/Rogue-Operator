import re

def fix_raycaster_id_bug():
    with open('src/lighting.ts', 'r', encoding='utf-8') as f:
        light = f.read()

    # --- 1. Fix lightsToCompute id mapping ---
    old_lights_to_compute = """        if (!this.isComputing) {
            this.isComputing = true;
            const lightsToCompute = this.lights.filter(l => l.castShadows).map((l, i) => ({ id: i, x: l.x, y: l.y, radius: l.radius }));
            if (lightsToCompute.length > 0) {"""
    
    new_lights_to_compute = """        if (!this.isComputing || (performance.now() - (this.lastComputeTime || 0) > 100)) {
            this.isComputing = true;
            this.lastComputeTime = performance.now();
            
            // Corrige o ID: mantemos o indice original (idx) para bater com a array this.lights
            const lightsToCompute = this.lights
                .map((l, i) => ({ id: i, x: l.x, y: l.y, radius: l.radius, castShadows: l.castShadows }))
                .filter(l => l.castShadows);
                
            if (lightsToCompute.length > 0) {"""
    
    light = light.replace(old_lights_to_compute, new_lights_to_compute)

    with open('src/lighting.ts', 'w', encoding='utf-8') as f:
        f.write(light)

    # --- 2. Add safe try/catch to RaycastWorker ---
    with open('src/raycastWorker.ts', 'r', encoding='utf-8') as f:
        worker = f.read()

    old_worker_start = """self.onmessage = (e) => {
    const { id, lights, mapGrid } = e.data;
    
    const rayCount = 240;"""
    
    new_worker_start = """self.onmessage = (e) => {
    try {
        const { id, lights, mapGrid } = e.data;
        
        const rayCount = 240;"""
    
    old_worker_end = """    // Send the array buffers back
    const buffers = results.map(r => r.points.buffer);
    self.postMessage({ id, results }, buffers);
};"""

    new_worker_end = """    // Send the array buffers back
        const buffers = results.map(r => r.points.buffer);
        self.postMessage({ id, results }, buffers);
    } catch (err) {
        self.postMessage({ id: e.data.id, results: [] });
    }
};"""

    worker = worker.replace(old_worker_start, new_worker_start).replace(old_worker_end, new_worker_end)

    with open('src/raycastWorker.ts', 'w', encoding='utf-8') as f:
        f.write(worker)

if __name__ == '__main__':
    fix_raycaster_id_bug()

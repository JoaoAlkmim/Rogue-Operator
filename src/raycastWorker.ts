import { TILE_SIZE } from './constants.js';

self.onmessage = (e) => {
    try {
        const { id, lights, mapGrid } = e.data;
        
        const rayCount = 240; 
    const angleStep = (Math.PI * 2) / rayCount;

    const results = [];

    for (let l = 0; l < lights.length; l++) {
        const { x: ox, y: oy, radius } = lights[l];
        const points = new Float32Array(rayCount * 2);

        for (let i = 0; i < rayCount; i++) {
            const angle = i * angleStep;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const dx = (cos === 0) ? 0.00001 : cos;
            const dy = (sin === 0) ? 0.00001 : sin;

            let mapX = Math.floor(ox / TILE_SIZE);
            let mapY = Math.floor(oy / TILE_SIZE);

            const deltaDistX = Math.abs(1 / dx);
            const deltaDistY = Math.abs(1 / dy);

            let stepX, stepY, sideDistX, sideDistY;

            if (dx < 0) {
                stepX = -1;
                sideDistX = (ox / TILE_SIZE - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1.0 - ox / TILE_SIZE) * deltaDistX;
            }

            if (dy < 0) {
                stepY = -1;
                sideDistY = (oy / TILE_SIZE - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1.0 - oy / TILE_SIZE) * deltaDistY;
            }

            let hit = false;
            let side = 0;
            const maxTiles = Math.ceil(radius / TILE_SIZE) + 2;
            let steps = 0;

            while (!hit && steps < maxTiles) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }

                if (mapGrid[mapY] && mapGrid[mapY][mapX] !== undefined) {
                    const tile = mapGrid[mapY][mapX];
                    if (tile === 1 || tile === 2) {
                        hit = true;
                    }
                }
                steps++;
            }

            let perpWallDist;
            if (side === 0) {
                perpWallDist = (mapX - ox / TILE_SIZE + (1 - stepX) / 2) / dx;
            } else {
                perpWallDist = (mapY - oy / TILE_SIZE + (1 - stepY) / 2) / dy;
            }

            const dist = Math.min(perpWallDist * TILE_SIZE, radius);
            points[i * 2] = ox + dx * dist;
            points[i * 2 + 1] = oy + dy * dist;
        }
        
        results.push({ id: lights[l].id, points });
    }

    // Send the array buffers back
        const buffers = results.map(r => r.points.buffer);
        self.postMessage({ id, results }, buffers);
    } catch (err) {
        self.postMessage({ id: e.data.id, results: [] });
    }
};

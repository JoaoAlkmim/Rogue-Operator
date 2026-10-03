/**
 * lighting.js
 * Sistema de Iluminação Volumétrica
 * Algoritmo: DDA (Digital Differential Analyzer) para precisão sub-pixel.
 */
import { SCREEN, TILE_SIZE } from './constants.js';
import RaycastWorker from './raycastWorker.ts?worker';


export class LightingSystem {
    constructor(w, h) {
        // Canvas dedicado para a luz
        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = w;
        this.lightCanvas.height = h;
        this.ctx = this.lightCanvas.getContext('2d', { alpha: true });
        
        // Mantemos escala 1:1 para nitidez máxima nas bordas
        this.scale = 1.0; 
        
        this.lights = []; 
        this.worker = new RaycastWorker();
        this.worker.onmessage = (e) => {
            this.cachedRays = e.data.results;
            this.isComputing = false;
        };
        this.cachedRays = [];
        this.isComputing = false;
    }

    resize(w, h) {
        this.lightCanvas.width = w;
        this.lightCanvas.height = h;
    }

    // luz para beams e godrays
    addBeam(x, y, angle, length, width, color, flicker = 0) {
        this.lights.push({ type: 'beam', x, y, angle, length, width, color, flicker });
    }

    // luz circular padrão
    addLight(x, y, radius, color, castShadows = false, flicker = 0) {
        this.lights.push({ type: 'point', x, y, radius, color, castShadows, flicker });
    }

    /**
     * DDA Raycasting:
     * Calcula a interseção EXATA com as linhas da grade.
     * Isso elimina o efeito "serrilhado" (jitter) em paredes retas.
     */
    castRaysDDA(ox, oy, radius, map) {
        const points = [];
        // 240 raios é um bom equilíbrio. Se ainda notar curvas em paredes longas, suba para 360.
        const rayCount = 240; 
        const angleStep = (Math.PI * 2) / rayCount;

        for (let i = 0; i < rayCount; i++) {
            const angle = i * angleStep;
            
            // --- INÍCIO DO ALGORITMO DDA ---
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Evita divisão por zero
            const dx = (cos === 0) ? 0.00001 : cos;
            const dy = (sin === 0) ? 0.00001 : sin;

            // Em qual quadrado da grade estamos?
            let mapX = Math.floor(ox / TILE_SIZE);
            let mapY = Math.floor(oy / TILE_SIZE);

            // Distância que o raio tem que viajar para cruzar 1 unidade de X ou Y
            // (Teorema de Pitágoras derivado para DDA)
            const deltaDistX = Math.abs(1 / dx);
            const deltaDistY = Math.abs(1 / dy);

            let stepX, stepY;
            let sideDistX, sideDistY;

            // Configura a direção do passo e a distância inicial até a primeira borda
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
            let side = 0; // 0 para hit em X (parede vertical), 1 para hit em Y (parede horizontal)
            
            // Avança o raio pela grade
            // O raio máximo em "tiles" (para evitar loop infinito)
            const maxTiles = Math.ceil(radius / TILE_SIZE) + 2;
            let steps = 0;

            while (!hit && steps < maxTiles) {
                // Pula para o próximo quadrado mais próximo (X ou Y)
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }

                // Checa colisão
                if (map.grid[mapY] && map.grid[mapY][mapX] !== undefined) {
                    const tile = map.grid[mapY][mapX];
                    // Se for parede (1) ou caixa (2)
                    if (tile === 1 || tile === 2) {
                        hit = true;
                    }
                }
                steps++;
            }

            // Calcula a distância real projetada até o ponto de impacto
            let perpWallDist;
            if (side === 0) {
                perpWallDist = (mapX - ox / TILE_SIZE + (1 - stepX) / 2) / dx;
            } else {
                perpWallDist = (mapY - oy / TILE_SIZE + (1 - stepY) / 2) / dy;
            }

            // Converte de "distância normalizada" para pixels reais
            // Importante: Limitamos ao raio da luz para não desenhar sombras infinitas
            const dist = Math.min(perpWallDist * TILE_SIZE, radius);

            // Ponto final exato
            points.push({
                x: ox + dx * dist,
                y: oy + dy * dist
            });
        }
        return points;
    }

    render(gameCtx, map, cam, ambientLight = 0.95) {
        if (!this.isComputing) {
            this.isComputing = true;
            const lightsToCompute = this.lights.filter(l => l.castShadows).map((l, i) => ({ id: i, x: l.x, y: l.y, radius: l.radius }));
            if (lightsToCompute.length > 0) {
                this.worker.postMessage({ id: 0, lights: lightsToCompute, mapGrid: map.grid });
            } else {
                this.isComputing = false;
            }
        }
        // Prepara o canvas
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
        
        // Fundo (Escuridão)
        //this.ctx.fillStyle = `rgba(8, 12, 20, ${ambientLight})`; // SOMBRA PRETA
        //this.ctx.fillStyle = `rgba(15, 20, 45, ${ambientLight})`; // SOMBRA PRETO AZULADA 
        //this.ctx.fillStyle = `rgba(10, 20, 40, ${ambientLight})`; // SOMBRA AZUL MARINHO
        //this.ctx.fillStyle = `rgba(10, 10, 50, ${ambientLight})`; // SOMBRA AZUL NEON ESCURO
        //this.ctx.fillStyle = `rgba(10, 20, 10, ${ambientLight})`; // SOMBRA VERDE ESCURO
        //this.ctx.fillStyle = `rgba(20, 10, 30, ${ambientLight})`; // SOMBRA ROXA HOTLINE
        this.ctx.fillStyle = `rgba(30, 10, 30, ${ambientLight})`; // SOMBRA AVERMELHADA MIAMI

        this.ctx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
        
        // Ajusta para a câmera
        this.ctx.translate(-cam.renderX, -cam.renderY);







        // --- PASS 1: RECORTE DA ESCURIDÃO (Destination-Out) ---
    this.ctx.globalCompositeOperation = 'destination-out';

    this.lights.forEach((l, idx) => {
        const flickerVal = Math.random() * l.flicker;
        
        if (l.type === 'point') {
            // Lógica antiga de Ponto (Círculo)
            const finalRadius = l.radius + flickerVal;
            
            if (l.castShadows) {
                let points = [];
                let cached = this.cachedRays.find(cr => cr.id === idx);
                if (cached) {
                    for(let i=0; i<cached.points.length; i+=2) {
                        points.push({ x: cached.points[i], y: cached.points[i+1] });
                    }
                } else {
                    points = this.castRaysDDA(l.x, l.y, finalRadius, map); // Fallback no primeiro frame
                }
                this.ctx.beginPath();
                if(points.length > 0) {
                    this.ctx.moveTo(points[0].x, points[0].y);
                    for(let i=1; i<points.length; i++) this.ctx.lineTo(points[i].x, points[i].y);
                }
                this.ctx.closePath();
                const g = this.ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, finalRadius);
                g.addColorStop(0, 'rgba(0,0,0,1)');
                g.addColorStop(0.9, 'rgba(0,0,0,1)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                this.ctx.fillStyle = g;
                this.ctx.fill();
            } else {
                const g = this.ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, finalRadius);
                g.addColorStop(0, 'rgba(0,0,0,1)');
                g.addColorStop(1, 'rgba(0,0,0,0)');
                this.ctx.fillStyle = g;
                this.ctx.beginPath(); this.ctx.arc(l.x, l.y, finalRadius, 0, Math.PI*2); this.ctx.fill();
            }
        } 
        else if (l.type === 'beam') {
            // NOVA LÓGICA DE FEIXE (BEAM)
            // Desenha um trapézio suave para simular luz volumétrica
            const finalLen = l.length + flickerVal * 2;
            const halfW = l.width / 2;
            
            this.ctx.save();
            this.ctx.translate(l.x, l.y);
            this.ctx.rotate(l.angle);
            
            // Gradiente Linear (Começa forte, termina transparente)
            const g = this.ctx.createLinearGradient(0, 0, finalLen, 0);
            g.addColorStop(0, 'rgba(0,0,0,0.8)'); // Início não totalmente transparente
            g.addColorStop(1, 'rgba(0,0,0,0)');
            
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -halfW * 0.2); // Começa fino
            this.ctx.lineTo(finalLen, -halfW); // Abre o leque
            this.ctx.lineTo(finalLen, halfW);
            this.ctx.moveTo(0, halfW * 0.2);
            this.ctx.fill();
            this.ctx.restore();
        }
    });

    // --- PASS 2: COR E BRILHO (Lighter) ---
    this.ctx.globalCompositeOperation = 'lighter';
    
    this.lights.forEach((l, idx) => {
        if (!l.color) return;
        const flickerVal = Math.random() * l.flicker;

        if (l.type === 'point') {
            const finalRadius = l.radius + flickerVal;
            const g = this.ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, finalRadius);
            g.addColorStop(0, l.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = g;
            this.ctx.beginPath(); this.ctx.arc(l.x, l.y, finalRadius, 0, Math.PI*2); this.ctx.fill();
        }
        else if (l.type === 'beam') {
            // Desenha a cor do feixe
            const finalLen = l.length + flickerVal * 2;
            const halfW = l.width / 2;
            
            this.ctx.save();
            this.ctx.translate(l.x, l.y);
            this.ctx.rotate(l.angle);
            
            const g = this.ctx.createLinearGradient(0, 0, finalLen, 0);
            g.addColorStop(0, l.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            
            this.ctx.fillStyle = g;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -halfW * 0.2);
            this.ctx.lineTo(finalLen, -halfW);
            this.ctx.lineTo(finalLen, halfW);
            this.ctx.moveTo(0, halfW * 0.2);
            this.ctx.fill();
            this.ctx.restore();
        }
    });

    this.ctx.restore();

        // Renderiza no jogo
        gameCtx.save();
        
        // Aplica a sombra (Multiplicação)
        gameCtx.globalCompositeOperation = 'multiply';
        gameCtx.drawImage(this.lightCanvas, 0, 0);
        
        // Bloom (Brilho extra onde tem luz)
        gameCtx.globalCompositeOperation = 'screen';
        gameCtx.globalAlpha = 0.3; // Bloom suave
        gameCtx.drawImage(this.lightCanvas, 0, 0);
        
        // Vignette Tática
        gameCtx.globalCompositeOperation = 'source-over';
        gameCtx.globalAlpha = 1.0;
        const gVig = gameCtx.createRadialGradient(
            SCREEN.w/2, SCREEN.h/2, SCREEN.h*0.4, 
            SCREEN.w/2, SCREEN.h/2, SCREEN.h*0.85
        );
        gVig.addColorStop(0, 'rgba(0,0,0,0)');
        gVig.addColorStop(1, 'rgba(0,0,0,0.6)');
        gameCtx.fillStyle = gVig;
        gameCtx.fillRect(0, 0, SCREEN.w, SCREEN.h);

        gameCtx.restore();
        
        // Limpa para o próximo frame
        this.lights = [];
    }
}
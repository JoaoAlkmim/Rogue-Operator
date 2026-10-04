/**
 * game.js
 * ---------------------------------------------------------------------
 * Núcleo do jogo: Lógica, Loop Principal, Renderização e Sistemas.
 * VERSÃO AAA: Integração com LightingSystem (Luzes Dinâmicas) e SpatialHash.
 * ---------------------------------------------------------------------
 */

import { TILE_SIZE, COLORS, M, PERKS, WEAPONS, SCREEN, Assets, LIGHT_SETTINGS, TEXTURE_VARIATIONS } from './constants.js';
import { Player, Enemy, Particle, FloatingText, Tree, DustSystem, ParticleSystem } from './entities.js';
import { UI, Meta } from './ui.js';
import { SpatialHash } from './physics.js';
import { Network } from './network.js';
import { LightingSystem } from './lighting.js'; // NOVO: Importa o sistema de luz volumétrica

// =============================================================================
// UTILITÁRIOS VISUAIS E DE SISTEMA
// =============================================================================

/**
 * Injeta um filtro SVG no DOM para criar o efeito de Aberração Cromática (Glitch).
 */
function injectSVGFilter() {
    const svg = `
    <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="chromatic-aberration">
          <feColorMatrix type="matrix" result="red_" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
          <feOffset in="red_" dx="4" dy="0" result="red"/>
          <feColorMatrix type="matrix" result="blue_" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
          <feOffset in="blue_" dx="-4" dy="0" result="blue"/>
          <feColorMatrix type="matrix" result="green_" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
          <feBlend mode="screen" in="red" in2="blue" result="main"/>
          <feBlend mode="screen" in="main" in2="green_" result="final"/>
        </filter>
      </defs>
    </svg>`;
    document.body.insertAdjacentHTML('beforeend', svg);
}

// =============================================================================
// SISTEMA DE ÁUDIO (Web Audio API)
// =============================================================================

export const AudioSys = {
    ctx: null,
    masterGain: null,
    bgmSource: null,
    bgmGain: null,
    bgmFilter: null,
    isBgmPlaying: false,
    currentVolume: 0.6,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.currentVolume;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.isBgmPlaying && Assets.sounds['bgm']) {
            this.playBGM('bgm');
        }
    },

    setMasterVolume(val) {
        this.currentVolume = val;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(val, this.ctx.currentTime);
        }
    },

    playSpatial(key, x, y, game) {
        if (!this.ctx || !Assets.sounds[key]) return;

        const source = this.ctx.createBufferSource();
        source.buffer = Assets.sounds[key];

        const camCenterX = game.cam.renderX + (SCREEN.w / 2);
        const camCenterY = game.cam.renderY + (SCREEN.h / 2);

        const dx = x - camCenterX;
        const dy = y - camCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const panValue = Math.max(-1, Math.min(1, dx / (SCREEN.w / 2)));
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = panValue;

        const gain = this.ctx.createGain();
        let vol = 1.0 - (dist / 1000); 
        vol = Math.max(0, vol * 0.5); 
        gain.gain.value = vol;

        source.connect(panner);
        panner.connect(gain);
        gain.connect(this.masterGain);

        source.playbackRate.value = 0.95 + Math.random() * 0.1;
        source.start(0);
    },

    playBuffer(key, vol = 0.3) {
        if (!this.ctx || !Assets.sounds[key]) return;
        const source = this.ctx.createBufferSource();
        source.buffer = Assets.sounds[key];
        const gain = this.ctx.createGain();
        gain.gain.value = vol;

        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(0);
    },

    playBGM(key) {
        if (!this.ctx || !Assets.sounds[key]) return;
        if (this.isBgmPlaying) return;

        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = Assets.sounds[key];
        this.bgmSource.loop = true;

        this.bgmFilter = this.ctx.createBiquadFilter();
        this.bgmFilter.type = 'lowpass';
        this.bgmFilter.frequency.value = 22000;

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = 1.0;

        this.bgmSource.connect(this.bgmFilter);
        this.bgmFilter.connect(this.bgmGain);
        this.bgmGain.connect(this.masterGain);

        this.bgmSource.start(0);
        this.isBgmPlaying = true;
    },

    setMusicMode(mode) {
        if (!this.ctx || !this.bgmFilter || !this.bgmGain) return;
        const now = this.ctx.currentTime;
        const time = 0.5;

        if (mode === 'muffled') {
            this.bgmFilter.frequency.exponentialRampToValueAtTime(600, now + time);
            this.bgmGain.gain.linearRampToValueAtTime(0.5, now + time);
        } else {
            this.bgmFilter.frequency.exponentialRampToValueAtTime(22000, now + time);
            this.bgmGain.gain.linearRampToValueAtTime(1.0, now + time);
        }
    },

    playTone(freq, type, dur) {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

        o.connect(g);
        g.connect(this.masterGain);
        o.start();
        o.stop(this.ctx.currentTime + dur);
    },

    sfx: {
        shoot: (weaponId) => {
            AudioSys.init();
            if (Assets.sounds && Assets.sounds[weaponId]) {
                AudioSys.playBuffer(weaponId, 0.4);
            } else {
                if (weaponId === 'crossbow') {
                    AudioSys.playTone(600, 'triangle', 0.05);
                    setTimeout(() => AudioSys.playTone(100, 'sawtooth', 0.1), 50); 
                } else {
                    AudioSys.playTone(150, 'square', 0.1);
                }
            }
        },
        reload: () => {
            AudioSys.init();
            if (Assets.sounds && Assets.sounds['reload']) AudioSys.playBuffer('reload', 0.5);
            else {
                AudioSys.playTone(600, 'sine', 0.1);
                setTimeout(() => AudioSys.playTone(800, 'sine', 0.1), 150);
            }
        },
        hit: () => { AudioSys.init(); AudioSys.playTone(100, 'sawtooth', 0.1); },
        click: () => { AudioSys.init(); AudioSys.playTone(800, 'triangle', 0.05); },
        shell: () => { AudioSys.init(); setTimeout(() => AudioSys.playTone(1200, 'square', 0.05), Math.random() * 300 + 200); },
        explode: (x, y, game) => { 
            AudioSys.init();
            if (x !== undefined && game) {
                AudioSys.playSpatial('explode', x, y, game);
            } else {
                AudioSys.playTone(50, 'sawtooth', 0.3); 
            }
        }
    }
};

// =============================================================================
// INPUT HANDLER & DEV CONSOLE
// =============================================================================

export const Input = { 
    keys: {}, mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false, wasRT: false,
    updateGamepad(screenW, screenH) {
        if (!navigator.getGamepads) return;
        const pads = navigator.getGamepads();
        if (!pads || !pads[0]) return;
        
        const pad = pads[0];
        
        // Analogico Esquerdo (WASD)
        const lx = pad.axes[0];
        const ly = pad.axes[1];
        const deadzone = 0.2;
        
        this.keys['a'] = lx < -deadzone;
        this.keys['d'] = lx > deadzone;
        this.keys['w'] = ly < -deadzone;
        this.keys['s'] = ly > deadzone;
        
        // Analogico Direito (Mira)
        const rx = pad.axes[2];
        const ry = pad.axes[3];
        if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
            // Emula o mouse ao redor do centro da tela (onde a camera esta)
            this.mouseX = (screenW / 2) + rx * 250;
            this.mouseY = (screenH / 2) + ry * 250;
        }
        
        // Gatilho RT ou Botao R1 para atirar
        if (pad.buttons[7].pressed || pad.buttons[5].pressed) {
            if (!this.wasRT) this.mouseClicked = true;
            else this.mouseClicked = false;
            this.mouseDown = true;
            this.wasRT = true;
        } else {
            this.mouseDown = false;
            this.wasRT = false;
        }
        
        // Dash no LT (6) ou A (0)
        this.keys[' '] = pad.buttons[6].pressed || pad.buttons[0].pressed;
        
        // Recarregar no X (2)
        this.keys['r'] = pad.buttons[2].pressed;
    }
};

const DevConsole = {
    active: false,
    el: null,
    input: null,

    init() {
        this.el = document.getElementById('dev-console');
        this.input = document.getElementById('console-input');
        
        window.addEventListener('keydown', (e) => {
            if (e.key === "'" || e.key === '"') {
                e.preventDefault();
                this.toggle();
            }
            
            if (this.active && e.key === 'Enter') {
                this.processCommand();
            }
        });
    },

    toggle() {
        this.active = !this.active;
        this.el.style.display = this.active ? 'flex' : 'none';
        
        if (this.active) {
            this.input.value = '';
            this.input.focus();
            Input.keys = {}; 
            Input.mouseDown = false;
        } else {
            this.input.blur();
        }
    },

    processCommand() {
        const raw = this.input.value.trim();
        this.toggle();
        
        if (!raw) return;

        const parts = raw.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (cmd === 'admin:money') {
            const val = parseInt(args[0]);
            if (!isNaN(val)) {
                Meta.data.money += val;
                Meta.save();
                UI.updateMoney(Meta.data.money);
                const hudMoney = document.getElementById('meta-money-hud');
                if(hudMoney) hudMoney.innerText = Math.floor(Meta.data.money);
                
                UI.log(`ADMIN: ADDED $${val}`);
            }
        }
        else {
            UI.log(`UNKNOWN COMMAND: ${cmd}`);
        }
    }
};

window.addEventListener('keydown', e => {
    if (DevConsole.active) return;
    Input.keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', e => {
    if (DevConsole.active) return;
    Input.keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', e => { 
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const canvasRatio = canvas.width / canvas.height;
        const rectRatio = rect.width / rect.height;
        
        let renderW = rect.width;
        let renderH = rect.height;
        let offsetX = 0;
        let offsetY = 0;
        
        // Compensates for object-fit: contain black bars
        if (canvasRatio > rectRatio) {
            renderH = rect.width / canvasRatio;
            offsetY = (rect.height - renderH) / 2;
        } else {
            renderW = rect.height * canvasRatio;
            offsetX = (rect.width - renderW) / 2;
        }
        
        const renderLeft = rect.left + offsetX;
        const renderTop = rect.top + offsetY;
        
        const scaleX = canvas.width / renderW;
        const scaleY = canvas.height / renderH;
        
        Input.mouseX = (e.clientX - renderLeft) * scaleX; 
        Input.mouseY = (e.clientY - renderTop) * scaleY; 
    } else {
        Input.mouseX = e.clientX; 
        Input.mouseY = e.clientY; 
    }
});

window.addEventListener('mousedown', (e) => {
    if (DevConsole.active) return;
    if (e.target.id === 'gameCanvas') {
        Input.mouseDown = true;
        Input.mouseClicked = true;
    }
});

window.addEventListener('mouseup', () => Input.mouseDown = false);
window.addEventListener('contextmenu', e => e.preventDefault());

// =============================================================================
// CAMERA SYSTEM
// =============================================================================

class Camera {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.trauma = 0;
        this.recoilX = 0;
        this.recoilY = 0;
        this.zoom = 1.0;
    }

    update(target, dt, input) {
        let tx = target.x + (target.w / 2);
        let ty = target.y + (target.h / 2);

        const mouseDistX = input.mouseX - (SCREEN.w / 2);
        const mouseDistY = input.mouseY - (SCREEN.h / 2);
        const lookFactor = 0.35; 

        tx += mouseDistX * lookFactor;
        ty += mouseDistY * lookFactor;

        tx += this.recoilX;
        ty += this.recoilY;

        tx -= SCREEN.w / 2;
        ty -= SCREEN.h / 2;

        const smoothSpeed = 8;
        this.x += (tx - this.x) * smoothSpeed * dt;
        this.y += (ty - this.y) * smoothSpeed * dt;

        this.trauma = Math.max(0, this.trauma - dt * 2.0);
        const shake = this.trauma * this.trauma; 

        this.shakeX = (Math.random() * 2 - 1) * shake * 20;
        this.shakeY = (Math.random() * 2 - 1) * shake * 20;

        this.recoilX *= 0.90;
        this.recoilY *= 0.90;

        if (Math.abs(this.recoilX) < 0.5) this.recoilX = 0;
        if (Math.abs(this.recoilY) < 0.5) this.recoilY = 0;
    }

    kick(angle, force) {
        this.recoilX += Math.cos(angle + Math.PI) * force;
        this.recoilY += Math.sin(angle + Math.PI) * force;
    }

    addTrauma(amt) {
        this.trauma = Math.min(1.0, this.trauma + amt);
    }

    get renderX() { return Math.floor(this.x + this.shakeX); }
    get renderY() { return Math.floor(this.y + this.shakeY); }
}

// =============================================================================
// MAP SYSTEM
// =============================================================================

class MapSystem {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.grid = [];
        this.rooms = [];
        this.decalCanvas = document.createElement('canvas');
        this.decalCanvas.width = w * TILE_SIZE;
        this.decalCanvas.height = h * TILE_SIZE;
        this.decalCtx = this.decalCanvas.getContext('2d');
        
        // NOTA: O sistema de iluminação antigo (Raycasting CPU) foi removido 
        // e substituído pelo LightingSystem (lightCanvas e lightCtx migrados para lá).

        this.floorTex = null;
        this.wallTex = null;
        this.crateHp = {}; this.barrels = {};

        this.shadowRight = document.createElement('canvas');
        this.shadowRight.width = 12;
        this.shadowRight.height = TILE_SIZE;
        const ctxR = this.shadowRight.getContext('2d');
        const grR = ctxR.createLinearGradient(0, 0, 12, 0);
        grR.addColorStop(0, 'rgba(0,0,0,0.6)'); grR.addColorStop(1, 'rgba(0,0,0,0)');
        ctxR.fillStyle = grR; ctxR.fillRect(0, 0, 12, TILE_SIZE);

        this.shadowBottom = document.createElement('canvas');
        this.shadowBottom.width = TILE_SIZE;
        this.shadowBottom.height = 12;
        const ctxB = this.shadowBottom.getContext('2d');
        const grB = ctxB.createLinearGradient(0, 0, 0, 12);
        grB.addColorStop(0, 'rgba(0,0,0,0.6)'); grB.addColorStop(1, 'rgba(0,0,0,0)');
        ctxB.fillStyle = grB; ctxB.fillRect(0, 0, TILE_SIZE, 12);
    }

    generate() {
        this.grid = new Array(this.h).fill(0).map(() => new Array(this.w).fill(1));
        this.rooms = [];
        this.crateHp = {}; this.barrels = {};
        this.destroyedCratesThisFrame = [];
        this.decalCtx.clearRect(0, 0, this.decalCanvas.width, this.decalCanvas.height);

        const roomCount = M.randInt(8, 14);
        for (let i = 0; i < roomCount; i++) {
            const w = M.randInt(4, 10), h = M.randInt(4, 10);
            const x = M.randInt(2, this.w - w - 2), y = M.randInt(2, this.h - h - 2);

            let overlap = false;
            for (let r of this.rooms) {
                if (M.checkRect({ x: x - 1, y: y - 1, w: w + 2, h: h + 2 }, r)) overlap = true;
            }

            if (!overlap) {
                this.rooms.push({ x, y, w, h, center: { x: x + w / 2, y: y + h / 2 } });
                for (let ry = y; ry < y + h; ry++) {
                    for (let rx = x; rx < x + w; rx++) this.grid[ry][rx] = 0;
                }
                if (Math.random() > 0.3) this.addCrates({ x, y, w, h });
            }
        }

        this.rooms.sort((a, b) => a.center.x - b.center.x);
        for (let i = 0; i < this.rooms.length - 1; i++) {
            const p1 = this.rooms[i].center, p2 = this.rooms[i + 1].center;
            this.carve(p1.x, p2.x, p1.y, true);
            this.carve(p1.y, p2.y, p2.x, false);
        }

        
        // --- 2.2 GERAÇÃO PROCEDURAL ORGÂNICA (Cellular Automata) ---
        // Passos de suavização para arredondar quinas e criar cavernas
        for (let pass = 0; pass < 3; pass++) {
            const newGrid = this.grid.map(arr => [...arr]); // clone
            for (let y = 1; y < this.h - 1; y++) {
                for (let x = 1; x < this.w - 1; x++) {
                    let wallNeighbors = 0;
                    for (let ny = y - 1; ny <= y + 1; ny++) {
                        for (let nx = x - 1; nx <= x + 1; nx++) {
                            if (ny === y && nx === x) continue;
                            if (this.grid[ny][nx] === 1 || this.grid[ny][nx] === 2) wallNeighbors++;
                        }
                    }
                    // Regras do Automato
                    if (this.grid[y][x] === 1) {
                        newGrid[y][x] = wallNeighbors < 3 ? 0 : 1; // Parede isolada vira chão
                    } else if (this.grid[y][x] === 0) {
                        newGrid[y][x] = wallNeighbors >= 5 ? 1 : 0; // Chão cercado vira parede
                    }
                }
            }
            this.grid = newGrid;
        }
        
        // Garante que o centro das salas sempre será chão limpo (para garantir spawn)
        for (let r of this.rooms) {
            for (let ry = r.center.y - 1; ry <= r.center.y + 1; ry++) {
                for (let rx = r.center.x - 1; rx <= r.center.x + 1; rx++) {
                    if (this.grid[ry] && this.grid[ry][rx] !== undefined) this.grid[ry][rx] = 0;
                }
            }
        }
        
        this.bakeStaticFloor();

        this.decorateFloor();
    }

    bakeStaticFloor() {
        const ctx = this.decalCtx;
        const currentFloorImg = this.floorTex || Assets.floor1;
        const SHADOW_COLOR_START = 'rgba(0,0,0,0.6)', SHADOW_COLOR_END = 'rgba(0,0,0,0)';
        const S_WALL_BIG = 32;

        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (this.grid[y][x] !== 1) {
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;
                    ctx.drawImage(currentFloorImg, px, py, TILE_SIZE, TILE_SIZE);

                    const noise = Math.abs(Math.sin(x * 12.9898 + y * 78.233));
                    ctx.save();
                    ctx.fillStyle = noise > 0.5 ? '#000000' : '#ffffff';
                    ctx.globalAlpha = 0.03 + (noise * 0.04);
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.restore();

                    const nTop = (y > 0) ? this.grid[y - 1][x] : 0;
                    const nLeft = (x > 0) ? this.grid[y][x - 1] : 0;
                    const nTopLeft = (y > 0 && x > 0) ? this.grid[y - 1][x - 1] : 0;

                    let sTop = 0, sLeft = 0;
                    if (nTop === 1) sTop = S_WALL_BIG;
                    if (nLeft === 1) sLeft = S_WALL_BIG;
                    const cornerSize = Math.max(sTop, sLeft);

                    if (sTop > 0) {
                        ctx.save();
                        if (sLeft > 0) {
                            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + TILE_SIZE, py); ctx.lineTo(px + TILE_SIZE, py + sTop); ctx.lineTo(px + cornerSize, py + cornerSize); ctx.closePath(); ctx.clip();
                        }
                        const g = ctx.createLinearGradient(0, py, 0, py + sTop);
                        g.addColorStop(0, SHADOW_COLOR_START); g.addColorStop(1, SHADOW_COLOR_END);
                        ctx.fillStyle = g; ctx.fillRect(px, py, TILE_SIZE, sTop);
                        ctx.restore();
                    }
                    if (sLeft > 0) {
                        ctx.save();
                        if (sTop > 0) {
                            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + TILE_SIZE); ctx.lineTo(px + sLeft, py + TILE_SIZE); ctx.lineTo(px + cornerSize, py + cornerSize); ctx.closePath(); ctx.clip();
                        }
                        const g = ctx.createLinearGradient(px, 0, px + sLeft, 0);
                        g.addColorStop(0, SHADOW_COLOR_START); g.addColorStop(1, SHADOW_COLOR_END);
                        ctx.fillStyle = g; ctx.fillRect(px, py, sLeft, TILE_SIZE);
                        ctx.restore();
                    }
                    if (sTop === 0 && sLeft === 0 && nTopLeft === 1) {
                        let sCorner = S_WALL_BIG;
                        ctx.save();
                        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + sCorner); ctx.lineTo(px + sCorner, py + sCorner); ctx.closePath(); ctx.clip();
                        const gV = ctx.createLinearGradient(0, py, 0, py + sCorner);
                        gV.addColorStop(0, SHADOW_COLOR_START); gV.addColorStop(1, SHADOW_COLOR_END);
                        ctx.fillStyle = gV; ctx.fillRect(px, py, sCorner, sCorner);
                        ctx.restore();

                        ctx.save();
                        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sCorner, py); ctx.lineTo(px + sCorner, py + sCorner); ctx.closePath(); ctx.clip();
                        const gH = ctx.createLinearGradient(px, 0, px + sCorner, 0);
                        gH.addColorStop(0, SHADOW_COLOR_START); gH.addColorStop(1, SHADOW_COLOR_END);
                        ctx.fillStyle = gH; ctx.fillRect(px, py, sCorner, sCorner);
                        ctx.restore();
                    }
                }
            }
        }
    }

    decorateFloor() {
        const ctx = this.decalCtx;
        const iterations = this.w * this.h * 2;
        for (let i = 0; i < iterations; i++) {
            const rx = M.randInt(0, (this.w - 1) * TILE_SIZE);
            const ry = M.randInt(0, (this.h - 1) * TILE_SIZE);
            const tx = Math.floor(rx / TILE_SIZE);
            const ty = Math.floor(ry / TILE_SIZE);

            if (this.grid[ty] && this.grid[ty][tx] !== 1) {
                const type = Math.random();
                if (type > 0.92) {
                    ctx.fillStyle = `rgba(100, 100, 100, ${M.rand(0.2, 0.5)})`;
                    const s = M.rand(1, 3);
                    ctx.fillRect(rx, ry, s, s);
                } else if (type < 0.04) {
                    ctx.strokeStyle = `rgba(0, 0, 0, 0.6)`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + M.rand(-8, 8), ry + M.rand(-8, 8)); ctx.stroke();
                } else if (type > 0.45 && type < 0.48) {
                    ctx.fillStyle = `rgba(40, 30, 20, ${M.rand(0.2, 0.4)})`;
                    const br = M.rand(8, 20);
                    ctx.beginPath();
                    for (let k = 0; k < M.randInt(4, 7); k++) {
                        const cx = rx + Math.cos(Math.random() * Math.PI * 2) * (Math.random() * br * 0.6);
                        const cy = ry + Math.sin(Math.random() * Math.PI * 2) * (Math.random() * br * 0.6);
                        const r = M.rand(br * 0.5, br * 1.0);
                        ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    }
                    ctx.fill();
                }
            }
        }
    }

    destroyBox(tx, ty) {
        if (this.grid[ty][tx] !== 2) return;
        this.grid[ty][tx] = 3;
        if (this.destroyedCratesThisFrame) this.destroyedCratesThisFrame.push({x: tx, y: ty});
        const ctx = this.decalCtx;
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE;

        ctx.save();
        ctx.translate(px, py);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = '#4a3622';
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.translate(M.rand(4, TILE_SIZE - 4), M.rand(4, TILE_SIZE - 4));
            ctx.rotate(Math.random() * Math.PI * 2);
            ctx.fillRect(-M.rand(4, 8), -2, M.rand(8, 16), 4);
            ctx.restore();
        }
        ctx.fillStyle = '#8f6e4d';
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.translate(M.rand(4, TILE_SIZE - 4), M.rand(4, TILE_SIZE - 4));
            ctx.rotate(Math.random() * Math.PI * 2);
            ctx.fillRect(-M.rand(3, 6), -1.5, M.rand(6, 12), 3);
            ctx.restore();
        }
        ctx.restore();
    }

    carve(a, b, fixed, horizontal) {
        const start = Math.floor(Math.min(a, b)), end = Math.floor(Math.max(a, b)), f = Math.floor(fixed);
        for (let i = start; i <= end; i++) {
            if (horizontal && i >= 0 && i < this.w && f >= 0 && f < this.h) {
                this.grid[f][i] = 0;
                if (f + 1 < this.h) this.grid[f + 1][i] = 0;
            } else if (!horizontal && i >= 0 && i < this.h && f >= 0 && f < this.w) {
                this.grid[i][f] = 0;
                if (f + 1 < this.w) this.grid[i][f + 1] = 0;
            }
        }
    }

    addCrates(r) {
        const c = M.randInt(1, 4);
        for (let i = 0; i < c; i++) {
            const cx = M.randInt(r.x + 1, r.x + r.w - 2);
            const cy = M.randInt(r.y + 1, r.y + r.h - 2);
            if (this.grid[cy][cx] === 0) {
                this.grid[cy][cx] = 2;
                this.crateHp[`${cx},${cy}`] = 60 + M.randInt(0, 40);
            }
        }
    }

    getSpawnPoint() {
        if (this.rooms.length === 0) return { x: 100, y: 100 };
        const r = this.rooms[0];
        for (let attempt = 0; attempt < 20; attempt++) {
            const tx = M.randInt(r.x, r.x + r.w - 1);
            const ty = M.randInt(r.y, r.y + r.h - 1);
            if (this.grid[ty][tx] === 0) return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
        }
        return { x: r.center.x * TILE_SIZE, y: r.center.y * TILE_SIZE };
    }

    getRandomFloor() {
        if (this.rooms.length === 0) return { x: 0, y: 0 };
        for (let i = 0; i < 50; i++) {
            const r = this.rooms[M.randInt(1, this.rooms.length - 1)];
            const tx = M.randInt(r.x, r.x + r.w - 1);
            const ty = M.randInt(r.y, r.y + r.h - 1);
            if (this.grid[ty][tx] === 0) return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
        }
        return { x: 0, y: 0 };
    }

    drawFloorAndDecals(ctx, cam) {
        ctx.drawImage(this.decalCanvas, -cam.renderX, -cam.renderY);
    }

    drawObstacles(ctx, cam) {
        const sx = Math.floor(cam.renderX / TILE_SIZE), sy = Math.floor(cam.renderY / TILE_SIZE);
        const ex = sx + Math.ceil(SCREEN.w / TILE_SIZE) + 1, ey = sy + Math.ceil(SCREEN.h / TILE_SIZE) + 1;

        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                if (y >= 0 && y < this.h && x >= 0 && x < this.w && this.grid[y][x] === 2) {
                    const px = Math.floor(x * TILE_SIZE - cam.renderX);
                    const py = Math.floor(y * TILE_SIZE - cam.renderY);
                    ctx.drawImage(this.shadowRight, px + TILE_SIZE, py);
                    ctx.drawImage(this.shadowBottom, px, py + TILE_SIZE);
                    ctx.drawImage(Assets.box, px, py, TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    drawWalls(ctx, cam) {
        const sx = Math.floor(cam.renderX / TILE_SIZE), sy = Math.floor(cam.renderY / TILE_SIZE);
        const ex = sx + Math.ceil(SCREEN.w / TILE_SIZE) + 1, ey = sy + Math.ceil(SCREEN.h / TILE_SIZE) + 1;
        const currentWallImg = this.wallTex || Assets.wall1;

        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                if (y >= 0 && y < this.h && x >= 0 && x < this.w && this.grid[y][x] === 1) {
                    ctx.drawImage(currentWallImg, Math.floor(x * TILE_SIZE - cam.renderX), Math.floor(y * TILE_SIZE - cam.renderY), TILE_SIZE, TILE_SIZE);
                }
            }
        }
    }

    collide(r) {
        const mx = Math.floor(r.x / TILE_SIZE), Mx = Math.floor((r.x + r.w) / TILE_SIZE);
        const my = Math.floor(r.y / TILE_SIZE), My = Math.floor((r.y + r.h) / TILE_SIZE);
        for (let y = my; y <= My; y++) {
            for (let x = mx; x <= Mx; x++) {
                const tile = (x >= 0 && x < this.w && y >= 0 && y < this.h) ? this.grid[y][x] : 1;
                if (tile === 1 || tile === 2) return true;
            }
        }
        return false;
    }

    isWall(x, y) {
        const tx = Math.floor(x / TILE_SIZE), ty = Math.floor(y / TILE_SIZE);
        return tx < 0 || tx >= this.w || ty < 0 || ty >= this.h ||
            (this.grid[ty][tx] === 1 || this.grid[ty][tx] === 2);
    }

    raycast(x1, y1, x2, y2) {
        let dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1), sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1, err = dx - dy, cx = x1, cy = y1;
        while (true) {
            if (Math.abs(cx - x2) < 2 && Math.abs(cy - y2) < 2) break;
            const gx = Math.floor(cx / TILE_SIZE), gy = Math.floor(cy / TILE_SIZE);
            if (gx >= 0 && gx < this.w && gy >= 0 && gy < this.h && (this.grid[gy][gx] === 1 || this.grid[gy][gx] === 2)) return false;
            const e2 = 2 * err; if (e2 > -dy) { err -= dy; cx += sx * 4; } if (e2 < dx) { err += dx; cy += sy * 4; }
        }
        return true;
    }
}

function createExplosion(game, x, y, radius, damage) {
    game.audio.sfx.explode(x, y, game);
    // Variable screen shake based on distance
    const distToPlayer = M.dist(x, y, game.player.x + 12, game.player.y + 12);
    const trauma = Math.max(0, 1.2 - (distToPlayer / 600)); 
    game.cam.addTrauma(trauma);

    for (let i = 0; i < 10; i++) {
        ParticleSystem.spawn(x, y, 'explosion');
        ParticleSystem.spawn(x, y, 'spark');
    }

    game.enemies.forEach(e => {
        const dist = M.dist(x, y, e.x + 12, e.y + 12);
        if (dist < radius) {
            const pushX = (e.x - x) / dist * 400;
            const pushY = (e.y - y) / dist * 400;
            e.takeDamage(damage, game, pushX, pushY, { knockbackForce: 400 });
        }
    });
}

// =============================================================================
// MAIN GAME OBJECT
// =============================================================================

export const Game = {
    state: 'menu',
    paused: false,
    level: 1,
    stats: { kills: 0, money: 0 },
    levelKills: 0,

    player: null,
    map: null,
    cam: null,
    enemies: [],
    projectiles: [],
    particles: [],
    texts: [],
    trees: [],
    dust: null, // Para névoa
    windows: [], // Lista de janelas/grades no teto

    // SISTEMAS OTIMIZADOS
    spatialGrid: null,
    lighting: null, // NOVO: Sistema de Luz

    ctx: null,
    audio: AudioSys,

    hitStopTimer: 0,
    heartbeatTimer: 0,
    glitchTimer: 0,

    init(canvas) {
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.map = new MapSystem(40, 40);
        this.cam = new Camera();

        // Inicializa o Spatial Hash com células de 128px
        this.spatialGrid = new SpatialHash(128);

        // Inicializa o Sistema de Iluminação
        this.lighting = new LightingSystem(SCREEN.w, SCREEN.h);

        // Inicializa sistema de poeira (150 partículas)
        this.dust = new DustSystem(1500);

        DevConsole.init(); 
        injectSVGFilter();
        Meta.load();

        this.applyGraphicsSettings();
        
        const toggleAA = document.getElementById('opt-aa');
        if(toggleAA) {
            toggleAA.onchange = (e) => {
                Meta.data.antiAliasing = e.target.checked;
                Meta.save();
                this.applyGraphicsSettings();
                this.audio.sfx.click();
            };
        }

        const unlockAudio = () => {
            this.audio.init();
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        window.addEventListener('resize', () => { 
            // O Lighting System NÃO deve ser redimensionado para innerWidth, ele deve espelhar a resolução base do canvas (SCREEN.w / SCREEN.h)
            // porque o CSS cuida da escala.
        });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'p') this.togglePause(); });

        
        const btnHost = document.getElementById('btn-host');
        if (btnHost) btnHost.onclick = () => {
            btnHost.innerText = 'CRIANDO SERVIDOR...';
            Network.host((id) => {
                alert('Servidor criado! Envie este ID para seus amigos: ' + id);
                btnHost.innerText = 'RODANDO COMO HOST';
                this.isHost = true;
                this.remotePlayers = {}; // Para armazenar os amigos
                
                Network.onData = (peerId, data) => {
                    if (!this.remotePlayers[peerId]) {
                        this.remotePlayers[peerId] = new Player(this.map.getSpawnPoint().x, this.map.getSpawnPoint().y); this.remotePlayers[peerId].isLocal = false;
                        // Envia o mapa inteiro para o novo cliente no próximo frame
                        this.sendMapNextFrame = true;
                    }
                    this.remotePlayers[peerId].networkInput = data;
                };
                
                this.startRun();
            });
        };

        const btnJoin = document.getElementById('btn-join');
        if (btnJoin) btnJoin.onclick = () => {
            const joinId = document.getElementById('input-join-id').value;
            if (!joinId) return;
            btnJoin.innerText = 'CONECTANDO...';
            Network.join(joinId, (id) => {
                alert('Conectado ao Host com sucesso!');
                this.isClient = true;
                this.networkState = null; 
                
                Network.onData = (hostId, data) => {
                    this.networkState = data; 
                    // Garante que o mapa carrega assim que o pacote chega
                    if (data.initMap && this.map) {
                        this.map.grid = data.initMap;
                        this.map.h = data.initMap.length;
                        this.map.w = data.initMap[0].length;
                        this.map.barrels = data.initBarrels || {};
                        if (data.initFIdx) this.map.floorTex = Assets[`floor${data.initFIdx}`];
                        if (data.initWIdx) this.map.wallTex = Assets[`wall${data.initWIdx}`];
                        
                        // RE-BAKE SHADOWS!
                        this.map.decalCanvas.width = this.map.w * 48; // TILE_SIZE
                        this.map.decalCanvas.height = this.map.h * 48;
                        this.map.decalCtx.clearRect(0, 0, this.map.decalCanvas.width, this.map.decalCanvas.height);
                        this.map.bakeStaticFloor();
                        this.map.decorateFloor();

                        if (data.initTrees) {
                            this.trees = [];
                            data.initTrees.forEach(t => this.trees.push(new Tree(t.x, t.y, t.size)));
                        }
                        if (data.initWindows) {
                            this.windows = data.initWindows;
                        }
                        console.log("Mapa sincronizado com sucesso do Host!");
                    }
                };
                
                this.startRun();
            });
        };

        document.getElementById('btn-shop').onclick = () => this.openShop();
        document.getElementById('btn-shop-back').onclick = () => this.returnToMenu();
        document.getElementById('btn-go-back').onclick = () => this.returnToMenu();
        document.getElementById('btn-resume').onclick = () => this.togglePause();

        const btnAbort = document.getElementById('btn-go-back-pause');
        if (btnAbort) btnAbort.onclick = () => { this.gameOver(); this.returnToMenu(); };

        document.getElementById('btn-settings').onclick = () => this.openSettings();
        document.getElementById('btn-settings-back').onclick = () => this.returnToMenu();

        const volSlider = document.getElementById('opt-volume');
        volSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('vol-display').innerText = Math.round(val * 100) + '%';
            this.audio.setMasterVolume(val);
        };

        const fsToggle = document.getElementById('opt-fullscreen');
        fsToggle.onchange = (e) => {
            if (e.target.checked) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(err);
                    e.target.checked = false;
                });
            } else {
                if (document.fullscreenElement) document.exitFullscreen();
            }
        };
        document.addEventListener('fullscreenchange', () => {
            fsToggle.checked = !!document.fullscreenElement;
        });

        requestAnimationFrame((ts) => this.loop(ts));
    },

    applyGraphicsSettings() {
        const canvas = document.getElementById('gameCanvas');
        if(!canvas || !this.ctx) return;

        this.ctx.imageSmoothingEnabled = Meta.data.antiAliasing;
        
        if (Meta.data.antiAliasing) {
            canvas.classList.remove('pixelated');
        } else {
            canvas.classList.add('pixelated');
        }
    },

    openSettings() {
        UI.show('menu-settings');
        const slider = document.getElementById('opt-volume');
        slider.value = this.audio.currentVolume;
        document.getElementById('vol-display').innerText = Math.round(this.audio.currentVolume * 100) + '%';
        document.getElementById('opt-fullscreen').checked = !!document.fullscreenElement;
        
        const aaToggle = document.getElementById('opt-aa');
        if(aaToggle) aaToggle.checked = Meta.data.antiAliasing;
        
        this.audio.sfx.click();
    },

    togglePause() {
        if (this.state !== 'play' && this.state !== 'paused') return;
        this.paused = !this.paused;
        const canvas = document.getElementById('gameCanvas');

        if (this.paused) {
            this.state = 'paused';
            canvas.classList.add('blur-effect');
            canvas.style.cursor = 'default';
            UI.updatePauseMenu(this.player);
            UI.show('menu-pause');
            this.audio.setMusicMode('muffled');
        } else {
            this.state = 'play';
            canvas.classList.remove('blur-effect');
            canvas.style.cursor = 'none';
            Input.mouseDown = false;
            UI.show(null);
            document.getElementById('hud').style.display = 'flex';
            this.audio.setMusicMode('normal');
        }
    },

    startRun() {
        this.level = 1;
        this.stats = { kills: 0, money: 0 };
        this.player = new Player(0, 0);
        this.player.isLocal = true;

        UI.show(null);
        document.getElementById('hud').style.display = 'flex';
        Input.mouseDown = false;
        Input.mouseClicked = false;
        document.getElementById('gameCanvas').style.cursor = 'none';

        this.startLevel();
        this.state = 'play';
        this.paused = false;
        document.getElementById('gameCanvas').classList.remove('blur-effect');
    },

    startLevel() {
        this.levelKills = 0;
        const ksEl = document.getElementById('killstreak-display');
        if (ksEl) ksEl.style.fontSize = '0px';

        const fIdx = M.randInt(1, TEXTURE_VARIATIONS.floors);
        const wIdx = M.randInt(1, TEXTURE_VARIATIONS.walls);
        this.map.fIdx = fIdx;
        this.map.wIdx = wIdx;
        this.map.floorTex = Assets[`floor${fIdx}`];
        this.map.wallTex = Assets[`wall${wIdx}`];

        this.map.generate();
        
        // --- GERAR JANELAS / GRADES NO TETO ---
        this.windows = [];
        const numWindows = 6; // Quantas luzes volumétricas no mapa?
        
        for(let i=0; i<numWindows; i++) {
            // Tenta achar um ponto no chão que não seja parede
            let pt = this.map.getRandomFloor();
            
            // Ângulo aleatório para o feixe de luz
            // Dica: Fixar ângulos (ex: todos 45 graus) dá sensação de sol da tarde
            const angle = Math.PI / 4; // 45 graus (diagonal)
            
            this.windows.push({
                x: pt.x,
                y: pt.y,
                angle: angle,
                length: M.rand(200, 400),
                width: M.rand(60, 120)
            });
        }
        const start = this.map.getSpawnPoint();
        this.player.x = start.x;
        this.player.y = start.y;

        this.enemies = [];
        this.projectiles = [];
        ParticleSystem.clear();
        this.texts = [];

        this.spawnFog(25);

        const count = 4 + Math.floor(this.level * 1.5);
        for (let i = 0; i < count; i++) {
            const pos = this.map.getRandomFloor();
            if (M.dist(pos.x, pos.y, this.player.x, this.player.y) > 300) {
                let typeId = 1;
                const r = Math.random();
                if (this.level >= 3) { if (r < 0.2) typeId = 4; else if (r < 0.4) typeId = 2; else if (r < 0.5) typeId = 3; }
                else if (this.level >= 2) { if (r < 0.3) typeId = 4; else if (r < 0.5) typeId = 2; }
                else if (r < 0.3) typeId = 4;
                this.enemies.push(new Enemy(pos.x, pos.y, typeId, this.level));
            }
        }

        this.trees = [];
        const treeChance = 0.05;

for (let y = 2; y < this.map.h - 5; y++) {
    for (let x = 2; x < this.map.w - 5; x++) {
        // Se for chão...
        if (this.map.grid[y][x] === 0) {
            
            if (Math.random() < treeChance) {
                        // --- LÓGICA DE PROBABILIDADE ---
                        const r = Math.random();
                        let size = 3; // Padrão (60% de chance)

                        if (r < 0.20) {
                            size = 2; // 20% Pequena (2x2)
                        } else if (r > 0.80) { 
                            size = 4; // 20% Grande (4x4)
                        }
                        // ------------------------------------

                        let spaceFree = true;
                
                        // Verifica se tem espaço para o tamanho sorteado (2, 3 ou 4)
                        // Adicionamos verificação de limites do mapa para não crashar com árvores 4x4 na borda
                        if (y + size >= this.map.h || x + size >= this.map.w) {
                            spaceFree = false;
                        } else {
                            for (let ty = 0; ty < size; ty++) {
                                for (let tx = 0; tx < size; tx++) {
                                    if (this.map.grid[y + ty][x + tx] !== 0) spaceFree = false;
                                }
                            }
                        }

                        if (spaceFree && M.dist(x * TILE_SIZE, y * TILE_SIZE, start.x, start.y) > 200) {
                            // Passamos o 'size' para o construtor!
                            this.trees.push(new Tree(x * TILE_SIZE, y * TILE_SIZE, size));
                    
                            // Pula os tiles ocupados horizontalmente para não encavalar
                            x += size - 1; 
                        }
                    }
                }
            }
        }
        UI.updateHudFull(this);
    },

    spawnFog(count) {
        for (let i = 0; i < count; i++) {
            const pos = this.map.getRandomFloor();
            ParticleSystem.spawn(pos.x, pos.y, 'fog');
        }
    },

    triggerGlitch(duration) { this.glitchTimer = duration; },
    triggerHitStop(duration) { this.hitStopTimer = duration; },

    getClosestPlayer(x, y) {
        let closest = this.player;
        let minDist = M.dist(x, y, this.player.x, this.player.y);
        
        if (this.remotePlayers) {
            for (let peerId in this.remotePlayers) {
                const rp = this.remotePlayers[peerId];
                if (rp.dead) continue;
                const d = M.dist(x, y, rp.x, rp.y);
                if (d < minDist) {
                    minDist = d;
                    closest = rp;
                }
            }
        }
        return closest;
    },

    // =========================================================================

    // LOOP PRINCIPAL (UPDATE & DRAW)
    // =========================================================================
    loop(ts) {
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= 0.016;
            if (this.state === 'play' || this.state === 'paused') this.draw();
            requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        const dt = 0.016; 

        if (this.state === 'menu') {
            this.drawMenuBackground(dt);
            requestAnimationFrame((ts) => this.loop(ts));
            return;
        }

        if (this.state === 'play' && !this.paused) {
            
            if (typeof Input.updateGamepad === 'function') Input.updateGamepad(SCREEN.w, SCREEN.h);

            // --- CLIENT LOGIC ---
            if (this.isClient) {
                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    worldMouseX: Input.mouseX + this.cam.renderX,
                    worldMouseY: Input.mouseY + this.cam.renderY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };
                
                // Tickrate limit for Client (approx 40 FPS to avoid WebRTC buffer bloat)
                if (!this.netTimer) this.netTimer = 0;
                this.netTimer += dt;
                if (this.netTimer > 0.025) {
                    Network.sendToHost(localInput);
                    this.netTimer = 0;
                    if (Input.mouseClicked) Input.mouseClicked = false;
                }
                
                if (this.networkState) {
                    const s = this.networkState;
                    
                    
                    
                    
                    // Hydrate Enemies (Keep real instances for rendering)
                    if (s.enemies) {
                        this.enemies = s.enemies.map((se, i) => {
                            let e = this.enemies[i];
                            if (!e || e.typeId !== se.typeId) {
                                e = new Enemy(se.x, se.y, se.typeId || 1, 1);
                            }
                            e.x = se.x; e.y = se.y; e.hp = se.hp; e.maxHp = se.maxHp;
                            e.angle = se.angle; e.dead = se.dead; e.spriteName = se.spriteName;
                            // Fake movement values so animation works
                            e.isMoving = se.hp > 0;
                            if (e.animTimer === undefined || isNaN(e.animTimer)) e.animTimer = 0;
                            e.animTimer += 0.016;
                            return e;
                        });
                    } else {
                        this.enemies = [];
                    }
                    
                    // PERFECT SYNC: Spawn exactly the decals the Host spawned
                    if (s.particles && s.particles.length > 0) {
                        s.particles.forEach(p => {
                            // Ignore fog/dust from network, Client does it locally
                            if (p.type !== 'fog') {
                                ParticleSystem.spawn(p.x, p.y, p.type, p.ivx, p.ivy, { isNetwork: true, sprite: p.sprite });
                            }
                        });
                        s.particles = []; // Clear so we don't spawn them again next frame
                    }
                    this.projectiles = s.projectiles || [];
                    if (s.destroyedCrates && s.destroyedCrates.length > 0) {
                        s.destroyedCrates.forEach(c => this.map.destroyBox(c.x, c.y));
                        s.destroyedCrates = [];
                    }

                    if (s.players) {
                        if (s.players[Network.id]) {
                            this.player.x = s.players[Network.id].x;
                            this.player.y = s.players[Network.id].y;
                            this.player.hp = s.players[Network.id].hp;
                            this.player.maxHp = s.players[Network.id].maxHp;
                            this.player.angle = s.players[Network.id].angle;
                            this.player.renderAngle = s.players[Network.id].angle;
                            this.player.isMoving = s.players[Network.id].isMoving;
                            this.player.recoilTimer = s.players[Network.id].recoilTimer;
                            if (this.player.animTimer === undefined || isNaN(this.player.animTimer)) this.player.animTimer = 0;
                            this.player.animTimer += 0.016; // Always increment

                            // HUD Sync for Client
                            const spData = s.players[Network.id];
                            if (spData.ammo !== undefined) {
                                if (this.player.weapon.ammo !== spData.ammo) {
                                    if (spData.ammo < this.player.weapon.ammo) {
                                        this.player.flashTimer = 0.06;
                                    }
                                    this.player.weapon.ammo = spData.ammo;
                                    UI.updateAmmo(this.player);
                                }
                                this.player.reloading = spData.reloading;
                                
                                const reloadInd = document.getElementById('reload-indicator');
                                const reloadFill = document.getElementById('reload-fill');
                                if (this.player.reloading && reloadInd) {
                                    reloadInd.style.display = 'block';
                                    if (reloadFill) reloadFill.style.setProperty('--p', `${spData.reloadPct}%`);
                                } else if (reloadInd) {
                                    reloadInd.style.display = 'none';
                                }
                            }
                        }
                        
                        if (!this.remotePlayers) this.remotePlayers = {};
                        for (let peerId in s.players) {
                            if (peerId === Network.id) continue;
                            let rp = this.remotePlayers[peerId];
                            if (!rp) { rp = new Player(0, 0); rp.visualSize = 64; rp.isLocal = false; }
                            const sp = s.players[peerId];
                            rp.x = sp.x; rp.y = sp.y; rp.hp = sp.hp; rp.maxHp = sp.maxHp;
                            rp.angle = sp.angle; rp.renderAngle = sp.angle; 
                            rp.isMoving = sp.isMoving;
                            rp.recoilTimer = sp.recoilTimer;
                            if (rp.animTimer === undefined || isNaN(rp.animTimer)) rp.animTimer = 0;
                            rp.animTimer += 0.016; // Always increment so idle breathe works
                            
                            // Sync remote ammo
                            if (sp.ammo !== undefined) {
                                if (rp.weapon && rp.weapon.ammo !== undefined && sp.ammo < rp.weapon.ammo) {
                                    rp.flashTimer = 0.06;
                                }
                                if (rp.weapon) rp.weapon.ammo = sp.ammo;
                            }
                            rp.reloading = sp.reloading;
                            
                            this.remotePlayers[peerId] = rp;
                        }
                    }
                }
                
                try {
                    if (this.dust) this.dust.update(0.016);
                    ParticleSystem.update(0.016, this.map.decalCtx);
                    this.trees.forEach(t => t.update(0.016));
                    this.cam.update(this.player, 0.016, Input);
                    this.draw();
                } catch(err) {
                    if (!window.hasAlertedClientCrash) {
                        alert("CRASH NO CLIENTE: " + err.message + "\n" + err.stack);
                        window.hasAlertedClientCrash = true;
                    }
                }
                requestAnimationFrame((ts) => this.loop(ts));
                return; // O Cliente aborta o calculo local!
            }
            // --- END CLIENT LOGIC ---

            // 1. Limpa a grade espacial no início do frame
            this.spatialGrid.clear();

            // Atualiza poeira
            if(this.dust) this.dust.update(dt);
            
            // 2. Insere os inimigos na grade para consulta rápida
            this.enemies.forEach(e => this.spatialGrid.insert(e));

            const p = this.player;
            p.update(dt, Input, this.map, this.cam, this);
            this.cam.update(p, dt, Input);
            
            // Host processa os inputs dos amigos
            if (this.isHost && this.remotePlayers) {
                for (let peerId in this.remotePlayers) {
                    const rp = this.remotePlayers[peerId];
                    if (rp.networkInput) {
                        rp.update(dt, rp.networkInput, this.map, this.cam, this);
                    }
                }
            }

            const canvas = document.getElementById('gameCanvas');
            if (this.glitchTimer > 0) {
                this.glitchTimer -= dt;
                if (!canvas.classList.contains('glitch-active')) canvas.classList.add('glitch-active');
            } else {
                if (canvas.classList.contains('glitch-active')) canvas.classList.remove('glitch-active');
            }

            if (p.hp < p.maxHp * 0.4 && !p.dead) {
                this.heartbeatTimer -= dt;
                if (this.heartbeatTimer <= 0) {
                    this.audio.playTone(60, 'sine', 0.1);
                    setTimeout(() => this.audio.playTone(55, 'sine', 0.1), 150);
                    const hpPct = p.hp / (p.maxHp * 0.4);
                    this.heartbeatTimer = 0.6 + (hpPct * 0.6);
                }
            }

            const fogCount = ParticleSystem.countType('fog');
            if (fogCount < 20) {
                const pos = this.map.getRandomFloor();
                const part = ParticleSystem.spawn(pos.x, pos.y, 'fog'); part.life = 0.1;
                
            }

            // --- FÍSICA E COLISÃO DE PROJÉTEIS (AGORA OTIMIZADA) ---
            this.projectiles.forEach(b => {
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.life -= dt;

                // Colisão com Mundo (Paredes/Caixas) - Usa Grid Direta (Rápido)
                if (this.map.isWall(b.x, b.y)) {
                    const tx = Math.floor(b.x / TILE_SIZE);
                    const ty = Math.floor(b.y / TILE_SIZE);

                    if (tx >= 0 && tx < this.map.w && ty >= 0 && ty < this.map.h && this.map.grid[ty][tx] === 2) {
                        this.audio.playTone(150, 'square', 0.05); 
                        for (let k = 0; k < 3; k++) ParticleSystem.spawn(b.x, b.y, 'wood');

                        const key = `${tx},${ty}`;
                        if (this.map.crateHp[key]) {
                            this.map.crateHp[key] -= b.dmg;
                            if (this.map.crateHp[key] <= 0) {
                                this.map.destroyBox(tx, ty);
                                this.audio.playTone(100, 'sawtooth', 0.2);
                                this.cam.addTrauma(0.25);
                                for (let k = 0; k < 15; k++) ParticleSystem.spawn(b.x, b.y, 'wood');
                                const dust = ParticleSystem.spawn(b.x, b.y, 'fog'); dust.life = 0.6; dust.size = 40;
                                
                            }
                        }
                        b.life = 0; 
                    }
                    else {
                        ParticleSystem.spawn(b.x, b.y, 'bullet_hole');
                        if (b.explosiveRadius > 0) {
                            createExplosion(this, b.x, b.y, 80 + b.explosiveRadius, b.dmg * 0.5);
                        }
                        for (let i = 0; i < 4; i++) ParticleSystem.spawn(b.x, b.y, 'spark');

                        if (b.ricochet > 0) {
                            b.ricochet--;
                            b.life = 0.6;
                            const prevX = b.x - b.vx * dt;
                            const prevY = b.y - b.vy * dt;
                            if (this.map.isWall(b.x, prevY)) b.vx *= -1; else b.vy *= -1;

                            const speed = Math.hypot(b.vx, b.vy);
                            const angle = Math.atan2(b.vy, b.vx);
                            const spread = M.rand(-0.4, 0.4);
                            const newAngle = angle + spread;
                            b.vx = Math.cos(newAngle) * speed;
                            b.vy = Math.sin(newAngle) * speed;

                            b.x += b.vx * dt * 2;
                            b.y += b.vy * dt * 2;
                        } else {
                            b.life = 0;
                        }
                    }
                }

                // Colisão de Combate (Balas vs Entidades) - OTIMIZADO VIA SPATIAL HASH
                if (b.owner === 'player') {
                    // Consulta apenas os inimigos próximos à bala
                    const nearbyEnemies = this.spatialGrid.query({x: b.x, y: b.y, w: 10, h: 10});

                    for (let e of nearbyEnemies) {
                        if (M.dist(b.x, b.y, e.x + 12, e.y + 12) < 22) {
                            if (b.isCrit) {
                                this.addFloatText(e.x, e.y - 10, "CRIT!", '#ff0');
                                this.triggerHitStop(0.05);
                            }
                            if (b.explosiveRadius > 0) {
                                createExplosion(this, b.x, b.y, 80 + b.explosiveRadius, b.dmg * 0.5);
                                this.triggerHitStop(0.03);
                            }

                            e.takeDamage(b.dmg, this, b.vx, b.vy, {
                                freezeTime: b.freezeTime,
                                executeLimit: b.executeLimit,
                                knockbackForce: b.knockbackForce
                            });

                            if (b.wallBang > 0) b.wallBang--; else b.life = 0;
                            this.audio.sfx.hit();
                            break; 
                        }
                    }
                } else if (M.dist(b.x, b.y, p.x + 12, p.y + 12) < 12) {
                    p.takeDamage(b.dmg, this, b.x, b.y);
                    b.life = 0;
                }
            });

            this.projectiles = this.projectiles.filter(b => b.life > 0);
            this.enemies.forEach(e => e.update(dt, p, this.map, this));
            this.enemies = this.enemies.filter(e => !e.dead);
            this.trees.forEach(t => t.update(dt));
            ParticleSystem.update(dt, this.map.decalCtx);
            
            this.texts.forEach(t => t.update(dt));
            this.texts = this.texts.filter(t => t.life > 0);

            if (this.enemies.length === 0) this.levelComplete();
        }
        
        // --- HOST BROADCAST STATE ---
        if (this.isHost) {
            // Tickrate limit for Host
            if (!this.netTimer) this.netTimer = 0;
            this.netTimer += dt;
            if (this.netTimer < 0.025) {
                // Skip broadcast this frame, but still draw
            } else {
                this.netTimer = 0;
            const state = {
                enemies: this.enemies.map(e => ({ x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, angle: e.angle, spriteName: e.spriteName, typeId: e.typeId, dead: e.dead })),
                projectiles: this.projectiles.map(pr => ({ x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, wepId: pr.wepId, explosiveRadius: pr.explosiveRadius, freezeTime: pr.freezeTime, rotSpeed: pr.rotSpeed, size: pr.size, width: pr.width, length: pr.length })),
                players: { 
                    'host': { 
                        x: this.player.x, y: this.player.y, hp: this.player.hp, maxHp: this.player.maxHp, angle: this.player.angle,
                        isMoving: this.player.isMoving, recoilTimer: this.player.recoilTimer || 0,
                        ammo: this.player.weapon.ammo, reloading: this.player.reloading,
                        reloadPct: this.player.reloading ? (1 - (this.player.reloadTimer / (this.player.weapon.reload * this.player.mods.reloadMult))) * 100 : 0
                    } 
                }
            };
            if (this.remotePlayers) {
                for (let peerId in this.remotePlayers) {
                    const rp = this.remotePlayers[peerId];
                    state.players[peerId] = { 
                        x: rp.x, y: rp.y, hp: rp.hp, maxHp: rp.maxHp, angle: rp.angle,
                        isMoving: rp.isMoving, recoilTimer: rp.recoilTimer || 0,
                        ammo: rp.weapon.ammo, reloading: rp.reloading,
                        reloadPct: rp.reloading ? (1 - (rp.reloadTimer / (rp.weapon.reload * rp.mods.reloadMult))) * 100 : 0
                    };
                }
            }
            if (this.sendMapNextFrame) {
                state.initMap = this.map.grid;
                state.initBarrels = this.map.barrels;
                state.initFIdx = this.map.fIdx;
                state.initWIdx = this.map.wIdx;
                state.initTrees = this.trees.map(t => ({ x: t.x, y: t.y, size: t.size }));
                state.initWindows = this.windows.map(w => ({ x: w.x, y: w.y, w: w.w, rot: w.rot }));
                this.sendMapNextFrame = false;
            }
            state.particles = ParticleSystem.networkEvents;
            if (this.map.destroyedCratesThisFrame && this.map.destroyedCratesThisFrame.length > 0) {
                state.destroyedCrates = this.map.destroyedCratesThisFrame;
            }
            Network.broadcast(state);
            ParticleSystem.networkEvents = [];
            this.map.destroyedCratesThisFrame = [];
            } // Close else
        }

        if (this.state === 'play' || this.state === 'paused') this.draw();
        requestAnimationFrame((ts) => this.loop(ts));
    },

    drawMenuBackground(dt) {
        this.ctx.fillStyle = '#050505';
        this.ctx.fillRect(0, 0, SCREEN.w, SCREEN.h);

        this.ctx.strokeStyle = 'rgba(0, 255, 100, 0.05)';
        this.ctx.lineWidth = 1;
        const time = Date.now() / 1000;
        const offsetX = (time * 10) % TILE_SIZE;
        const offsetY = (time * 10) % TILE_SIZE;

        this.ctx.beginPath();
        for (let x = 0; x < SCREEN.w; x += TILE_SIZE) {
            this.ctx.moveTo(x - offsetX, 0);
            this.ctx.lineTo(x - offsetX, SCREEN.h);
        }
        for (let y = 0; y < SCREEN.h; y += TILE_SIZE) {
            this.ctx.moveTo(0, y + offsetY);
            this.ctx.lineTo(SCREEN.w, y + offsetY);
        }
        this.ctx.stroke();

        const fogCount = ParticleSystem.countType('fog');
        if (fogCount < 15) {
            const x = Math.random() * SCREEN.w;
            const y = Math.random() * SCREEN.h;
            const p = ParticleSystem.spawn(x, y, 'fog'); p.life = 10;
            
        }

        ParticleSystem.pool.forEach(p => { if (p.life <= 0) return;
            p.x += p.vx * dt * 0.5;
            p.y += p.vy * dt * 0.5;
            p.angle += p.rotSpeed * dt;
            p.life -= dt;

            if (p.type === 'fog') {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate(p.angle);
                this.ctx.globalAlpha = 0.05;
                this.ctx.fillStyle = '#45f3ff';
                this.ctx.beginPath(); this.ctx.arc(0, 0, p.size, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.restore();
            }
        });
        

        const grad = this.ctx.createRadialGradient(SCREEN.w / 2, SCREEN.h / 2, SCREEN.h * 0.3, SCREEN.w / 2, SCREEN.h / 2, SCREEN.h);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, SCREEN.w, SCREEN.h);
    },

    draw() {
        if (this.state === 'menu') return;
        this.ctx.fillStyle = '#0d0d0d';
        this.ctx.fillRect(0, 0, SCREEN.w, SCREEN.h);

        this.map.drawFloorAndDecals(this.ctx, this.cam);
        this.trees.forEach(t => t.drawShadow(this.ctx, this.cam));
        this.map.drawObstacles(this.ctx, this.cam);
        ParticleSystem.drawType(this.ctx, this.cam, 'blood');
        ParticleSystem.drawType(this.ctx, this.cam, 'fog');

        this.enemies.forEach(e => {
            if (e.draw) e.draw(this.ctx, this.cam);
            else {
                // Client-side raw draw
                if(e.dead) return;
                this.ctx.save();
                this.ctx.translate(e.x + 12 - this.cam.renderX, e.y + 12 - this.cam.renderY);
                this.ctx.rotate(e.angle);
                if (Assets[e.spriteName]) this.ctx.drawImage(Assets[e.spriteName], -12, -12, 24, 24);
                else { this.ctx.fillStyle = 'red'; this.ctx.fillRect(-12, -12, 24, 24); }
                
                // Draw HP bar
                const pct = e.hp / e.maxHp;
                this.ctx.fillStyle = '#f00'; this.ctx.fillRect(-12, -20, 24, 3);
                this.ctx.fillStyle = '#0f0'; this.ctx.fillRect(-12, -20, 24 * pct, 3);
                this.ctx.restore();
            }
        });
        if (this.player) this.player.draw(this.ctx, this.cam);
        if (this.remotePlayers) {
            for (let peerId in this.remotePlayers) {
                const skipId = this.isHost ? 'host' : Network.id;
                if (peerId !== skipId) {
                    const rp = this.remotePlayers[peerId];
                    if (rp.draw) rp.draw(this.ctx, this.cam);
                    else {
                        this.ctx.save();
                        this.ctx.translate(rp.x + 12 - this.cam.renderX, rp.y + 12 - this.cam.renderY);
                        this.ctx.rotate(rp.angle);
                        if (Assets.player) this.ctx.drawImage(Assets.player, -12, -12, 24, 24);
                        this.ctx.restore();
                    }
                }
            }
        }

        this.map.drawWalls(this.ctx, this.cam);
        this.trees.forEach(t => t.drawCanopy(this.ctx, this.cam, this.player));

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';

        this.projectiles.forEach(p => {
            const speedFactor = 0.04; 
            const screenX = p.x - this.cam.renderX;
            const screenY = p.y - this.cam.renderY;
            
            const isBolt = p.wepId === 'crossbow';
            const trailLen = isBolt ? speedFactor * 3.5 : speedFactor;
            
            const tailX = (p.x - p.vx * trailLen) - this.cam.renderX;
            const tailY = (p.y - p.vy * trailLen) - this.cam.renderY;

            let glowColor, coreColor;

            if (isBolt) {
                glowColor = '0, 255, 200'; 
                coreColor = '200, 255, 255'; 
            } else {
                const baseCol = p.freezeTime > 0 ? '100, 200, 255' : '255, 200, 50';
                glowColor = baseCol;
                coreColor = baseCol;
            }

            this.ctx.lineWidth = isBolt ? 3 : 4; 
            this.ctx.strokeStyle = `rgba(${glowColor}, ${isBolt ? 0.6 : 0.3})`; 
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(tailX, tailY);
            this.ctx.stroke();

            this.ctx.lineWidth = isBolt ? 2 : 1; 
            this.ctx.strokeStyle = `rgba(${coreColor}, 1.0)`;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, screenY);
            this.ctx.lineTo(tailX, tailY);
            this.ctx.stroke();

            this.ctx.fillStyle = '#fff'; 
            this.ctx.beginPath(); 
            this.ctx.arc(screenX, screenY, isBolt ? 1.0 : 1.5, 0, Math.PI * 2); 
            this.ctx.fill(); 
        });
        this.ctx.restore();

        ParticleSystem.drawExclude(this.ctx, this.cam, 'blood', 'fog');
        this.texts.forEach(t => t.draw(this.ctx, this.cam));
        


        // --- INTEGRAÇÃO DA LUZ VOLUMÉTRICA ---
        if (this.player && this.lighting) {
                        
            // 1. Luz do Player (Lanterna Tática / Aura)
            // Tom azulado para noite, leve flicker para realismo
            this.lighting.addLight(
                this.player.x + 12, 
                this.player.y + 12, 
                LIGHT_SETTINGS.radius, 
                'rgba(200, 230, 255, 0.4)', 
                true, // Gera sombras (Occlusion)
                2.0   // Flicker leve
            );

            // 2. Muzzle Flash (Disparo) - Cria sombra dinâmica instantânea!
            if (this.player.flashTimer > 0) { 
                const mx = this.player.x + 12 + Math.cos(this.player.angle) * 20;
                const my = this.player.y + 12 + Math.sin(this.player.angle) * 20;
    
                // Lógica opcional para variar a intensidade enquanto apaga
                // Faz a luz diminuir de tamanho no finalzinho
                const intensity = this.player.flashTimer / 0.06; 
                const size = 300 * intensity; 

                this.lighting.addLight(mx, my, size, 'rgba(255, 200, 50, 0.6)', true);
            }

            // 3. Projéteis em Voo (Luz Dinâmica)
            this.projectiles.forEach(p => {
                let col = 'rgba(255, 220, 100, 0.3)';
                // Cores diferentes para efeitos elementais
                if(p.freezeTime > 0) col = 'rgba(0, 200, 255, 0.5)';
                else if(p.explosiveRadius > 0) col = 'rgba(255, 100, 50, 0.5)';
                
                // Luz sem sombra (mais barato) para balas
                this.lighting.addLight(p.x, p.y, 100, col, false);
            });

            // 4. Explosões e Partículas Brilhantes
            ParticleSystem.pool.forEach(p => { if (p.life <= 0) return;
                if(p.type === 'explosion') {
                    // Explosão ilumina muito
                    this.lighting.addLight(p.x, p.y, p.size * 8, `rgba(255, 100, 50, ${p.life})`, false, 10);
                } else if (p.type === 'spark') {
                    this.lighting.addLight(p.x, p.y, 30, `rgba(255, 255, 200, ${p.life * 0.5})`, false);
                }
            });

            // 5. Inimigos (Olhos brilhantes no escuro - Opcional)
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
            }

            // Renderiza todas as luzes acumuladas sobre a cena
            this.lighting.render(this.ctx, this.map, this.cam);
        }

        // --- DESENHA A POEIRA ---
        // Desenhamos DEPOIS da luz, mas como usamos 'screen' ou alpha baixo,
        // ela vai parecer iluminada pelo ambiente.
        if (this.dust) this.dust.draw(this.ctx, this.cam);

        // -------------------------------------------------------------

        if (this.glitchTimer > 0 && this.state === 'play' && Math.random() < 0.8) {
            const slices = 3;
            for (let i = 0; i < slices; i++) {
                const h = M.rand(10, 50);
                const y = M.rand(0, SCREEN.h - h);
                const offset = M.rand(-10, 10);
                this.ctx.drawImage(this.ctx.canvas, 0, y, SCREEN.w, h, offset, y, SCREEN.w, h);
            }
        }

        if (this.state === 'play' && !this.paused) {
            const mx = Input.mouseX, my = Input.mouseY;
            let currentSpread = 4;
            if (this.player.isMoving) currentSpread += 8;
            if (this.player.shootTimer > 0) currentSpread += this.player.shootTimer * 150;
            currentSpread = Math.min(currentSpread, 60);

            const size = 6;
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';

            const drawCross = (ox, oy, col) => {
                this.ctx.strokeStyle = col;
                this.ctx.beginPath();
                this.ctx.moveTo(mx + ox, my - currentSpread + oy); this.ctx.lineTo(mx + ox, my - currentSpread - size + oy);
                this.ctx.moveTo(mx + ox, my + currentSpread + oy); this.ctx.lineTo(mx + ox, my + currentSpread + size + oy);
                this.ctx.moveTo(mx - currentSpread + ox, my + oy); this.ctx.lineTo(mx - currentSpread - size + ox, my + oy);
                this.ctx.moveTo(mx + currentSpread + ox, my + oy); this.ctx.lineTo(mx + currentSpread + size + ox, my + oy);
                this.ctx.stroke();
            };
            this.ctx.lineWidth = 3; drawCross(0, 0, '#000');
            this.ctx.lineWidth = 2; drawCross(0, 0, '#0f0');
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; this.ctx.fillRect(mx - 1, my - 1, 2, 2);
        }
    },

    levelComplete() {
        this.state = 'pause';
        this.audio.setMusicMode('muffled');

        const container = document.getElementById('upgrade-list');
        container.innerHTML = '';
        document.getElementById('gameCanvas').classList.add('blur-effect');
        document.getElementById('gameCanvas').style.cursor = 'default';

        let options = [];
        const availableWeapons = Object.values(WEAPONS).filter(w => !this.player.weapons.some(pw => pw.id === w.id) && w.inPool !== false);

        if (this.player.weapons.length < 5 && availableWeapons.length > 0) {
            options.push({ type: 'weapon', data: availableWeapons[M.randInt(0, availableWeapons.length - 1)] });
        }

        while (options.length < 3) {
            options.push({ type: 'perk', data: PERKS[M.randInt(0, PERKS.length - 1)] });
        }

        options.forEach(opt => {
            const item = opt.data;
            const div = document.createElement('div');
            div.className = 'card';
            if (opt.type === 'weapon') div.classList.add('arma');
            else if (item.rare) div.classList.add(item.rare);
            else div.classList.add('comum');

            div.innerHTML = `<div class="card-icon">${opt.type === 'weapon' ? '🔫' : '⚡'}</div><div class="card-title">${item.name}</div><div class="card-desc">${opt.type === 'weapon' ? 'Nova Arma' : item.desc}</div>`;

            div.onclick = () => {
                Input.mouseDown = false;
                Input.mouseClicked = false;
                if (opt.type === 'weapon') this.player.equipWeapon(item.id);
                else {
                    item.func(this.player);
                    this.player.addPerk(item.id);
                }

                this.level++;
                this.startLevel();
                UI.show(null);
                this.state = 'play';
                this.audio.sfx.click();
                this.audio.setMusicMode('normal');
                document.getElementById('gameCanvas').classList.remove('blur-effect');
                document.getElementById('gameCanvas').style.cursor = 'none';
            };
            container.appendChild(div);
        });
        UI.show('menu-levelup');
    },

    gameOver() {
        this.state = 'over';
        Meta.data.money += Math.floor(this.stats.money);

        if (this.level > (Meta.data.bestLevel || 0)) Meta.data.bestLevel = this.level;
        if (this.stats.kills > (Meta.data.bestKills || 0)) Meta.data.bestKills = this.stats.kills;
        Meta.save();

        ['go-level', 'go-kills', 'go-money'].forEach((id, i) =>
            document.getElementById(id).innerText = [
                this.level,
                this.stats.kills,
                '$' + Math.floor(this.stats.money)
            ][i]
        );

        document.getElementById('gameCanvas').style.cursor = 'default';
        UI.show('menu-gameover');
        document.getElementById('hud').style.display = 'none';
        document.getElementById('gameCanvas').classList.remove('blur-effect');
    },

    openShop() {
        UI.show('menu-shop');
        Meta.renderShop(this.audio.sfx.click);
        this.audio.setMusicMode('muffled');
    },

    returnToMenu() {
        this.state = 'menu';
        UI.show('menu-main');
        Meta.updateMenu();
        document.getElementById('gameCanvas').classList.remove('blur-effect');
        document.getElementById('gameCanvas').style.cursor = 'default';
        this.audio.setMusicMode('normal');
    },

    addFloatText(x, y, txt, color) {
        this.texts.push(new FloatingText(x, y, txt, color));
    }
};
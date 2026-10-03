/**
 * entities.js
 * Gerencia entidades dinâmicas: Jogador, Inimigos, Partículas e Textos.
 */
import { WEAPONS, M, COLORS, Assets, TILE_SIZE, ENEMY_TYPES, RECOIL_PATTERNS } from './constants.js';
import { UI, Meta } from './ui.js';

// Função de interpolação angular para o efeito de "peso" da arma (Sway)
const lerpAngle = (a, b, t) => {
    const da = (b - a) % (Math.PI * 2);
    const dist = 2 * da % (Math.PI * 2) - da;
    return a + dist * t;
};

export class Particle {
    constructor(x, y, type, ivx = 0, ivy = 0, props = {}) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.life = 1.0;
        this.vx = (Math.random() - 0.5) * 200;
        this.vy = (Math.random() - 0.5) * 200;

        // --- TIPOS EXISTENTES ---
        if (type === 'ghost') {
            this.life = 0.3; this.sprite = props.sprite; this.angle = props.angle || 0; this.vx = 0; this.vy = 0;
        }
        else if (type === 'shell') { 
            this.angle = Math.random() * 6; this.rotSpeed = (Math.random() - 0.5) * 15; this.life = 2.0; 
        } 
        else if (type === 'blood') { 
            this.vx = (Math.random() - 0.5) * 150 + (ivx * 0.25);
            this.vy = (Math.random() - 0.5) * 150 + (ivy * 0.25);
            this.color = COLORS.blood[M.randInt(0, 2)];
            this.size = Math.random() * 3 + 1;
        } 
        else if (type === 'flash') { this.life = 0.08; this.size = M.rand(15, 25); this.angle = Math.random() * Math.PI * 2; } 
        else if (type === 'explosion') { this.life = 0.2; this.size = M.rand(30, 50); this.angle = Math.random() * Math.PI * 2; } 
        else if (type === 'fog') {
            this.size = M.rand(150, 300); this.life = M.rand(8, 15); this.maxLife = this.life;
            this.vx = M.rand(-15, 15); this.vy = M.rand(-10, 10); this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = M.rand(-0.1, 0.1); this.opacity = M.rand(0.03, 0.07);
        } 
        else if (type === 'spark') {
            this.life = M.rand(0.1, 0.3); this.vx = (Math.random() - 0.5) * 600; this.vy = (Math.random() - 0.5) * 600;
            this.size = M.rand(1, 3); this.color = '#fff';
        } 
        else if (type === 'bullet_hole') {
            this.life = 90.0; this.vx = 0; this.vy = 0; this.size = M.rand(2, 4); this.angle = Math.random() * Math.PI * 2;
        }
        else if (type === 'corpse') {
            this.life = 10.0; this.sprite = props.sprite; this.angle = props.angle;   
            this.vx = ivx; this.vy = ivy; this.friction = 0.92; 
        }

        // --- PARTÍCULA DE MADEIRA ---
        else if (type === 'wood') {
            this.life = M.rand(0.4, 0.8);
            this.vx = (Math.random() - 0.5) * 300;
            this.vy = (Math.random() - 0.5) * 300;
            this.size = M.rand(2, 5);
            this.color = Math.random() > 0.5 ? '#5a4632' : '#755b41'; // Cores da caixa
            this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = M.rand(-10, 10);
        }
    }

    update(dt, decalCtx) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.type === 'shell') {
            this.vx *= 0.92; this.vy *= 0.92; this.angle += this.rotSpeed * dt; this.life -= dt;
            if ((Math.abs(this.vx) < 5 && Math.abs(this.vy) < 5) || this.life <= 0) {
                if (decalCtx) {
                    decalCtx.save(); decalCtx.translate(this.x, this.y); decalCtx.rotate(this.angle);
                    decalCtx.fillStyle = '#b8860b'; decalCtx.fillRect(-2, -1, 4, 2); 
                    decalCtx.fillStyle = 'rgba(255,255,255,0.3)'; decalCtx.fillRect(-1, -0.5, 2, 0.5); 
                    decalCtx.restore();
                }
                this.life = 0;
            }
        } 
        else if (this.type === 'corpse') {
            this.vx *= this.friction; this.vy *= this.friction; this.life -= dt;
            const speed = Math.hypot(this.vx, this.vy);
            if (speed < 10 || this.life <= 0) {
                if (decalCtx && this.sprite) {
                    decalCtx.save(); decalCtx.translate(this.x + 12, this.y + 12); decalCtx.rotate(this.angle + Math.PI / 2);
                    decalCtx.filter = 'grayscale(0.8) brightness(0.7) contrast(1.2)';
                    decalCtx.drawImage(this.sprite, -24, -24, 60, 60); decalCtx.filter = 'none'; decalCtx.restore();
                }
                this.life = 0;
            }
        }
        else if (this.type === 'blood') {
            this.vx *= 0.8; this.vy *= 0.8; this.life -= dt * 2;
            if (Math.abs(this.vx) < 5 && decalCtx) {
                decalCtx.save(); decalCtx.fillStyle = this.color; decalCtx.globalAlpha = 0.6;
                decalCtx.beginPath(); decalCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                decalCtx.fill(); decalCtx.restore(); this.life = 0;
            }
        } 
        else if (this.type === 'fog') { this.angle += this.rotSpeed * dt; this.life -= dt; } 
        // --- ATUALIZAÇÃO DA MADEIRA ---
        else if (this.type === 'wood') {
            this.vx *= 0.9; this.vy *= 0.9; this.angle += this.rotSpeed * dt; this.life -= dt;
        }
        else { this.life -= dt; }
    }

    draw(ctx, cam) {
        if (this.life <= 0) return;
        const sx = this.x - cam.renderX;
        const sy = this.y - cam.renderY;

        if (this.type === 'corpse' && this.sprite) {
            ctx.save(); ctx.translate(sx + 12, sy + 12); ctx.rotate(this.angle + Math.PI / 2);
            //ctx.filter = 'grayscale(0.5) brightness(0.8)';    70, 70 é o pixel da imagem
            ctx.drawImage(this.sprite, -35, -35, 70, 70);
            ctx.filter = 'none'; ctx.restore(); return;
        }

        if (this.type === 'ghost' && this.sprite) {
            ctx.save(); ctx.translate(sx + 12, sy + 12); ctx.rotate(this.angle + Math.PI / 2);
            ctx.globalAlpha = this.life * 1.5; ctx.globalCompositeOperation = 'screen'; 
            ctx.filter = 'grayscale(100%) brightness(200%) sepia(100%) hue-rotate(180deg)';
            ctx.drawImage(this.sprite, -32, -32, 64, 64); ctx.restore();
        }
        else if (this.type === 'shell') {
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
            ctx.fillStyle = '#d4a017'; ctx.fillRect(-2, -1, 4, 2); 
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-1, -0.5, 2, 0.5); ctx.restore();
        } 
        else if (this.type === 'blood') { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(sx, sy, this.size, 0, Math.PI * 2); ctx.fill(); } 
        else if (this.type === 'flash' || this.type === 'explosion') {
            ctx.save(); 
            ctx.translate(sx, sy); 
            ctx.rotate(this.angle);
            ctx.globalCompositeOperation = 'lighter'; 
            
            const col = this.type === 'explosion' ? '255, 100, 50' : '255, 200, 100';
            
            // FAKE GLOW: Desenhamos um círculo transparente maior atrás
            ctx.fillStyle = `rgba(${col}, ${this.life * 0.3})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // NÚCLEO: O desenho original
            ctx.fillStyle = `rgba(${col}, ${this.life * 10})`; // RGB puro
            ctx.beginPath();
            const spikes = 8;
            for (let i = 0; i < spikes * 2; i++) {
                const r = (i % 2 === 0) ? this.size : this.size * 0.4;
                const a = (Math.PI * i) / spikes;
                ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath(); 
            ctx.fill(); 
            ctx.restore();
        }
        else if (this.type === 'fog') {
            ctx.save();
            const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * this.opacity;
            ctx.globalAlpha = alpha;
            const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, this.size);
            grad.addColorStop(0, 'rgba(150, 160, 180, 0.4)'); grad.addColorStop(1, 'rgba(150, 160, 180, 0)');
            ctx.fillStyle = grad; ctx.translate(sx, sy); ctx.rotate(this.angle);
            ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } 
        else if (this.type === 'spark') {
            ctx.save(); 
            ctx.translate(sx, sy); 
            ctx.globalCompositeOperation = 'lighter';
                        
            // Spark agora é um traço brilhante simples
            ctx.fillStyle = `rgba(255, 204, 0, ${this.life * 4})`; 
            ctx.beginPath(); 
            ctx.arc(0, 0, this.size, 0, Math.PI * 2); 
            ctx.fill(); 
            ctx.restore();
        }
        else if (this.type === 'bullet_hole') {
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
            ctx.globalAlpha = Math.min(1, this.life); ctx.fillStyle = '#000'; 
            ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
            ctx.beginPath(); for(let i=0; i<3; i++) { ctx.moveTo(0,0); ctx.lineTo(M.rand(-6, 6), M.rand(-6, 6)); }
            ctx.stroke(); ctx.restore();
        }
        // --- DESENHO DA MADEIRA ---
        else if (this.type === 'wood') {
            ctx.save(); ctx.translate(sx, sy); ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size, -this.size/2, this.size*2, this.size);
            ctx.restore();
        }
    }
}

export class FloatingText {
    constructor(x, y, txt, color) { 
        this.x = x; 
        this.y = y; 
        this.txt = txt; 
        this.color = color; 
        this.life = 1.0; 
        
        // FÍSICA DE POP-UP
        // Joga um pouco para os lados (-20 a 20) e forte para cima (-100 a -50)
        this.vx = (Math.random() - 0.5) * 40; 
        this.vy = -(Math.random() * 50 + 50); 
        this.gravity = 200; // Gravidade puxa para baixo
        
        this.scale = 1.5; // Começa grande (impacto)
    }

    update(dt) { 
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt; // Aplica gravidade
        this.life -= dt; 
        
        // Efeito elástico no tamanho
        if (this.scale > 1.0) this.scale -= dt * 2;
    }

    draw(ctx, cam) {
        ctx.save(); 
        
        ctx.globalAlpha = Math.min(1, this.life * 2); 
        
        ctx.fillStyle = this.color; 
        
        // Define o tamanho base: 30 se for crítico (amarelo), 24 se for normal
        const baseSize = (this.color === 'rgb(255, 60, 0)' || this.txt === 'CRIT!') ? 36 : 30;
        //const baseSize = (this.color === '#ff0' || this.txt === 'CRIT!') ? 36 : 30;

        // --- ALTERAÇÃO AQUI ---
        // Usamos peso '900' (Black) e a familia Consolas/Monaco para igualar ao Killstreak
        ctx.font = `900 ${Math.floor(baseSize * this.scale)}px "Consolas", "Monaco", monospace`;
        // ----------------------
        
        // Sombra dura para legibilidade (estilo arcade)
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        const renderX = this.x - cam.renderX;
        const renderY = this.y - cam.renderY;
        
        ctx.fillText(this.txt, renderX, renderY); 
        


        ctx.restore();
    }
}

export class Player {
    constructor(x, y) {
        this.x = x; this.y = y; 
        this.w = 24; this.h = 24; 
        this.dead = false; this.angle = 0;
        this.maxHp = 100 + Meta.getUpgradeVal('startHp'); this.hp = this.maxHp; this.speedBase = 220 + Meta.getUpgradeVal('startSpd');
        this.weapons = []; this.currentWepIdx = 0; this.perks = {};
        
        this.mods = { 
            dmgMult: 1.0 + Meta.getUpgradeVal('startDmg'), 
            rateMult: 1.0, 
            // Agora usa reloadSpd
            reloadMult: 1.0 - (Meta.getUpgradeVal('reloadSpd') || 0), 
            magSize: 1.0 + Meta.getUpgradeVal('ammo') + Meta.getUpgradeVal('magStart'), 
            ricochet: 0, wallBang: 0, freezeTime: 0, explosiveRadius: 0, executeLimit: 0, knockbackForce: 0, berserkCap: 0,
            lifesteal: (Meta.getUpgradeVal('regen') ? 0.5 : 0) + Meta.getUpgradeVal('vampStart'), 
            critChance: 0.0 + Meta.getUpgradeVal('critStart'), 
            dodge: Meta.getUpgradeVal('dodge'),
            multishot: 0
        };
        
        this.equipWeapon('glock');
        if (Meta.getUpgradeVal('startWep')) {
            const tier2 = ['ak47', 'm4a1', 'mp5', 'nova'];
            this.equipWeapon(tier2[M.randInt(0, tier2.length - 1)]);
            this.switchWeapon(1);
        }

        this.shootTimer = 0;
        this.flashTimer = 0;

        // --- Variáveis de Controle de Recuo ---
        this.recoilIndex = 0;          // Qual "passo" do padrão estamos
        this.recoilRecoveryTimer = 0;  // Tempo até começar a baixar a mira
        // -------------------------------------------

        this.recoilTimer = 0;

        // --- Variáveis do Dash ---
        this.dashTime = 0;       
        this.dashCooldown = 0;   
        // Atualização do Dash Cooldown no Player
        this.dashMaxCooldown = 1.5 - (Meta.getUpgradeVal('dashCool') || 0);
        this.ghostTimer = 0;     
        
        // --- NOVO: Variáveis de Knockback (Empurrão sofrido) ---
        this.knockbackX = 0;
        this.knockbackY = 0;
        // ------------------------------------------------------

        this.reloadTimer = 0; this.reloading = false; this.hitFlash = 0;
        this.animTimer = 0; this.isMoving = false;
        this.footstepTimer = 0; this.isLeftFoot = true;
        this.renderAngle = 0; 
        this.visualSize = 64; 
    }

    addPerk(id) { this.perks[id] = (this.perks[id] || 0) + 1; }

    equipWeapon(key) {
        if (this.weapons.length >= 5 || this.weapons.some(w => w.id === key)) return;
        const base = WEAPONS[key];
        const newWep = { ...base, ammo: Math.floor(base.mag * this.mods.magSize) };
        this.weapons.push(newWep);
        if (this.weapons.length === 1) this.switchWeapon(0);
        UI.renderWeaponBar(this);
    }

    switchWeapon(idx) {
        if (idx < 0 || idx >= this.weapons.length) return;
        this.currentWepIdx = idx; this.reloading = false; this.reloadTimer = 0; this.shootTimer = 0;
        UI.renderWeaponBar(this); UI.updateAmmo(this);
    }

    get weapon() { return this.weapons[this.currentWepIdx]; }

    update(dt, input, map, cam, game) {
        if (this.dead) return;
        this.animTimer += dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;

        // --- Lógica do Dash ---
        if (this.dashCooldown > 0) this.dashCooldown -= dt;
        if (this.dashTime > 0) this.dashTime -= dt;

        if (input.keys[' '] && this.dashCooldown <= 0 && this.isMoving && this.dashTime <= 0) {
            this.dashTime = 0.2; 
            this.dashCooldown = this.dashMaxCooldown;
            game.audio.playTone(300, 'triangle', 0.1); 
        }

        if (this.dashTime > 0) {
            this.ghostTimer -= dt;
            if (this.ghostTimer <= 0) {
                game.particles.push(new Particle(this.x, this.y, 'ghost', 0, 0, { 
                    sprite: Assets.player, 
                    angle: this.renderAngle 
                }));
                this.ghostTimer = 0.03; 
            }
        }

        // --- NOVO: APLICA KNOCKBACK (Força Externa) ---
        // Isso roda ANTES do movimento normal para garantir prioridade
        if (Math.abs(this.knockbackX) > 1 || Math.abs(this.knockbackY) > 1) {
            // Tentamos mover com o knockback. 
            // IMPORTANTE: Aqui só checamos PAREDES, ignorando INIMIGOS para sair de dentro deles.
            if (!map.collide({ x: this.x + this.knockbackX * dt, y: this.y, w: this.w, h: this.h })) {
                this.x += this.knockbackX * dt;
            }
            if (!map.collide({ x: this.x, y: this.y + this.knockbackY * dt, w: this.w, h: this.h })) {
                this.y += this.knockbackY * dt;
            }
            
            // Atrito para parar o empurrão suavemente
            this.knockbackX *= 0.9;
            this.knockbackY *= 0.9;
        }
        // ---------------------------------------------

        ['1', '2', '3', '4', '5'].forEach((k, i) => { if (input.keys[k]) this.switchWeapon(i); });

        let dx = 0, dy = 0;
        if (input.keys['w']) dy = -1; if (input.keys['s']) dy = 1;
        if (input.keys['a']) dx = -1; if (input.keys['d']) dx = 1;

        // Se estiver sendo empurrado fortemente, perde controle de movimento momentâneo (opcional, mas bom pra gamefeel)
        // Aqui permitimos controle, mas o knockback soma.
        this.isMoving = (dx !== 0 || dy !== 0);
        
        if (this.isMoving) { 
            const l = Math.hypot(dx, dy); 
            
            let currentSpeed = this.speedBase;
            if (this.dashTime > 0) currentSpeed *= 3.5; 
            
            const moveX = (dx / l) * currentSpeed * dt;
            const moveY = (dy / l) * currentSpeed * dt;

            this.move(moveX, moveY, map, game.enemies); 

            if (this.hp < this.maxHp * 0.4) {
                this.footstepTimer += this.speedBase * dt;
                if (this.footstepTimer > 25) { 
                    this.spawnBloodFootprint(game.map);
                    this.footstepTimer = 0;
                }
            }
        }

        this.angle = Math.atan2((input.mouseY + cam.renderY) - (this.y + 12), (input.mouseX + cam.renderX) - (this.x + 12));
        this.renderAngle = lerpAngle(this.renderAngle, this.angle, 15 * dt);

        if (this.mods.lifesteal > 0 && this.hp < this.maxHp && Math.random() < 0.01) { 
            this.hp = Math.min(this.hp + 0.1, this.maxHp); 
            UI.updateHp(this); 
        }

        if (this.shootTimer > 0) this.shootTimer -= dt;
        if (this.recoilTimer > 0) this.recoilTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;

        if (this.reloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.reloading = false;
                this.weapon.ammo = Math.floor(this.weapon.mag * this.mods.magSize);
                UI.updateAmmo(this);
            }
        } else {
            const wantShoot = this.weapon.auto ? input.mouseDown : input.mouseClicked;
            if (input.mouseClicked) input.mouseClicked = false;
            
            if (wantShoot && this.shootTimer <= 0 && this.weapon.ammo > 0) {
                this.fire(cam, game);
            } else if ((wantShoot && this.weapon.ammo <= 0) || input.keys['r']) {
                this.startReload(game.audio);
            }
        }

        const reloadInd = document.getElementById('reload-indicator');
        const reloadFill = document.getElementById('reload-fill');
        
        if (this.reloading && reloadInd) {
            reloadInd.style.display = 'block';
            const totalReload = this.weapon.reload * this.mods.reloadMult;
            const pct = (1 - (this.reloadTimer / totalReload)) * 100;
            if (reloadFill) reloadFill.style.setProperty('--p', `${pct}%`);
        } else if (reloadInd) {
            reloadInd.style.display = 'none';
        }

        const wantShoot = this.weapon.auto ? input.mouseDown : input.mouseClicked;
            if (!wantShoot) { // Se parou de atirar
            if (this.recoilRecoveryTimer > 0) {
                this.recoilRecoveryTimer -= dt;
            } else if (this.recoilIndex > 0) {
                // Recupera a mira rapidamente (reset do spray)
                // Use a velocidade definida na arma ou um padrão rápido (30)
                const recoverySpeed = this.weapon.recoilRecovery || 15;
                this.recoilIndex = Math.max(0, this.recoilIndex - (dt * recoverySpeed));
            }
        }
    }

    move(dx, dy, map, others) {
        if (!map.collide({ x: this.x + dx, y: this.y, w: this.w, h: this.h }) && !this.checkEntityCollide(this.x + dx, this.y, others)) this.x += dx;
        if (!map.collide({ x: this.x, y: this.y + dy, w: this.w, h: this.h }) && !this.checkEntityCollide(this.x, this.y + dy, others)) this.y += dy;
    }

    checkEntityCollide(x, y, others) {
        if (!others) return false;
        // Se estiver com Dash, ignora colisão com inimigos (atravessa)
        if (this.dashTime > 0) return false;

        for (let e of others) if (e !== this && !e.dead && M.dist(x + 12, y + 12, e.x + 12, e.y + 12) < 40) return true;
        return false;
    }

    fire(cam, game) {
        this.weapon.ammo--; 
        this.shootTimer = 1 / (this.weapon.rate * this.mods.rateMult);
        this.flashTimer = 0.06; // 0.06s = 60ms (aprox 3 ou 4 frames, bem rápido)
        this.recoilTimer = 0.2; // Visual kickback do sprite da arma

        // --- SISTEMA DE RECUO AVANÇADO (PATTERN RECOIL) ---
        // Pega o padrão da arma (ou usa padrão simples se não tiver)
        let pattern = RECOIL_PATTERNS[this.weapon.recoilType] || [[0, -this.weapon.spread]];

        // Garante que não estoure o array do padrão
        let stepIndex = Math.min(Math.floor(this.recoilIndex), pattern.length - 1);
        let step = pattern[stepIndex];

        // Aplica o recuo:
        // step[0] = Horizontal (Graus)
        // step[1] = Vertical (Graus - Negativo sobe)

        const recoilAngleX = M.rad(step[0]);
        const recoilAngleY = M.rad(step[1]);

        // Empurra a CÂMERA (Kick físico)
        // Multiplicamos para ficar visível na tela
        cam.recoilX += step[0] * 3; 
        cam.recoilY += step[1] * 3;
        cam.addTrauma(this.weapon.shake / 20); // Trauma adicional

        // O ângulo final da bala soma: Mira + Recuo Acumulado + Jitter Aleatório
        // Nota: O recuo altera onde a bala VAI, forçando o player a compensar com o mouse
        const finalAngle = this.angle + recoilAngleX + (Math.random() - 0.5) * 0.05;

        // Avança no padrão de recuo
        this.recoilIndex += 1.0; 
        this.recoilRecoveryTimer = 0.3; // Delay antes de recuperar
        // --------------------------------------------------

        game.audio.sfx.shoot(this.weapon.id); 
        game.audio.sfx.shell();

        const ejectAngle = this.angle + Math.PI / 2;
        const sx = (this.x + 12) + Math.cos(ejectAngle) * 8;
        const sy = (this.y + 12) + Math.sin(ejectAngle) * 8;
        game.particles.push(new Particle(sx, sy, 'shell'));

        const mx = this.x + 12 + Math.cos(this.angle) * 20; 
        const my = this.y + 12 + Math.sin(this.angle) * 20;
        game.particles.push(new Particle(mx, my, 'flash'));

        let baseDmg = this.weapon.dmg * this.mods.dmgMult;
        if (this.mods.berserkCap > 0) {
            const missingHpPct = 1.0 - (this.hp / this.maxHp);
            baseDmg *= (1.0 + (missingHpPct * this.mods.berserkCap));
        }

        const pellets = this.weapon.pellets || 1;
        let extraShots = (this.mods.multishot > 0 && pellets === 1) ? this.mods.multishot : 0;
        const totalProjectiles = pellets + extraShots;

        for (let i = 0; i < totalProjectiles; i++) {
            // Spread base agora é menor, pois o recuo faz o trabalho pesado
            const spread = (this.weapon.spread * 0.5) * (1.0 - (Meta.getUpgradeVal('acc') || 0));
            const ang = finalAngle + M.rad(spread) * (Math.random() - 0.5);

            const isCrit = Math.random() < this.mods.critChance;
            const finalDmg = baseDmg * (isCrit ? 2 : 1);

            game.projectiles.push({ 
                x: mx, y: my, 
                vx: Math.cos(ang) * 2000, vy: Math.sin(ang) * 2000, 
                dmg: finalDmg, 
                life: 1.5, 
                owner: 'player', 
                wepId: this.weapon.id,
                ricochet: this.mods.ricochet, 
                wallBang: this.mods.wallBang, 
                isCrit: isCrit,
                freezeTime: this.mods.freezeTime,
                explosiveRadius: this.mods.explosiveRadius,
                executeLimit: this.mods.executeLimit,
                knockbackForce: this.mods.knockbackForce
            });
        }
        UI.updateAmmo(this);
    }

    startReload(audio) { if (!this.reloading && this.weapon.ammo < Math.floor(this.weapon.mag * this.mods.magSize)) { this.reloading = true; this.reloadTimer = this.weapon.reload * this.mods.reloadMult; audio.sfx.reload(); } }

    // --- NOVO: takeDamage recebe a origem (sourceX, sourceY) ---
    takeDamage(amt, game, sourceX, sourceY) {
        if (this.dashTime > 0) {
            game.addFloatText(this.x, this.y, "DODGE", '#0ff'); 
            return;
        }

        if (Math.random() < this.mods.dodge) { game.addFloatText(this.x, this.y, "MISS", '#fff'); return; }
        
        this.hp -= amt; 
        this.hitFlash = 0.1; 
        UI.updateHp(this); 
        game.cam.addTrauma(0.5);
        game.addFloatText(this.x, this.y, `-${Math.ceil(amt)}`, '#f00');
        game.triggerGlitch(0.4);

        // --- LÓGICA DO EMPURRÃO (KNOCKBACK) NO PLAYER ---
        if (sourceX !== undefined && sourceY !== undefined) {
            const angle = Math.atan2(this.y - sourceY, this.x - sourceX);
            const force = 400; // Força do empurrão
            this.knockbackX = Math.cos(angle) * force;
            this.knockbackY = Math.sin(angle) * force;
        }
        // ------------------------------------------------

        for (let i = 0; i < 8; i++) {
            game.particles.push(new Particle(this.x + 12, this.y + 12, 'blood'));
        }

        if (this.hp <= 0) {
            this.dead = true;
            this.spawnBloodDecal(game); 
            game.gameOver();
        }
    }

    draw(ctx, cam) {
        const sx = Math.floor(this.x - cam.renderX), sy = Math.floor(this.y - cam.renderY);
        ctx.save(); ctx.translate(sx + 12, sy + 12);
        
        ctx.save();
        const shadowRadius = 30; const grad = ctx.createRadialGradient(0, 0, shadowRadius * 0.3, 0, 0, shadowRadius);
        grad.addColorStop(0, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (this.hitFlash > 0) ctx.filter = 'brightness(1000%)';

        let bobAngle = 0, breathScale = 1.0;
        if (this.isMoving) bobAngle = Math.sin(this.animTimer * 10) * 0.05;
        else breathScale = 1.0 + Math.sin(this.animTimer * 2) * 0.02;

        let kickback = 0;
        if (this.recoilTimer > 0) {
            const progress = this.recoilTimer / 0.2; 
            kickback = Math.sin(progress * Math.PI) * 6; 
        }

        ctx.rotate(this.renderAngle + Math.PI / 2 + bobAngle);

        if (Assets.player.width > 0) { 
            const size = this.visualSize * breathScale; 
            ctx.drawImage(Assets.player, -size / 2, -size / 2, size, size); 
        
            const wepId = this.weapon.id;
            if (Assets[wepId] && Assets[wepId].width > 0) {
                ctx.save();
                ctx.translate(0, kickback); 
                ctx.drawImage(Assets[wepId], -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = '#5d79ae'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); 
            ctx.fillStyle = '#111'; ctx.fillRect(0, -3, 22, 6); 
        }

        if (this.dashCooldown > 0) {
            const sx = Math.floor(this.x - cam.renderX);
            const sy = Math.floor(this.y - cam.renderY);
            
            const barW = 24; const barH = 2;
            const pct = 1 - (this.dashCooldown / this.dashMaxCooldown);
            
            ctx.fillStyle = '#444'; ctx.fillRect(sx, sy + 30, barW, barH); 
            ctx.fillStyle = '#0ff'; ctx.fillRect(sx, sy + 30, barW * pct, barH); 
        }

        // --- BARRA DE MUNIÇÃO TÁTICA ---
        const maxAmmo = Math.floor(this.weapon.mag * this.mods.magSize);
        if (this.weapon.ammo < maxAmmo) {
            // Rotaciona ao contrário para a barra ficar sempre horizontal na tela
            ctx.rotate(-(this.renderAngle + Math.PI / 2 + bobAngle)); 
            
            const barW = 32; 
            const barH = 5; 
            const barY = 32; // Distância abaixo do player

            // 1. Container (Fundo Escuro)
            ctx.fillStyle = 'rgba(10, 12, 16, 0.9)';
            ctx.beginPath();
            // roundRect(x, y, w, h, radii) - Cria cantos arredondados
            ctx.roundRect(-barW/2 - 2, barY - 2, barW + 4, barH + 4, 3);
            ctx.fill();

            // 2. Borda Fina (Detalhe visual)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 3. Preenchimento (Com Glow)
            const ammoPct = this.weapon.ammo / maxAmmo;
            let barColor = '#45f3ff'; // Padrão: Ciano Tech

            if (ammoPct < 0.3) barColor = '#ff2a2a';      // Crítico: Vermelho
            else if (ammoPct < 0.6) barColor = '#ffb700'; // Atenção: Dourado
            
            ctx.fillStyle = barColor;
            ctx.shadowColor = barColor;
            ctx.shadowBlur = 8; // Efeito de Neon

            ctx.beginPath();
            // Desenha a barra interna levemente menor que o container
            ctx.roundRect(-barW/2, barY, Math.max(2, barW * ammoPct), barH, 2);
            ctx.fill();

            // Limpa o shadow para não afetar outros desenhos
            ctx.shadowBlur = 0;
        }

        ctx.filter = 'none'; ctx.restore();
    }

    spawnBloodFootprint(map) {
        if (!map || !map.decalCtx) return;
        const ctx = map.decalCtx;
        const bloodIntensity = 1.0 - (this.hp / (this.maxHp * 0.4));
        ctx.save();
        ctx.globalAlpha = M.rand(0.2, 0.4) * bloodIntensity;
        ctx.fillStyle = COLORS.blood[M.randInt(0, 2)];
        const sideOffset = this.isLeftFoot ? -5 : 5; this.isLeftFoot = !this.isLeftFoot;
        const fx = (this.x + 12) + Math.cos(this.angle + Math.PI/2) * sideOffset;
        const fy = (this.y + 12) + Math.sin(this.angle + Math.PI/2) * sideOffset;
        ctx.translate(fx, fy); ctx.rotate(this.angle);
        ctx.beginPath(); ctx.ellipse(0, 0, M.rand(2, 3), M.rand(1, 2), 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    spawnBloodDecal(game) {
        if (!game.map || !game.map.decalCtx) return;
        const dc = game.map.decalCtx;
        dc.save(); dc.globalAlpha = 0.8; dc.fillStyle = COLORS.blood[0];
        const cx = this.x + 12, cy = this.y + 12;
        dc.beginPath(); dc.arc(cx, cy, M.rand(15, 25), 0, Math.PI * 2); dc.fill();
        dc.restore();
    }
}

export class Enemy {
    constructor(x, y, typeId, lvl) {
        const config = ENEMY_TYPES[typeId] || ENEMY_TYPES[1];
        const scale = 1 + (lvl * 0.15) - (Meta.getUpgradeVal('headstart') * 0.05);
        this.x = x; this.y = y; this.w = 24; this.h = 24; this.dead = false; this.angle = 0;
        this.typeId = typeId; this.spriteName = config.sprite; this.aiType = config.ai; this.color = config.color;
        this.maxHp = Math.max(10, config.hp * scale); this.hp = this.maxHp; 
        this.speedBase = config.speed;
        this.speed = this.speedBase; 
        
        const wData = WEAPONS[config.weapon];
        this.weapon = { id: config.weapon, dmg: wData.dmg * scale, rate: wData.rate, range: wData.range };
        this.cooldown = 0; this.hitFlash = 0; 
        
        // IA de Combate
        this.strafingDir = Math.random() > 0.5 ? 1 : -1; 
        this.strafeTimer = 0;
        this.shootTimer = 0;
        
        // IA de Patrulha (NOVO)
        this.patrolTarget = null; // {x, y} para onde ele quer ir
        this.patrolTimer = 0;     // Tempo que ele fica parado "observando"
        this.alertLevel = 0;      // 0 = Relaxado, 1 = Alerta (viu algo recente)

        // Animação e Utilitários
        this.animTimer = Math.random() * 100; this.isMoving = false;
        this.footstepTimer = 0; this.isLeftFoot = true;

        // Recarga
        this.maxAmmo = wData.mag;
        this.ammo = this.maxAmmo;
        this.reloadTime = wData.reload * 2;
        this.isReloading = false;
        this.reloadTimer = 0;

        // Estados de Debuff
        this.freezeTimer = 0;
        this.knockbackX = 0;
        this.knockbackY = 0;
    }

    update(dt, player, map, game) {
        this.animTimer += dt; this.isMoving = false;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        if (this.shootTimer > 0) this.shootTimer -= dt;

        // --- PROCESSA DEBUFFS ---
        if (this.freezeTimer > 0) {
            this.freezeTimer -= dt;
            this.speed = this.speedBase * 0.5;
        } else {
            this.speed = this.speedBase;
        }

        // --- LÓGICA DE RECARGA ---
        if (this.isReloading) {
            this.reloadTimer -= dt;
            if (this.reloadTimer <= 0) {
                this.isReloading = false;
                this.ammo = this.maxAmmo;
                game.audio.sfx.click(); 
            }
        }

        const cx = this.x + 12, cy = this.y + 12;
        const px = player.x + 12, py = player.y + 12;
        const dist = M.dist(cx, cy, px, py);
        
        // Check de visão (Raycast)
        const canSee = map.raycast(cx, cy, px, py);
        
        // Vetor de movimento final
        let dx = 0, dy = 0;

        // ============================================================
        // DECISÃO DE ESTADO: COMBATE vs PATRULHA
        // ============================================================
        
        // Entra em combate se ver o player OU estiver muito perto (audição/passos)
        const combatRange = 250; 
        const isInCombat = canSee || dist < combatRange;

        if (isInCombat) {
            // --- ESTADO: COMBATE ---
            this.alertLevel = 5.0; // Fica alerta por 5 segundos mesmo se perder visão
            this.patrolTarget = null; // Esquece a patrulha

            // Rotação: Olha para o player
            const targetAngle = Math.atan2(py - cy, px - cx);
            const diff = targetAngle - this.angle;
            let delta = Math.atan2(Math.sin(diff), Math.cos(diff));
            this.angle += delta * 12 * dt; // Gira rápido no combate

            let aiDx = 0, aiDy = 0;
            
            // Comportamentos de Combate
            if (this.aiType === 'rush') {
                if (dist > 30) { 
                    aiDx = Math.cos(this.angle); aiDy = Math.sin(this.angle); 
                }
            } else if (this.aiType === 'sniper') {
                if (dist > 600) { aiDx = Math.cos(this.angle); aiDy = Math.sin(this.angle); } 
                else if (dist < 400) { aiDx = -Math.cos(this.angle); aiDy = -Math.sin(this.angle); }
            } else { // Aggressive / Tactical
                const optimalRange = this.aiType === 'aggressive' ? 200 : 350;
                if (dist > optimalRange + 50) { 
                    aiDx = Math.cos(this.angle); aiDy = Math.sin(this.angle); 
                } else if (dist < optimalRange - 50) { 
                    aiDx = -Math.cos(this.angle); aiDy = -Math.sin(this.angle); 
                } else {
                    // Strafe lateral
                    this.strafeTimer -= dt;
                    if (this.strafeTimer <= 0) { this.strafingDir *= -1; this.strafeTimer = M.rand(1, 3); }
                    aiDx = Math.cos(this.angle + Math.PI / 2 * this.strafingDir); 
                    aiDy = Math.sin(this.angle + Math.PI / 2 * this.strafingDir);
                }
            }

            dx += aiDx * this.speed;
            dy += aiDy * this.speed;

            // Atirar
            if (this.cooldown > 0) this.cooldown -= dt;
            let wantToShoot = false;
            if (this.aiType === 'rush' && dist < 60) wantToShoot = true;
            else if (canSee && dist < this.weapon.range) {
                if (Math.abs(delta) < 0.5) wantToShoot = true;
            }
            if (!this.isReloading && wantToShoot && this.cooldown <= 0) this.attack(game);

        } else {
            // --- ESTADO: PATRULHA ---
            if (this.alertLevel > 0) this.alertLevel -= dt;

            // Se o timer de espera acabou, tenta se mover
            if (this.patrolTimer > 0) {
                this.patrolTimer -= dt;
                // Animação de "Looking around" (olhando pros lados) enquanto espera
                this.angle += Math.sin(this.animTimer * 2) * 0.5 * dt;
            } else {
                // Se não tem destino, escolhe um novo
                if (!this.patrolTarget) {
                    this.pickPatrolPoint(map);
                }

                if (this.patrolTarget) {
                    const tx = this.patrolTarget.x;
                    const ty = this.patrolTarget.y;
                    const dToTarget = M.dist(cx, cy, tx, ty);

                    if (dToTarget < 10) {
                        // Chegou no destino: Espera um pouco
                        this.patrolTarget = null;
                        this.patrolTimer = M.rand(1.5, 4.0); // Espera entre 1.5s e 4s
                    } else {
                        // Anda até o destino
                        const moveAngle = Math.atan2(ty - cy, tx - cx);
                        
                        // Na patrulha, gira suavemente para onde está andando
                        const diff = moveAngle - this.angle;
                        let delta = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.angle += delta * 5 * dt; // Gira mais devagar (relaxado)

                        // Velocidade reduzida na patrulha (50% da velocidade de combate)
                        const patrolSpeed = this.speed * 0.5;
                        dx += Math.cos(moveAngle) * patrolSpeed;
                        dy += Math.sin(moveAngle) * patrolSpeed;
                    }
                }
            }
        }

        // ============================================================
        // FÍSICA E COLISÃO (COMUM A TODOS OS ESTADOS)
        // ============================================================

        // Separação (Boids) - Evita encavalar (funciona na patrulha também)
        const SEPARATION_DIST = 35; 
        const SEPARATION_FORCE = 150; 
        
        game.enemies.forEach(other => {
            if (other === this || other.dead) return;
            const distSq = (this.x - other.x)**2 + (this.y - other.y)**2;
            if (distSq < SEPARATION_DIST * SEPARATION_DIST && distSq > 0.1) {
                const d = Math.sqrt(distSq);
                const pushX = (this.x - other.x) / d;
                const pushY = (this.y - other.y) / d;
                const factor = 1.0 - (d / SEPARATION_DIST); 
                dx += pushX * SEPARATION_FORCE * factor;
                dy += pushY * SEPARATION_FORCE * factor;
            }
        });

        // Aplica Knockback
        if (Math.abs(this.knockbackX) > 1 || Math.abs(this.knockbackY) > 1) {
            dx += this.knockbackX;
            dy += this.knockbackY;
            this.knockbackX *= 0.9; 
            this.knockbackY *= 0.9;
        }

        // Movimento Final
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            this.isMoving = true;
            this.move(dx * dt, dy * dt, map);
            
            // Passos (Som/Visual)
            // Se estiver em combate, passos são mais frequentes. Em patrulha, mais lentos.
            const stepFreq = isInCombat ? 20 : 40; 
            if (this.hp < this.maxHp * 0.4) {
                this.footstepTimer += Math.hypot(dx, dy) * dt; // Baseado na velocidade real
                if (this.footstepTimer > stepFreq) { 
                    this.spawnBloodFootprint(game.map); 
                    this.footstepTimer = 0; 
                }
            }
        }
    }

    // Função auxiliar para encontrar ponto válido de patrulha
    pickPatrolPoint(map) {
        // Tenta 10 vezes achar um ponto válido num raio de 300px
        for(let i=0; i<10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = M.rand(50, 300);
            const tx = this.x + Math.cos(angle) * dist;
            const ty = this.y + Math.sin(angle) * dist;

            // Converte para coordenadas de Grid
            const gx = Math.floor(tx / TILE_SIZE);
            const gy = Math.floor(ty / TILE_SIZE);

            // Verifica se está dentro do mapa e é chão (0)
            if (gx >= 0 && gx < map.w && gy >= 0 && gy < map.h && map.grid[gy][gx] === 0) {
                // Verifica se tem linha de visão até o ponto (para não tentar atravessar paredes)
                if (map.raycast(this.x + 12, this.y + 12, tx, ty)) {
                    this.patrolTarget = { x: tx, y: ty };
                    return;
                }
            }
        }
        // Se falhar, fica parado (o timer vai resetar na proxima iteração)
        this.patrolTimer = 1.0; 
    }

    spawnBloodFootprint(map) {
        if (!map || !map.decalCtx) return;
        const ctx = map.decalCtx;
        ctx.save(); ctx.globalAlpha = M.rand(0.3, 0.6) * (1.0 - (this.hp / (this.maxHp * 0.4))); ctx.fillStyle = COLORS.blood[M.randInt(0, 2)];
        const sideOffset = this.isLeftFoot ? -6 : 6; this.isLeftFoot = !this.isLeftFoot;
        const footprintX = (this.x + 12) + Math.cos(this.angle + Math.PI/2) * sideOffset; const footprintY = (this.y + 12) + Math.sin(this.angle + Math.PI/2) * sideOffset;
        ctx.translate(footprintX, footprintY); ctx.rotate(this.angle); ctx.beginPath(); ctx.ellipse(0, 0, M.rand(2, 4), M.rand(1.5, 2.5), 0, 0, Math.PI * 2); ctx.fill();
        if (Math.random() > 0.7) { ctx.beginPath(); ctx.arc(M.rand(-5, 5), M.rand(-5, 5), M.rand(0.5, 1.5), 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }

    move(dx, dy, map) {
        if (!map.collide({ x: this.x + dx, y: this.y, w: this.w, h: this.h })) this.x += dx;
        if (!map.collide({ x: this.x, y: this.y + dy, w: this.w, h: this.h })) this.y += dy;
    }

    attack(game) {
        if (this.ammo > 0) {
            this.ammo--;
            this.cooldown = 1 / this.weapon.rate;
            this.shootTimer = 0.1; 

            if (this.aiType === 'rush') {
                if (M.dist(this.x, this.y, game.player.x, game.player.y) < 60) {
                    // Passa a posição do inimigo para knockback
                    game.player.takeDamage(this.weapon.dmg, game, this.x, this.y);
                    
                    if (Assets.sounds['machete']) {
                        // --- SOM ESPACIAL ---
                        // Ouve o corte vindo da direção do inimigo
                        game.audio.playSpatial('machete', this.x, this.y, game); 
                    } else {
                        game.audio.sfx.hit();
                    }
                }
            } else {
                // --- SOM ESPACIAL PARA TIROS INIMIGOS ---
                // Isso é crucial: você ouvirá onde o sniper está!
                if (Assets.sounds[this.weapon.id]) {
                    game.audio.playSpatial(this.weapon.id, this.x, this.y, game);
                } else {
                    game.audio.sfx.shoot(this.weapon.id);
                }
                // ---------------------------------------

                const spread = this.isMoving ? 0.2 : 0.05;
                const ang = this.angle + (Math.random() - 0.5) * spread;
                
                game.projectiles.push({ 
                    x: this.x + 12, 
                    y: this.y + 12, 
                    vx: Math.cos(ang) * 1200, 
                    vy: Math.sin(ang) * 1200, 
                    dmg: this.weapon.dmg, 
                    life: 2, 
                    owner: 'enemy' 
                });
            }
        } else {
            this.startReload(game);
        }
    }

    startReload(game) {
        if (!this.isReloading) {
            this.isReloading = true;
            this.reloadTimer = this.reloadTime;
            game.audio.playBuffer('reload', 0.4); 
            game.addFloatText(this.x, this.y - 20, "RELOADING...", '#bbb');
        }
    }

    takeDamage(dmg, game, ivx = 0, ivy = 0, specialProps = {}) {
        // Ao tomar dano, o inimigo deve entrar em alerta IMEDIATAMENTE e olhar para a origem do tiro
        this.alertLevel = 5.0; // Fica alerta
        
        // Vira para de onde veio o tiro (ivx e ivy são a velocidade da bala que atingiu)
        if (ivx !== 0 || ivy !== 0) {
            // A bala veio de (ivx, ivy), então a origem é o oposto
            this.angle = Math.atan2(-ivy, -ivx);
        }

        let finalDmg = dmg;
        if (specialProps.executeLimit > 0 && (this.hp / this.maxHp) <= specialProps.executeLimit) {
            finalDmg = 9999; 
            game.addFloatText(this.x, this.y, "EXECUTE!", '#f00');
        }
        if (specialProps.freezeTime > 0) this.freezeTimer = specialProps.freezeTime;

        if (specialProps.knockbackForce > 0) {
            const len = Math.hypot(ivx, ivy) || 1;
            this.knockbackX += (ivx / len) * specialProps.knockbackForce;
            this.knockbackY += (ivy / len) * specialProps.knockbackForce;
        }

        this.hp -= finalDmg; 
        this.hitFlash = 0.1; 
        game.addFloatText(this.x, this.y, Math.round(finalDmg), 'rgb(183, 250, 255)');
        
        for (let i = 0; i < 6; i++) {
            game.particles.push(new Particle(this.x + 12, this.y + 12, 'blood', ivx, ivy));
        }

        if (this.hp <= 0 && !this.dead) {
            this.dead = true;
            this.spawnBloodDecal(game, ivx, ivy);
            
            // --- SPAWN DO CORPO (RAGDOLL) ---
            // ivx/ivy é a direção da bala que matou. Usamos isso para empurrar o corpo.
            const sprite = Assets[this.spriteName];
            if (sprite) {
                // Força do empurrão na morte
                const deathPush = 150; 
                // Se foi explosão ou shotgun de perto, empurra mais
                const pushMult = (specialProps.knockbackForce > 0) ? 2.5 : 1.0;
                
                // Normaliza o vetor de impacto
                const len = Math.hypot(ivx, ivy) || 1;
                const pushX = (ivx / len) * deathPush * pushMult;
                const pushY = (ivy / len) * deathPush * pushMult;

                game.particles.push(new Particle(this.x, this.y, 'corpse', pushX, pushY, {
                    sprite: sprite,
                    angle: this.angle
                }));
            }
            // -------------------------------------

            game.stats.kills++; 
            if (typeof game.levelKills === 'undefined') game.levelKills = 0;
            game.levelKills++; 
            const kAudio = game.levelKills <= 10 ? game.levelKills : 10;
            if(game.audio && game.audio.playBuffer) game.audio.playBuffer(`kill${kAudio}`, 0.6);

            UI.triggerStreak(game.levelKills);

            let money = M.randInt(15, 40) * (1 + Meta.getUpgradeVal('greed'));
            if (Meta.getUpgradeVal('income') > 0) money += 2;
            game.stats.money += money;

            UI.updateMoney(game.stats.money);
            if (game.player.mods.lifesteal > 0) { game.player.hp = Math.min(game.player.hp + game.player.mods.lifesteal, game.player.maxHp); UI.updateHp(game.player); }
            UI.log(["Neutralized", "Tango Down", "Clear"][M.randInt(0, 2)]);
        }
    }

    spawnBloodDecal(game, ivx = 0, ivy = 0) {
        // Carimba a poça de sangue no chão (Baking)
        if (game.map && game.map.decalCtx) {
            const dc = game.map.decalCtx; 
            
            dc.save(); 
            // Aumentei a opacidade para o sangue ficar mais escuro e visível
            dc.globalAlpha = M.rand(0.8, 1.0);
            dc.fillStyle = COLORS.blood[0]; // Cor mais escura
            
            const cx = this.x + 12, cy = this.y + 12;
            
            // Poça Principal (Maior)
            const mainSize = M.rand(25, 35); // Aumentei o tamanho
            dc.beginPath();
            dc.arc(cx, cy, mainSize, 0, Math.PI * 2);
            dc.fill(); 

            // Poças secundárias (Espalhadas) - "Mais sangue"
            // Agora fazemos 2 loops para criar uma mancha irregular maior
            dc.fillStyle = COLORS.blood[1]; // Varia a cor
            for (let k = 0; k < M.randInt(8, 12); k++) {
                const a = Math.random() * Math.PI * 2;
                const d = Math.random() * mainSize * 1.2; 
                const r = M.rand(5, 12);
                dc.beginPath();
                dc.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r, 0, Math.PI * 2);
                dc.fill();
            }
            dc.restore();
        }

        // Explosão de partículas (Sangue voando)
        // 25 partículas para ser mais visceral
        for (let i = 0; i < 25; i++) {
            const p = new Particle(this.x + 12, this.y + 12, 'blood', ivx, ivy);
            
            // Espalha mais o sangue
            const sm = M.rand(0.8, 1.8); 
            p.vx *= sm; 
            p.vy *= sm; 
            p.size = M.rand(3, 7); // Partículas maiores
            game.particles.push(p);
        }
    }

    draw(ctx, cam) {
        const sx = Math.floor(this.x - cam.renderX), sy = Math.floor(this.y - cam.renderY);
        ctx.save(); ctx.translate(sx + 12, sy + 12);
        
        ctx.save();
        // Aumente a sombra também (era 30)
        const shadowRadius = 30; 
        const grad = ctx.createRadialGradient(0, 0, shadowRadius * 0.3, 0, 0, shadowRadius);
        grad.addColorStop(0, 'rgba(0,0,0,0.7)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (this.hitFlash > 0) ctx.filter = 'brightness(1000%)';
        if (this.freezeTimer > 0) ctx.filter = 'hue-rotate(180deg) brightness(1.2)';

        let bobAngle = 0, breathScale = 1.0;
        if (this.isMoving) bobAngle = Math.sin(this.animTimer * 10) * 0.1;
        else breathScale = 1.0 + Math.sin(this.animTimer * 2) * 0.02;

        ctx.rotate(this.angle + Math.PI / 2 + bobAngle);
        const spriteImg = Assets[this.spriteName];
        
        if (spriteImg && spriteImg.width > 0) { 
            // --- AQUI ESTÁ O TAMANHO DO INIMIGO ---
            // Mude de 48 para algo maior (ex: 64 ou 70) se quiser uma imagem maior (não a hitbox)
            const size = 60 * breathScale; // Aumentado de 48 para 68
            
            ctx.drawImage(spriteImg, -size / 2, -size / 2, size, size); 
        }
        else { ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(0, 2, 16, 6); }
        ctx.filter = 'none'; ctx.restore();

        // Ícone de Alerta: "!" quando vê o jogador
        if (this.alertLevel > 0 && this.alertLevel < 4.8) { 
            // Mostra "!" se estiver em alerta, mas não exatamente no momento do tiro (pra não poluir)
            ctx.fillStyle = '#ff0'; 
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText("!", 10, -20);
        }

        // --- BARRA DE HP DO INIMIGO ---
        if (this.hp < this.maxHp) { 
            const barW = 26;
            const barH = 4;
            const yOff = -16; // Posição acima da cabeça

            // 1. Fundo (Background da barra)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(sx - 1, sy + yOff - 1, barW + 2, barH + 2);

            // 2. Preenchimento (Barra de Vida)
            const hpPct = Math.max(0, this.hp / this.maxHp);
            
            // Cor sólida agressiva (Vermelho Sangue)
            ctx.fillStyle = '#d63031'; 
            ctx.fillRect(sx, sy + yOff, barW * hpPct, barH);

            // 3. Moldura (Border)
            // Dá um acabamento mais "nítido"
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx - 1.5, sy + yOff - 1.5, barW + 3, barH + 3);
        }
    }
}

export class Tree {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        
        // Sorteia qual sprite usar (1 a 3)
        this.spriteName = `tree${M.randInt(1, 3)}`;
        
        // Sorteia tamanho: 2 ou 3 tiles
        this.sizeTiles = Math.random() < 0.6 ? 2 : 3;
        this.pixelSize = this.sizeTiles * TILE_SIZE;
        
        // Pivô centralizado na árvore (já que é um quadrado)
        this.pivotX = this.pixelSize / 2;
        this.pivotY = this.pixelSize / 2;

        // Variaveis de animação (Wave/Wind)
        this.swaySpeed = M.rand(0.5, 1.2); 
        this.swayPhase = M.rand(0, 100);   
        this.swayAmount = M.rand(0.02, 0.05); 
        this.timer = 0;
    }

    update(dt) {
        this.timer += dt;
    }

    // --- SOMBRA CÍRCULAR TOP-DOWN ---
    drawShadow(ctx, cam) {
        const sx = this.x - cam.renderX;
        const sy = this.y - cam.renderY;

        ctx.save();
        
        // Configuração da distância da sombra
        const shadowDist = 24; 
        
        // Translada para a posição da sombra
        ctx.translate(sx + this.pivotX + shadowDist, sy + this.pivotY + shadowDist);
        
        // Rotação sutil (acompanha o vento)
        const rotation = Math.sin(this.timer * this.swaySpeed + this.swayPhase) * this.swayAmount;
        ctx.rotate(rotation);

        // Define o raio da sombra
        const radius = this.pixelSize * 0.6; // Um pouquinho maior para compensar o fade nas bordas

        // Gradiente Radial em vez de Blur
        // (x0, y0, r0, x1, y1, r1) -> Do centro (r=0) para a borda (r=radius)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        
        // Configuração das cores para parecer uma sombra difusa
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');   // Centro mais escuro
        grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)'); // Meio termo
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');     // Borda invisível (suavidade)

        ctx.fillStyle = grad;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    // Desenha a copa da árvore (com transparência dinâmica)
    drawCanopy(ctx, cam, player) { 
        const sprite = Assets[this.spriteName];
        if (!sprite) return;

        const sx = this.x - cam.renderX;
        const sy = this.y - cam.renderY;

        // Verifica se o player está "atrás/embaixo" da árvore
        const dist = M.dist(this.x + this.pivotX, this.y + this.pivotY, player.x + 12, player.y + 12);
        
        // Se estiver perto (passando por baixo), fica transparente
        const targetAlpha = dist < 60 ? 0.3 : 1.0; 

        ctx.save();
        ctx.translate(sx + this.pivotX, sy + this.pivotY);
        
        // Animação de vento
        const rotation = Math.sin(this.timer * this.swaySpeed + this.swayPhase) * this.swayAmount;
        ctx.rotate(rotation);
        
        // Leve escala pulsante para dar "vida"
        const scale = 1.0 + Math.sin(this.timer * this.swaySpeed * 1.5) * 0.02;
        ctx.scale(scale, scale);

        ctx.globalAlpha = targetAlpha; 

        // Desenha a copa centralizada
        ctx.drawImage(sprite, -this.pivotX, -this.pivotY, this.pixelSize, this.pixelSize);
        ctx.restore();
    }
}

export class DustSystem {
    constructor(count) {
        this.particles = [];
        // Cria partículas espalhadas pela tela inteira
        for(let i=0; i<count; i++) {
            this.particles.push({
                x: Math.random() * 1920, // Área larga
                y: Math.random() * 1080,
                vx: (Math.random() - 0.5) * 10, // Movimento lento aleatório
                vy: (Math.random() - 0.5) * 10,
                size: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.15 + 0.05 // Bem transparente
            });
        }
    }

    update(dt) {
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Wrap around (Se sair da tela, volta do outro lado)
            if (p.x < 0) p.x += 1920;
            if (p.x > 1920) p.x -= 1920;
            if (p.y < 0) p.y += 1080;
            if (p.y > 1080) p.y -= 1080;
        });
    }

    draw(ctx, cam) {
        ctx.save();
        ctx.fillStyle = '#fff';
        
        // Fator de Parallax: Quanto menor, mais "perto" da câmera parece estar
        // 0.0 = Preso na câmera (HUD)
        // 1.0 = Preso no chão
        const parallax = 0.9; 

        // Calcula offset do parallax baseado na posição da câmera
        // Usamos módulo (%) para que a poeira se repita infinitamente sem precisar de milhões de partículas
        const offX = (cam.renderX * parallax) % 1920;
        const offY = (cam.renderY * parallax) % 1080;

        this.particles.forEach(p => {
            // Posição final na tela
            let sx = p.x - offX;
            let sy = p.y - offY;

            // Corrige se wrap do módulo deixou buracos
            if (sx < 0) sx += 1920;
            if (sy < 0) sy += 1080;
            
            // Só desenha se estiver na tela visível
            if (sx > 0 && sx < window.innerWidth && sy > 0 && sy < window.innerHeight) {
                ctx.globalAlpha = p.alpha;
                ctx.fillRect(sx, sy, p.size, p.size);
            }
        });
        ctx.restore();
    }
}

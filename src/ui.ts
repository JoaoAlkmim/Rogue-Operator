/**
 * ui.js
 * Gerencia HUD, Menus e Feedback Visual
 */
import { WEAPONS, META_ITEMS, PERKS } from './constants.js';

export const UI = {
    show(id) { 
        document.querySelectorAll('.menu-screen').forEach(el => el.classList.remove('active')); 
        if(id) document.getElementById(id).classList.add('active');
        
        const topUi = document.getElementById('top-right-ui');
        if(!id && topUi) topUi.style.display = 'block'; 
        else if(topUi && id !== 'menu-pause') topUi.style.display = 'none'; 
    },
    updateHudFull(game) { 
        this.updateHp(game.player); 
        this.updateAmmo(game.player); 
        this.renderWeaponBar(game.player);
        const moneyEl = document.getElementById('meta-money-hud');
        if(moneyEl) moneyEl.innerText = game.stats.money;
    },
    updateMoney(amount) {
        const moneyEl = document.getElementById('meta-money-hud');
        if(moneyEl) moneyEl.innerText = Math.floor(amount);
    },
    updateHp(p) { 
        const hp = Math.ceil(p.hp);
        const hpEl = document.getElementById('hud-hp');
        const barEl = document.getElementById('hp-bar-fill');
        const vig = document.getElementById('damage-vignette');
        const module = document.querySelector('.hud-module.left');
    
        if(hpEl) hpEl.innerText = Math.max(0, hp); 
        if(barEl) barEl.style.width = Math.max(0, (hp / p.maxHp) * 100) + '%'; 
        
        if(hp < p.maxHp * 0.3) {
            barEl.style.background = 'linear-gradient(90deg, #ff0000, #aa0000)'; 
            hpEl.style.color = '#ff2a2a';
            if(module) module.style.borderLeftColor = '#ff2a2a';
            if(vig) { vig.classList.add('vignette-critical'); vig.style.display = 'block'; }
        } else {
            barEl.style.background = 'linear-gradient(90deg, #45f3ff, #00aaff)'; 
            hpEl.style.color = '#fff';
            if(module) module.style.borderLeftColor = '#45f3ff';
            if(vig) { vig.classList.remove('vignette-critical'); vig.style.display = 'none'; }
        }
    },
    updateAmmo(p) { 
        const ammoEl = document.getElementById('hud-ammo');
        const weaponEl = document.getElementById('hud-weapon'); 
        const magEl = document.getElementById('hud-mag-size');
        const fireModeEl = document.querySelector('.fire-mode');
        
        if(ammoEl) ammoEl.innerText = p.weapon.ammo; 
        if(weaponEl) weaponEl.innerText = p.weapon.name; 
        if(magEl) magEl.innerText = Math.floor(p.weapon.mag * p.mods.magSize);
        if(fireModeEl) fireModeEl.innerText = p.weapon.auto ? "AUTO" : "SEMI";
        
        if(p.weapon.ammo <= p.weapon.mag * 0.3) ammoEl.style.color = '#ffb700'; 
        else ammoEl.style.color = '#fff';
        
        if(p.weapon.ammo === 0) ammoEl.style.color = '#ff2a2a'; 

        this.highlightActiveWeapon(p.currentWepIdx);
    },
    renderWeaponBar(player) {
        const bar = document.getElementById('weapon-bar');
        if(!bar) return;
        bar.innerHTML = '';
        for(let i = 0; i < 5; i++) {
            const slot = document.createElement('div'); slot.className = 'wep-slot';
            if(player.weapons[i]) {
                const name = player.weapons[i].name.split(' ')[0].substring(0, 4);
                slot.innerText = name;
            } else {
                slot.innerHTML = `<span style="opacity:0.3">${i+1}</span>`;
            }
            bar.appendChild(slot);
        }
        this.highlightActiveWeapon(player.currentWepIdx);
    },
    highlightActiveWeapon(idx) {
        document.querySelectorAll('.wep-slot').forEach((s, i) => {
            if(i === idx) s.classList.add('active'); else s.classList.remove('active');
        });
    },
    updatePauseMenu(player) {
        const wepContainer = document.getElementById('pause-weapons');
        const perkContainer = document.getElementById('pause-perks');
        
        if (wepContainer) {
            wepContainer.innerHTML = '';
            player.weapons.forEach(w => {
                const div = document.createElement('div'); div.className = 'pause-item';
                div.innerHTML = `<span>${w.name}</span><span class="count">${w.ammo} / ${Math.floor(w.mag * player.mods.magSize)}</span>`;
                wepContainer.appendChild(div);
            });
        }
        
        if (perkContainer) {
            perkContainer.innerHTML = '';
            const hasPerks = Object.keys(player.perks).length > 0;
            if(!hasPerks) perkContainer.innerHTML = '<div style="color:#666; font-size:12px; font-style:italic; padding:10px;">NENHUM UPGRADE OPERACIONAL.</div>';
            else {
                Object.keys(player.perks).forEach(id => {
                    const count = player.perks[id];
                    const perkInfo = PERKS.find(p => p.id === id);
                    if (perkInfo) {
                        const div = document.createElement('div'); div.className = 'pause-item';
                        div.innerHTML = `<span>${perkInfo.name}</span><span class="count">MK ${count}</span>`;
                        perkContainer.appendChild(div);
                    }
                });
            }
        }
    },
    log(msg) {
        const feed = document.getElementById('killfeed');
        if(!feed) return;
        const div = document.createElement('div'); div.className = 'kill-msg'; div.innerText = msg;
        feed.prepend(div); if(feed.children.length > 5) feed.lastChild.remove();
    },
    triggerStreak(count) {
        const el = document.getElementById('killstreak-display');
        if(!el) return;

        const intensity = Math.min(count, 10);
        el.innerText = `${count}x KILL`;
        
        if (count < 3) el.style.color = '#fff';
        else if (count < 6) el.style.color = '#ffb700';
        else el.style.color = '#ff2a2a';

        const size = 32 + (intensity * 8);
        el.style.fontSize = `${size}px`;

        el.classList.remove('streak-pop');
        void el.offsetWidth;
        el.classList.add('streak-pop');

        if (this.streakTimeout) clearTimeout(this.streakTimeout);
        this.streakTimeout = setTimeout(() => {
            el.style.fontSize = '0px'; 
        }, 3000);
    }
};

export const Meta = {
    // Adicionei dashCool e reloadSpd no default para garantir compatibilidade
    data: { money: 0, upgrades: {}, bestLevel: 0, bestKills: 0, antiAliasing: true }, 
    
    load() { 
        const s = localStorage.getItem('cs_rogue_v4'); 
        if(s) {
            const loaded = JSON.parse(s);
            this.data = { ...this.data, ...loaded };
        }
        this.updateMenu(); 
    },
    
    save() { localStorage.setItem('cs_rogue_v4', JSON.stringify(this.data)); },
    
    reset() { localStorage.removeItem('cs_rogue_v4'); location.reload(); },
    
    getUpgradeVal(key) { 
        const item = META_ITEMS.find(i => i.key === key); 
        const lvl = this.data.upgrades[key] || 0; 
        return item ? lvl * item.inc : 0; 
    },
    
    buy(key, audioCallback) {
        const item = META_ITEMS.find(i => i.key === key); 
        const lvl = this.data.upgrades[key] || 0;
        
        if (lvl >= item.maxLvl) return; // Segurança extra

        const cost = Math.floor(item.cost * Math.pow(1.3, lvl));
        
        if(this.data.money >= cost) { 
            this.data.money -= cost; 
            this.data.upgrades[key] = lvl + 1; 
            this.save(); 
            this.renderShop(audioCallback); 
            if(audioCallback) audioCallback(); 
            this.updateMenu(); 
        }
    },
    
    updateMenu() { 
        const elMoney = document.getElementById('meta-money'); 
        const elLvl = document.getElementById('meta-best-lvl');
        const elKills = document.getElementById('meta-best-kills');

        if(elMoney) elMoney.innerText = Math.floor(this.data.money);
        if(elLvl) elLvl.innerText = this.data.bestLevel || 0;
        if(elKills) elKills.innerText = this.data.bestKills || 0;
    },

    renderShop(audioCallback) {
        const moneyDisplay = document.getElementById('shop-money-display');
        if(moneyDisplay) moneyDisplay.innerText = Math.floor(this.data.money);

        const container = document.getElementById('shop-container'); 
        if(!container) return; 
        container.innerHTML = '';

        // Agrupa itens por categoria
        const categories = { 'OFFENSE': [], 'DEFENSE': [], 'TACTICAL': [] };
        META_ITEMS.forEach(item => {
            if(categories[item.category]) categories[item.category].push(item);
        });

        // Renderiza cada categoria
        Object.keys(categories).forEach(cat => {
            if (categories[cat].length === 0) return;

            // Título da Categoria
            const catTitle = document.createElement('div');
            catTitle.className = `shop-category-title cat-${cat.toLowerCase()}`;
            catTitle.innerText = cat === 'OFFENSE' ? 'SISTEMAS DE ARMAS' : (cat === 'DEFENSE' ? 'SOBREVIVÊNCIA' : 'SUPORTE TÁTICO');
            container.appendChild(catTitle);

            // Grid para os itens
            const grid = document.createElement('div');
            grid.className = 'shop-category-grid';

            categories[cat].forEach(item => {
                const lvl = this.data.upgrades[item.key] || 0; 
                const cost = Math.floor(item.cost * Math.pow(1.3, lvl));
                const isMaxed = lvl >= item.maxLvl;

                // Cálculo visual do stats (Ex: +5% -> +10%)
                // Tratamento especial para percentuais vs inteiros
                const formatVal = (v) => (item.inc < 1 && item.inc > -1) ? Math.round(v * 100) + '%' : v;
                
                const currentVal = formatVal(lvl * item.inc);
                const nextVal = formatVal((lvl + 1) * item.inc);
                
                // Gera os "Pips" (Indicadores de nível ◼◼◻◻◻)
                let pipsHTML = '<div class="level-pips">';
                for(let i=0; i<item.maxLvl; i++) {
                    pipsHTML += `<div class="pip ${i < lvl ? 'active' : ''}"></div>`;
                }
                pipsHTML += '</div>';

                const div = document.createElement('div'); 
                div.className = `shop-item ${isMaxed ? 'maxed' : ''}`;
                
                div.innerHTML = `
                    <div class="shop-icon">${item.icon}</div>
                    <div class="shop-info">
                        <div class="shop-header">
                            <span class="shop-name">${item.name}</span>
                            ${pipsHTML}
                        </div>
                        <div class="shop-desc">${item.desc}</div>
                        <div class="shop-stats">
                            <span class="curr-stat">ATUAL: <span class="val">${currentVal}</span></span>
                            ${!isMaxed ? `<span class="arrow">➜</span> <span class="next-stat">PRÓX: <span class="val">${nextVal}</span></span>` : ''}
                        </div>
                    </div>
                    <button class="btn-shop-buy ${isMaxed ? 'btn-maxed' : ''}" id="buy-${item.key}" ${this.data.money < cost || isMaxed ? 'disabled' : ''}>
                        ${isMaxed ? 'MAX' : `$${cost}`}
                    </button>
                `;
                grid.appendChild(div);
                
                if (!isMaxed) {
                    setTimeout(() => { 
                        const btn = document.getElementById(`buy-${item.key}`); 
                        if(btn) btn.onclick = () => Meta.buy(item.key, audioCallback); 
                    }, 0);
                }
            });
            container.appendChild(grid);
        });
    }
};
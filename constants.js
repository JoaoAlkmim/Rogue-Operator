/**
 * CONFIGURAÇÕES GERAIS DO MUNDO
 */
export const TILE_SIZE = 48; 
export const SCREEN = { w: window.innerWidth, h: window.innerHeight };

// Configuração de Variedade de Texturas ---
export const TEXTURE_VARIATIONS = {
    floors: 5, // Mude aqui quando adicionar mais imagens de chão
    walls: 5   // Mude aqui quando adicionar mais imagens de parede
};

/**
 * SISTEMA DE ILUMINAÇÃO (RAYCASTING)
 */
export const LIGHT_SETTINGS = {
    rayCount: 360,      // Qualidade da luz: 360 = decente e leve, 720 = bonito mas pesado
    radius: 512,        // Alcance da visão
    darkness: 0.99      // Nível da penumbra
};

/**
 * PALETA DE CORES
 */
export const COLORS = {
    floor: '#161616', floor2: '#1a1a1a',
    wall: '#2d2d2d', wallTop: '#3a3a3a',
    crate: '#5a4632', crateTop: '#755b41',
    blood: ['#4a0d0d', '#5e1212', '#360505']
};

/**
 * REPOSITÓRIO DE ASSETS
 */
export const Assets = {
    // Agora preparamos slots para as variações
    tree1: new Image(), tree2: new Image(), tree3: new Image(),
    box: new Image(),
    player: new Image(), 
    inimigo1: new Image(), inimigo2: new Image(), inimigo3: new Image(), inimigo4: new Image(),
    sounds: {}
};

/**
 * UTILITÁRIOS MATEMÁTICOS
 */
export const M = {
    rand: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    checkRect: (r1, r2) => r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y,
    rad: (deg) => deg * (Math.PI / 180)
};

/**
 * PADRÕES DE RECUO (RECOIL PATTERNS) - NOVO!
 * Define como a mira "sobe" e "dança" durante o fogo contínuo (Spray).
 * Cada array interno é [DesvioHorizontal, DesvioVertical] em graus relativos.
 */
export const RECOIL_PATTERNS = {
    // Padrão Rifle (Sobe e depois vai para os lados - Estilo AK/M4)
    'rifle': [
        [0, -1.5], [0, -3.0], [0, -4.5],      // Sobe forte (Tiros 1-3)
        [0.5, -5.0], [1.0, -5.0], [1.5, -4.0],// Puxa direita (Tiros 4-6)
        [-1.0, -3.0], [-2.0, -2.0],           // Puxa esquerda (Tiros 7-8)
        [0, -1.0]                             // Estabiliza (Tiro 9+)
    ],
    // Padrão SMG (Sobe rápido mas com menos força, mais jitter lateral)
    'smg': [
        [0, -1.0], [0, -2.0], 
        [0.8, -2.5], [-0.8, -2.5], 
        [1.2, -3.0], [-1.2, -3.0]
    ],
    // Padrão Pistola (Apenas sobe um pouco)
    'pistol': [
        [0, -2.0], [0, -3.0]
    ]
};

/**
 * ARMAS
 * Atualizado com recoilType e recoilRecovery
 */
export const WEAPONS = {
    'glock': { 
        id: 'glock', name: "Glock-18", dmg: 14, rate: 2.5, mag: 20, spread: 4, reload: 1.2, auto: false, range: 400, shake: 5, rare: 'comum',
        recoilType: 'pistol', recoilRecovery: 10 
    },
    'usp':   { 
        id: 'usp', name: "USP-S", dmg: 22, rate: 2, mag: 12, spread: 2, reload: 1.4, auto: false, range: 500, shake: 5, rare: 'comum',
        recoilType: 'pistol', recoilRecovery: 12 
    },
    'nova':  { 
        id: 'nova', name: "Nova", dmg: 10, rate: 0.5, mag: 8, spread: 15, reload: 2.0, auto: false, pellets: 6, range: 250, shake: 10, rare: 'comum',
        recoilType: 'pistol', recoilRecovery: 5 
    },
    'mp5':   { 
        id: 'mp5', name: "MP5-SD", dmg: 11, rate: 5, mag: 30, spread: 6, reload: 1.8, auto: true, range: 450, shake: 5, rare: 'raro',
        recoilType: 'smg', recoilRecovery: 15 
    },
    'ak47':  { 
        id: 'ak47', name: "AK-47", dmg: 28, rate: 4, mag: 30, spread: 5, reload: 2.2, auto: true, range: 600, shake: 7, rare: 'raro',
        recoilType: 'rifle', recoilRecovery: 12 // Recuperação lenta
    },
    'm4a1':  { 
        id: 'm4a1', name: "M4A1", dmg: 24, rate: 4.5, mag: 25, spread: 3, reload: 2.0, auto: true, range: 650, shake: 6, rare: 'raro',
        recoilType: 'rifle', recoilRecovery: 14 // Recuperação média
    },
    'deagle':{ 
        id: 'deagle', name: "Deagle", dmg: 55, rate: 1.5, mag: 7, spread: 1, reload: 2.0, auto: false, range: 700, shake: 15, rare: 'lendario',
        recoilType: 'pistol', recoilRecovery: 8 
    },
    'awp':   { 
        id: 'awp', name: "AWP", dmg: 110, rate: 0.25, mag: 5, spread: 0, reload: 3.5, auto: false, range: 1000, shake: 30, rare: 'lendario',
        recoilType: 'pistol', recoilRecovery: 5 
    },
    'machete': { 
        id: 'machete', name: "Machete", dmg: 40, rate: 1, mag: 999, spread: 0, reload: 0, auto: true, range: 45, shake: 10, inPool: false,
        recoilType: null, recoilRecovery: 0 
    },
    'crossbow': { 
        id: 'crossbow', name: 'TAC-CROSSBOW', dmg: 160, rate: 1.0, mag: 1, reload: 1.3, range: 1500, speed: 28, shake: 35, spread: 0.01, auto: false, rare: 'lendario', inPool: true,
        recoilType: 'pistol', recoilRecovery: 5 
    }
};

/**
 * TIPOS DE INIMIGOS
 */
export const ENEMY_TYPES = {
    1: { sprite: 'inimigo1', hp: 30, speed: 120, weapon: 'glock', ai: 'tactical', color: '#5d79ae' },
    2: { sprite: 'inimigo2', hp: 60, speed: 100, weapon: 'ak47',  ai: 'aggressive', color: '#8e44ad' },
    3: { sprite: 'inimigo3', hp: 40, speed: 80,  weapon: 'awp',   ai: 'sniper', color: '#27ae60' },
    4: { sprite: 'inimigo4', hp: 80, speed: 170, weapon: 'machete', ai: 'rush', color: '#c44e4e' }
};

/**
 * PERKS (Upgrades Acumulativos)
 */
export const PERKS = [
    // --- Básicos ---
    { id: 'hp', name: "Kit Médico", desc: "+30 HP Máximo (Cura Total)", rare: 'comum', func: (p) => { p.maxHp += 30; p.hp = p.maxHp; } },
    { id: 'dmg', name: "Munição FMJ", desc: "+15% Dano (Stack)", rare: 'comum', func: (p) => { p.mods.dmgMult += 0.15; } },
    { id: 'rate', name: "Gatilho Leve", desc: "+10% Cadência (Stack)", rare: 'comum', func: (p) => { p.mods.rateMult += 0.10; } },
    
    // --- Táticos ---
    { id: 'speed', name: "Adrenalina", desc: "+10% Velocidade Movimento", rare: 'raro', func: (p) => { p.speedBase *= 1.1; } },
    { id: 'reload', name: "Mags Táticos", desc: "-15% Tempo de Recarga", rare: 'raro', func: (p) => { p.mods.reloadMult *= 0.85; } },
    { id: 'mag', name: "Pente Estendido", desc: "+25% Tamanho do Pente", rare: 'raro', func: (p) => { p.mods.magSize += 0.25; } },
    
    // --- Avançados ---
    { id: 'multi', name: "Cano Duplo", desc: "+1 Projétil por tiro", rare: 'lendario', func: (p) => { p.mods.multishot += 1; } },
    { id: 'ice', name: "Munição Criogênica", desc: "+1.5s Duração do Congelamento", rare: 'raro', func: (p) => { p.mods.freezeTime += 1.5; } },
    { id: 'boom', name: "Pontas Explosivas", desc: "+30 Raio de Explosão", rare: 'lendario', func: (p) => { p.mods.explosiveRadius += 30; } },
    { id: 'exec', name: "Guilhotina", desc: "Executa com +15% de HP restante", rare: 'raro', func: (p) => { p.mods.executeLimit += 0.15; } },
    { id: 'push', name: "Munição de Impacto", desc: "+100 Força de Empurrão", rare: 'raro', func: (p) => { p.mods.knockbackForce += 100; } },
    { id: 'lowhp', name: "Berserker", desc: "+25% Bônus máx. de dano", rare: 'raro', func: (p) => { p.mods.berserkCap += 0.25; } },

    // --- Clássicos Lendários ---
    { id: 'vamp', name: "Vampirismo", desc: "+2 Cura por abate (Stack)", rare: 'lendario', func: (p) => { p.mods.lifesteal += 2; } },
    { id: 'crit', name: "Lente Focal", desc: "+10% Chance Crítica (Stack)", rare: 'lendario', func: (p) => { p.mods.critChance += 0.1; } },
    { id: 'wall', name: "Balas Fantasma", desc: "+1 Alvo perfurado (Penetração)", rare: 'lendario', func: (p) => { p.mods.wallBang += 1; } },
    { id: 'rico', name: "Ricochete", desc: "+1 Rebatida na parede", rare: 'lendario', func: (p) => { p.mods.ricochet += 1; } }
];

/**
 * META ITENS (Loja Persistente) 
 */
export const META_ITEMS = [
    // --- OFENSIVA (RED) ---
    { key: 'startDmg', category: 'OFFENSE', icon: '💀', name: "Polvora Fina", cost: 400, inc: 0.05, maxLvl: 10, desc: "Aumenta o dano base de todas as armas." },
    { key: 'acc', category: 'OFFENSE', icon: '🎯', name: "Laser Tático", cost: 300, inc: 0.1, maxLvl: 5, desc: "Reduz o espalhamento (spread) das balas." },
    { key: 'critStart', category: 'OFFENSE', icon: '⚡', name: "Lente Focal", cost: 600, inc: 0.02, maxLvl: 10, desc: "Aumenta a chance de Dano Crítico." },
    { key: 'reloadSpd', category: 'OFFENSE', icon: '🔄', name: "Mags Lubrificados", cost: 350, inc: 0.05, maxLvl: 5, desc: "Reduz o tempo de recarga das armas." },

    // --- SOBREVIVÊNCIA (BLUE) ---
    { key: 'startHp', category: 'DEFENSE', icon: '🛡️', name: "Colete Kevlar", cost: 200, inc: 10, maxLvl: 10, desc: "Aumenta a Vida Máxima inicial." },
    { key: 'regen', category: 'DEFENSE', icon: '💉', name: "Nanobots", cost: 600, inc: 0.2, maxLvl: 5, desc: "Concede regeneração passiva de vida." },
    { key: 'dodge', category: 'DEFENSE', icon: '💨', name: "Reflexos", cost: 450, inc: 0.05, maxLvl: 5, desc: "Chance percentual de ignorar dano recebido." },
    { key: 'vampStart', category: 'DEFENSE', icon: '🩸', name: "Sede de Sangue", cost: 800, inc: 0.2, maxLvl: 5, desc: "Cura uma pequena quantidade de vida ao matar." },

    // --- TÁTICO / UTILITÁRIOS (YELLOW) ---
    { key: 'startSpd', category: 'TACTICAL', icon: '👟', name: "Botas Leves", cost: 300, inc: 5, maxLvl: 10, desc: "Aumenta a velocidade de movimento base." },
    { key: 'dashCool', category: 'TACTICAL', icon: '⏩', name: "Hidráulica", cost: 500, inc: 0.1, maxLvl: 5, desc: "Reduz o tempo de recarga do Dash." },
    { key: 'greed', category: 'TACTICAL', icon: '💰', name: "Contrato", cost: 250, inc: 0.1, maxLvl: 5, desc: "Aumenta o ouro ganho por abate." },
    { key: 'luck', category: 'TACTICAL', icon: '🍀', name: "Trevo", cost: 500, inc: 1, maxLvl: 5, desc: "Aumenta a chance de drop de armas raras." },
    { key: 'income', category: 'TACTICAL', icon: '📈', name: "Investimento", cost: 400, inc: 10, maxLvl: 10, desc: "Ganha ouro extra ao completar níveis." },
    { key: 'startWep', category: 'TACTICAL', icon: '🔫', name: "Licença de Porte", cost: 2000, inc: 1, maxLvl: 1, desc: "Começa a run com uma arma Tier 2 aleatória." }
];
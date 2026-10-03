/**
 * main.js
 * Ponto de entrada da aplicação. Gerencia o carregamento de assets (Imagens e Sons)
 * e a inicialização dos sistemas principais do jogo.
 */
import { Game, AudioSys } from './game.js';
import { SCREEN, Assets, WEAPONS, TEXTURE_VARIATIONS } from './constants.js';

window.onload = async () => {
    const canvas = document.getElementById('gameCanvas');
    const loadingDiv = document.getElementById('debug-log');
    
    function updateSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        SCREEN.w = window.innerWidth;
        SCREEN.h = window.innerHeight;
    }
    window.addEventListener('resize', updateSize);
    updateSize();

    AudioSys.init();

    // --- DEFINIÇÃO DE RECURSOS (ASSETS) ---
    const images = {
        box: 'assets/box.png',
        player: 'assets/player.png',
        inimigo1: 'assets/inimigo1.png',
        inimigo2: 'assets/inimigo2.png',
        inimigo3: 'assets/inimigo3.png',
        inimigo4: 'assets/inimigo4.png'
    };

    // --- Carregamento Dinâmico de Pisos, arvores e Paredes ---
    // Gera floor1 até floor5 (ou o numero que estiver no constants.js)
    for (let i = 1; i <= TEXTURE_VARIATIONS.floors; i++) {
        images[`floor${i}`] = `assets/floor${i}.png`;
    }

    // Gera wall1 até wall5
    for (let i = 1; i <= TEXTURE_VARIATIONS.walls; i++) {
        images[`wall${i}`] = `assets/wall${i}.png`;
    }
    // Gera tree1 até tree3
    for (let i = 1; i <= 3; i++) {
        images[`tree${i}`] = `assets/tree${i}.png`;
    }
    // -----------------------------------------------------

    // --- CARREGAMENTO AUTOMÁTICO DAS ARMAS ---
    // Adiciona cada arma definida em constants.js à lista de imagens para carregar
    Object.keys(WEAPONS).forEach(key => {
        // Ignora a machete se ela não tiver sprite de player, ou carrega se tiver
        if (key !== 'machete') {
            images[key] = `assets/${key}.png`;
        }
    });

    const sounds = {
        reload: 'assets/sounds/reload.wav',
        machete: 'assets/sounds/machete.wav',
        bgm: 'assets/sounds/KillzoneProtocol.wav'
    };
    
    // Carregamento Automático dos Killstreaks (1 a 10)
    for(let i = 1; i <= 10; i++) {
        // Cria chaves como 'kill1', 'kill2'... apontando para '1kill.wav', '2kill.wav'...
        sounds[`kill${i}`] = `assets/sounds/${i}kill.wav`;
    }

    Object.keys(WEAPONS).forEach(key => {
        if(key !== 'machete') sounds[key] = `assets/sounds/${key}.wav`;
    });

    // --- SISTEMA DE CARREGAMENTO (LOADER) ---
    let loadedCount = 0;
    const totalCount = Object.keys(images).length + Object.keys(sounds).length;

    const loadImage = (key, src) => {
        return new Promise((resolve) => {
            // Cria dinamicamente a propriedade no objeto Assets se não existir
            if (!Assets[key]) Assets[key] = new Image();
            
            Assets[key].src = src;
            Assets[key].onload = () => { updateProgress(); resolve(); };
            Assets[key].onerror = () => { 
                console.warn(`Asset opcional não encontrado: ${src}`); 
                updateProgress(); 
                resolve(); // Resolve mesmo com erro para não travar o jogo
            };
        });
    };

    const loadSound = async (key, src) => {
        try {
            const response = await fetch(src);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await AudioSys.ctx.decodeAudioData(arrayBuffer);
            Assets.sounds[key] = audioBuffer;
        } catch (e) { console.warn(`Erro ao carregar som: ${src}`); } finally { updateProgress(); }
    };

    function updateProgress() {
        loadedCount++;
        if(loadingDiv) {
            const progress = Math.floor((loadedCount / totalCount) * 100);
            loadingDiv.innerText = `Carregando Operação... ${progress}%`;
        }
    }

    // --- INICIALIZAÇÃO ---
    if(loadingDiv) loadingDiv.style.display = 'block';
    const promises = [];
    for(let key in images) promises.push(loadImage(key, images[key]));
    for(let key in sounds) promises.push(loadSound(key, sounds[key]));

    await Promise.all(promises);

    if(loadingDiv) loadingDiv.style.display = 'none';
    console.log("Assets sincronizados. Iniciando Rogue Operator...");
    Game.init(canvas);
};
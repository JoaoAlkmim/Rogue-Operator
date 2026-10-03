# Game Design Document (GDD) - CS: ROGUE OPERATOR

## 1. Visão Geral do Jogo
**Nome:** CS: Rogue Operator (Tactical Simulation v4.1)
**Gênero:** Top-Down Tactical Shooter / Roguelite
**Plataforma:** Web (HTML5 Canvas / Vanilla JavaScript)
**Câmera:** Top-Down 2D
**Descrição:** Um shooter tático focado em sobrevivência em hordas (waves), com mecânicas avançadas de física, iluminação dinâmica (Raycasting) e um sistema robusto de progressão dupla (Perks por nível durante a *run* e Meta Progressão no Mercado Negro).

---

## 2. Arquitetura de Sistemas (ES6 Modules)
O projeto é construído em JavaScript Modular puro, dispensando bibliotecas externas pesadas e garantindo performance através de separação de responsabilidades.
*   **`main.js`**: Ponto de entrada (Bootstrap). Gerencia o redimensionamento da tela, inicializa o sistema de áudio (Web Audio API) e faz o pré-carregamento assíncrono de todos os assets (`Promise.all`) antes de chamar o `Game.init()`.
*   **`game.js`**: Núcleo do loop (Core Engine). Gerencia os *states* (Update e Draw), controle de tempo (Delta Time), spawns de hordas, eventos de mapa e integra os sistemas isolados.
*   **`constants.js`**: Repositório central de configuração. Mantém o equilíbrio (Balanceamento) do jogo livre de código lógico. Armazena dicionários de Armas, Inimigos, Cores, Perks e Upgrades do Mercado Negro.
*   **`entities.js`**: Gerencia as Entidades. Contém as classes `Player`, `Enemy`, `Particle` (sangue, cápsulas, explosões, nevoeiro, faíscas), `FloatingText`, etc.
*   **`physics.js`**: Sistema de Colisão Avançado. Contém a classe `SpatialHash`, que divide o mapa em um grid para verificar colisões em O(1), evitando testes O(n²) e suportando dezenas de inimigos simultâneos.
*   **`lighting.js`**: Motor de Renderização de Luz. Executa Raycasting (configurável para 360 ou 720 raios) para simular oclusão e campo de visão real, adicionando tensão tática.
*   **`ui.js`**: Gerenciador de Interface. Manipula o DOM HTML para telas de menu (Shop, Level Up, Pause, Morte) e atualiza o HUD (Vida, Munição, Dinheiro).

> **Aviso de Prevenção de Redundância:** Ao criar novas funcionalidades, não injete lógicas pesadas no `game.js`. Se for algo visual complexo, vai em `lighting.js` ou num novo arquivo de render. Se for item de balanceamento, cadastre APENAS no `constants.js`.

---

## 3. Armamento e Mecânicas de Tiro
O sistema de tiro suporta *Spread* (espalhamento radial dinâmico) e um inovador sistema de *Recoil Pattern* (Padrão de Recuo), categorizado por arquétipos. O "Sway" (peso da arma) é processado no `entities.js`.

### Padrões de Recuo (`RECOIL_PATTERNS`)
*   **Rifle:** Puxa fortemente para cima nos 3 primeiros tiros, depois deriva lateralmente e estabiliza (Ex: AK-47, M4A1).
*   **SMG:** Recuo vertical baixo, mas com alto "jitter" (tremor lateral alternado) (Ex: MP5-SD).
*   **Pistol:** Puxa verticalmente a cada clique, com rápida recuperação (Ex: Glock, USP-S).

### Inventário Ativo (`WEAPONS`)
*   **Pistolas:** Glock-18 (Auto/Burst), USP-S (Precisão), Deagle (Lendária, Alto Dano).
*   **Submetralhadoras:** MP5-SD.
*   **Escopetas:** Nova (Multi-pellets).
*   **Rifles:** AK-47 (Alto Dano, Recuo Pesado), M4A1 (Equilibrado).
*   **Snipers/Especiais:** AWP (Hit-kill, Lentidão), TAC-CROSSBOW.
*   **Melee:** Machete.

---

## 4. Inimigos (IA e Comportamento)
Categorizados em `ENEMY_TYPES`, escalando por HP, Arma e IA.
1.  **Azul (Tier 1):** Usa Glock, comportamento *Tactical*.
2.  **Roxo (Tier 2):** Usa AK-47, comportamento *Aggressive* (Rush de tiro).
3.  **Verde (Tier 3):** Usa AWP, comportamento *Sniper* (Mantém distância e tenta alinhar tiros).
4.  **Vermelho (Tier 4):** Usa Machete, comportamento *Rush* (Kamikaze super rápido).

---

## 5. Progressão In-Run (Perks de Nível)
Ao subir de nível, o jogador seleciona *Upgrades* cumulativos (`PERKS` em `constants.js`).
*   **Básicos:** Kit Médico, Munição FMJ (Dano), Gatilho Leve (Cadência).
*   **Táticos:** Adrenalina (Velocidade), Mags Táticos (Reload), Pente Estendido.
*   **Avançados/Elementos:** Cano Duplo, Munição Criogênica, Pontas Explosivas, Guilhotina, Munição de Impacto, Berserker.
*   **Lendários:** Vampirismo (Lifesteal), Lente Focal (Crítico), Balas Fantasma (Penetração), Ricochete.

---

## 6. Meta-Progressão (Mercado Negro)
Sistema persistente onde o jogador gasta "Dinheiro/Ouro" arrecadado em runs passadas (`META_ITEMS`).
*   **Ofensiva (Red):** Pólvora Fina (Dano Base), Laser Tático (Precisão), Lente Focal (Crit), Mags Lubrificados.
*   **Sobrevivência (Blue):** Colete Kevlar (HP Inicial), Nanobots (Regeneração Passiva), Reflexos (Esquiva), Sede de Sangue.
*   **Tática/Utilitários (Yellow):** Botas Leves (Move Speed), Hidráulica (Dash CD), Contrato (Mais Ouro), Trevo (Chance de Raros), Investimento, Licença de Porte (Começa com Arma Tier 2).

---

## 7. Gráficos, Efeitos e Partículas
*   **Renderização Otimizada:** *Decal Context* separado para rastros de tiro e sangue, poupando a thread principal.
*   **Efeitos Modulares (`Particle`):** Cápsulas (`shell`) com física de fricção, projéteis perfurantes, explosões com variação angular, e faíscas.
*   **Filtros CSS/SVG:** Aberração Cromática e vinhetas de dano para feedback visual.
*   **Tile System:** Variação de pisos (floor1-5) e paredes (wall1-5) carregados dinamicamente em `TEXTURE_VARIATIONS`.

## 8. Diretrizes de Manutenção
*   **Novas Armas:** Adicionar apenas objeto em `WEAPONS` (constants.js) e seu sprite (se necessário) na pasta assets (nomedarma.png). O main.js carrega o sprite automaticamente.
*   **Novos Perks:** Declarar o objeto de perk com seu id, raridade, nome e `func` no array `PERKS` (constants.js). Nenhuma alteração no UI ou Game.js é necessária.
*   **Física:** Mantenha entidades dentro do `SpatialHash` para checagem com `M.dist` ou `M.checkRect`. Nunca use loop duplo de colisão fora do Spatial Hash.


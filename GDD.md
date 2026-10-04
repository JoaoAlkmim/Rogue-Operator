# Game Design Document (GDD) - CS: ROGUE OPERATOR

## 1. Visão Geral do Jogo
**Nome:** CS: Rogue Operator (Tactical Simulation v4.1)
**Gênero:** Top-Down Tactical Shooter / Roguelite
**Plataforma:** Web (Vite + TypeScript)
**Câmera:** Top-Down 2D
**Descrição:** Um shooter tático focado em sobrevivência em hordas (waves), com mecânicas avançadas de física, iluminação dinâmica distribuída em Web Workers e um sistema robusto de progressão dupla.

---

## 2. Arquitetura de Sistemas e Performance
O projeto utiliza **TypeScript** e é compilado via **Vite**, garantindo performance AAA no navegador.
*   **`main.ts`**: Ponto de entrada (Bootstrap). Gerencia o redimensionamento da tela, inicializa o sistema de áudio (Web Audio API) e faz o pré-carregamento assíncrono de todos os assets (`Promise.all`).
*   **`game.ts`**: Núcleo do loop (Core Engine). Gerencia os *states* (Update e Draw), controle de tempo (Delta Time), spawns de hordas, eventos de mapa e integra os sistemas isolados.
*   **`constants.ts`**: Repositório central de configuração. Mantém o equilíbrio (Balanceamento) de Armas, Inimigos, Cores e Upgrades. *(Livre de chamadas de DOM para suporte a Web Workers).*
*   **`entities.ts`**: Gerencia as Entidades. Contém as classes `Player`, `Enemy`.
*   **`ParticleSystem` (Object Pooling):** Localizado em `entities.ts`, é um sistema que recicla centenas de partículas (sangue, explosões) em vez de instanciar e destruir novos objetos na memória, prevenindo *stutters* (travamentos de Garbage Collection).
*   **`physics.ts`**: Sistema de Colisão Avançado com `SpatialHash`, verificando colisões em O(1).
*   **`lighting.ts` & `raycastWorker.ts`**: Motor de Renderização de Luz. O DDA Raycasting (que calcula colisões da luz na parede) roda assincronamente em uma **Web Worker thread** (`raycastWorker.ts`), blindando a taxa de quadros (FPS) do jogo principal.
*   **`ui.ts`**: Gerenciador de Interface. Manipula o DOM HTML para telas de menu e HUD.

---

## 3. Geração de Mapa e Eventos de Cenário
*   **Algoritmo de Mapa (Cellular Automata):** A geração procedural do cenário cria cavernas orgânicas e corredores não-lineares, usando um modelo de autômatos celulares para arredondar esquinas e gerar "bolsões" naturais de *cover* (cobertura) para trocas de tiro.
*   **Eventos Interativos:** 
    *   **Barris Explosivos (Tile Vermelho):** Certas caixas (15% de chance) nascem como barris explosivos. Se destruídos, geram dano em área (AoE) letal tanto para inimigos quanto para o jogador.

---

## 4. Armamento e Mecânicas de Tiro
O sistema de tiro suporta *Spread* e um inovador sistema de *Recoil Pattern* (Padrão de Recuo).
*   **Rifle:** Puxa fortemente para cima, depois deriva lateralmente e estabiliza.
*   **SMG:** Recuo vertical baixo, mas com alto "jitter" (tremor lateral).
*   **Pistol:** Puxa verticalmente a cada clique.

### Inventário Ativo
*   Pistolas: Glock-18, USP-S, Deagle.
*   Sub/Escopetas: MP5-SD, Nova.
*   Rifles/Sniper: AK-47, M4A1, AWP, TAC-CROSSBOW.

---

## 5. Inimigos (IA Avançada e Comportamento)
Inimigos possuem comportamentos base e táticos (`combatRange`, visão via raycast).
*   **IA Tática (Sistema de Cover):** Se a vida do inimigo cair abaixo de 30% ou ele precisar recarregar a arma, a IA irá varrer o mapa buscando a parede/caixa mais próxima que bloqueie a linha de visão do jogador e correrá para lá se esconder.
*   **1. Azul:** Glock, comportamento *Tactical*.
*   **2. Roxo:** AK-47, comportamento *Aggressive* (Rush de tiro).
*   **3. Verde:** AWP, comportamento *Sniper* (Mantém distância e tenta alinhar tiros).
*   **4. Vermelho:** Machete, comportamento *Rush* (Kamikaze super rápido que ignora *cover*).

---

## 6. Progressão In-Run (Perks de Nível)
Ao subir de nível, o jogador seleciona *Upgrades* cumulativos.
*   **Básicos/Táticos:** Kit Médico, Munição FMJ, Gatilho Leve, Adrenalina, Mags Táticos.
*   **Avançados/Elementos:** Cano Duplo, Munição Criogênica, Pontas Explosivas, Guilhotina, Munição de Impacto, Berserker.
*   **Lendários:** Vampirismo (Lifesteal), Lente Focal (Crítico), Balas Fantasma (Penetração), Ricochete.

---

## 7. Meta-Progressão (Mercado Negro)
Sistema persistente onde o jogador gasta "Dinheiro" arrecadado.
*   **Ofensiva:** Pólvora Fina, Laser Tático, Lente Focal, Mags Lubrificados.
*   **Sobrevivência:** Colete Kevlar, Nanobots, Reflexos, Sede de Sangue.
*   **Tática:** Botas Leves, Hidráulica, Contrato, Trevo, Investimento, Licença de Porte.

## 8. Diretrizes de Manutenção
*   Ao criar efeitos de massa visual (tiros/sangue), use OBRIGATORIAMENTE o `ParticleSystem.spawn()` em vez de instanciar novas classes.
*   Mudanças no DDA Raycasting devem ser feitas no `raycastWorker.ts`, tendo em mente que a *worker thread* não possui acesso à árvore do DOM ou variáveis globais.

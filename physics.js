/**
 * physics.js
 * ---------------------------------------------------------------------
 * SISTEMA DE PARTICIONAMENTO ESPACIAL (SPATIAL HASHING)
 * ---------------------------------------------------------------------
 * Este módulo resolve o problema de performance O(N^2) na detecção de colisão.
 * Em vez de checar cada bala contra cada inimigo (o que causaria lag com muitos objetos),
 * dividimos o mundo em uma grade imaginária.
 * * Quando uma bala precisa checar colisão, ela pergunta à grade:
 * "Quem está na mesma célula que eu?"
 * E a grade retorna apenas os 2 ou 3 inimigos próximos, em vez de 50 ou 100.
 */

export class SpatialHash {
    /**
     * @param {number} cellSize - Tamanho de cada célula da grade em pixels. 
     * Idealmente deve ser maior que o maior objeto do jogo (ex: 128px).
     */
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    /**
     * Gera uma chave única (string) para coordenadas de grade.
     * Exemplo: x=250, y=130 (com cell 128) -> "1,1"
     */
    getKey(x, y) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    /**
     * Limpa toda a grade.
     * Deve ser chamado no início de cada frame antes de reinserir os objetos dinâmicos.
     */
    clear() {
        this.cells.clear();
    }

    /**
     * Insere uma entidade na(s) célula(s) correspondente(s).
     * Se uma entidade estiver na borda, ela pode ocupar até 4 células.
     * @param {Object} entity - Objeto com propriedades x, y, w, h.
     */
    insert(entity) {
        // Calcula os índices de início e fim da entidade na grade
        const startX = Math.floor(entity.x / this.cellSize);
        const startY = Math.floor(entity.y / this.cellSize);
        const endX = Math.floor((entity.x + entity.w) / this.cellSize);
        const endY = Math.floor((entity.y + entity.h) / this.cellSize);

        // Itera sobre todas as células que a entidade toca
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                
                // Se a célula não existe, cria o array
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                
                // Adiciona a entidade à lista desta célula
                this.cells.get(key).push(entity);
            }
        }
    }

    /**
     * Retorna uma lista de candidatos a colisão próximos à entidade fornecida.
     * @param {Object} entity - Objeto (ou área de busca) com x, y, w, h.
     * @returns {Array} Lista de entidades próximas (sem duplicatas).
     */
    query(entity) {
        const startX = Math.floor(entity.x / this.cellSize);
        const startY = Math.floor(entity.y / this.cellSize);
        const endX = Math.floor((entity.x + entity.w) / this.cellSize);
        const endY = Math.floor((entity.y + entity.h) / this.cellSize);

        const found = new Set(); // Set garante unicidade (evita checar o mesmo inimigo 2x)

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cellEntities = this.cells.get(key);
                
                if (cellEntities) {
                    for (let other of cellEntities) {
                        // Não retorna a própria entidade se ela estiver na grade
                        if (other !== entity) {
                            found.add(other);
                        }
                    }
                }
            }
        }
        
        // Retorna como Array para fácil iteração (forEach)
        return Array.from(found);
    }
}
import re

def fix_tree_and_shadows():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    # --- 1. Fix Tree Size Sync ---
    old_tree = """export class Tree {
    constructor(x, y) {
        this.x = x; 
        this.y = y;
        
        // Sorteia qual sprite usar (1 a 3)
        this.spriteName = `tree${M.randInt(1, 3)}`;
        
        // Sorteia tamanho: 2 ou 3 tiles
        this.sizeTiles = Math.random() < 0.6 ? 2 : 3;"""
    
    new_tree = """export class Tree {
    constructor(x, y, size = null) {
        this.x = x; 
        this.y = y;
        
        // Sorteia qual sprite usar (1 a 3) (se for remoto, usa um fixo ou baseado no tamanho pra nao desincronizar)
        this.spriteName = `tree${Math.abs(Math.floor(x + y)) % 3 + 1}`;
        
        // Sorteia tamanho ou usa o tamanho enviado pela rede
        this.sizeTiles = size ? size : (Math.random() < 0.6 ? 2 : 3);
        this.size = this.sizeTiles; // Para que o construtor salve o size correto no host"""
    ent = ent.replace(old_tree, new_tree)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)


    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # Make sure we use size on host too during procedural generation
    old_tree_gen = "this.trees.push(new Tree(x * TILE_SIZE, y * TILE_SIZE, size));"
    # Actually, the host was passing 'size' but the constructor wasn't accepting it! So new_tree fixes it.
    
    # --- 2. Fix Lighting System Resize Bug ---
    old_resize = """        window.addEventListener('resize', () => { 
            if (this.map) {
                // Resize do LightingSystem
                this.lighting.resize(window.innerWidth, window.innerHeight); 
            }
        });"""
    new_resize = """        window.addEventListener('resize', () => { 
            // O Lighting System NÃO deve ser redimensionado para innerWidth, ele deve espelhar a resolução base do canvas (SCREEN.w / SCREEN.h)
            // porque o CSS cuida da escala.
        });"""
    game = game.replace(old_resize, new_resize)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_tree_and_shadows()

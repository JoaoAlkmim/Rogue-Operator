import re

def modify_map():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # The smoothing logic
    cellular_automata_logic = """
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
"""

    content = content.replace("this.bakeStaticFloor();", cellular_automata_logic)
    
    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    modify_map()

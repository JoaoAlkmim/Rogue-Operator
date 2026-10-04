import re

def fix_map_dimensions():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    old_sync = """                        if (data.initMap && this.map) {
                            this.map.grid = data.initMap;
                            if (data.initBarrels) this.map.barrels = data.initBarrels;
                            if (data.initTrees) {"""
    
    new_sync = """                        if (data.initMap && this.map) {
                            this.map.grid = data.initMap;
                            this.map.h = data.initMap.length;
                            this.map.w = data.initMap[0].length;
                            if (data.initBarrels) this.map.barrels = data.initBarrels;
                            if (data.initTrees) {"""

    game = game.replace(old_sync, new_sync)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_map_dimensions()

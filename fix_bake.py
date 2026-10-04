import re

def fix_baked_shadows():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    old_sync = """                        if (data.initMap && this.map) {
                            this.map.grid = data.initMap;
                            this.map.h = data.initMap.length;
                            this.map.w = data.initMap[0].length;
                            if (data.initBarrels) this.map.barrels = data.initBarrels;
                            if (data.initTrees) {"""
    
    new_sync = """                        if (data.initMap && this.map) {
                            this.map.grid = data.initMap;
                            this.map.h = data.initMap.length;
                            this.map.w = data.initMap[0].length;
                            if (data.initBarrels) this.map.barrels = data.initBarrels;
                            if (data.initFIdx) this.map.fIdx = data.initFIdx;
                            if (data.initWIdx) this.map.wIdx = data.initWIdx;
                            this.map.floorTex = Assets[`floor${this.map.fIdx}`] || Assets.floor1;
                            this.map.wallTex = Assets[`wall${this.map.wIdx}`] || Assets.wall1;
                            
                            // RE-BAKE STATIC SHADOWS AND FLOOR
                            this.map.decalCanvas.width = this.map.w * 48; // TILE_SIZE
                            this.map.decalCanvas.height = this.map.h * 48;
                            this.map.decalCtx.clearRect(0, 0, this.map.decalCanvas.width, this.map.decalCanvas.height);
                            this.map.bakeStaticFloor();
                            this.map.decorateFloor();

                            if (data.initTrees) {"""

    game = game.replace(old_sync, new_sync)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_baked_shadows()

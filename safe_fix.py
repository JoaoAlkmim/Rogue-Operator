import re

def fix_network_sync():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # Apply the network sync fix properly
    old_sync = """                    if (data.initMap && this.map) {
                        this.map.grid = data.initMap;
                        this.map.barrels = data.initBarrels || {};
                        if (data.initFIdx) this.map.floorTex = Assets[`floor${data.initFIdx}`];
                        if (data.initWIdx) this.map.wallTex = Assets[`wall${data.initWIdx}`];
                        if (data.initTrees) {"""
                        
    new_sync = """                    if (data.initMap && this.map) {
                        this.map.grid = data.initMap;
                        this.map.h = data.initMap.length;
                        this.map.w = data.initMap[0].length;
                        this.map.barrels = data.initBarrels || {};
                        if (data.initFIdx) this.map.floorTex = Assets[`floor${data.initFIdx}`];
                        if (data.initWIdx) this.map.wallTex = Assets[`wall${data.initWIdx}`];
                        
                        // RE-BAKE SHADOWS FOR CLIENT
                        this.map.decalCanvas.width = this.map.w * 48;
                        this.map.decalCanvas.height = this.map.h * 48;
                        this.map.decalCtx.clearRect(0, 0, this.map.decalCanvas.width, this.map.decalCanvas.height);
                        
                        // Force assets if not loaded yet just in case
                        this.map.floorTex = this.map.floorTex || Assets.floor1;
                        this.map.wallTex = this.map.wallTex || Assets.wall1;
                        
                        this.map.bakeStaticFloor();
                        this.map.decorateFloor();

                        if (data.initTrees) {"""

    game = game.replace(old_sync, new_sync)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_network_sync()

import re

def modify_barrels():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # In map generate(), create this.barrels = {}
    content = content.replace("this.crateHp = {};", "this.crateHp = {}; this.barrels = {};")

    # In addCrates(), maybe 10% chance to make it a barrel (tile 3)
    # Wait, `addCrates` does `this.grid[ry][rx] = 2;`
    # Let's replace the grid assignment in addCrates
    add_crates_old = "this.grid[ry][rx] = 2;"
    add_crates_new = """
                        if (Math.random() < 0.15) {
                            this.grid[ry][rx] = 3; // 3 is Explosive Barrel
                            this.barrels[`${ry},${rx}`] = 20; // 20 HP
                        } else {
                            this.grid[ry][rx] = 2; // Crate
                        }"""
    if "this.grid[ry][rx] = 3;" not in content:
        content = content.replace(add_crates_old, add_crates_new)

    # In bakeStaticFloor, draw the barrel if it's 3
    # Look for: if (tile === 2) 
    bake_old = """if (this.grid[y][x] === 2) {
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;"""
    bake_new = """if (this.grid[y][x] === 2 || this.grid[y][x] === 3) {
                    const px = x * TILE_SIZE;
                    const py = y * TILE_SIZE;"""
    content = content.replace(bake_old, bake_new)
    
    # We also need to draw the red barrel instead of the box sprite
    draw_box_old = "ctx.drawImage(Assets.box, px, py - S_WALL_BIG, TILE_SIZE, TILE_SIZE + S_WALL_BIG);"
    draw_box_new = """if (this.grid[y][x] === 3) {
                        ctx.fillStyle = '#b83b3b'; // Base vermelha
                        ctx.fillRect(px, py - S_WALL_BIG, TILE_SIZE, TILE_SIZE + S_WALL_BIG);
                        ctx.fillStyle = '#8f2929'; // Sombra
                        ctx.fillRect(px + TILE_SIZE/2, py - S_WALL_BIG, TILE_SIZE/2, TILE_SIZE + S_WALL_BIG);
                        ctx.fillStyle = '#ff6b6b'; // Faixa neon
                        ctx.fillRect(px, py - 10, TILE_SIZE, 4);
                    } else {
                        ctx.drawImage(Assets.box, px, py - S_WALL_BIG, TILE_SIZE, TILE_SIZE + S_WALL_BIG);
                    }"""
    if "ctx.fillStyle = '#b83b3b';" not in content:
        content = content.replace(draw_box_old, draw_box_new)

    # In bullet collision (game update):
    col_old = """if (tile === 2) {
                        const k = `${wY},${wX}`;
                        this.map.crateHp[k] = (this.map.crateHp[k] || 30) - b.dmg;
                        if (this.map.crateHp[k] <= 0) {
                            this.map.grid[wY][wX] = 0;
                            // partculas..."""
    col_new = """if (tile === 2 || tile === 3) {
                        const k = `${wY},${wX}`;
                        if (tile === 3) {
                            this.map.barrels[k] = (this.map.barrels[k] || 20) - b.dmg;
                            if (this.map.barrels[k] <= 0) {
                                this.map.grid[wY][wX] = 0;
                                // EXPLOSION LOGIC
                                const ex = wX * TILE_SIZE + 24;
                                const ey = wY * TILE_SIZE + 24;
                                this.createExplosion(ex, ey, 150, 100);
                            }
                        } else {
                            this.map.crateHp[k] = (this.map.crateHp[k] || 30) - b.dmg;
                            if (this.map.crateHp[k] <= 0) {
                                this.map.grid[wY][wX] = 0;
                            }
                        }"""
    if "this.map.barrels[k]" not in content:
        # Since I might not match exactly, let's use regex
        content = re.sub(r'if \(tile === 2\) \{\s*const k = `\$\{wY\},\$\{wX\}`;', 
                         r'if (tile === 2 || tile === 3) { const k = `${wY},${wX}`; if(tile===3) { this.map.barrels[k] = (this.map.barrels[k]||20) - b.dmg; if(this.map.barrels[k]<=0) { this.map.grid[wY][wX]=0; this.createExplosion(wX*48+24, wY*48+24, 150, 100); } b.life=0; continue; }', 
                         content)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    modify_barrels()

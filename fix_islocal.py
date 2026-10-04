import re

def fix_ui_calls():
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    # Replace bad regex from earlier
    ent = re.sub(r'if \(this === game\.player\) if \(game && this === game\.player\) UI\.updateAmmo\(this\);', r'if (this.isLocal) UI.updateAmmo(this);', ent)
    ent = re.sub(r'if \(game && this === game\.player\) UI\.updateHp\(this\);', r'if (this.isLocal) UI.updateHp(this);', ent)

    # In Player constructor, add this.isLocal = false;
    if "this.isLocal = false;" not in ent:
        ent = ent.replace("this.life = 1.0; this.type = 'player';", "this.life = 1.0; this.type = 'player'; this.isLocal = false;")

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)

    # Now in game.ts, ensure the local player gets isLocal = true
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()
    
    if "this.player.isLocal = true;" not in game:
        game = game.replace("this.player = new Player(start.x, start.y);", "this.player = new Player(start.x, start.y);\n        this.player.isLocal = true;")

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_ui_calls()

import re

def fix_aiming_network():
    # --- 1. Client side: calculate worldMouseX and worldMouseY and send it ---
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # In Game.loop, where localInput is created
    old_local_input = """                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };"""
    
    new_local_input = """                const localInput = {
                    keys: Input.keys,
                    mouseX: Input.mouseX,
                    mouseY: Input.mouseY,
                    worldMouseX: Input.mouseX + this.cam.renderX,
                    worldMouseY: Input.mouseY + this.cam.renderY,
                    mouseDown: Input.mouseDown,
                    mouseClicked: Input.mouseClicked
                };"""
    game = game.replace(old_local_input, new_local_input)

    # In Game.loop, for Player 1 (Host or local), we should also calculate worldMouseX for consistency
    # But Player 1 uses Input globally, so we can just modify Player.update in entities.ts to use world coordinates if available.

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

    # --- 2. Entities side: Player.update calculates angle using worldMouse if available ---
    with open('src/entities.ts', 'r', encoding='utf-8') as f:
        ent = f.read()

    old_angle_calc = "this.angle = Math.atan2(input.mouseY - (SCREEN.h / 2), input.mouseX - (SCREEN.w / 2));"
    
    # If networkInput provides worldMouseX, use it! Otherwise, calculate it using cam (for local player)
    new_angle_calc = """if (input.worldMouseX !== undefined) {
            this.angle = Math.atan2(input.worldMouseY - (this.y + 12), input.worldMouseX - (this.x + 12));
        } else {
            const wmx = input.mouseX + cam.renderX;
            const wmy = input.mouseY + cam.renderY;
            this.angle = Math.atan2(wmy - (this.y + 12), wmx - (this.x + 12));
        }"""
    
    ent = ent.replace(old_angle_calc, new_angle_calc)

    with open('src/entities.ts', 'w', encoding='utf-8') as f:
        f.write(ent)

if __name__ == '__main__':
    fix_aiming_network()

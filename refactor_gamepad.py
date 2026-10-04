import re

def implement_gamepad():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Input object
    input_old = "export const Input = { keys: {}, mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false };"
    input_new = """export const Input = { 
    keys: {}, mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false, wasRT: false,
    updateGamepad(screenW, screenH) {
        if (!navigator.getGamepads) return;
        const pads = navigator.getGamepads();
        if (!pads || !pads[0]) return;
        
        const pad = pads[0];
        
        // Analogico Esquerdo (WASD)
        const lx = pad.axes[0];
        const ly = pad.axes[1];
        const deadzone = 0.2;
        
        this.keys['a'] = lx < -deadzone;
        this.keys['d'] = lx > deadzone;
        this.keys['w'] = ly < -deadzone;
        this.keys['s'] = ly > deadzone;
        
        // Analogico Direito (Mira)
        const rx = pad.axes[2];
        const ry = pad.axes[3];
        if (Math.abs(rx) > deadzone || Math.abs(ry) > deadzone) {
            // Emula o mouse ao redor do centro da tela (onde a camera esta)
            this.mouseX = (screenW / 2) + rx * 250;
            this.mouseY = (screenH / 2) + ry * 250;
        }
        
        // Gatilho RT ou Botao R1 para atirar
        if (pad.buttons[7].pressed || pad.buttons[5].pressed) {
            if (!this.wasRT) this.mouseClicked = true;
            else this.mouseClicked = false;
            this.mouseDown = true;
            this.wasRT = true;
        } else {
            this.mouseDown = false;
            this.wasRT = false;
        }
        
        // Dash no LT (6) ou A (0)
        this.keys[' '] = pad.buttons[6].pressed || pad.buttons[0].pressed;
        
        // Recarregar no X (2)
        this.keys['r'] = pad.buttons[2].pressed;
    }
};"""
    if "updateGamepad(" not in content:
        content = content.replace(input_old, input_new)

    # 2. Call Input.updateGamepad() at the beginning of the Game loop, inside update(dt)
    # Let's find: `update(dt) {`
    # Replace it with: `update(dt) { Input.updateGamepad(SCREEN.w, SCREEN.h);`
    update_old = "    update(dt) {"
    update_new = "    update(dt) {\n        if (typeof Input.updateGamepad === 'function') Input.updateGamepad(SCREEN.w, SCREEN.h);"
    if "Input.updateGamepad(SCREEN.w, SCREEN.h)" not in content:
        content = content.replace(update_old, update_new, 1)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    implement_gamepad()

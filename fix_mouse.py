import re

def fix_mouse_mapping():
    with open('src/game.ts', 'r', encoding='utf-8') as f:
        game = f.read()

    # We need to replace the entire mousemove listener block
    old_listener_start = "window.addEventListener('mousemove', e => {"
    old_listener_end = "});"
    
    # We will just find the block and replace it using regex
    # The block looks like:
    # window.addEventListener('mousemove', e => { 
    #     const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    #     if (canvas) {
    #         const rect = canvas.getBoundingClientRect();
    #         const scaleX = canvas.width / rect.width;
    #         const scaleY = canvas.height / rect.height;
    #         Input.mouseX = (e.clientX - rect.left) * scaleX; 
    #         Input.mouseY = (e.clientY - rect.top) * scaleY; 
    #     } else {
    #         Input.mouseX = e.clientX; 
    #         Input.mouseY = e.clientY; 
    #     }
    # });

    new_listener = """window.addEventListener('mousemove', e => { 
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const canvasRatio = canvas.width / canvas.height;
        const rectRatio = rect.width / rect.height;
        
        let renderW = rect.width;
        let renderH = rect.height;
        let offsetX = 0;
        let offsetY = 0;
        
        // Compensates for object-fit: contain black bars
        if (canvasRatio > rectRatio) {
            renderH = rect.width / canvasRatio;
            offsetY = (rect.height - renderH) / 2;
        } else {
            renderW = rect.height * canvasRatio;
            offsetX = (rect.width - renderW) / 2;
        }
        
        const renderLeft = rect.left + offsetX;
        const renderTop = rect.top + offsetY;
        
        const scaleX = canvas.width / renderW;
        const scaleY = canvas.height / renderH;
        
        Input.mouseX = (e.clientX - renderLeft) * scaleX; 
        Input.mouseY = (e.clientY - renderTop) * scaleY; 
    } else {
        Input.mouseX = e.clientX; 
        Input.mouseY = e.clientY; 
    }
});"""

    pattern = re.compile(r"window\.addEventListener\('mousemove', e => \{.*?\}\);", re.DOTALL)
    game = pattern.sub(new_listener, game)

    with open('src/game.ts', 'w', encoding='utf-8') as f:
        f.write(game)

if __name__ == '__main__':
    fix_mouse_mapping()

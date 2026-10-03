# Antigravity Workspace Rules for Runevale

You are assisting with the development of the "Rogue Operator" game project. The following guidelines must be strictly adhered to during all interactions and modifications.

## 1. Core Directives

*   **Analyze Before Modifying**: Before making any significant changes, always analyze the existing implementation, the systems involved, and their dependencies.
*   **Incremental Development**: Prefer small, targeted, and incremental changes over large rewrites.
*   **Preserve Functionality**: Never remove or alter existing functionality unless explicitly requested. The game must remain playable after every change.
*   **Scope Isolation**: Do not modify files or systems unrelated to the current task. 
*   **Safety First**: Do not execute destructive or irreversible commands without explicit user approval.
*   **Planning Complex Tasks**: If a task is complex enough to involve multiple parts of the project, present a plan first and wait for user approval before modifying code.
*   **Post-Change Verification**: After making changes, verify for syntax errors, broken references, and ensure the new functionality integrates properly with the existing code.
*   **No Placeholders**: Never leave functionalities purposefully incomplete or as placeholders unless specifically requested by the user.

## 2. Code Quality & Architecture

*   **Clean Code & No God Numbers**: Write clean and readable code. Use descriptive names for all variables. Do not scatter unexplained numeric values ("magic numbers"); centralize important configurations.
*   **Architecture & Responsibilities**: Keep systems separated by their specific responsibilities. Do not create unnecessarily large or monolithic functions.
*   **Reuse Existing Systems**: Always verify if an existing system provides similar functionality before creating a new one (e.g., reuse the `EventBus`, UI components, entity structures).
*   **Meaningful Comments**: Code comments should explain *why* a non-obvious decision was made, not *what* the code does.
*   **Dependencies & Assets**: Do not add external libraries, dependencies, or replace existing assets unnecessarily.


## 3. Contexto do Projeto
*   **GDD.md**: Sempre leia este arquivo antes de sugerir novas mecânicas de gameplay ou polimentos, para evitar propor ideias que já estão ativas e maduras no jogo.

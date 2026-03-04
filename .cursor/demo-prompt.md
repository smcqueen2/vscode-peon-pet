# Peon Pet — Demo Recording Script

Use this to walk through every animation state for a demo GIF or screenshot.

## Setup

1. Open Cursor / VS Code with the Peon Pet extension installed
2. Make sure the **Explorer sidebar** is visible — the orc lives there
3. Open a terminal (`` Ctrl+` ``) and start a Claude Code session: `claude`
4. Open Kap, crop the frame to the sidebar panel, and hit record

---

## Animation walkthrough

Run each step in the Claude Code terminal session. Pause ~4 seconds between steps
so each animation has time to complete before the next fires.

### 1. Waking (SessionStart)
Claude Code starting a session fires `SessionStart` automatically.
The orc wakes from sleep, stretches, and opens his eyes.

### 2. Typing (UserPromptSubmit)
Send any message to Claude:
```
Create a file called /tmp/peon-demo/hello.txt with the text "Work, work."
```
The orc hunches over and types furiously.

### 3. Annoyed (PostToolUseFailure)
Ask Claude to read a file that doesn't exist:
```
Read the file /tmp/peon-demo/missing.txt
```
The tool call fails. The orc crosses his arms and grumbles.

### 4. Alarmed (PermissionRequest)
Ask Claude to do something that requires your permission — bash commands
work well for this:
```
Delete /tmp/peon-demo/hello.txt — ask me before you do it
```
Claude pauses and requests confirmation. The orc looks alarmed, flashing red.
Type `yes` to continue.

### 5. Celebrate (Stop)
Claude finishes the task and exits. The orc throws his arms up and celebrates,
flashing gold.

### 6. Sleeping (idle)
Stop interacting. After 30 seconds the orc slumps back into his idle sleeping loop.

---

## Tips for the recording

- Crop Kap tightly to the sidebar — no need to show the full editor
- 15 fps is plenty for pixel art and keeps the GIF small
- Aim for the full cycle in under 60 seconds
- Export as GIF, then drop into `media/demo.gif` and update the README placeholder

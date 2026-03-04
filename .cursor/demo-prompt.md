# Peon Pet — Demo Script

Paste the block below into a fresh Cursor agent chat in a sandbox workspace.
The orc in the Explorer sidebar will react as the agent works through each step.

---

```
I need you to walk through a short demo script to showcase the Peon Pet VS Code
extension. The orc in the sidebar animates in response to what you do, so please
work through each step slowly — wait about 4 seconds between steps so each
animation has time to play out fully before the next one starts.

Here are the steps:

1. **Waking** — starting this session already triggers the waking animation.
   Confirm you can see the orc opening his eyes in the sidebar before continuing.

2. **Typing** — create a file called hello.txt in the current directory with
   the content "Work, work." This triggers the typing animation as you use tools.

3. **Annoyed** — try to read a file called missing.txt (it does not exist).
   The failed tool use triggers the annoyed animation.

4. **Alarmed** — before doing the next step, ask me for permission first.
   Say something like: "I'd like to delete hello.txt — shall I go ahead?"
   Wait for my reply before proceeding. This triggers the alarmed animation.

5. **Celebrate** — once I say yes, delete hello.txt and wrap up. Finishing
   the task triggers the celebrate animation.

6. **Sleeping** — once you're done, stop responding. After 30 seconds of
   inactivity the orc will slump back into his idle sleeping loop.

Take your time. The whole demo should take about 60–90 seconds.
```

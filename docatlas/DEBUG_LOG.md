# Debugging & Lessons Learned


| Date | Issue | Fix |
| :--- | :--- | :--- |
| 2026-01-17 | Quest 3 Connectivity Fail ("Site not reached") | **Windows Firewall:** Explicitly allow `Node.js` on **Public** networks. |
| 2026-01-17 | WebXR "Didn't send data" Error | **SSL protocol mismatch:** Ensure Vite config uses `basicSsl()` AND bind to `0.0.0.0`. |
| 2026-01-17 | Interaction Flickering (Race Condition) | **Logic:** `InteractionSystem` must use "Winner Takes All" (closest hit) when merging Mouse & VR inputs. |
| 2026-01-17 | "Black Box" Artifact on Transparent Buttons | **Material:** Set `depthWrite: false` on invisible or semi-transparent overlay meshes. |
| 2026-01-17 | Themis Crash: `undefined` port position | **Logic:** Verify node type before accessing ports. Source nodes have NO inputs; Target nodes have NO outputs. Added guards. |

# Architecture Decision Records (ADR)

## ADR-001: WebXR over Unity
- **Decision:** Use Three.js/WebXR instead of Unity.
- **Reason:** Faster iteration, no app store friction, easier sharing via URL.
- **Context:** Proof of concept only; performance overhead is acceptable.

## ADR-002: Modular Architecture
- **Decision:** Use a "Core + Module" pattern.
- **Reason:** To allow switching between Mnemosyne, Themis, and Tecton without reloading the page.

## ADR-003: "Fake" Data
- **Decision:** No live backend. Use hardcoded JSON.
- **Reason:** Stability for demos. We are selling the *concept*, not testing the database.

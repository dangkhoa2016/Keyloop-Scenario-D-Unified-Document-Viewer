# ADR-002 — Local static reviewer interface, no JavaScript framework dependency

**Status:** Adopted for Reviewer UI with deviation from the revised implementation plan.

The planning baseline proposed Vue 3 and Tailwind CSS without a frontend build, initially via pinned CDN assets. The implementation uses versioned local vanilla JavaScript and CSS instead. This is a deliberate project-level scope change, **not a Keyloop requirement change**.

**Reason:** Scenario D explicitly evaluates a single combined document list and fully implemented backend layer. Local assets remove CDN/network failures from the reviewer path, avoid an additional frontend toolchain, and keep the user interface inspectable for the small state model. The UI is not being presented as a full Vue application.

**Cost:** UI behavior is manually coded, so larger user experiences would benefit from Vue's component architecture. If project complexity increases, return to pinned Vue and a build step rather than adding unpinned runtime CDN scripts.

**Evidence:** Reviewer UI HTML/JS smoke tests and manual browser accessibility checks (pending human validation).

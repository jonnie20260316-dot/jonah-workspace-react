# Lessons Locked — 2026-04-04 Whiteboard Surface Fixes

## Mistakes Extracted
- Connector objects were created successfully, but there was no post-create drag path, so they felt frozen after placement.
- Frame objects were created at a too-small default size for their header controls, and there was no obvious resize path after creation.
- The fit-to-content button occupied the same general screen area as the add-block FAB, creating a blocking overlap.
- The first build pass missed a `screenToBoardPoint` import after adding new pointer-driven movement code.

## Root Causes
- Interaction coverage stopped at creation-time tooling and did not extend to selection/editing behavior.
- Frame sizing behavior was tuned for drawing, not for a usable post-create editing surface.
- Floating controls were positioned independently without checking for cross-control collision on the viewport edge.
- The surface interaction patch added new coordinate conversion calls without a final compile check before validation.

## Prevention Rules
- **SURFACE-EDIT-1: Post-Create Interaction Gate**
  - Trigger: Any new whiteboard/surface object type that can be created visually.
  - Checklist: verify select, drag, and resize/edit paths exist after creation; confirm the object can be reselected and moved without re-entering the creation tool.
  - Escape hatch: if post-create editing is missing, ship only after the edit path is wired or the tool is hidden from the toolbar.
- **SURFACE-SIZE-1: Usable Default Bounds**
  - Trigger: Any frame/zone/container object with header controls or nested UI.
  - Checklist: set a minimum practical default size; check header/button spacing at creation size; confirm the first render is usable without immediate resize.
  - Escape hatch: if the default is too small, increase the minimum and preserve the larger size on commit.
- **SURFACE-LAYOUT-1: Floating Control Collision Check**
  - Trigger: Adding any fixed-position overlay near an existing primary action.
  - Checklist: verify screen-edge overlap against FABs and toolbar buttons; prefer relocation over z-index escalation; test the smallest viewport size.
  - Escape hatch: move the overlay to a non-conflicting corner before shipping.
- **SURFACE-BUILD-1: Pointer-Code Compile Gate**
  - Trigger: Any patch that adds pointer handlers or viewport coordinate conversion.
  - Checklist: run the build immediately after the edit; confirm all coordinate utilities are imported and referenced.
  - Escape hatch: stop and fix compile errors before any browser smoke test.

## Integration Points
- `src/components/SurfaceForeground.tsx` for connector drag interaction and hit-target coverage.
- `src/components/SurfaceBackground.tsx` for frame move/resize behavior and default sizing.
- `src/hooks/useDrawTool.ts` for committed object sizing at creation time.
- `src/components/FitButton.tsx` and `src/workspace.css` for fixed-control placement.

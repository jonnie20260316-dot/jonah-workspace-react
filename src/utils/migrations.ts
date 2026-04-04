/**
 * Schema migration framework for Jonah Workspace v2.0 Edgeless.
 * Call runMigrations() after rehydrateStores() on boot.
 * Add migration logic here as the data model evolves across phases.
 */

export const CURRENT_SCHEMA = "2026-04-05-edgeless-v1";

export function runMigrations(): void {
  // Phase 1+: will add zoneId default to existing blocks
  // Phase 1+: will initialize surface-elements if missing
  // Currently a no-op framework — migrations are added here as phases ship
}

import type { PlacementChange } from './generation'

/** Keep the accumulated draft relative to its immutable source. A later move
 * must not discard an explicit room clear or an unrelated earlier operation. */
export function mergePlacementChanges(changes: PlacementChange[], next: PlacementChange[]): PlacementChange[] {
  const merged = new Map(changes.map((item) => [item.class_id, { ...item }]))
  next.forEach((item) => merged.set(item.class_id, { ...merged.get(item.class_id), ...item }))
  return [...merged.values()]
}

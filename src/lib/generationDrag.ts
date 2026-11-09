import type { PlacementChange } from './generation'

export interface GenerationDropTarget { slotId?: number; classId?: number; fixed?: boolean }
export interface GenerationDrop { classId: number; slotId: number; swapClassId?: number }
export interface GenerationDropProposal extends GenerationDrop { nonce: number }
const validId = (value: number | undefined): value is number => Number.isSafeInteger(value) && Number(value) > 0

/** Pointer targeting only proposes an operation. The server decides whether
 * people, rooms, travel and saved rules permit the resulting placements. */
export function generationDropTarget(classId: number, sourceSlotId: number, target: GenerationDropTarget | null): GenerationDrop | null {
  if (!validId(classId) || !target || target.fixed || !validId(target.slotId)) return null
  if (target.classId === classId) return null
  if (validId(target.classId)) return { classId, slotId: target.slotId, swapClassId: target.classId }
  return target.slotId === sourceSlotId ? null : { classId, slotId: target.slotId }
}

export function changesForGenerationDrop(proposal: GenerationDrop, classes: { id: number; slot?: number }[]): PlacementChange[] {
  const source = classes.find((item) => item.id === proposal.classId)
  if (!source || !validId(source.slot) || !validId(proposal.slotId)) return []
  if (proposal.swapClassId !== undefined) {
    const second = classes.find((item) => item.id === proposal.swapClassId)
    if (!second || second.id === source.id || !validId(second.slot)) return []
    return [{ class_id: source.id, slot_id: second.slot }, { class_id: second.id, slot_id: source.slot }]
  }
  return [{ class_id: source.id, slot_id: proposal.slotId }]
}

export function generationDragThreshold(dx: number, dy: number, pointerType: string): boolean {
  const threshold = pointerType === 'touch' ? 10 : 6
  return dx * dx + dy * dy >= threshold * threshold
}

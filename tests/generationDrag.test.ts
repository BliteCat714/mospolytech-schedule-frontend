import assert from 'node:assert/strict'
import test from 'node:test'
import { changesForGenerationDrop, generationDragThreshold, generationDropTarget } from '../src/lib/generationDrag.ts'

test('dragging onto an empty slot proposes one move while dropping onto another class proposes a swap', () => {
  assert.deepEqual(generationDropTarget(5, 10, { slotId: 20 }), { classId: 5, slotId: 20 })
  assert.deepEqual(generationDropTarget(5, 10, { slotId: 20, classId: 6 }), { classId: 5, slotId: 20, swapClassId: 6 })
})
test('a drag cannot target fixed PD, its own card, its unchanged empty slot or outside the saved grid', () => {
  assert.equal(generationDropTarget(5, 10, { fixed: true, slotId: 20 }), null)
  assert.equal(generationDropTarget(5, 10, { classId: 5, slotId: 10 }), null)
  assert.equal(generationDropTarget(5, 10, { slotId: 10 }), null)
  assert.equal(generationDropTarget(5, 10, null), null)
  assert.equal(generationDropTarget(5, 10, { slotId: 0 }), null)
})
test('swap preview releases both current draft positions in a single changes array without touching a third class', () => {
  const classes = [{ id: 5, slot: 10 }, { id: 6, slot: 25 }, { id: 7, slot: 30 }]
  const before = structuredClone(classes)
  assert.deepEqual(changesForGenerationDrop({ classId: 5, slotId: 20, swapClassId: 6 }, classes), [{ class_id: 5, slot_id: 25 }, { class_id: 6, slot_id: 10 }])
  assert.deepEqual(classes, before)
  assert.deepEqual(changesForGenerationDrop({ classId: 5, slotId: 20 }, classes), [{ class_id: 5, slot_id: 20 }])
})
test('stale source or swap class ids cannot produce a changes payload', () => {
  assert.deepEqual(changesForGenerationDrop({ classId: 5, slotId: 20 }, [{ id: 6, slot: 10 }]), [])
  assert.deepEqual(changesForGenerationDrop({ classId: 5, slotId: 20, swapClassId: 99 }, [{ id: 5, slot: 10 }]), [])
  assert.deepEqual(changesForGenerationDrop({ classId: 5, slotId: 20, swapClassId: 5 }, [{ id: 5, slot: 10 }]), [])
})
test('pointer threshold preserves click behavior and gives touch a larger movement tolerance', () => {
  assert.equal(generationDragThreshold(3, 3, 'mouse'), false)
  assert.equal(generationDragThreshold(6, 0, 'mouse'), true)
  assert.equal(generationDragThreshold(6, 0, 'touch'), false)
  assert.equal(generationDragThreshold(8, 6, 'touch'), true)
})

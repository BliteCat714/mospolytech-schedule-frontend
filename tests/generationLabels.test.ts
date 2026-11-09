import assert from 'node:assert/strict'
import test from 'node:test'
import { preferredGenerationSemester, savedGenerationSemester } from '../src/lib/generation.ts'
import type { GenerationOptions, LoadedProjection } from '../src/lib/generation.ts'

test('archived demos cannot become launch defaults while saved history remains readable', () => {
  const options = { default_semester_id: 1, semesters: [{ id: 1, is_archived: true }, { id: 2, is_archived: false }] } as GenerationOptions
  assert.equal(preferredGenerationSemester(options, 1)?.id, 2)
  const loaded = { identity: { runId: 9 }, schedule: { run: { id: 9, semester: 1 } } } as LoadedProjection
  assert.equal(savedGenerationSemester(options, 9, loaded)?.id, 1)
})

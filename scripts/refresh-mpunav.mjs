import { readFile, writeFile } from 'node:fs/promises'

const schemaUrl = new URL('https://mpunav.ru/api/config/navigation/schemas/2/file')
const output = new URL('../src/lib/mpunavRooms.ts', import.meta.url)

async function loadSchema(harPath) {
  if (!harPath) {
    const response = await fetch(schemaUrl, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) throw new Error(`MPUNav returned HTTP ${response.status}`)
    return response.json()
  }

  const har = JSON.parse(await readFile(harPath, 'utf8'))
  const entry = har.log?.entries.find(({ request, response }) => {
    const url = new URL(request.url)
    return url.origin === schemaUrl.origin && url.pathname === schemaUrl.pathname
      && response.status === 200 && response.content?.text
  })
  if (!entry) throw new Error('The HAR does not contain the MPUNav navigation schema response')
  const { text, encoding } = entry.response.content
  return JSON.parse(encoding === 'base64' ? Buffer.from(text, 'base64').toString('utf8') : text)
}

function roomRows(spaces) {
  const rows = []
  for (const { title, key, planKey } of spaces) {
    if (typeof key !== 'string' || key.startsWith('!') || typeof title !== 'string') continue
    const label = title.trim().split(/\s+(?:—|–|-)\s+/)[0]

    // ПР-2507 appears on two floors in the schema. pr-2207 is on floor 2.
    if (key === 'pr-2207' && label === 'ПР-2507' && planKey === 'PR-2-2') continue

    if (/^(?:ав|av|а|аb|a|б|b|в|v|нд|nd|н|n|м|m|пк|pk|пр|pr)[\s-]*\d/i.test(label)) {
      rows.push([label, key])
      continue
    }

    if (label) continue
    // The room number is sometimes only present in its space key, e.g. av-6-4108.
    const numberedKey = /^(av|m)-(?:6-(?=\d{4}$))?(\d{4}[a-z]?(?:-\d+)?)$/i.exec(key)
    if (numberedKey) rows.push([`${numberedKey[1]}-${numberedKey[2]}`, key])
  }
  return rows.sort((left, right) => left[1].localeCompare(right[1], 'en', { numeric: true }))
}

try {
  const schema = await loadSchema(process.argv[2])
  const { spaces, locations, metaInfo } = schema
  if (!Array.isArray(spaces) || !Array.isArray(locations) || typeof metaInfo?.generatedAt !== 'string') {
    throw new Error('Unexpected MPUNav schema')
  }
  const rows = roomRows(spaces)
  if (!rows.length || !locations.length) throw new Error('The MPUNav catalog is empty')

  const lines = [
    `// Room labels and space keys from the MPUNav navigation schema v2, dated ${new Date(metaInfo.generatedAt).toISOString().slice(0, 10)}.`,
    `// ${schemaUrl.href}`,
    'export const mpunavRooms: readonly (readonly [label: string, space: string])[] = [',
    ...rows.map(([label, space]) => `  [${JSON.stringify(label)}, ${JSON.stringify(space)}],`),
    ']',
    '',
  ]
  await writeFile(output, lines.join('\n'))
  console.log(`MPUNav catalog updated with ${rows.length} room entries across ${locations.length} sites.`)
} catch (error) {
  console.error('MPUNav catalog update failed:', error)
  process.exitCode = 1
}

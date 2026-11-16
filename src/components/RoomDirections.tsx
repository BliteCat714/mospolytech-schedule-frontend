import { Navigation } from 'lucide-react'
import { roomDirections, type NavigationRoom } from '../lib/mpunav'

export default function RoomDirections({ rooms = [], compact = false }: {
  rooms?: readonly NavigationRoom[]
  compact?: boolean
}) {
  const destinations = new Map<string, { label: string; title: string; room: string }>()
  for (const room of rooms) {
    const destination = roomDirections(room)
    if (destination && !destinations.has(destination.url)) {
      destinations.set(destination.url, { ...destination, room: room.name })
    }
  }
  if (!destinations.size) return null

  return (
    <div className={compact ? 'flex flex-col items-end' : 'mt-2 flex flex-wrap gap-2'}>
      {[...destinations].map(([url, { label, title, room }]) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
          title={title}
          className={`inline-flex items-center text-xs font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent ${compact
            ? 'min-h-6 rounded-sm hover:underline'
            : 'min-h-8 gap-1.5 rounded-lg border border-border px-2.5 py-1 transition hover:border-accent hover:bg-accent-soft'}`}>
          {!compact && <Navigation size={14} aria-hidden="true" />}
          {destinations.size > 1 ? `${label} · ${room}` : label}
        </a>
      ))}
    </div>
  )
}

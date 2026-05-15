export interface Note {
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

function _key(itemId: string) { return `abs_notes_${itemId}` }

export function getNotes(itemId: string): Note[] {
  try { return JSON.parse(localStorage.getItem(_key(itemId)) ?? '[]') } catch { return [] }
}

export function saveNotes(itemId: string, notes: Note[]): void {
  try { localStorage.setItem(_key(itemId), JSON.stringify(notes)) } catch {}
}

export function addNote(itemId: string, title: string, body: string): Note[] {
  const now = new Date().toISOString()
  const note: Note = { title, body, createdAt: now, updatedAt: now }
  const notes = [note, ...getNotes(itemId)]
  saveNotes(itemId, notes)
  return notes
}

export function updateNote(itemId: string, index: number, title: string, body: string): Note[] {
  const notes = getNotes(itemId)
  if (index < 0 || index >= notes.length) return notes
  notes[index] = { ...notes[index], title, body, updatedAt: new Date().toISOString() }
  saveNotes(itemId, notes)
  return notes
}

export function deleteNote(itemId: string, index: number): Note[] {
  const notes = getNotes(itemId).filter((_, i) => i !== index)
  saveNotes(itemId, notes)
  return notes
}

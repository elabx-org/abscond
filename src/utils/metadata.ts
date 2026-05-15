import type { LibraryItem } from '@/api/types'

export function getAuthorDisplay(item: LibraryItem): string {
  const meta = item.media.metadata
  if (meta.authors && meta.authors.length > 0) {
    return meta.authors.map(a => a.name).join(', ')
  }
  if (meta.authorName) return meta.authorName
  return ''
}

export function getNarratorDisplay(item: LibraryItem): string {
  const meta = item.media.metadata
  if (meta.narrators && meta.narrators.length > 0) {
    return meta.narrators.join(', ')
  }
  if (meta.narratorName) return meta.narratorName
  return ''
}

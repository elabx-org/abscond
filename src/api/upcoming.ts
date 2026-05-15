import { api } from './client'

export interface UpcomingBook {
  asin: string
  title: string
  subtitle?: string
  authors: string
  seriesName: string
  seriesPosition: string
  releaseDate: string       // ISO date string "YYYY-MM-DD"
  coverUrl: string
  runtimeMinutes?: number
  inLibrary: boolean
  libraryItemId?: string
}

export interface ScanProgress {
  total: number
  done: number
  current: string
}

const CACHE_KEY   = 'abs_upcoming_cache'
const CACHE_TS_KEY = 'abs_upcoming_ts'
const CACHE_DAYS  = 7

export function loadCache(): UpcomingBook[] | null {
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) ?? '0')
    if (Date.now() - ts > CACHE_DAYS * 86400_000) return null
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
  } catch { return null }
}

function saveCache(books: UpcomingBook[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(books))
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()))
  } catch {}
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_TS_KEY)
}

async function getAudnexBook(asin: string): Promise<any | null> {
  try {
    const r = await fetch(`https://api.audnex.us/books/${asin}`)
    if (r.ok) return await r.json()
  } catch {}
  return null
}

async function getAudibleSeriesRelationships(seriesAsin: string, region: string): Promise<string[]> {
  const tld = _tldFor(region)
  const url  = `https://api.audible${tld}/1.0/catalog/products/${seriesAsin}?response_groups=relationships`
  try {
    const r = await fetch(url, { mode: 'cors' })
    if (!r.ok) return []
    const data = await r.json()
    const rels = data?.product?.relationships as any[] ?? []
    return rels.map((x: any) => x.asin as string).filter(Boolean)
  } catch { return [] }
}

function _tldFor(region: string): string {
  const map: Record<string, string> = {
    us: '.com', uk: '.co.uk', au: '.com.au', ca: '.ca',
    de: '.de', fr: '.fr', it: '.it', es: '.es', jp: '.co.jp', in: '.in',
  }
  return map[region] ?? '.com'
}

function _isUpcoming(date: string): boolean {
  if (!date) return false
  const d = new Date(date)
  if (isNaN(d.getTime())) return false
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60) // last 60 days
  return d >= cutoff
}

export async function scanUpcoming(
  libraryId: string,
  region: string,
  onProgress: (p: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<UpcomingBook[]> {
  // 1. Get all series in the library (fetch up to 500)
  const [seriesRes, itemsRes] = await Promise.all([
    api.get(`/libraries/${libraryId}/series`, { params: { limit: 500, minified: 1 } }),
    api.get(`/libraries/${libraryId}/items`, { params: { limit: 1000, minified: 1 } }),
  ])

  const allSeries: any[] = seriesRes.data?.results ?? seriesRes.data ?? []
  const allItems: any[]  = itemsRes.data?.results ?? itemsRes.data?.libraryItems ?? []

  // Build libraryItemId → ASIN map
  const asinByItem = new Map<string, string>()
  const itemIdByAsin = new Map<string, string>()
  for (const item of allItems) {
    const asin = item.media?.metadata?.asin as string | undefined
    if (asin) {
      asinByItem.set(item.id, asin)
      itemIdByAsin.set(asin, item.id)
    }
  }

  // Build series → item list map
  const itemsBySeries = new Map<string, any[]>()
  for (const item of allItems) {
    const seriesList: any[] = item.media?.metadata?.series ?? []
    for (const s of seriesList) {
      if (!itemsBySeries.has(s.id)) itemsBySeries.set(s.id, [])
      itemsBySeries.get(s.id)!.push(item)
    }
  }

  const results: UpcomingBook[] = []
  const seriesWithAsins = allSeries.filter(s => {
    const books = itemsBySeries.get(s.id) ?? []
    return books.some(b => asinByItem.has(b.id))
  })

  onProgress({ total: seriesWithAsins.length, done: 0, current: '' })

  // Collect unique series ASINs to avoid duplicate work
  const processedSeriesAsins = new Set<string>()

  for (let i = 0; i < seriesWithAsins.length; i++) {
    if (signal?.aborted) break
    const series = seriesWithAsins[i]
    onProgress({ total: seriesWithAsins.length, done: i, current: series.name })

    const books = itemsBySeries.get(series.id) ?? []
    // Pick any book with an ASIN
    const anchor = books.find(b => asinByItem.has(b.id))
    if (!anchor) continue
    const anchorAsin = asinByItem.get(anchor.id)!

    // Get series ASIN from audnex
    const audnexBook = await getAudnexBook(anchorAsin)
    if (!audnexBook) continue

    const seriesEntries: any[] = audnexBook.series ?? []
    // Match our ABS series name to an Audible series entry
    const audibleSeries = seriesEntries.find((se: any) =>
      se.name?.toLowerCase().includes(series.name.toLowerCase()) ||
      series.name.toLowerCase().includes(se.name?.toLowerCase() ?? '')
    ) ?? seriesEntries[0]

    if (!audibleSeries?.asin) continue
    const seriesAsin = audibleSeries.asin as string
    if (processedSeriesAsins.has(seriesAsin)) continue
    processedSeriesAsins.add(seriesAsin)

    // Get all book ASINs in this series from Audible
    let seriesBookAsins = await getAudibleSeriesRelationships(seriesAsin, region)

    if (!seriesBookAsins.length) {
      // CORS blocked: fall back to audnex book data alone
      const releaseDate = audnexBook.releaseDate ?? audnexBook.release_date ?? ''
      if (_isUpcoming(releaseDate)) {
        const authors = (audnexBook.authors as any[] ?? []).map((a: any) => a.name ?? a).join(', ')
        results.push({
          asin: anchorAsin,
          title: audnexBook.title ?? '',
          subtitle: audnexBook.subtitle,
          authors,
          seriesName: series.name,
          seriesPosition: audibleSeries.position ?? '',
          releaseDate,
          coverUrl: audnexBook.image ?? '',
          runtimeMinutes: audnexBook.runtimeLengthMin,
          inLibrary: itemIdByAsin.has(anchorAsin),
          libraryItemId: itemIdByAsin.get(anchorAsin),
        })
      }
      continue
    }

    // Fetch details for each series book we don't already know
    const unknownAsins = seriesBookAsins.filter(a => !itemIdByAsin.has(a) || true) // check all for release dates
    const batches: string[][] = []
    for (let j = 0; j < unknownAsins.length; j += 5) batches.push(unknownAsins.slice(j, j + 5))

    for (const batch of batches) {
      if (signal?.aborted) break
      const details = await Promise.all(batch.map(a => getAudnexBook(a)))
      for (const d of details) {
        if (!d) continue
        const releaseDate = d.releaseDate ?? d.release_date ?? ''
        if (!_isUpcoming(releaseDate)) continue
        const asin = d.asin as string
        const authors = (d.authors as any[] ?? []).map((a: any) => a.name ?? a).join(', ')
        const serEntry = (d.series as any[] ?? []).find((se: any) => se.asin === seriesAsin) ?? (d.series?.[0])
        results.push({
          asin,
          title: d.title ?? '',
          subtitle: d.subtitle,
          authors,
          seriesName: series.name,
          seriesPosition: serEntry?.position ?? '',
          releaseDate,
          coverUrl: d.image ?? '',
          runtimeMinutes: d.runtimeLengthMin,
          inLibrary: itemIdByAsin.has(asin),
          libraryItemId: itemIdByAsin.get(asin),
        })
      }
    }
  }

  onProgress({ total: seriesWithAsins.length, done: seriesWithAsins.length, current: '' })

  // Deduplicate by ASIN
  const seen = new Set<string>()
  const unique = results.filter(b => {
    if (seen.has(b.asin)) return false
    seen.add(b.asin); return true
  })

  // Sort: upcoming first (soonest first), then recent (most recent first)
  const today = new Date().toISOString().slice(0, 10)
  unique.sort((a, b) => {
    const aFuture = a.releaseDate >= today
    const bFuture = b.releaseDate >= today
    if (aFuture && !bFuture) return -1
    if (!aFuture && bFuture) return 1
    return aFuture
      ? a.releaseDate.localeCompare(b.releaseDate)       // upcoming: soonest first
      : b.releaseDate.localeCompare(a.releaseDate)        // recent: newest first
  })

  saveCache(unique)
  return unique
}

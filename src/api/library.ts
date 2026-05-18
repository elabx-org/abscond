import { api } from './client'
import type { Library, LibraryItemsResponse } from './types'

export async function getLibraries(): Promise<Library[]> {
  const res = await api.get('/libraries')
  const data = res.data
  if (Array.isArray(data)) return data
  return data?.libraries ?? []
}

export interface GetLibraryItemsParams {
  limit?: number
  page?: number
  sort?: string
  desc?: boolean
  filter?: string
}

export async function getLibraryItems(
  libraryId: string,
  params: GetLibraryItemsParams = {}
): Promise<LibraryItemsResponse> {
  const { desc, ...rest } = params
  const res = await api.get(`/libraries/${libraryId}/items`, {
    params: { ...rest, ...(desc !== undefined ? { desc: desc ? 1 : 0 } : {}) },
  })
  const data = res.data
  return {
    ...data,
    results: data.results ?? data.libraryItems ?? [],
    total: data.total ?? 0,
  }
}

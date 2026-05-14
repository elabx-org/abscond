import { api } from './client'
import type { Library, LibraryItemsResponse } from './types'

export async function getLibraries(): Promise<Library[]> {
  const res = await api.get('/libraries')
  return res.data.libraries
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
  return res.data
}

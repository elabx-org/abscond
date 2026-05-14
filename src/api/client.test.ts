import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveBaseUrl, createApiClient } from './client'

describe('resolveBaseUrl', () => {
  it('returns /api when absHost is empty (proxy mode)', () => {
    expect(resolveBaseUrl('')).toBe('/api')
  })

  it('returns /api when absHost is not provided', () => {
    expect(resolveBaseUrl(undefined)).toBe('/api')
  })

  it('appends /api to absHost in direct mode', () => {
    expect(resolveBaseUrl('https://abs.example.com')).toBe('https://abs.example.com/api')
  })

  it('strips trailing slash before appending /api', () => {
    expect(resolveBaseUrl('https://abs.example.com/')).toBe('https://abs.example.com/api')
  })
})

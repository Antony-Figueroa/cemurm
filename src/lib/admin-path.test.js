import { describe, expect, it } from 'vitest'
import { toAdminPath } from './admin-path'

describe('toAdminPath', () => {
  it('prefixes internal template paths with the admin base', () => {
    expect(toAdminPath('/')).toBe('/admin')
    expect(toAdminPath('/apps/notes')).toBe('/admin/apps/notes')
    expect(toAdminPath('pages/tables')).toBe('/admin/pages/tables')
  })

  it('leaves admin, external and anchor paths untouched', () => {
    expect(toAdminPath('/admin')).toBe('/admin')
    expect(toAdminPath('/admin/apps/blog/post')).toBe('/admin/apps/blog/post')
    expect(toAdminPath('https://example.com/docs')).toBe('https://example.com/docs')
    expect(toAdminPath('mailto:demo@cemurm.app')).toBe('mailto:demo@cemurm.app')
    expect(toAdminPath('#')).toBe('#')
    expect(toAdminPath(undefined)).toBe('#')
  })
})

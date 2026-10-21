import { describe, it, expect } from 'vitest'
import { isGerencial, GERENCIAL_ROLES } from './gerencial.js'

describe('isGerencial', () => {
  it('admits a system administrator', () => {
    expect(isGerencial([], true)).toBe(true)
  })

  it('admits every active managerial role', () => {
    for (const role of GERENCIAL_ROLES) {
      expect(isGerencial([{ role, status: 'active' }], false)).toBe(true)
    }
  })

  it('rejects an active instructor', () => {
    expect(isGerencial([{ role: 'instructor', status: 'active' }], false)).toBe(false)
  })

  it('rejects former and pending manager memberships', () => {
    expect(isGerencial([{ role: 'org_owner', status: 'former' }], false)).toBe(false)
    expect(isGerencial([{ role: 'org_admin', status: 'pending' }], false)).toBe(false)
  })

  it('rejects empty or unreadable memberships without a system role', () => {
    expect(isGerencial(null, false)).toBe(false)
    expect(isGerencial(undefined, false)).toBe(false)
    expect(isGerencial([], false)).toBe(false)
  })
})

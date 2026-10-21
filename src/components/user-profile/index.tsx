import { ArrowRight, Building2, Settings } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp'
import StyleDivider from '../shared/StyleDivider'
import { Link } from 'react-router-dom'
import avatar from '@/assets/images/profile/avtar.webp'
import {
  useAdminProfile,
  type AdminMembership,
} from '@/hooks/shared/useAdminProfile'

const ROLE_LABELS: Record<string, string> = {
  org_owner: 'Owner',
  org_admin: 'Admin',
  branch_admin: 'Branch admin',
  instructor: 'Instructor',
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-chart-2/10! text-chart-2!',
  former: 'bg-cem-hover! text-cem-secondary-elevated!',
  pending: 'bg-chart-5/10! text-chart-5!',
}

function roleLabel(role: string): string {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ')
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs text-cem-secondary'>{label}</p>
      <p>{value || '—'}</p>
    </div>
  )
}

function MembershipRow({ membership }: { membership: AdminMembership }) {
  return (
    <div className='flex items-start justify-between gap-4 border-b border-cem-hover py-3 last:border-b-0 last:pb-0 first:pt-0'>
      <div className='flex flex-col gap-0.5'>
        <span className='text-sm font-medium text-cem-text'>
          {membership.orgName}
        </span>
        <span className='text-xs font-normal text-cem-secondary'>
          {[membership.branchName, roleLabel(membership.role)]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className='text-xs font-normal text-cem-secondary'>
          Joined {formatDate(membership.joinedAt)}
        </span>
      </div>
      <Badge
        className={`capitalize ${
          STATUS_STYLES[membership.status] ??
          'bg-cem-hover! text-cem-secondary-elevated!'
        }`}
      >
        {membership.status || 'unknown'}
      </Badge>
    </div>
  )
}

const UserProfile = () => {
  const profile = useAdminProfile()

  const BCrumb = [
    {
      to: '/admin',
      title: 'Home',
    },
    {
      title: 'User Profile',
    },
  ]

  const name =
    profile.displayName ||
    profile.username ||
    profile.email ||
    (profile.loading ? 'Loading…' : 'Your profile')

  return (
    <div className='flex flex-col p-px bg-cem-hover gap-px'>
      <BreadcrumbComp title='User Profile' items={BCrumb} />
      <StyleDivider />
      <div className='flex flex-col gap-px bg-cem-hover'>
        <Card className='p-6 overflow-hidden'>
          <div className='flex flex-col sm:flex-row items-center gap-6 rounded-xl relative w-full break-words'>
            <div>
              <img
                src={profile.avatarUrl || avatar}
                alt='Profile avatar'
                width={80}
                height={80}
                className='rounded-full object-cover'
              />
            </div>
            <div className='flex flex-wrap gap-4 justify-center sm:justify-between items-center w-full'>
              <div className='flex flex-col sm:text-left text-center gap-1.5'>
                <h5 className='card-title'>{name}</h5>
                <div className='flex flex-wrap items-center justify-center sm:justify-start gap-1 md:gap-3'>
                  {profile.username ? (
                    <p className='text-sm text-cem-secondary'>
                      @{profile.username}
                    </p>
                  ) : null}
                  <div className='hidden h-4 w-px bg-cem-elevated xl:block'></div>
                  <p className='text-sm text-cem-secondary'>
                    {roleLabel(profile.role)}
                    {profile.orgName ? ` · ${profile.orgName}` : ''}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Link
                  to='/organizations'
                  aria-label='Organizations'
                  className='flex h-11 w-11 items-center justify-center gap-2 rounded-full shadow-md border border-cem-hover hover:bg-cem-hover/40 hover:text-cem-text'
                >
                  <Building2 width={20} height={20} />
                </Link>
                <Link
                  to='/settings'
                  aria-label='Settings'
                  className='flex h-11 w-11 items-center justify-center gap-2 rounded-full shadow-md border border-cem-hover hover:bg-cem-hover/40 hover:text-cem-text'
                >
                  <Settings width={20} height={20} />
                </Link>
              </div>
            </div>
          </div>
        </Card>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-px'>
          <div className='space-y-6 bg-cem-base md:p-6 p-4 relative w-full break-words'>
            <h5 className='card-title'>Personal Information</h5>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-7 2xl:gap-x-32'>
              <Field label='Display Name' value={profile.displayName} />
              <Field
                label='Username'
                value={profile.username ? `@${profile.username}` : ''}
              />
              <Field label='Email' value={profile.email} />
              <Field label='Role' value={roleLabel(profile.role)} />
              <Field label='Organization' value={profile.orgName} />
              <Field label='Member Since' value={formatDate(profile.joinedAt)} />
            </div>
          </div>

          <div className='space-y-6 bg-cem-base md:p-6 p-4 relative w-full break-words'>
            <h5 className='card-title'>Organizations</h5>
            {profile.memberships.length === 0 ? (
              <p className='text-sm text-cem-secondary'>
                {profile.loading
                  ? 'Loading memberships…'
                  : 'No organization memberships.'}
              </p>
            ) : (
              <div className='flex flex-col'>
                {profile.memberships.map((membership) => (
                  <MembershipRow
                    key={membership.id}
                    membership={membership}
                  />
                ))}
              </div>
            )}
            <div className='flex justify-end'>
              <Link
                to='/organizations'
                className={buttonVariants({
                  variant: 'outline',
                  className: 'gap-1.5 px-4 py-2 h-auto rounded-md',
                })}
              >
                View organizations
                <span>
                  <ArrowRight width={18} height={18} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile

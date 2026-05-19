export interface AdminNavTab {
  name: string
  label: string
  icon: string
  color: string
}

export interface AdminNavGroup {
  label: string
  tabs: AdminNavTab[]
}

export const ADMIN_DETAIL_PARENT: Record<string, string> = {
  'admin-user-detail':    'admin-users',
  'admin-podcast-detail': 'admin-libraries',
}

export const NAV_GROUPS: AdminNavGroup[] = [
  {
    label: 'Server',
    tabs: [
      { name: 'admin-overview',  label: 'Overview',  icon: 'mdi-view-dashboard-outline', color: '#6366f1' },
      { name: 'admin-libraries', label: 'Libraries', icon: 'mdi-bookshelf',              color: '#8b5cf6' },
      { name: 'admin-settings',  label: 'Settings',  icon: 'mdi-cog',                   color: '#64748b' },
      { name: 'admin-backups',   label: 'Backups',   icon: 'mdi-backup-restore',        color: '#0ea5e9' },
      { name: 'admin-email',     label: 'Email',     icon: 'mdi-email-outline',         color: '#10b981' },
    ],
  },
  {
    label: 'Users',
    tabs: [
      { name: 'admin-users',    label: 'Users',    icon: 'mdi-account-group',       color: '#f59e0b' },
      { name: 'admin-sessions', label: 'Sessions', icon: 'mdi-headphones',          color: '#ec4899' },
      { name: 'admin-auth',     label: 'Auth',     icon: 'mdi-shield-lock-outline', color: '#ef4444' },
    ],
  },
  {
    label: 'Integrations',
    tabs: [
      { name: 'admin-api-keys',      label: 'API Keys',      icon: 'mdi-key-outline',        color: '#d4a017' },
      { name: 'admin-feeds',         label: 'RSS Feeds',     icon: 'mdi-rss',                color: '#f97316' },
      { name: 'admin-notifications', label: 'Notifications', icon: 'mdi-bell-outline',       color: '#a78bfa' },
    ],
  },
  {
    label: 'Logs & Tools',
    tabs: [
      { name: 'admin-logs',     label: 'Logs',     icon: 'mdi-text-box-outline',   color: '#475569' },
      { name: 'admin-upload',   label: 'Upload',   icon: 'mdi-upload',             color: '#22c55e' },
      { name: 'admin-metadata', label: 'Metadata', icon: 'mdi-tag-search-outline', color: '#06b6d4' },
    ],
  },
]

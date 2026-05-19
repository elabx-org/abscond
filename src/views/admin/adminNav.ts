export interface AdminNavTab {
  name: string
  label: string
  icon: string
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
      { name: 'admin-overview',  label: 'Overview',  icon: 'mdi-view-dashboard-outline' },
      { name: 'admin-libraries', label: 'Libraries', icon: 'mdi-bookshelf' },
      { name: 'admin-settings',  label: 'Settings',  icon: 'mdi-cog' },
      { name: 'admin-backups',   label: 'Backups',   icon: 'mdi-backup-restore' },
      { name: 'admin-email',     label: 'Email',     icon: 'mdi-email-outline' },
    ],
  },
  {
    label: 'Users',
    tabs: [
      { name: 'admin-users',    label: 'Users',    icon: 'mdi-account-group' },
      { name: 'admin-sessions', label: 'Sessions', icon: 'mdi-headphones' },
      { name: 'admin-auth',     label: 'Auth',     icon: 'mdi-shield-lock-outline' },
    ],
  },
  {
    label: 'Integrations',
    tabs: [
      { name: 'admin-api-keys',      label: 'API Keys',      icon: 'mdi-key-outline' },
      { name: 'admin-feeds',         label: 'RSS Feeds',     icon: 'mdi-rss' },
      { name: 'admin-notifications', label: 'Notifications', icon: 'mdi-bell-outline' },
    ],
  },
  {
    label: 'Logs & Tools',
    tabs: [
      { name: 'admin-logs',     label: 'Logs',     icon: 'mdi-text-box-outline' },
      { name: 'admin-upload',   label: 'Upload',   icon: 'mdi-upload' },
      { name: 'admin-metadata', label: 'Metadata', icon: 'mdi-tag-search-outline' },
    ],
  },
]

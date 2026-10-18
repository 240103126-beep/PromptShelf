import {
  ClipboardPaste,
  FileDown,
  FolderClosed,
  LibraryBig,
  MessagesSquare,
  Settings,
  Tag,
  type LucideIcon,
} from 'lucide-react'

export interface NavEntry {
  to: string
  key: string
  icon: LucideIcon
  end?: boolean
}

export const APP_NAV: NavEntry[] = [
  { to: '/app', key: 'nav.library', icon: LibraryBig, end: true },
  { to: '/app/collections', key: 'nav.collections', icon: FolderClosed },
  { to: '/app/tags', key: 'nav.tags', icon: Tag },
  { to: '/app/import', key: 'nav.import', icon: ClipboardPaste },
  { to: '/app/assistant', key: 'nav.assistant', icon: MessagesSquare },
  { to: '/app/export', key: 'nav.export', icon: FileDown },
  { to: '/app/settings', key: 'nav.settings', icon: Settings },
]

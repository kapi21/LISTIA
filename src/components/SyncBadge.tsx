import type { SyncStatus } from '../domain/types'

const LABELS: Record<SyncStatus, string> = {
  online: 'En línea',
  offline: 'Sin conexión',
  syncing: 'Sincronizando',
  error: 'Error sync',
}

type Props = {
  status: SyncStatus
}

export default function SyncBadge({ status }: Props) {
  return (
    <span className={`sync-badge sync-badge--${status}`} role="status">
      <span className="sync-badge__dot" aria-hidden />
      {LABELS[status]}
    </span>
  )
}

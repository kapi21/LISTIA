import { useTicketStats } from '../hooks/useTicketStats'

type Props = {
  pin: string
  onLeave: () => void
}

function isBackendConfigured(): boolean {
  const raw = import.meta.env.VITE_FUNCTIONS_BASE_URL
  return Boolean(raw && String(raw).trim())
}

function formatLastPurchased(ts: number): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts))
}

export default function PurchasesScreen({ pin, onLeave }: Props) {
  const { stats, connection, syncing, error, connect, refresh } = useTicketStats(pin)
  const backendConfigured = isBackendConfigured()

  const showConnect =
    backendConfigured &&
    (connection.status === 'disconnected' || connection.status === 'needs_reauth')
  const showRefresh = backendConfigured && connection.status === 'connected'

  return (
    <div className="purchases-screen">
      <header className="purchases-screen__header">
        <div className="purchases-screen__title-group">
          <h1 className="purchases-screen__title">Compras</h1>
          <p className="purchases-screen__pin">
            PIN <strong>{pin}</strong>
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onLeave}>
          Salir
        </button>
      </header>

      {!backendConfigured && (
        <p className="banner banner--warning" role="status">
          Backend de tickets no configurado.
        </p>
      )}

      {backendConfigured && connection.status === 'disconnected' && (
        <p className="purchases-screen__hint">
          Conecta Gmail para importar tickets PDF de Mercadona.
        </p>
      )}

      {backendConfigured && connection.status === 'needs_reauth' && (
        <p className="purchases-screen__hint">Vuelve a conectar.</p>
      )}

      {backendConfigured && connection.status === 'connected' && connection.email && (
        <p className="purchases-screen__connected">
          Gmail: <strong>{connection.email}</strong>
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="purchases-screen__actions">
        {showConnect && (
          <button type="button" className="btn btn--primary btn--block" onClick={connect}>
            {connection.status === 'needs_reauth' ? 'Volver a conectar Gmail' : 'Conectar Gmail'}
          </button>
        )}
        {showRefresh && (
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => void refresh()}
            disabled={syncing}
          >
            {syncing ? 'Actualizando…' : 'Actualizar tickets'}
          </button>
        )}
      </div>

      {stats.length > 0 ? (
        <ol className="purchases-ranking">
          {stats.map((stat) => (
            <li key={stat.productKey} className="purchases-ranking__item">
              {stat.name} · {stat.count} veces · {formatLastPurchased(stat.lastPurchasedAt)}
            </li>
          ))}
        </ol>
      ) : (
        backendConfigured &&
        connection.status === 'connected' && (
          <p className="purchases-screen__empty">
            Aún no hay productos importados. Pulsa «Actualizar tickets» para sincronizar.
          </p>
        )
      )}
    </div>
  )
}

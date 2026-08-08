import { useState } from 'react'

type Props = {
  onCreate: () => void
  onJoin: (pin: string) => void
  error: string | null
  isLocalMode?: boolean
}

export default function WelcomeScreen({ onCreate, onJoin, error, isLocalMode }: Props) {
  const [joinPin, setJoinPin] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    onJoin(joinPin)
  }

  return (
    <div className="app welcome">
      {isLocalMode && (
        <p className="banner banner--local" role="status">
          Modo local — sin sincronización en la nube
        </p>
      )}

      <header className="welcome__hero">
        <h1 className="welcome__brand">Lista Casa</h1>
        <p className="welcome__tagline">La lista de la compra compartida de tu hogar</p>
      </header>

      <div className="welcome__actions">
        <button type="button" className="btn btn--primary btn--block" onClick={onCreate}>
          Crear hogar
        </button>

        <div className="welcome__divider">o unirse con PIN</div>

        <form onSubmit={handleJoin}>
          <input
            className="input input--pin"
            value={joinPin}
            onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            aria-label="PIN de 6 dígitos"
            autoComplete="off"
          />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn--primary btn--block"
            style={{ marginTop: 'var(--space-md)' }}
            disabled={joinPin.length !== 6}
          >
            Unirse
          </button>
        </form>
      </div>
    </div>
  )
}

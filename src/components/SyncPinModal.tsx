import { useState, useEffect } from 'react'
import QRCode from 'qrcode'

type Props = {
  isOpen: boolean
  currentPin: string
  onClose: () => void
  onSetPin: (newPin: string) => void
  onDisconnect: () => void
}

export default function SyncPinModal({
  isOpen,
  currentPin,
  onClose,
  onSetPin,
  onDisconnect,
}: Props) {
  const [inputPin, setInputPin] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // URL para invitar / escanear QR
  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?pin=${currentPin || '123456'}`
    : ''

  // Generar código QR cuando cambia el PIN
  useEffect(() => {
    if (isOpen && currentPin) {
      QRCode.toDataURL(inviteUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1b4332',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.warn('Error generando QR:', err))
    }
  }, [isOpen, currentPin, inviteUrl])

  if (!isOpen) return null

  const handleJoinPin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    const clean = inputPin.trim()
    if (!/^\d{6}$/.test(clean)) {
      setErrorMsg('El PIN debe tener exactamente 6 números (ej: 123456)')
      return
    }
    onSetPin(clean)
    setInputPin('')
  }

  const handleGenerateRandomPin = () => {
    setErrorMsg('')
    const random = Math.floor(100000 + Math.random() * 900000).toString()
    onSetPin(random)
  }

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="catalog-modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="catalog-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '430px',
          height: 'auto',
          maxHeight: '92vh',
          borderRadius: '16px',
        }}
      >
        <div className="catalog-modal-header" style={{ background: '#007849' }}>
          <h2>
            <span>📲</span> Sincronizar en pareja
          </h2>
          <button className="catalog-modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', textAlign: 'center' }}>
          {currentPin ? (
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#dcfce7',
                  color: '#166534',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                }}
              >
                <span>🟢</span> Sincronización activa en tiempo real
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.25rem',
                  color: '#444',
                  marginBottom: '4px',
                }}
              >
                Tu código PIN compartido:
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '2.4rem',
                  fontWeight: 'bold',
                  letterSpacing: '6px',
                  color: '#007849',
                  background: '#f4ede0',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  display: 'inline-block',
                  margin: '6px 0 16px',
                  border: '2px dashed #b5ae9f',
                }}
              >
                {currentPin}
              </div>

              {/* Imagen del código QR */}
              {qrDataUrl && (
                <div style={{ marginBottom: '14px' }}>
                  <img
                    src={qrDataUrl}
                    alt="Código QR de sincronización"
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '12px',
                      border: '2px solid #007849',
                      padding: '4px',
                      background: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: '#666',
                      marginTop: '6px',
                      maxWidth: '280px',
                      marginInline: 'auto',
                    }}
                  >
                    📸 Apunta la cámara del otro móvil a este QR para conectar automáticamente.
                  </div>
                </div>
              )}

              {/* Botón copiar enlace */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    background: '#f3efe6',
                    border: '1px solid #c9c1af',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    color: '#333',
                  }}
                >
                  {copied ? '✅ ¡Enlace copiado!' : '📋 Copiar enlace'}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomPin}
                  style={{
                    background: '#f3efe6',
                    border: '1px solid #c9c1af',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-note)',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    color: '#333',
                  }}
                >
                  🎲 Nuevo PIN
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔒</div>
              <h3 style={{ margin: '0 0 8px', color: '#333' }}>Modo local sin compartir</h3>
              <p style={{ fontSize: '0.92rem', color: '#666', margin: '0 0 16px' }}>
                Genera un PIN o escanea el QR de tu pareja para sincronizar las listas al instante.
              </p>
              <button
                type="button"
                onClick={handleGenerateRandomPin}
                style={{
                  background: '#007849',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '1.05rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,120,73,0.3)',
                }}
              >
                ✨ Crear nuevo PIN para compartir
              </button>
            </div>
          )}

          {/* Formulario para unirse a un PIN existente */}
          <div
            style={{
              background: '#fcfaf5',
              border: '1px solid #e0d8c7',
              borderRadius: '12px',
              padding: '14px',
              marginTop: '10px',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-note)',
                fontSize: '1.05rem',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '6px',
              }}
            >
              ¿Tienes el PIN del otro móvil?
            </div>
            <form
              onSubmit={handleJoinPin}
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={inputPin}
                onChange={(e) => {
                  setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setErrorMsg('')
                }}
                placeholder="ej: 654321"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #b5ae9f',
                  fontSize: '1.1rem',
                  letterSpacing: '3px',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#007849',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontFamily: 'var(--font-note)',
                  fontSize: '1.05rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Conectar
              </button>
            </form>
            {errorMsg && (
              <div style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '6px' }}>
                {errorMsg}
              </div>
            )}
          </div>

          {/* Botón desconectar */}
          {currentPin && (
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  onDisconnect()
                  onClose()
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Desconectar y volver a modo solo local
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

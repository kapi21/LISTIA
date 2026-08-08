import { isLocalMode } from './data/createSync'

function App() {
  return (
    <main>
      {isLocalMode && (
        <p role="status" style={{ background: '#fff3cd', padding: '0.5rem 1rem' }}>
          modo local (sin nube)
        </p>
      )}
      <h1>Lista compra PWA</h1>
    </main>
  )
}
export default App

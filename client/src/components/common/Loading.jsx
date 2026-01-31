export default function Loading({ fullScreen = false, message = 'Loading' }) {
  return (
    <div className={`loading-container ${fullScreen ? 'fullscreen' : ''}`}>
      <div className="loading-spinner"></div>
      {message && <p className="loading-text">{message}</p>}
    </div>
  )
}

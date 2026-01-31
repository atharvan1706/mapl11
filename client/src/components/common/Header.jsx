import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

// MAPL11 Logo SVG Component
const Logo = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cricket Ball */}
    <circle cx="18" cy="18" r="16" fill="url(#ballGradient)" />
    {/* Ball Seam */}
    <path
      d="M6 18c3-6 9-10 12-10s9 4 12 10c-3 6-9 10-12 10s-9-4-12-10z"
      stroke="#c9372c"
      strokeWidth="1.5"
      fill="none"
    />
    {/* Seam stitches */}
    <path
      d="M8 14l1 1M10 12l1 1M12 10l1 1M14 9l1 0.5M22 9l-1 0.5M24 10l-1 1M26 12l-1 1M28 14l-1 1M8 22l1-1M10 24l1-1M12 26l1-1M14 27l1-0.5M22 27l-1-0.5M24 26l-1-1M26 24l-1-1M28 22l-1-1"
      stroke="#c9372c"
      strokeWidth="1"
      strokeLinecap="round"
    />
    {/* Shine */}
    <circle cx="12" cy="12" r="3" fill="url(#shine)" opacity="0.4" />
    <defs>
      <linearGradient id="ballGradient" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3fb950" />
        <stop offset="1" stopColor="#238636" />
      </linearGradient>
      <radialGradient id="shine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(3)">
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
)

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="header-logo">
          <div className="logo-icon">
            <Logo />
          </div>
          <div className="logo-text">
            <span className="logo-title">MAPL11</span>
            <span className="logo-subtitle">Fantasy Cricket</span>
          </div>
        </Link>

        <div className="header-right">
          {user && (
            <div className="header-avatar" onClick={() => navigate('/profile')}>
              <div className="avatar-placeholder">
                {getInitials(user.displayName)}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

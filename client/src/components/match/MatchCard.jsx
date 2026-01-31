import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const matchCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

export default function MatchCard({ match, index = 0 }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeRemaining = (dateStr) => {
    const now = new Date()
    const matchDate = new Date(dateStr)
    const diff = matchDate - now

    if (diff < 0) return 'Started'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'
  const isUpcoming = match.status === 'upcoming'

  return (
    <motion.div
      variants={matchCardVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link 
        to={`/match/${match._id}`} 
        className={`match-card glass ${isLive ? 'live' : ''} ${isCompleted ? 'completed' : ''}`}
      >
        {/* Live Glow Effect */}
        {isLive && <div className="match-card-live-glow"></div>}
        
        {/* Card Content */}
        <div className="match-card-inner">
          {/* Header - Status & Time */}
          <div className="match-card-header">
            {isLive ? (
              <div className="match-live-badge">
                <span className="live-dot"></span>
                <span className="live-ring"></span>
                LIVE
              </div>
            ) : isCompleted ? (
              <div className="match-status-badge completed">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Completed
              </div>
            ) : (
              <div className="match-time-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {getTimeRemaining(match.matchDate)}
              </div>
            )}
            
            <div className="match-series-badge">
              🏏 T20
            </div>
          </div>

          {/* Teams Section */}
          <div className="match-teams">
            <div className="match-team">
              <div className={`match-team-logo ${isLive ? 'animated' : ''}`}>
                <div className="team-logo-bg"></div>
                <span className="team-logo-text">{match.team1.shortName}</span>
              </div>
              <div className="match-team-info">
                <span className="match-team-name">{match.team1.name}</span>
                {match.result?.team1Score && (
                  <motion.span 
                    className="match-score"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {match.result.team1Score}
                  </motion.span>
                )}
              </div>
            </div>

            <div className="match-vs-section">
              <div className="match-vs-line"></div>
              <div className={`match-vs-badge ${isLive ? 'live' : ''}`}>
                {isLive ? (
                  <div className="vs-live-icon">
                    <span className="vs-pulse"></span>
                    VS
                  </div>
                ) : (
                  'VS'
                )}
              </div>
              <div className="match-vs-line"></div>
            </div>

            <div className="match-team">
              <div className={`match-team-logo ${isLive ? 'animated' : ''}`}>
                <div className="team-logo-bg"></div>
                <span className="team-logo-text">{match.team2.shortName}</span>
              </div>
              <div className="match-team-info">
                <span className="match-team-name">{match.team2.name}</span>
                {match.result?.team2Score && (
                  <motion.span 
                    className="match-score"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {match.result.team2Score}
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          {/* Match Info Footer */}
          <div className="match-card-footer">
            {isUpcoming && (
              <div className="match-date-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDate(match.matchDate)}
              </div>
            )}
            
            {isLive && match.liveData && (
              <div className="match-live-score">
                <span className="current-score">{match.liveData.currentScore}</span>
                <span className="current-over">({match.liveData.currentOver} ov)</span>
              </div>
            )}
            
            {isCompleted && match.result?.summary && (
              <div className="match-result-summary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                {match.result.summary}
              </div>
            )}
            
            <div className="match-venue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {match.venue}
            </div>
          </div>

          {/* Play Button Overlay */}
          <div className="match-card-action">
            <div className="play-button">
              <span>{isCompleted ? 'View' : 'Play'}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { matchService } from '../services/matchService'
import Loading from '../components/common/Loading'
import MatchCard from '../components/match/MatchCard'

// Helper to get user initials
const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Animated Counter Component
function AnimatedNumber({ value, duration = 1.5 }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => {
    if (typeof value === 'string') return value
    return Math.round(latest)
  })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (typeof value === 'number') {
      const controls = animate(count, value, { duration })
      return controls.stop
    }
  }, [value, count, duration])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v))
    return unsubscribe
  }, [rounded])

  if (typeof value === 'string') return value
  return displayValue
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12
    }
  }
}

const heroVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

const statsVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.3
    }
  }
}

const statCardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 14
    }
  }
}

const matchListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2
    }
  }
}

const actionVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 15
    }
  },
  tap: { scale: 0.95 }
}

export default function HomePage() {
  const { user } = useAuth()
  const [liveMatches, setLiveMatches] = useState([])
  const [upcomingMatches, setUpcomingMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const [liveRes, upcomingRes] = await Promise.all([
          matchService.getLiveMatches(),
          matchService.getUpcomingMatches()
        ])
        setLiveMatches(liveRes.data || [])
        setUpcomingMatches(upcomingRes.data || [])
      } catch (error) {
        console.error('Error fetching matches:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [])

  if (loading) {
    return <Loading fullScreen message="Loading matches" />
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <motion.div 
      className="home-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Pattern */}
      <div className="home-bg-pattern"></div>
      <div className="home-bg-glow"></div>

      {/* Hero Welcome Section */}
      <motion.div className="welcome-hero" variants={heroVariants}>
        <div className="welcome-hero-inner">
          <div className="welcome-content">
            <motion.span 
              className="welcome-greeting"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {getGreeting()}
            </motion.span>
            <motion.h1 
              className="welcome-name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {user?.displayName || 'Champion'}
            </motion.h1>
            <motion.p 
              className="welcome-subtitle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              Ready to play fantasy cricket?
            </motion.p>
          </div>
          <motion.div 
            className="welcome-avatar"
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ 
              delay: 0.3, 
              type: 'spring', 
              stiffness: 200,
              damping: 15 
            }}
          >
            <div className="avatar-ring">
              <div className="avatar-ring-glow"></div>
              <div className="avatar-large">
                {getInitials(user?.displayName)}
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Decorative Elements */}
        <div className="hero-decoration">
          <div className="cricket-ball-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8.5 5.5C9.5 7 9.5 9 8 11C6.5 13 6.5 15 7.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M15.5 5.5C14.5 7 14.5 9 16 11C17.5 13 17.5 15 16.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div className="quick-stats" variants={statsVariants}>
        <motion.div 
          className="stat-card glass"
          variants={statCardVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="stat-icon-wrapper neumorphic">
            <div className="stat-icon secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
          </div>
          <div className="stat-details">
            <span className="stat-value">
              <AnimatedNumber value={user?.stats?.matchesPlayed || 0} />
            </span>
            <span className="stat-label">Matches</span>
          </div>
          <div className="stat-glow secondary"></div>
        </motion.div>

        <motion.div 
          className="stat-card glass featured"
          variants={statCardVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="stat-icon-wrapper neumorphic gold">
            <div className="stat-icon gold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 22V12"/>
                <path d="M14 22V12"/>
                <rect x="6" y="3" width="12" height="9" rx="2"/>
              </svg>
            </div>
          </div>
          <div className="stat-details">
            <span className="stat-value rank">
              #{user?.stats?.bestRank || '-'}
            </span>
            <span className="stat-label">Best Rank</span>
          </div>
          <div className="stat-glow gold"></div>
        </motion.div>

        <motion.div 
          className="stat-card glass"
          variants={statCardVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="stat-icon-wrapper neumorphic">
            <div className="stat-icon accent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
          </div>
          <div className="stat-details">
            <span className="stat-value">
              <AnimatedNumber value={user?.stats?.totalWins || 0} />
            </span>
            <span className="stat-label">Wins</span>
          </div>
          <div className="stat-glow accent"></div>
        </motion.div>
      </motion.div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <motion.section 
          className="matches-section live-section"
          variants={itemVariants}
        >
          <div className="section-header">
            <h3 className="section-title">
              <span className="live-indicator">
                <span className="live-dot"></span>
                <span className="live-ring"></span>
                LIVE
              </span>
              Matches
            </h3>
            <div className="live-pulse-bg"></div>
          </div>
          <motion.div 
            className="matches-list"
            variants={matchListVariants}
          >
            {liveMatches.map((match, index) => (
              <MatchCard key={match._id} match={match} index={index} />
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* Upcoming Matches */}
      <motion.section 
        className="matches-section"
        variants={itemVariants}
      >
        <div className="section-header">
          <h3 className="section-title">
            <div className="section-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="section-icon">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            Upcoming Matches
          </h3>
          {upcomingMatches.length > 3 && (
            <Link to="/matches" className="see-all-link">
              <span>See All</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          )}
        </div>

        {upcomingMatches.length > 0 ? (
          <motion.div 
            className="matches-list"
            variants={matchListVariants}
          >
            {upcomingMatches.slice(0, 3).map((match, index) => (
              <MatchCard key={match._id} match={match} index={index} />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            className="empty-state-card glass"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="empty-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <circle cx="12" cy="15" r="2"/>
              </svg>
            </div>
            <p>No upcoming matches scheduled</p>
            <span>Check back later for new matches</span>
          </motion.div>
        )}
      </motion.section>

      {/* Quick Actions */}
      <motion.section 
        className="quick-actions"
        variants={statsVariants}
      >
        <motion.div variants={actionVariants}>
          <Link to="/matches" className="action-card glass neumorphic-btn">
            <motion.div 
              className="action-icon-wrapper"
              whileHover={{ rotate: 10 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="action-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 12a4 4 0 0 0 8 0"/>
                  <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                </svg>
              </div>
            </motion.div>
            <span>All Matches</span>
            <div className="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={actionVariants}>
          <Link to="/leaderboard" className="action-card glass neumorphic-btn">
            <motion.div 
              className="action-icon-wrapper"
              whileHover={{ rotate: -10 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="action-icon leaderboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="14" width="4" height="7" rx="1"/>
                  <rect x="10" y="9" width="4" height="12" rx="1"/>
                  <rect x="16" y="12" width="4" height="9" rx="1"/>
                  <circle cx="12" cy="5" r="2"/>
                </svg>
              </div>
            </motion.div>
            <span>Leaderboard</span>
            <div className="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={actionVariants}>
          <Link to="/profile" className="action-card glass neumorphic-btn">
            <motion.div 
              className="action-icon-wrapper"
              whileHover={{ rotate: 10 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="action-icon profile">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
            </motion.div>
            <span>My Profile</span>
            <div className="action-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        </motion.div>
      </motion.section>

      {/* Bottom Spacing for Navigation */}
      <div className="bottom-spacer"></div>
    </motion.div>
  )
}
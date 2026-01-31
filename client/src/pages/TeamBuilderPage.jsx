import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchService } from '../services/matchService'
import { fantasyService } from '../services/fantasyService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

const MAX_CREDITS = 100
const TEAM_SIZE = 11

// Team composition rules
const ROLE_REQUIREMENTS = {
  'Wicket-Keeper': { min: 1, max: 4 },
  'Batsman': { min: 3, max: 6 },
  'All-Rounder': { min: 1, max: 4 },
  'Bowler': { min: 3, max: 6 }
}
const MAX_PLAYERS_PER_TEAM = 7

export default function TeamBuilderPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { success, error: showError } = useToast()

  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [captain, setCaptain] = useState(null)
  const [viceCaptain, setViceCaptain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [step, setStep] = useState(1)

  // Use refs to store toast functions to avoid dependency issues and prevent double calls
  const showErrorRef = useRef(showError)
  const successRef = useRef(success)
  
  // Keep refs updated
  useEffect(() => {
    showErrorRef.current = showError
    successRef.current = success
  }, [showError, success])

  // Track last error to prevent duplicates
  const lastErrorRef = useRef({ message: '', time: 0 })

  // Helper function to show error without duplicates
  const showErrorOnce = (message) => {
    const now = Date.now()
    if (
      lastErrorRef.current.message === message &&
      now - lastErrorRef.current.time < 1000
    ) {
      return // Skip duplicate
    }
    lastErrorRef.current = { message, time: now }
    showErrorRef.current(message)
  }

  useEffect(() => {
    // Flag to prevent state updates after unmount (fixes StrictMode double-render)
    let isActive = true

    const fetchData = async () => {
      try {
        const [matchRes, playersRes, teamRes] = await Promise.all([
          matchService.getMatch(matchId),
          matchService.getMatchPlayers(matchId),
          fantasyService.getFantasyTeam(matchId)
        ])

        // Only update state if component is still mounted
        if (!isActive) return

        setMatch(matchRes.data)
        setPlayers(playersRes.data || [])

        if (teamRes.data) {
          const existingPlayers = teamRes.data.players.map(p => p.playerId._id || p.playerId)
          setSelectedPlayers(existingPlayers)
          const captainPlayer = teamRes.data.players.find(p => p.isCaptain)
          const vcPlayer = teamRes.data.players.find(p => p.isViceCaptain)
          if (captainPlayer) setCaptain(captainPlayer.playerId._id || captainPlayer.playerId)
          if (vcPlayer) setViceCaptain(vcPlayer.playerId._id || vcPlayer.playerId)
        }
      } catch (error) {
        // Only show error if component is still mounted
        if (isActive) {
          showErrorOnce('Error loading data')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchData()

    // Cleanup function - runs when component unmounts or matchId changes
    return () => {
      isActive = false
    }
  }, [matchId])

  const filteredPlayers = useMemo(() => {
    if (filter === 'all') return players
    return players.filter(p => p.role === filter)
  }, [players, filter])

  const usedCredits = useMemo(() => {
    return players
      .filter(p => selectedPlayers.includes(p._id))
      .reduce((sum, p) => sum + p.creditValue, 0)
  }, [players, selectedPlayers])

  const remainingCredits = MAX_CREDITS - usedCredits

  // Live validation
  const validationStatus = useMemo(() => {
    const selectedPlayerObjects = players.filter(p => selectedPlayers.includes(p._id))
    
    const roleCounts = {
      'Wicket-Keeper': 0,
      'Batsman': 0,
      'All-Rounder': 0,
      'Bowler': 0
    }
    
    const teamCounts = {}
    
    selectedPlayerObjects.forEach(player => {
      roleCounts[player.role] = (roleCounts[player.role] || 0) + 1
      teamCounts[player.team] = (teamCounts[player.team] || 0) + 1
    })
    
    const errors = []
    const warnings = []
    
    Object.entries(ROLE_REQUIREMENTS).forEach(([role, limits]) => {
      const count = roleCounts[role]
      const remaining = TEAM_SIZE - selectedPlayers.length
      
      if (count > limits.max) {
        errors.push(`Max ${limits.max} ${role}s allowed (have ${count})`)
      } else if (count === limits.max && remaining > 0) {
        warnings.push(`${role}: Max reached (${count}/${limits.max})`)
      }
      
      const needed = limits.min - count
      if (needed > remaining && selectedPlayers.length > 0) {
        errors.push(`Need ${needed} more ${role}(s), only ${remaining} slots left`)
      }
    })
    
    Object.entries(teamCounts).forEach(([team, count]) => {
      if (count > MAX_PLAYERS_PER_TEAM) {
        errors.push(`Max ${MAX_PLAYERS_PER_TEAM} from ${team} (have ${count})`)
      } else if (count === MAX_PLAYERS_PER_TEAM) {
        warnings.push(`${team}: Max reached (${count}/${MAX_PLAYERS_PER_TEAM})`)
      }
    })
    
    let minimumsMet = true
    if (selectedPlayers.length === TEAM_SIZE) {
      Object.entries(ROLE_REQUIREMENTS).forEach(([role, limits]) => {
        if (roleCounts[role] < limits.min) {
          errors.push(`Need at least ${limits.min} ${role}(s) (have ${roleCounts[role]})`)
          minimumsMet = false
        }
      })
    }
    
    const canContinue = selectedPlayers.length === TEAM_SIZE && errors.length === 0 && minimumsMet
    
    return { roleCounts, teamCounts, errors, warnings, canContinue }
  }, [players, selectedPlayers])

  const togglePlayer = (playerId) => {
    const player = players.find(p => p._id === playerId)
    if (!player) return

    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        if (captain === playerId) setCaptain(null)
        if (viceCaptain === playerId) setViceCaptain(null)
        return prev.filter(id => id !== playerId)
      }
      
      if (prev.length >= TEAM_SIZE) {
        showErrorOnce(`Maximum ${TEAM_SIZE} players allowed`)
        return prev
      }
      
      if (player.creditValue > remainingCredits) {
        showErrorOnce('Not enough credits')
        return prev
      }
      
      const currentRoleCount = players
        .filter(p => prev.includes(p._id) && p.role === player.role)
        .length
      
      if (currentRoleCount >= ROLE_REQUIREMENTS[player.role].max) {
        showErrorOnce(`Max ${ROLE_REQUIREMENTS[player.role].max} ${player.role}s allowed`)
        return prev
      }
      
      const currentTeamCount = players
        .filter(p => prev.includes(p._id) && p.team === player.team)
        .length
      
      if (currentTeamCount >= MAX_PLAYERS_PER_TEAM) {
        showErrorOnce(`Max ${MAX_PLAYERS_PER_TEAM} players from ${player.team}`)
        return prev
      }
      
      return [...prev, playerId]
    })
  }

  const handleContinue = () => {
    if (!validationStatus.canContinue) {
      if (validationStatus.errors.length > 0) {
        showErrorOnce(validationStatus.errors[0])
      } else {
        showErrorOnce(`Please select ${TEAM_SIZE} players`)
      }
      return
    }
    setStep(2)
  }

  const handleSave = async () => {
    if (!captain || !viceCaptain) {
      showErrorOnce('Please select captain and vice-captain')
      return
    }

    setSaving(true)
    try {
      await fantasyService.createOrUpdateTeam(matchId, {
        players: selectedPlayers,
        captainId: captain,
        viceCaptainId: viceCaptain
      })
      successRef.current('Team saved successfully!')
      navigate(`/match/${matchId}`)
    } catch (err) {
      showErrorOnce(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />
  if (!match) return <div className="empty-state-card"><p>Match not found</p></div>

  const selectedPlayerObjects = players.filter(p => selectedPlayers.includes(p._id))

  return (
    <div className="team-builder-page">
      {/* Credit Counter */}
      <div className="credit-counter">
        <div>
          <div className="credit-value">{selectedPlayers.length}/{TEAM_SIZE}</div>
          <div className="credit-label">Players</div>
        </div>
        <div>
          <div className="credit-value">{remainingCredits.toFixed(1)}</div>
          <div className="credit-label">Credits Left</div>
        </div>
      </div>

      {/* Live Validation Status */}
      {selectedPlayers.length > 0 && (
        <div className="validation-status">
          <div className="role-counts">
            {Object.entries(ROLE_REQUIREMENTS).map(([role, limits]) => {
              const count = validationStatus.roleCounts[role]
              const isMin = count < limits.min
              const isMax = count >= limits.max
              
              return (
                <div 
                  key={role} 
                  className={`role-count ${isMin ? 'need-more' : ''} ${isMax ? 'maxed' : ''}`}
                >
                  <span className="role-abbr">
                    {role === 'Wicket-Keeper' ? 'WK' : 
                     role === 'All-Rounder' ? 'AR' : 
                     role.substring(0, 3).toUpperCase()}
                  </span>
                  <span className="role-num">{count}</span>
                  <span className="role-range">({limits.min}-{limits.max})</span>
                </div>
              )
            })}
          </div>

          {validationStatus.errors.length > 0 && (
            <div className="validation-errors">
              {validationStatus.errors.map((err, i) => (
                <div key={i} className="validation-error">⚠️ {err}</div>
              ))}
            </div>
          )}

          {validationStatus.warnings.length > 0 && validationStatus.errors.length === 0 && (
            <div className="validation-warnings">
              {validationStatus.warnings.map((warn, i) => (
                <div key={i} className="validation-warning">ℹ️ {warn}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 ? (
        <>
          {/* Role Filter */}
          <div className="tabs">
            {['all', 'Wicket-Keeper', 'Batsman', 'All-Rounder', 'Bowler'].map(role => (
              <button
                key={role}
                className={`tab ${filter === role ? 'active' : ''}`}
                onClick={() => setFilter(role)}
              >
                {role === 'all' ? 'All' : role === 'Wicket-Keeper' ? 'WK' : role.split('-')[0]}
              </button>
            ))}
          </div>

          {/* Players List */}
          <div className="players-list">
            {filteredPlayers.map(player => {
              const isSelected = selectedPlayers.includes(player._id)
              const canSelect = isSelected || (selectedPlayers.length < TEAM_SIZE && player.creditValue <= remainingCredits)

              return (
                <div
                  key={player._id}
                  className={`player-card ${isSelected ? 'selected' : ''} ${!canSelect ? 'disabled' : ''}`}
                  onClick={() => canSelect && togglePlayer(player._id)}
                >
                  <div className="player-avatar">
                    {player.image ? (
                      <img
                        src={player.image}
                        alt={player.name}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <span style={{ display: player.image ? 'none' : 'flex' }}>
                      {player.name.charAt(0)}
                    </span>
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-meta">
                      <span className="player-team">{player.team}</span>
                      <span className="player-role">{player.role}</span>
                    </div>
                  </div>
                  <div className="player-credits">{player.creditValue}</div>
                </div>
              )
            })}
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleContinue}
            disabled={!validationStatus.canContinue}
          >
            Continue ({selectedPlayers.length}/{TEAM_SIZE})
          </button>
        </>
      ) : (
        <>
          {/* Captain Selection */}
          <div className="card mb-3">
            <div className="card-header">Select Captain & Vice-Captain</div>
            <div className="card-body">
              <p className="text-sm text-muted mb-3">
                Captain gets 2x points, Vice-captain gets 1.5x points
              </p>

              <div className="captain-selection-list">
                {selectedPlayerObjects.map(player => (
                  <div key={player._id} className="captain-row">
                    <div className="captain-player">
                      <div className="captain-avatar">
                        {player.image ? (
                          <img src={player.image} alt={player.name} />
                        ) : (
                          <span>{player.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="captain-info">
                        <div className="captain-name">{player.name}</div>
                        <div className="captain-role">{player.role}</div>
                      </div>
                    </div>
                    <div className="captain-buttons">
                      <button
                        className={`captain-btn ${captain === player._id ? 'active captain' : ''}`}
                        onClick={() => {
                          if (viceCaptain === player._id) setViceCaptain(null)
                          setCaptain(captain === player._id ? null : player._id)
                        }}
                      >
                        C
                      </button>
                      <button
                        className={`captain-btn ${viceCaptain === player._id ? 'active vice' : ''}`}
                        onClick={() => {
                          if (captain === player._id) setCaptain(null)
                          setViceCaptain(viceCaptain === player._id ? null : player._id)
                        }}
                      >
                        VC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn btn-primary flex-1"
              onClick={handleSave}
              disabled={saving || !captain || !viceCaptain}
            >
              {saving ? 'Saving...' : 'Save Team'}
            </button>
          </div>
        </>
      )}

      <style>{`
        .validation-status {
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        .role-counts {
          display: flex;
          justify-content: space-between;
          gap: var(--spacing-xs);
        }
        .role-count {
          flex: 1;
          text-align: center;
          padding: var(--spacing-xs);
          background: var(--bg-card);
          border-radius: var(--radius-sm);
          border: 2px solid transparent;
        }
        .role-count.need-more {
          border-color: var(--warning);
          background: rgba(245, 158, 11, 0.1);
        }
        .role-count.maxed {
          border-color: var(--success);
          background: rgba(46, 160, 67, 0.1);
        }
        .role-abbr {
          display: block;
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .role-num {
          display: block;
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .role-range {
          font-size: 0.6rem;
          color: var(--text-muted);
        }
        .validation-errors {
          margin-top: var(--spacing-sm);
        }
        .validation-error {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(248, 81, 73, 0.15);
          color: var(--error);
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: var(--radius-sm);
          margin-top: var(--spacing-xs);
        }
        .validation-warnings {
          margin-top: var(--spacing-sm);
        }
        .validation-warning {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(245, 158, 11, 0.15);
          color: var(--warning);
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: var(--radius-sm);
          margin-top: var(--spacing-xs);
        }
        .player-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .player-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        }
        .player-avatar span {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--text-primary);
        }
        .captain-selection-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .captain-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
        }
        .captain-player {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .captain-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--bg-card);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .captain-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .captain-avatar span {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .captain-info {
          min-width: 0;
        }
        .captain-name {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .captain-role {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .captain-buttons {
          display: flex;
          gap: var(--spacing-sm);
        }
        .captain-btn {
          width: 32px;
          height: 32px;
          border: 2px solid var(--border-primary);
          border-radius: var(--radius-full);
          background: var(--bg-card);
          color: var(--text-muted);
          font-weight: 700;
          font-size: 0.7rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .captain-btn:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        .captain-btn.active.captain {
          background: var(--accent);
          border-color: var(--accent);
          color: white;
        }
        .captain-btn.active.vice {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
      `}</style>
    </div>
  )
}
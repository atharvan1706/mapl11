import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchService } from '../services/matchService'
import { fantasyService } from '../services/fantasyService'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'

const MAX_CREDITS = 100
const TEAM_SIZE = 11

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, playersRes, teamRes] = await Promise.all([
          matchService.getMatch(matchId),
          matchService.getMatchPlayers(matchId),
          fantasyService.getFantasyTeam(matchId)
        ])
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
        showError('Error loading data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
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

  const togglePlayer = (playerId) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        if (captain === playerId) setCaptain(null)
        if (viceCaptain === playerId) setViceCaptain(null)
        return prev.filter(id => id !== playerId)
      } else {
        if (prev.length >= TEAM_SIZE) {
          showError(`Maximum ${TEAM_SIZE} players allowed`)
          return prev
        }
        const player = players.find(p => p._id === playerId)
        if (player.creditValue > remainingCredits) {
          showError('Not enough credits')
          return prev
        }
        return [...prev, playerId]
      }
    })
  }

  const handleContinue = () => {
    if (selectedPlayers.length !== TEAM_SIZE) {
      showError(`Please select ${TEAM_SIZE} players`)
      return
    }
    setStep(2)
  }

  const handleSave = async () => {
    if (!captain || !viceCaptain) {
      showError('Please select captain and vice-captain')
      return
    }

    setSaving(true)
    try {
      await fantasyService.createOrUpdateTeam(matchId, {
        players: selectedPlayers,
        captainId: captain,
        viceCaptainId: viceCaptain
      })
      success('Team saved successfully!')
      navigate(`/match/${matchId}`)
    } catch (err) {
      showError(err.message)
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
                {role === 'all' ? 'All' : role === 'Wicket-Keeper' ? 'Wicket' : role.split('-')[0]}
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
            disabled={selectedPlayers.length !== TEAM_SIZE}
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

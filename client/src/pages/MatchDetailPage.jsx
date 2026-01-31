import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { matchService } from '../services/matchService'
import { fantasyService } from '../services/fantasyService'
import { teamService } from '../services/teamService'
import { useMatchSocket } from '../hooks/useSocket'
import { useToast } from '../hooks/useToast'
import Loading from '../components/common/Loading'
import TeamLineup from '../components/fantasy/TeamLineup'

export default function MatchDetailPage() {
  const { matchId } = useParams()
  const [match, setMatch] = useState(null)
  const [fantasyTeam, setFantasyTeam] = useState(null)
  const [teamStatus, setTeamStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLineup, setShowLineup] = useState(false)
  const { success, error: showError } = useToast()

  useMatchSocket(matchId, {
    onScoreUpdate: (data) => {
      if (data.matchId === matchId) {
        setMatch(prev => ({ ...prev, liveData: data.liveData }))
      }
    },
    onTeamMatched: (data) => {
      if (data.matchId === matchId) {
        setTeamStatus({ status: 'matched', team: data })
        success('You have been matched with a team!')
      }
    },
    onMatchLocked: (data) => {
      if (data.matchId === matchId) {
        setMatch(prev => ({ ...prev, isTeamSelectionOpen: false }))
      }
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [matchRes, fantasyRes, teamStatusRes] = await Promise.all([
          matchService.getMatch(matchId),
          fantasyService.getFantasyTeam(matchId),
          teamService.getQueueStatus(matchId)
        ])
        setMatch(matchRes.data)
        setFantasyTeam(fantasyRes.data)
        setTeamStatus(teamStatusRes.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [matchId])

  const handleJoinQueue = async () => {
    try {
      const result = await teamService.joinQueue(matchId)
      setTeamStatus(result.data)
      if (result.data.matched) {
        success('Matched with a team!')
      } else {
        success('Joined the queue!')
      }
    } catch (err) {
      showError(err.message)
    }
  }

  if (loading) return <Loading />
  if (!match) return <div className="empty-state-card"><p>Match not found</p></div>

  const isUpcoming = match.status === 'upcoming'
  const isLive = match.status === 'live'
  const canCreateTeam = isUpcoming && match.isTeamSelectionOpen

  return (
    <div className="match-detail-page">
      {/* Match Header */}
      <div className="match-header-card">
        <div className="match-header-teams">
          <div className="match-header-team">
            <div className="team-logo-large">{match.team1.shortName}</div>
            <span className="team-name-large">{match.team1.name}</span>
            {match.result?.team1Score && (
              <span className="match-score">{match.result.team1Score}</span>
            )}
          </div>

          <div className="match-header-vs">
            <span className={`match-status-badge ${match.status}`}>
              {match.status.toUpperCase()}
            </span>
          </div>

          <div className="match-header-team">
            <div className="team-logo-large">{match.team2.shortName}</div>
            <span className="team-name-large">{match.team2.name}</span>
            {match.result?.team2Score && (
              <span className="match-score">{match.result.team2Score}</span>
            )}
          </div>
        </div>

        {isLive && match.liveData && (
          <div className="live-score-box">
            <div className="live-score-value">
              {match.liveData.currentScore}
            </div>
            <div className="live-score-overs">
              {match.liveData.currentOver} overs
            </div>
          </div>
        )}

        <div className="match-meta">
          <span className="match-venue">{match.venue}</span>
        </div>
      </div>

      {/* Actions */}
      {canCreateTeam && (
        <div className="card">
          <div className="card-body">
            <h3 className="section-title mb-3">Create Your Team</h3>

            {/* Tab-like buttons */}
            <div className="action-tabs">
              {fantasyTeam ? (
                <Link to={`/match/${matchId}/team-builder`} className="action-tab">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Edit Fantasy Team
                </Link>
              ) : (
                <Link to={`/match/${matchId}/team-builder`} className="action-tab active">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Create Fantasy Team
                </Link>
              )}

              <Link to={`/match/${matchId}/predictions`} className="action-tab">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                Make Predictions
              </Link>
            </div>

            {/* Fantasy Team Status */}
            {fantasyTeam && (
              <div className="team-status-card">
                <div className="team-status-info">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  <span>Fantasy team ready ({fantasyTeam.players?.length || 0} players)</span>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowLineup(true)}
                >
                  View
                </button>
              </div>
            )}

            {/* Auto-Match Queue */}
            {fantasyTeam && (
              <div className="team-competition-section">
                <h4 className="subsection-title">Team Competition</h4>
                {teamStatus?.status === 'matched' ? (
                  <div className="status-box success">
                    <span>Matched: {teamStatus.team?.teamName}</span>
                    <Link to={`/match/${matchId}/my-team`} className="btn btn-sm btn-primary">
                      View Team
                    </Link>
                  </div>
                ) : teamStatus?.status === 'waiting' ? (
                  <div className="status-box warning">
                    <span>In queue (waiting for {teamStatus.needMore} more)</span>
                  </div>
                ) : (
                  <button onClick={handleJoinQueue} className="btn btn-success btn-full">
                    Join Team Competition
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Link */}
      <Link to={`/leaderboard/${matchId}`} className="btn btn-secondary btn-full mt-3">
        View Leaderboard
      </Link>

      {/* Team Lineup Modal */}
      {showLineup && fantasyTeam && (
        <TeamLineup
          players={fantasyTeam.players?.map(p => p.playerId) || []}
          captain={fantasyTeam.players?.find(p => p.isCaptain)?.playerId?._id}
          viceCaptain={fantasyTeam.players?.find(p => p.isViceCaptain)?.playerId?._id}
          onClose={() => setShowLineup(false)}
        />
      )}

      <style>{`
        .match-status-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .match-status-badge.live {
          background: rgba(248, 81, 73, 0.15);
          color: var(--live);
        }
        .match-status-badge.upcoming {
          background: rgba(46, 160, 67, 0.15);
          color: var(--success);
        }
        .match-status-badge.completed {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }
        .live-score-box {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .live-score-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--live);
        }
        .live-score-overs {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .section-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .subsection-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }
        .action-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }
        .action-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: var(--transition-fast);
        }
        .action-tab svg {
          width: 18px;
          height: 18px;
        }
        .action-tab:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }
        .action-tab.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .team-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(46, 160, 67, 0.1);
          border: 1px solid rgba(46, 160, 67, 0.3);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
        }
        .team-status-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--success);
          font-size: 0.8rem;
          font-weight: 500;
        }
        .team-status-info svg {
          width: 18px;
          height: 18px;
        }
        .team-competition-section {
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--border-primary);
        }
      `}</style>
    </div>
  )
}

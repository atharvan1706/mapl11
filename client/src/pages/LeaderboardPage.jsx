import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { leaderboardService } from '../services/leaderboardService'
import { matchService } from '../services/matchService'
import { useAuth } from '../hooks/useAuth'
import Loading from '../components/common/Loading'

export default function LeaderboardPage() {
  const { matchId } = useParams()
  const { user } = useAuth()
  const [tab, setTab] = useState('individual')
  const [leaderboard, setLeaderboard] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (matchId) {
          const [matchRes, myRankRes] = await Promise.all([
            matchService.getMatch(matchId),
            leaderboardService.getMyRank(matchId)
          ])
          setMatch(matchRes.data)
          setMyRank(myRankRes.data)
        }

        const leaderboardRes = matchId
          ? tab === 'individual'
            ? await leaderboardService.getIndividualMatchLeaderboard(matchId)
            : await leaderboardService.getTeamMatchLeaderboard(matchId)
          : await leaderboardService.getOverallIndividualLeaderboard()

        setLeaderboard(leaderboardRes.data?.entries || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [matchId, tab])

  const getRankClass = (rank) => {
    if (rank === 1) return 'top-1'
    if (rank === 2) return 'top-2'
    if (rank === 3) return 'top-3'
    return ''
  }

  return (
    <div className="leaderboard-page">
      <h1 className="mb-md">Leaderboard</h1>

      {match && (
        <p className="text-gray text-sm mb-md">
          {match.team1.name} vs {match.team2.name}
        </p>
      )}

      {/* My Rank Card */}
      {myRank && myRank.rank && (
        <div className="card mb-md">
          <div className="card-body">
            <div className="my-rank-card">
              <div>
                <div className="text-gray text-sm">Your Rank</div>
                <div className="my-rank-value">#{myRank.rank}</div>
              </div>
              <div className="text-right">
                <div className="text-gray text-sm">Points</div>
                <div className="my-points-value">{myRank.totalPoints}</div>
              </div>
            </div>
            <div className="rank-breakdown mt-sm text-sm text-gray">
              Fantasy: {myRank.fantasyPoints} | Predictions: {myRank.predictionPoints}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {matchId && (
        <div className="tabs">
          <button
            className={`tab ${tab === 'individual' ? 'active' : ''}`}
            onClick={() => setTab('individual')}
          >
            Individual
          </button>
          <button
            className={`tab ${tab === 'team' ? 'active' : ''}`}
            onClick={() => setTab('team')}
          >
            Team
          </button>
        </div>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <Loading />
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <div
                  key={entry.userId || entry.teamId}
                  className={`leaderboard-row ${entry.userId === user?._id ? 'current-user' : ''}`}
                >
                  <div className={`leaderboard-rank ${getRankClass(entry.rank)}`}>
                    {entry.rank}
                  </div>
                  <div className="leaderboard-user">
                    <div className="leaderboard-name">
                      {entry.displayName || entry.teamName}
                    </div>
                    {entry.teamName && entry.members && (
                      <div className="team-members text-xs text-gray">
                        {entry.members.map(m => m.displayName).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="leaderboard-points">
                    {entry.totalPoints || entry.points}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No entries yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .my-rank-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .my-rank-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
        }
        .my-points-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--success);
        }
        .rank-breakdown {
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--gray-100);
        }
        .leaderboard-row.current-user {
          background: rgba(30, 64, 175, 0.05);
        }
        .team-members {
          margin-top: 2px;
        }
      `}</style>
    </div>
  )
}

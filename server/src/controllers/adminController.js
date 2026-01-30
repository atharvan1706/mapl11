/**
 * Admin Controller
 * Handles data synchronization from Cricket API
 */

const cricketApiService = require('../services/cricketApiService');
const scoringService = require('../services/scoringService');
const Match = require('../models/Match');
const Player = require('../models/Player');
const FantasyTeam = require('../models/FantasyTeam');
const Prediction = require('../models/Prediction');
const ApiError = require('../utils/ApiError');

/**
 * Check API status
 * GET /api/admin/api-status
 */
const checkApiStatus = async (req, res, next) => {
  try {
    const isConfigured = cricketApiService.isApiConfigured();

    if (!isConfigured) {
      return res.json({
        success: true,
        data: {
          configured: false,
          message: 'Cricket API key not configured. Add CRICKET_API_KEY to your .env file.'
        }
      });
    }

    // Test API connection
    try {
      const series = await cricketApiService.getSeries();
      res.json({
        success: true,
        data: {
          configured: true,
          connected: true,
          seriesCount: series.length
        }
      });
    } catch (apiError) {
      const errorMsg = apiError.message || 'Unknown API error';
      console.error('API connection test failed:', errorMsg);
      res.json({
        success: true,
        data: {
          configured: true,
          connected: false,
          error: errorMsg
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get available series/tournaments from API
 * GET /api/admin/series
 * Query params:
 *   - search: optional search term to filter series by name
 */
const getAvailableSeries = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { search } = req.query;
    const series = await cricketApiService.getSeries();

    // Log all series names for debugging
    console.log('All series from API:', series.map(s => s.name));

    // If search is provided, filter by search term
    let filteredSeries = series;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredSeries = series.filter(s =>
        s.name?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      count: filteredSeries.length,
      data: filteredSeries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current/live matches from API
 * GET /api/admin/live-matches
 */
const getLiveMatchesFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const matches = await cricketApiService.getCurrentMatches();

    // Filter for India matches if needed
    const indiaMatches = matches.filter(m =>
      m.teams?.some(t => t?.toLowerCase().includes('india')) ||
      m.name?.toLowerCase().includes('india')
    );

    res.json({
      success: true,
      count: indiaMatches.length,
      allMatchesCount: matches.length,
      data: indiaMatches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync matches from API to database
 * POST /api/admin/sync-matches
 */
const syncMatchesFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { seriesId, matchIds } = req.body;

    let matchesToSync = [];

    if (seriesId) {
      // Get matches from a specific series
      const seriesData = await cricketApiService.getSeriesMatches(seriesId);
      matchesToSync = seriesData.matchList || [];
    } else if (matchIds && matchIds.length > 0) {
      // Get specific matches by ID
      for (const id of matchIds) {
        const matchInfo = await cricketApiService.getMatchInfo(id);
        if (matchInfo) {
          matchesToSync.push(matchInfo);
        }
      }
    } else {
      // Get current matches
      matchesToSync = await cricketApiService.getCurrentMatches();
    }

    // Filter for India matches
    const indiaMatches = matchesToSync.filter(m =>
      m.teams?.some(t => t?.toLowerCase().includes('india')) ||
      m.name?.toLowerCase().includes('india')
    );

    const results = {
      synced: 0,
      updated: 0,
      errors: []
    };

    for (const apiMatch of indiaMatches) {
      try {
        const matchData = cricketApiService.transformMatchData(apiMatch);

        // Check if match already exists
        const existing = await Match.findOne({ externalMatchId: matchData.externalMatchId });

        if (existing) {
          // Update existing match
          await Match.findByIdAndUpdate(existing._id, matchData);
          results.updated++;
        } else {
          // Create new match
          await Match.create(matchData);
          results.synced++;
        }
      } catch (err) {
        results.errors.push({
          matchId: apiMatch.id,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalFound: indiaMatches.length,
        ...results
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync squad/players from API
 * POST /api/admin/sync-players
 */
const syncPlayersFromApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { seriesId, teamNames } = req.body;

    if (!seriesId) {
      return next(new ApiError(400, 'Series ID is required'));
    }

    const squads = await cricketApiService.getSeriesSquad(seriesId);

    const results = {
      synced: 0,
      updated: 0,
      errors: []
    };

    for (const team of squads) {
      // Filter by team names if provided
      if (teamNames && teamNames.length > 0) {
        const teamName = team.teamName?.toLowerCase() || '';
        if (!teamNames.some(t => teamName.includes(t.toLowerCase()))) {
          continue;
        }
      }

      const teamShortName = team.teamSName || team.teamName?.substring(0, 3).toUpperCase() || 'UNK';

      for (const apiPlayer of (team.players || [])) {
        try {
          const playerData = cricketApiService.transformPlayerData(apiPlayer, teamShortName);

          // Check if player already exists
          const existing = await Player.findOne({ externalPlayerId: playerData.externalPlayerId });

          if (existing) {
            // Update existing player
            await Player.findByIdAndUpdate(existing._id, playerData);
            results.updated++;
          } else {
            // Create new player
            await Player.create(playerData);
            results.synced++;
          }
        } catch (err) {
          results.errors.push({
            playerId: apiPlayer.id,
            playerName: apiPlayer.name,
            error: err.message
          });
        }
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update live scores from API
 * POST /api/admin/update-live-scores
 */
const updateLiveScores = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    // Get all live matches from our database
    const liveMatches = await Match.find({ status: 'live' });

    const results = {
      updated: 0,
      errors: []
    };

    for (const match of liveMatches) {
      if (!match.externalMatchId) continue;

      try {
        // Fetch latest score from API
        const scorecard = await cricketApiService.getMatchScorecard(match.externalMatchId);

        if (scorecard) {
          // Extract live data
          const lastInnings = scorecard.scoreCard?.[scorecard.scoreCard.length - 1];

          const liveData = {
            currentInnings: scorecard.scoreCard?.length || 1,
            currentScore: lastInnings?.scoreDetails ?
              `${lastInnings.scoreDetails.runs}/${lastInnings.scoreDetails.wickets}` : '0/0',
            currentOver: lastInnings?.scoreDetails?.overs?.toString() || '0',
            battingTeam: lastInnings?.batTeamName || '',
            lastUpdated: new Date()
          };

          // Check if match is completed
          const matchInfo = await cricketApiService.getMatchInfo(match.externalMatchId);
          const isCompleted = matchInfo?.matchEnded;

          const updateData = { liveData };

          if (isCompleted) {
            updateData.status = 'completed';
            updateData.isTeamSelectionOpen = false;

            // Extract final stats
            const stats = cricketApiService.extractMatchStats(scorecard);
            if (stats) {
              updateData.statsSnapshot = stats;
            }

            // Set result
            updateData.result = {
              winner: matchInfo.matchWinner || '',
              summary: matchInfo.status || '',
              team1Score: scorecard.scoreCard?.[0]?.scoreDetails ?
                `${scorecard.scoreCard[0].scoreDetails.runs}/${scorecard.scoreCard[0].scoreDetails.wickets} (${scorecard.scoreCard[0].scoreDetails.overs})` : '',
              team2Score: scorecard.scoreCard?.[1]?.scoreDetails ?
                `${scorecard.scoreCard[1].scoreDetails.runs}/${scorecard.scoreCard[1].scoreDetails.wickets} (${scorecard.scoreCard[1].scoreDetails.overs})` : ''
            };
          }

          await Match.findByIdAndUpdate(match._id, updateData);
          results.updated++;
        }
      } catch (err) {
        results.errors.push({
          matchId: match._id,
          externalId: match.externalMatchId,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for players in API
 * GET /api/admin/search-players?q=virat
 */
const searchPlayersInApi = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { q } = req.query;
    if (!q || q.length < 2) {
      return next(new ApiError(400, 'Search query must be at least 2 characters'));
    }

    const players = await cricketApiService.searchPlayers(q);

    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a player from API search to database
 * POST /api/admin/add-player
 */
const addPlayerFromApi = async (req, res, next) => {
  try {
    const { playerId, team, creditValue } = req.body;

    if (!playerId) {
      return next(new ApiError(400, 'Player ID is required'));
    }

    // Get player info from API
    const playerInfo = await cricketApiService.getPlayerInfo(playerId);

    if (!playerInfo) {
      return next(new ApiError(404, 'Player not found in API'));
    }

    // Check if player already exists
    const existing = await Player.findOne({ externalPlayerId: playerId });
    if (existing) {
      return res.json({
        success: true,
        data: existing,
        message: 'Player already exists in database'
      });
    }

    // Determine role
    let role = 'Batsman';
    if (playerInfo.role) {
      const roleStr = playerInfo.role.toLowerCase();
      if (roleStr.includes('keeper') || roleStr.includes('wk')) {
        role = 'Wicket-Keeper';
      } else if (roleStr.includes('allrounder') || roleStr.includes('all-rounder')) {
        role = 'All-Rounder';
      } else if (roleStr.includes('bowler')) {
        role = 'Bowler';
      }
    }

    // Create player
    const player = await Player.create({
      externalPlayerId: playerId,
      name: playerInfo.name,
      shortName: playerInfo.name?.split(' ').pop() || playerInfo.name,
      team: team || playerInfo.country || 'UNK',
      role: role,
      battingStyle: playerInfo.battingStyle || '',
      bowlingStyle: playerInfo.bowlingStyle || '',
      creditValue: creditValue || 8.5,
      image: playerInfo.playerImg || '',
      isActive: true
    });

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add players by searching team name
 * POST /api/admin/add-team-players
 */
const addTeamPlayers = async (req, res, next) => {
  try {
    if (!cricketApiService.isApiConfigured()) {
      return next(new ApiError(400, 'Cricket API key not configured'));
    }

    const { teamName, teamShortName } = req.body;

    if (!teamName) {
      return next(new ApiError(400, 'Team name is required'));
    }

    // Search for players from this team
    const searchResults = await cricketApiService.searchPlayers(teamName);

    const results = {
      found: searchResults.length,
      added: 0,
      skipped: 0,
      errors: []
    };

    for (const apiPlayer of searchResults) {
      try {
        // Check if already exists
        const existing = await Player.findOne({ externalPlayerId: apiPlayer.id });
        if (existing) {
          results.skipped++;
          continue;
        }

        // Get detailed player info
        let playerInfo = apiPlayer;
        try {
          const detailedInfo = await cricketApiService.getPlayerInfo(apiPlayer.id);
          if (detailedInfo) {
            playerInfo = { ...apiPlayer, ...detailedInfo };
          }
        } catch (e) {
          // Use basic info if detailed fetch fails
        }

        // Determine role
        let role = 'Batsman';
        if (playerInfo.role) {
          const roleStr = playerInfo.role.toLowerCase();
          if (roleStr.includes('keeper') || roleStr.includes('wk')) {
            role = 'Wicket-Keeper';
          } else if (roleStr.includes('allrounder') || roleStr.includes('all-rounder')) {
            role = 'All-Rounder';
          } else if (roleStr.includes('bowler')) {
            role = 'Bowler';
          }
        }

        // Assign credit value based on role
        let creditValue = 8.0;
        if (role === 'Wicket-Keeper') creditValue = 8.5;
        else if (role === 'All-Rounder') creditValue = 9.0;
        else if (role === 'Bowler') creditValue = 8.0;
        else creditValue = 8.5;

        // Add some randomness
        creditValue += (Math.random() * 1.5 - 0.5);
        creditValue = Math.round(creditValue * 10) / 10;
        creditValue = Math.max(7.0, Math.min(11.0, creditValue));

        await Player.create({
          externalPlayerId: apiPlayer.id,
          name: playerInfo.name,
          shortName: playerInfo.name?.split(' ').pop() || playerInfo.name,
          team: teamShortName || teamName.substring(0, 3).toUpperCase(),
          role: role,
          battingStyle: playerInfo.battingStyle || '',
          bowlingStyle: playerInfo.bowlingStyle || '',
          creditValue: creditValue,
          image: playerInfo.playerImg || '',
          isActive: true
        });

        results.added++;
      } catch (err) {
        results.errors.push({ player: apiPlayer.name, error: err.message });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all players from database
 * GET /api/admin/players
 */
const getPlayersFromDb = async (req, res, next) => {
  try {
    const { team } = req.query;
    const filter = {};
    if (team) filter.team = team;

    const players = await Player.find(filter).sort({ team: 1, name: 1 });

    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a player
 * DELETE /api/admin/players/:id
 */
const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return next(new ApiError(404, 'Player not found'));
    }

    res.json({
      success: true,
      message: 'Player deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Manually create a match
 * POST /api/admin/create-match
 */
const createMatch = async (req, res, next) => {
  try {
    const {
      team1Name,
      team1ShortName,
      team2Name,
      team2ShortName,
      venue,
      matchDate,
      matchTime
    } = req.body;

    // Validate required fields
    if (!team1Name || !team2Name || !venue || !matchDate) {
      return next(new ApiError(400, 'Missing required fields: team1Name, team2Name, venue, matchDate'));
    }

    // Parse date and time
    const dateTime = matchTime
      ? new Date(`${matchDate}T${matchTime}:00`)
      : new Date(matchDate);

    // Generate a unique external ID for manual matches
    const externalMatchId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const matchData = {
      externalMatchId,
      team1: {
        name: team1Name,
        shortName: team1ShortName || team1Name.substring(0, 3).toUpperCase(),
        logo: ''
      },
      team2: {
        name: team2Name,
        shortName: team2ShortName || team2Name.substring(0, 3).toUpperCase(),
        logo: ''
      },
      venue,
      matchDate: dateTime,
      startTime: dateTime,
      status: 'upcoming',
      lockTime: new Date(dateTime.getTime() - 15 * 60 * 1000), // 15 min before
      isTeamSelectionOpen: true
    };

    const match = await Match.create(matchData);

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update match status
 * PATCH /api/admin/matches/:id/status
 */
const updateMatchStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['upcoming', 'live', 'completed'].includes(status)) {
      return next(new ApiError(400, 'Invalid status. Must be: upcoming, live, or completed'));
    }

    const match = await Match.findByIdAndUpdate(
      req.params.id,
      {
        status,
        isTeamSelectionOpen: status === 'upcoming'
      },
      { new: true }
    );

    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all matches from database
 * GET /api/admin/matches
 */
const getMatchesFromDb = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const matches = await Match.find(filter).sort({ matchDate: 1 });

    res.json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a match
 * DELETE /api/admin/matches/:id
 */
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);

    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    res.json({
      success: true,
      message: 'Match deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate fantasy points for a match
 * POST /api/admin/calculate-points/:matchId
 *
 * This can work in two modes:
 * 1. Automatic: Fetches scorecard from API and calculates points
 * 2. Manual: Admin provides player points directly
 */
const calculateFantasyPoints = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerPoints, useApi } = req.body;

    const match = await Match.findById(matchId);
    if (!match) {
      return next(new ApiError(404, 'Match not found'));
    }

    // Get all fantasy teams for this match
    const fantasyTeams = await FantasyTeam.find({ matchId })
      .populate('players.playerId', 'name externalPlayerId');

    if (fantasyTeams.length === 0) {
      return res.json({
        success: true,
        message: 'No fantasy teams found for this match',
        data: { teamsUpdated: 0 }
      });
    }

    let playerPointsMap = {};

    if (useApi && match.externalMatchId && cricketApiService.isApiConfigured()) {
      // Try to fetch from API
      try {
        const scorecard = await cricketApiService.getMatchScorecard(match.externalMatchId);

        if (scorecard && scorecard.scoreCard) {
          // Process batting stats
          for (const innings of scorecard.scoreCard) {
            for (const batsman of (innings.batsman || [])) {
              const stats = {
                batting: {
                  runs: batsman.runs || 0,
                  fours: batsman['4s'] || 0,
                  sixes: batsman['6s'] || 0,
                  ballsFaced: batsman.balls || 0,
                  isOut: batsman.dismissal !== 'not out'
                },
                bowling: {},
                fielding: {}
              };

              // Find player in our database by external ID or name
              const player = await Player.findOne({
                $or: [
                  { externalPlayerId: batsman.id },
                  { name: new RegExp(batsman.name?.split(' ').pop(), 'i') }
                ]
              });

              if (player) {
                const points = scoringService.calculatePlayerPoints(stats);
                playerPointsMap[player._id.toString()] = (playerPointsMap[player._id.toString()] || 0) + points;
              }
            }

            // Process bowling stats
            for (const bowler of (innings.bowler || [])) {
              const stats = {
                batting: {},
                bowling: {
                  wickets: bowler.wickets || 0,
                  overs: parseFloat(bowler.overs) || 0,
                  runsConceded: bowler.runs || 0,
                  maidens: bowler.maidens || 0
                },
                fielding: {}
              };

              const player = await Player.findOne({
                $or: [
                  { externalPlayerId: bowler.id },
                  { name: new RegExp(bowler.name?.split(' ').pop(), 'i') }
                ]
              });

              if (player) {
                const points = scoringService.calculatePlayerPoints(stats);
                playerPointsMap[player._id.toString()] = (playerPointsMap[player._id.toString()] || 0) + points;
              }
            }
          }
        }
      } catch (apiError) {
        console.error('API fetch failed:', apiError.message);
        // Fall back to manual points if provided
        if (!playerPoints) {
          return next(new ApiError(400, 'Could not fetch scorecard from API and no manual points provided'));
        }
      }
    }

    // If manual points provided, use them (can supplement or override API points)
    if (playerPoints && typeof playerPoints === 'object') {
      for (const [playerId, points] of Object.entries(playerPoints)) {
        playerPointsMap[playerId] = points;
      }
    }

    // If no points calculated, generate random points for testing
    if (Object.keys(playerPointsMap).length === 0) {
      // Generate test points for all players in fantasy teams
      const allPlayerIds = new Set();
      fantasyTeams.forEach(team => {
        team.players.forEach(p => allPlayerIds.add(p.playerId._id.toString()));
      });

      for (const playerId of allPlayerIds) {
        // Random points between 10-80 for testing
        playerPointsMap[playerId] = Math.floor(Math.random() * 70) + 10;
      }
    }

    // Update each fantasy team with calculated points
    const results = { teamsUpdated: 0, errors: [] };

    for (const team of fantasyTeams) {
      try {
        const totalPoints = scoringService.calculateFantasyTeamPoints(team, playerPointsMap);

        await FantasyTeam.findByIdAndUpdate(team._id, {
          fantasyPoints: totalPoints,
          isLocked: true
        });

        results.teamsUpdated++;
      } catch (err) {
        results.errors.push({
          teamId: team._id,
          userId: team.userId,
          error: err.message
        });
      }
    }

    // Also calculate prediction points if match stats are available
    if (match.statsSnapshot) {
      const predictions = await Prediction.find({ matchId });

      for (const prediction of predictions) {
        try {
          const { totalPoints: predPoints } = scoringService.calculatePredictionPoints(
            prediction.predictions,
            match.statsSnapshot
          );

          await Prediction.findByIdAndUpdate(prediction._id, {
            totalPredictionPoints: predPoints,
            isScored: true
          });
        } catch (err) {
          console.error('Error scoring prediction:', err);
        }
      }
    }

    res.json({
      success: true,
      data: {
        ...results,
        playerPointsUsed: Object.keys(playerPointsMap).length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set player points manually for a match (for testing/manual scoring)
 * POST /api/admin/set-player-points/:matchId
 */
const setPlayerPoints = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { playerPoints } = req.body;

    if (!playerPoints || typeof playerPoints !== 'object') {
      return next(new ApiError(400, 'playerPoints object is required'));
    }

    // Forward to calculateFantasyPoints with manual points
    req.body = { playerPoints, useApi: false };
    return calculateFantasyPoints(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * Get fantasy teams for a match (admin view)
 * GET /api/admin/fantasy-teams/:matchId
 */
const getFantasyTeamsForMatch = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const teams = await FantasyTeam.find({ matchId })
      .populate('userId', 'displayName email')
      .populate('players.playerId', 'name shortName team role creditValue')
      .sort({ fantasyPoints: -1 });

    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkApiStatus,
  getAvailableSeries,
  getLiveMatchesFromApi,
  syncMatchesFromApi,
  syncPlayersFromApi,
  updateLiveScores,
  searchPlayersInApi,
  addPlayerFromApi,
  addTeamPlayers,
  getPlayersFromDb,
  deletePlayer,
  createMatch,
  updateMatchStatus,
  getMatchesFromDb,
  deleteMatch,
  calculateFantasyPoints,
  setPlayerPoints,
  getFantasyTeamsForMatch
};

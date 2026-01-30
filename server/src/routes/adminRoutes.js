const express = require('express');
const {
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
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication
// In production, you'd also add admin role check
router.use(protect);

// API Status
router.get('/api-status', checkApiStatus);

// Fetch from API (read-only)
router.get('/series', getAvailableSeries);
router.get('/live-matches', getLiveMatchesFromApi);
router.get('/search-players', searchPlayersInApi);

// Sync to database
router.post('/sync-matches', syncMatchesFromApi);
router.post('/sync-players', syncPlayersFromApi);
router.post('/update-live-scores', updateLiveScores);

// Manual match management
router.get('/matches', getMatchesFromDb);
router.post('/create-match', createMatch);
router.patch('/matches/:id/status', updateMatchStatus);
router.delete('/matches/:id', deleteMatch);

// Player management
router.get('/players', getPlayersFromDb);
router.post('/add-player', addPlayerFromApi);
router.post('/add-team-players', addTeamPlayers);
router.delete('/players/:id', deletePlayer);

// Fantasy points calculation
router.get('/fantasy-teams/:matchId', getFantasyTeamsForMatch);
router.post('/calculate-points/:matchId', calculateFantasyPoints);
router.post('/set-player-points/:matchId', setPlayerPoints);

module.exports = router;

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
  deletePlayer
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

// Player management
router.get('/players', getPlayersFromDb);
router.post('/add-player', addPlayerFromApi);
router.post('/add-team-players', addTeamPlayers);
router.delete('/players/:id', deletePlayer);

module.exports = router;

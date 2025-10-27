const express = require('express');
const { authenticate, requirePatient } = require('../middleware/auth');
const { 
  getMyProfile, 
  createOrUpdateMyProfile 
} = require('../controllers/profileController');

const router = express.Router();

/**
 * @route   GET /api/profile/me
 * @desc    Get current user's patient profile
 * @access  Private (Patient only)
 */
router.get('/me', authenticate, requirePatient, getMyProfile);

/**
 * @route   POST /api/profile/me
 * @desc    Create or update current user's patient profile
 * @access  Private (Patient only)
 */
router.post('/me', authenticate, requirePatient, createOrUpdateMyProfile);

module.exports = router;
const express = require('express');
const { authenticate, requireDoctor } = require('../middleware/auth');
const { 
  getAllPatients,
  getPatientProfile,
  updatePatientProfile
} = require('../controllers/profileController');

const router = express.Router();

// All routes are protected and restricted to doctors only
router.use(authenticate);
router.use(requireDoctor);

/**
 * @route   GET /api/patients
 * @desc    Get all patients with profiles
 * @access  Private (Doctor only)
 */
router.get('/', getAllPatients);

/**
 * @route   GET /api/patients/profile/:patientId
 * @desc    Get specific patient profile
 * @access  Private (Doctor only)
 */
router.get('/profile/:patientId', getPatientProfile);

/**
 * @route   PUT /api/patients/profile/:patientId
 * @desc    Update patient profile
 * @access  Private (Doctor only)
 */
router.put('/profile/:patientId', updatePatientProfile);

module.exports = router;
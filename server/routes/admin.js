const express = require('express');
const { 
  getPendingDoctors, 
  approveDoctor, 
  rejectDoctor,
  getAllDoctors 
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/admin/doctors/pending
 * @desc    Get all pending doctor approvals
 * @access  Admin only
 */
router.get('/doctors/pending', protect, adminOnly, getPendingDoctors);

/**
 * @route   GET /api/admin/doctors
 * @desc    Get all doctors with their approval status
 * @access  Admin only
 */
router.get('/doctors', protect, adminOnly, getAllDoctors);

/**
 * @route   PUT /api/admin/doctors/:doctorId/approve
 * @desc    Approve a doctor
 * @access  Admin only
 */
router.put('/doctors/:doctorId/approve', protect, adminOnly, approveDoctor);

/**
 * @route   PUT /api/admin/doctors/:doctorId/reject
 * @desc    Reject a doctor
 * @access  Admin only
 */
router.put('/doctors/:doctorId/reject', protect, adminOnly, rejectDoctor);

module.exports = router;
const User = require('../models/User');

/**
 * Get all pending doctor approvals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getPendingDoctors = async (req, res) => {
  try {
    const pendingDoctors = await User.find({
      role: 'doctor',
      approvalStatus: 'pending'
    }).select('-password');

    res.json({
      success: true,
      message: 'Pending doctors retrieved successfully',
      data: {
        doctors: pendingDoctors,
        count: pendingDoctors.length
      }
    });

  } catch (error) {
    console.error('Get pending doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving pending doctors'
    });
  }
};

/**
 * Get all doctors with their approval status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'doctor'
    }).select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'All doctors retrieved successfully',
      data: {
        doctors: doctors,
        count: doctors.length
      }
    });

  } catch (error) {
    console.error('Get all doctors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving doctors'
    });
  }
};

/**
 * Approve a doctor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const approveDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    // Find the doctor
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Verify it's a doctor
    if (doctor.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a doctor'
      });
    }

    // Update approval status
    doctor.approvalStatus = 'approved';
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor approved successfully',
      data: {
        doctor: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          role: doctor.role,
          approvalStatus: doctor.approvalStatus
        },
        reason: reason || 'No reason provided'
      }
    });

  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while approving doctor'
    });
  }
};

/**
 * Reject a doctor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const rejectDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    // Find the doctor
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Verify it's a doctor
    if (doctor.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a doctor'
      });
    }

    // Update approval status
    doctor.approvalStatus = 'rejected';
    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor rejected successfully',
      data: {
        doctor: {
          id: doctor._id,
          name: doctor.name,
          email: doctor.email,
          role: doctor.role,
          approvalStatus: doctor.approvalStatus
        },
        reason: reason || 'No reason provided'
      }
    });

  } catch (error) {
    console.error('Reject doctor error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while rejecting doctor'
    });
  }
};

module.exports = {
  getPendingDoctors,
  getAllDoctors,
  approveDoctor,
  rejectDoctor
};
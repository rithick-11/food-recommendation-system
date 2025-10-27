const express = require('express');
const router = express.Router();
const { 
  generateForPatient, 
  generateForPatientByDoctor, 
  getPatientMealPlan, 
  getPatientMealPlanByDoctor,
  getPatientMealPlanHistory
} = require('../controllers/mealPlanController');
const { authenticate, requirePatient, requireApprovedDoctor } = require('../middleware/auth');

// Patient routes - self-service meal plan management
router.post('/generate', 
  authenticate, 
  requirePatient, 
  generateForPatient
);

router.get('/me', 
  authenticate, 
  requirePatient, 
  getPatientMealPlan
);

// Doctor routes - manage meal plans for patients (approved doctors only)
router.post('/generate/:patientId', 
  authenticate, 
  requireApprovedDoctor, 
  generateForPatientByDoctor
);

router.get('/:patientId', 
  authenticate, 
  requireApprovedDoctor, 
  getPatientMealPlanByDoctor
);

router.get('/:patientId/history', 
  authenticate, 
  requireApprovedDoctor, 
  getPatientMealPlanHistory
);

module.exports = router;
const express = require('express');
const router = express.Router();
const { 
  generateForPatient, 
  generateForPatientByDoctor, 
  getPatientMealPlan, 
  getPatientMealPlanByDoctor,
  getPatientMealPlanHistory
} = require('../controllers/mealPlanController');
const { authenticate, requirePatient, requireDoctor } = require('../middleware/auth');

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

// Doctor routes - manage meal plans for patients
router.post('/generate/:patientId', 
  authenticate, 
  requireDoctor, 
  generateForPatientByDoctor
);

router.get('/:patientId', 
  authenticate, 
  requireDoctor, 
  getPatientMealPlanByDoctor
);

router.get('/:patientId/history', 
  authenticate, 
  requireDoctor, 
  getPatientMealPlanHistory
);

module.exports = router;
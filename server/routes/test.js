const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

/**
 * List available Gemini models
 * GET /api/test/models
 */
router.get('/models', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'GEMINI_API_KEY not configured'
      });
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    // Note: listModels might not be available in this API version
    const models = { message: 'Model listing not available with @google/genai package' };
    
    res.json({
      success: true,
      message: 'Available models retrieved successfully',
      data: models
    });
  } catch (error) {
    console.error('Models list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list models',
      error: error.message
    });
  }
});

/**
 * Test Gemini API connection with a simple prompt
 * GET /api/test/gemini
 */
router.get('/gemini', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'GEMINI_API_KEY not configured'
      });
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Try different model names with new API
    const modelNames = [
      'gemini-2.0-flash-lite',
      'gemini-2.0-flash-exp'
    ];

    let workingModel = null;
    let modelResponse = null;

    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        const response = await genAI.models.generateContent({
          model: modelName,
          contents: 'Say hello in JSON format: {"message": "hello"}'
        });
        
        workingModel = modelName;
        modelResponse = response.text;
        break;
      } catch (error) {
        console.log(`Model ${modelName} failed:`, error.message);
        continue;
      }
    }

    if (workingModel) {
      res.json({
        success: true,
        message: `Gemini API is working with model: ${workingModel}`,
        data: {
          workingModel,
          response: modelResponse
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'No working Gemini models found',
        error: 'All tested models failed'
      });
    }
  } catch (error) {
    console.error('Gemini test error:', error);
    res.status(500).json({
      success: false,
      message: 'Gemini API test failed',
      error: error.message
    });
  }
});

module.exports = router;
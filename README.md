# Food Recommendation System

A personalized food recommendation system that provides meal suggestions based on user health goals, dietary preferences, and nutritional requirements.

## Project Structure

```
Food Recommendation system/
├── server/                 # Backend (Node.js + Express)
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   ├── .env               # Environment variables
│   ├── package.json       # Backend dependencies
│   └── server.js          # Main server file
├── client/                # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── App.jsx        # Main app component
│   ├── .env               # Frontend environment variables
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js (v20.19+ or v22.12+)
- MongoDB
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- User authentication and authorization
- Health profile management
- Personalized meal recommendations
- Dietary preference tracking
- Meal planning capabilities
- AI-powered food suggestions using Google Gemini

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Google Generative AI (Gemini)

### Frontend
- React
- Vite
- React Router
- Tailwind CSS
- Axios for API calls

## API Endpoints

- `GET /` - Health check
- `GET /api/health` - API health status

(More endpoints will be added as development progresses)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
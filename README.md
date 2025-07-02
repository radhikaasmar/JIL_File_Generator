# JIL Project

This project contains an Angular frontend and a Python Flask backend.

## Prerequisites

- Python 3.8+
- Node.js (v20.x or v22.x recommended)
- npm

## Backend Setup (Flask)

1. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the backend server:**
   ```bash
   python app.py
   ```
   The backend will be available at `http://127.0.0.1:5000/`.

## Frontend Setup (Angular)

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the Angular development server:**
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:4200/`.

## Notes
- Make sure both servers are running for full functionality.
- Adjust ports or proxy settings as needed for integration. 
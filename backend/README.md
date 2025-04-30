# Google Drive App Backend

This backend powers the automated social-media-like news post generator for your React frontend. It fetches trending Indian news, generates posts, simulates dummy user engagement, and stores everything in Google Sheets.

## Setup

1. Copy your Google service account credentials JSON file to this folder as `google-credentials.json`.
2. Copy `.env.example` to `.env` and fill in your values:
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your credentials file (default is `./google-credentials.json`)
   - `NEWSAPI_KEY`: Your API key from https://newsapi.org/
   - `SPREADSHEET_ID`: The ID from your Google Sheets URL (the long string after `/d/` and before `/edit`)
   - `PORT`: Port to run the backend server (default 5000)

## Scripts
- `npm run dev`: Start with nodemon (auto-reloads on changes)
- `npm start`: Start normally

## Endpoints (to be implemented)
- `/api/latest-post` — Get the latest post and engagement
- `/api/posts` — (optional) Get all posts

## Automation
The backend will automatically create a new post every hour based on trending news.

---

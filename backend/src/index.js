import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fetchTrendingIndianNews } from './news.js';
import { DUMMY_USERS, FAVOR_COMMENTS, DISFAVOR_COMMENTS } from './dummyUsers.js';
import { scheduledPostJob } from './scheduler.js';
import cron from 'node-cron';

// Load env vars
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Google Auth Setup
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  ? JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  : undefined;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const sheets = google.sheets({ version: 'v4' });
const spreadsheetId = process.env.SPREADSHEET_ID;

// Helper to pick a random element
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to simulate dummy user engagement
export function simulateEngagement(newsTitle) {
  // 3 users favor, 2 disfavor (randomly selected)
  const shuffled = [...DUMMY_USERS].sort(() => 0.5 - Math.random());
  const favorUsers = shuffled.slice(0, 3);
  const disfavorUsers = shuffled.slice(3, 5);
  const likes = favorUsers.length;
  const dislikes = disfavorUsers.length;
  const comments = [
    ...favorUsers.map(u => ({ user: u.name, avatar: u.avatar, comment: pick(FAVOR_COMMENTS), favor: true })),
    ...disfavorUsers.map(u => ({ user: u.name, avatar: u.avatar, comment: pick(DISFAVOR_COMMENTS), favor: false })),
  ];
  return { likes, dislikes, comments };
}

// Test endpoint: Get first 5 rows from the sheet
app.get('/api/test-sheet', async (req, res) => {
  try {
    const auth = await getAuth();
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: 'Sheet1',
    });
    res.json({ data: response.data.values });
  } catch (err) {
    console.error('Google Sheets API error:', err);
    if (err.errors) {
      res.status(500).json({ error: err.errors, message: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Endpoint to manually trigger post creation (for now)
app.post('/api/generate-post', async (req, res) => {
  try {
    const auth = await getAuth();
    const articles = await fetchTrendingIndianNews();
    if (!articles.length) throw new Error('No trending news found');
    const top = articles[0];
    const engagement = simulateEngagement(top.title);
    // Prepare row: [timestamp, title, image, url, likes, dislikes, comments (JSON)]
    const row = [
      new Date().toISOString(),
      top.title,
      top.urlToImage,
      top.url,
      engagement.likes,
      engagement.dislikes,
      JSON.stringify(engagement.comments)
    ];
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });
    res.json({ success: true, post: row });
  } catch (err) {
    console.error('Post generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch the latest post
app.get('/api/latest-post', async (req, res) => {
  try {
    const auth = await getAuth();
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: 'Sheet1',
    });
    const rows = response.data.values || [];
    console.log('DEBUG /api/latest-post rows:', rows);
    if (rows.length < 2) return res.json({ post: null });
    const header = rows[0];
    const last = rows[rows.length - 1];
    // Map row to object
    const post = {
      timestamp: last[0],
      title: last[1],
      image: last[2],
      url: last[3],
      likes: Number(last[4]),
      dislikes: Number(last[5]),
      comments: last[6] ? JSON.parse(last[6]) : [],
    };
    res.json({ post });
  } catch (err) {
    console.error('Latest post fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch all posts
app.get('/api/all-posts', async (req, res) => {
  try {
    const auth = await getAuth();
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: 'Sheet1',
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return res.json({ posts: [] });
    const header = rows[0];
    const posts = rows.slice(1).map(row => ({
      timestamp: row[0],
      title: row[1],
      image: row[2],
      url: row[3],
      likes: Number(row[4]),
      dislikes: Number(row[5]),
      comments: row[6] ? JSON.parse(row[6]) : [],
    }));
    res.json({ posts });
  } catch (err) {
    console.error('All posts fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Schedule post creation every hour
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running scheduled post job...');
  await scheduledPostJob();
});

const PORT = process.env.PORT || 5000;

// Remove app.listen for Vercel serverless deployment
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

module.exports = app;

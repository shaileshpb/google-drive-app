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
import { Readable } from 'stream';
import authRouter from './auth.js';

// Load env vars
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));

// Google Auth Setup - support both Vercel (env) and local (file)
let credentials;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
} else if (process.env.NODE_ENV !== 'production') {
  credentials = JSON.parse(fs.readFileSync('./backend/google-credentials.json'));
} else {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set. This is required for production (Vercel).');
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });
}

const sheets = google.sheets({ version: 'v4' });
const drive = google.drive({ version: 'v3' });
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

// Helper: Upload image to ImgBB and return the direct URL
async function uploadImageToImgBB(base64Image) {
  const apiKey = '3301acabcb4ee1f08ca6e16a257de278';
  const form = new URLSearchParams();
  form.append('key', apiKey);
  form.append('image', base64Image);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed: ' + (data.error?.message || 'Unknown error'));
  return data.data.url;
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
      userName: row[4] || '',
      likes: Number(row[5]),
      dislikes: Number(row[6]),
      comments: row[7] ? JSON.parse(row[7]) : [],
    }));
    res.json({ posts });
  } catch (err) {
    console.error('All posts fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint for user to post a new news item
app.post('/api/user-post', async (req, res) => {
  try {
    const { title, image, url, userName } = req.body;
    if (!title || !image) {
      return res.status(400).json({ error: 'Title and image are required.' });
    }
    let imageUrl = '';
    if (image) {
      // Remove data URL prefix if present
      const base64 = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
      imageUrl = await uploadImageToImgBB(base64);
    }
    // Simulate dummy engagement for user post
    const engagement = simulateEngagement(title);
    // Prepare row: [timestamp, title, image, url, userName, likes, dislikes, comments (JSON)]
    const row = [
      new Date().toISOString(),
      title,
      imageUrl,
      url,
      userName || '',
      engagement.likes,
      engagement.dislikes,
      JSON.stringify(engagement.comments)
    ];
    const auth = await getAuth();
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Sheet1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] }
    });
    res.json({ success: true });
  } catch (err) {
    console.error('User post error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to add a comment to a post
app.post('/api/add-comment', async (req, res) => {
  try {
    const { timestamp, comment } = req.body;
    if (!timestamp || !comment) {
      return res.status(400).json({ error: 'Missing timestamp or comment.' });
    }
    const auth = await getAuth();
    // Fetch all posts
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: 'Sheet1',
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return res.status(404).json({ error: 'No posts found.' });
    const header = rows[0];
    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === timestamp) {
        // Comments are in col 8 (index 7)
        let comments = [];
        try {
          comments = row[7] ? JSON.parse(row[7]) : [];
        } catch { comments = []; }
        comments.push(comment);
        row[7] = JSON.stringify(comments);
        // Update the row in the sheet
        await sheets.spreadsheets.values.update({
          auth,
          spreadsheetId,
          range: `Sheet1!A${i+1}:H${i+1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [row] }
        });
        updated = true;
        break;
      }
    }
    if (!updated) return res.status(404).json({ error: 'Post not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/auth', authRouter);

// Schedule post creation every hour
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running scheduled post job...');
  await scheduledPostJob();
});

const PORT = process.env.PORT || 5000;

// ES module export for Vercel
export default app;

// Uncomment for local development
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

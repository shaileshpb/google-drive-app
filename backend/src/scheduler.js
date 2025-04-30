import { fetchTrendingIndianNews } from './news.js';
import { simulateEngagement } from './index.js';
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-credentials.json';
const spreadsheetId = process.env.SPREADSHEET_ID;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_email, private_key } = credentials;
  return new google.auth.JWT(client_email, null, private_key, SCOPES);
}

const sheets = google.sheets({ version: 'v4' });

export async function scheduledPostJob() {
  try {
    const auth = getAuth();
    await auth.authorize();
    // Fetch existing post titles to avoid duplicates
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: 'Sheet1',
    });
    const rows = response.data.values || [];
    const existingTitles = rows.slice(1).map(row => row[1]);

    // Fetch news and filter out already posted titles
    const articles = await fetchTrendingIndianNews();
    const freshArticles = articles.filter(a => !existingTitles.includes(a.title));
    if (!freshArticles.length) {
      console.log('No new unique news articles found. Skipping this hour.');
      return;
    }
    const top = freshArticles[0];
    const engagement = simulateEngagement(top.title);
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
    console.log('Scheduled post created:', top.title);
  } catch (err) {
    console.error('Scheduled post error:', err);
  }
}

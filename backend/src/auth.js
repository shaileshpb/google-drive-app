import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const GOOGLE_CLIENT_ID = '616822746244-3t6vhvltmm88ibao1sgdkq69pl1gh5uq.apps.googleusercontent.com';
const oAuth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper: get Google Sheets auth
function getAuth() {
  let credentials;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    credentials = JSON.parse(require('fs').readFileSync('./backend/google-credentials.json'));
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Missing credential' });
  try {
    // Verify Google token
    const ticket = await oAuth2Client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new Error('No email in Google payload');

    // Google Sheet for users (Sheet2)
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = 'Sheet2';
    const sheets = google.sheets({ version: 'v4' });
    const auth = await getAuth();

    // Check if user exists
    const getResp = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range: `${sheetName}!A2:C`,
    });
    const rows = getResp.data.values || [];
    let user = rows.find(r => r[0] === payload.email);
    if (!user) {
      // Add user
      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: `${sheetName}!A2:C`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[payload.email, payload.name, payload.picture]],
        },
      });
      user = [payload.email, payload.name, payload.picture];
    }
    res.json({ email: user[0], name: user[1], picture: user[2] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid Google token', details: err.message });
  }
});

export default router;

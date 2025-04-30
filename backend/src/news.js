import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded NEWSAPI_KEY:', process.env.NEWSAPI_KEY);

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';
const EVERYTHING_URL = 'https://newsapi.org/v2/everything';

export async function fetchTrendingIndianNews() {
  let articles = [];
  // Try everything endpoint first with a focused query for public service issues/grievances
  try {
    const params = {
      q: 'public service issue OR public grievance OR government complaint OR civic issue OR RTI OR corruption OR government response',
      language: 'en',
      apiKey: NEWSAPI_KEY,
      sortBy: 'publishedAt',
      pageSize: 5,
      domains: '', // Optionally restrict to Indian news domains
    };
    const response = await axios.get(EVERYTHING_URL, { params });
    articles = (response.data.articles || []).filter(
      (a) => a.urlToImage && a.url
    );
  } catch (err) {
    console.error('Error fetching public service news:', err.response?.data || err.message);
  }
  // Fallback: Try top-headlines for India and filter for relevant keywords
  if (!articles.length) {
    try {
      const params = {
        country: 'in',
        language: 'en',
        apiKey: NEWSAPI_KEY,
        pageSize: 10,
      };
      const response = await axios.get(NEWSAPI_URL, { params });
      const keywords = [
        'public service', 'public grievance', 'government complaint', 'civic issue', 'RTI', 'corruption', 'government response'
      ];
      articles = (response.data.articles || []).filter(
        (a) => a.urlToImage && a.url && keywords.some(k => (a.title || '').toLowerCase().includes(k) || (a.description || '').toLowerCase().includes(k))
      ).slice(0, 5);
    } catch (err) {
      console.error('Error fetching top-headlines:', err.response?.data || err.message);
    }
  }
  return articles;
}

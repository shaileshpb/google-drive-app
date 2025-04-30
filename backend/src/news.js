import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded NEWSAPI_KEY:', process.env.NEWSAPI_KEY);

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';
const EVERYTHING_URL = 'https://newsapi.org/v2/everything';

export async function fetchTrendingIndianNews() {
  let articles = [];
  // Try top-headlines for India first
  try {
    const params = {
      country: 'in',
      language: 'en',
      apiKey: NEWSAPI_KEY,
      pageSize: 5,
    };
    const response = await axios.get(NEWSAPI_URL, { params });
    articles = (response.data.articles || []).filter(
      (a) => a.urlToImage && a.url
    );
  } catch (err) {
    console.error('Error fetching top-headlines:', err.response?.data || err.message);
  }
  // If no articles found, try everything endpoint with a generic query
  if (!articles.length) {
    try {
      const params = {
        q: 'India',
        language: 'en',
        apiKey: NEWSAPI_KEY,
        sortBy: 'publishedAt',
        pageSize: 5,
      };
      const response = await axios.get(EVERYTHING_URL, { params });
      articles = (response.data.articles || []).filter(
        (a) => a.urlToImage && a.url
      );
    } catch (err) {
      console.error('Error fetching everything:', err.response?.data || err.message);
    }
  }
  return articles;
}

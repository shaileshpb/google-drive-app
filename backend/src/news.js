import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded NEWSAPI_KEY:', process.env.NEWSAPI_KEY);

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';
const EVERYTHING_URL = 'https://newsapi.org/v2/everything';

export async function fetchTrendingIndianNews() {
  let articles = [];
  // Try everything endpoint first with a focused query for daily public issues
  try {
    const params = {
      q: [
        'bad road condition',
        'road accident',
        'poor infrastructure',
        'bad quality education',
        'poor healthcare',
        'disease outbreak',
        'air pollution',
        'water pollution',
        'police corruption',
        'political corruption',
        'electricity outage',
        'water shortage',
        'civic issue',
        'public grievance',
        'government complaint',
        'sanitation issue',
        'garbage problem',
        'municipal failure',
        'school infrastructure',
        'hospital negligence',
        'unsafe roads',
        'unsafe bridges',
        'potholes',
        'traffic jam',
        'public transport issue',
        'drinking water issue',
        'flooding',
        'sewage issue',
        'crime rise',
        'unemployment',
        'inflation',
        'ration shortage',
        'power cut',
        'slum issue',
        'illegal construction',
        'encroachment',
        'child labour',
        'women safety',
        'elderly abuse',
        'public protest',
        'strike',
        'farmer protest',
        'public safety',
        'malnutrition',
        'public hospital issue',
        'government scheme failure',
        'ration card issue',
        'public interest litigation',
        'RTI',
        'corruption',
        'government response'
      ].join(' OR '),
      language: 'en',
      apiKey: NEWSAPI_KEY,
      sortBy: 'publishedAt',
      pageSize: 8,
      domains: '', // Optionally restrict to Indian news domains
    };
    const response = await axios.get(EVERYTHING_URL, { params });
    articles = (response.data.articles || []).filter(
      (a) => a.urlToImage && a.url
    );
  } catch (err) {
    console.error('Error fetching daily public issues news:', err.response?.data || err.message);
  }
  // Fallback: Try top-headlines for India and filter for relevant keywords
  if (!articles.length) {
    try {
      const params = {
        country: 'in',
        language: 'en',
        apiKey: NEWSAPI_KEY,
        pageSize: 16,
      };
      const response = await axios.get(NEWSAPI_URL, { params });
      const keywords = [
        'bad road', 'accident', 'infrastructure', 'education', 'healthcare', 'disease', 'pollution', 'police corruption', 'political corruption', 'electricity', 'water', 'civic', 'grievance', 'complaint', 'sanitation', 'garbage', 'municipal', 'school', 'hospital', 'unsafe', 'pothole', 'traffic', 'transport', 'flood', 'sewage', 'crime', 'unemployment', 'inflation', 'ration', 'power', 'slum', 'illegal', 'encroachment', 'child labour', 'women safety', 'elderly', 'protest', 'strike', 'farmer', 'malnutrition', 'scheme', 'ration card', 'RTI', 'corruption', 'government response'
      ];
      articles = (response.data.articles || []).filter(
        (a) => a.urlToImage && a.url && keywords.some(k => (a.title || '').toLowerCase().includes(k) || (a.description || '').toLowerCase().includes(k))
      ).slice(0, 8);
    } catch (err) {
      console.error('Error fetching top-headlines:', err.response?.data || err.message);
    }
  }
  return articles;
}

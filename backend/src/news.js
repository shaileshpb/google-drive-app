import axios from 'axios';

import dotenv from 'dotenv';
dotenv.config();

console.log('Loaded NEWSAPI_KEY:', process.env.NEWSAPI_KEY);

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2/top-headlines';
const EVERYTHING_URL = 'https://newsapi.org/v2/everything';

export async function fetchTrendingIndianNews() {
  let articles = [];
  // Top Indian news domains for better relevance
  const indianNewsDomains = [
    'thehindu.com',
    'indianexpress.com',
    'ndtv.com',
    'hindustantimes.com',
    'timesofindia.indiatimes.com',
    'livemint.com',
    'scroll.in',
    'deccanherald.com',
    'newindianexpress.com',
    'thewire.in',
    'indiatoday.in',
    'business-standard.com',
    'tribuneindia.com',
    'dnaindia.com',
    'outlookindia.com',
    'news18.com',
    'theprint.in',
    'zeenews.india.com',
    'oneindia.com',
    'telegraphindia.com'
  ].join(',');

  // Negative keywords to filter out entertainment/irrelevant news
  const negativeKeywords = [
    'music', 'movie', 'film', 'celebrity', 'actor', 'actress', 'bollywood', 'hollywood', 'song', 'album', 'concert', 'award', 'fashion', 'entertainment', 'taylor swift', 'ed sheeran', 'sports', 'cricket', 'football', 'ipl', 'match', 'game', 'series', 'tournament', 'show', 'reality show', 'tv show', 'web series', 'netflix', 'amazon prime', 'disney', 'star plus', 'zee tv', 'sony tv', 'serial', 'box office', 'trailer', 'premiere', 'gossip', 'love story', 'romance', 'wedding', 'divorce', 'affair', 'relationship', 'viral video', 'dance', 'rapper', 'pop star', 'dj', 'remix', 'remake', 'cover song', 'fashion show', 'model', 'pageant', 'miss india', 'miss world', 'miss universe', 'oscar', 'grammy', 'emmy', 'screen award', 'filmfare', 'cinema', 'blockbuster', 'block buster'
  ];

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
      pageSize: 10,
      domains: indianNewsDomains,
    };
    const response = await axios.get(EVERYTHING_URL, { params });
    articles = (response.data.articles || []).filter((a) => {
      const text = `${a.title || ''} ${a.description || ''}`.toLowerCase();
      // Must have at least one positive keyword and NOT match any negative keyword
      const hasPositive = true; // Already filtered by query
      const hasNegative = negativeKeywords.some(k => text.includes(k));
      return a.urlToImage && a.url && hasPositive && !hasNegative;
    });
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
        pageSize: 20,
        domains: indianNewsDomains,
      };
      const response = await axios.get(NEWSAPI_URL, { params });
      const keywords = [
        'bad road', 'accident', 'infrastructure', 'education', 'healthcare', 'disease', 'pollution', 'police corruption', 'political corruption', 'electricity', 'water', 'civic', 'grievance', 'complaint', 'sanitation', 'garbage', 'municipal', 'school', 'hospital', 'unsafe', 'pothole', 'traffic', 'transport', 'flood', 'sewage', 'crime', 'unemployment', 'inflation', 'ration', 'power', 'slum', 'illegal', 'encroachment', 'child labour', 'women safety', 'elderly', 'protest', 'strike', 'farmer', 'malnutrition', 'scheme', 'ration card', 'RTI', 'corruption', 'government response'
      ];
      articles = (response.data.articles || []).filter((a) => {
        const text = `${a.title || ''} ${a.description || ''}`.toLowerCase();
        const hasPositive = keywords.some(k => text.includes(k));
        const hasNegative = negativeKeywords.some(k => text.includes(k));
        return a.urlToImage && a.url && hasPositive && !hasNegative;
      }).slice(0, 10);
    } catch (err) {
      console.error('Error fetching top-headlines:', err.response?.data || err.message);
    }
  }
  return articles;
}

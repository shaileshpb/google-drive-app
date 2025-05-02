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
    // Instead of a single long query, break into smaller requests and merge results
    const queries = [
      'bad road condition OR road accident OR unsafe roads OR potholes OR unsafe bridges',
      'poor infrastructure OR municipal failure OR public transport issue OR traffic jam OR flooding OR sewage issue OR sanitation issue OR garbage problem',
      'bad quality education OR school infrastructure OR public hospital issue OR hospital negligence OR malnutrition',
      'poor healthcare OR disease outbreak OR women safety OR elderly abuse OR child labour',
      'air pollution OR water pollution OR drinking water issue',
      'police corruption OR political corruption OR corruption OR government complaint OR government scheme failure OR government response OR RTI',
      'electricity outage OR power cut OR water shortage OR ration shortage OR ration card issue',
      'civic issue OR public grievance OR public interest litigation',
      'crime rise OR public safety OR public protest OR strike OR farmer protest OR unemployment OR inflation OR slum issue OR illegal construction OR encroachment',
    ];
    for (const q of queries) {
      const params = {
        q: `india AND (${q})`, // Ensure 'india' is always in the query
        language: 'en',
        apiKey: NEWSAPI_KEY,
        sortBy: 'publishedAt',
        pageSize: 5,
        domains: indianNewsDomains,
      };
      const response = await axios.get(EVERYTHING_URL, { params });
      const newArticles = (response.data.articles || []).filter((a) => {
        const text = `${a.title || ''} ${a.description || ''}`.toLowerCase();
        const hasNegative = negativeKeywords.some(k => text.includes(k));
        return a.urlToImage && a.url && !hasNegative;
      });
      articles.push(...newArticles);
      // Stop early if we have enough articles
      if (articles.length >= 10) break;
    }
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

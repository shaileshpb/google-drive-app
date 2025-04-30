import React, { useEffect, useState } from 'react';
import './App.css';

interface Comment {
  user: string;
  avatar: string;
  comment: string;
  favor: boolean;
}

interface Post {
  timestamp: string;
  title: string;
  image: string;
  url: string;
  likes: number;
  dislikes: number;
  comments: Comment[];
}

// Use relative API path for monorepo deployment
const API_PREFIX = '/api';

const App: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAllPosts() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_PREFIX}/all-posts`);
        const data = await res.json();
        // Sort posts by timestamp descending (most recent first)
        const sortedPosts = (data.posts || []).slice().sort((a: Post, b: Post) => {
          // Try to parse timestamps as dates
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA;
        });
        setPosts(sortedPosts);
      } catch (err) {
        setError('Failed to load posts.');
      } finally {
        setLoading(false);
      }
    }
    fetchAllPosts();
  }, []);

  if (loading) return <div className="App"><div className="post-tile">Loading...</div></div>;
  if (error) return <div className="App"><div className="post-tile">{error}</div></div>;
  if (!posts || posts.length === 0) return <div className="App"><div className="post-tile">No posts available yet.</div></div>;

  return (
    <div className="App">
      {posts.map((post, idx) => {
        const comments = Array.isArray(post.comments) ? post.comments : [];
        return (
          <div className="post-tile" key={idx}>
            <img
              src={post.image}
              alt="Post"
              className="post-image"
              onError={e => (e.currentTarget.src = 'https://placehold.co/400x400?text=No+Image')}
            />
            <div className="post-content">
              <h2 className="post-title">
                <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#222', textDecoration: 'none' }}>{post.title}</a>
              </h2>
              <div className="post-actions">
                <button className="like-btn" disabled>👍 {typeof post.likes === 'number' ? post.likes : 0}</button>
                <button className="dislike-btn" disabled>👎 {typeof post.dislikes === 'number' ? post.dislikes : 0}</button>
              </div>
              <div className="post-comments">
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Comments</div>
                <ul className="comments-list">
                  {comments && comments.length > 0 ? (
                    comments.map((comment, idx2) => (
                      <li key={idx2} className="comment-item">
                        <span style={{ marginRight: 8 }}>{comment.avatar}</span>
                        <b>{comment.user}:</b> {comment.comment}
                        <span style={{ color: comment.favor ? '#228B22' : '#B22222', marginLeft: 8 }}>
                          {comment.favor ? '👍' : '👎'}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: '#888', fontStyle: 'italic' }}>No comments yet.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default App;

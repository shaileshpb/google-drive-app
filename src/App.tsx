import React, { useEffect, useState, ChangeEvent, useRef } from 'react';
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

  // State for new post UI
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // New post image preview handler
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setNewPostImage('');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPostImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Post submit handler (calls backend, saves to Google Sheet)
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    setPosting(true);
    try {
      if (!newPostText.trim() || !newPostImage) {
        setPostError('Both text and image are required.');
        setPosting(false);
        return;
      }
      const res = await fetch(`${API_PREFIX}/user-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPostText,
          image: newPostImage,
        }),
      });
      if (!res.ok) throw new Error('Failed to post news');
      setShowNewPost(false);
      setNewPostText('');
      setNewPostImage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Fetch posts again
      setLoading(true);
      const postsRes = await fetch(`${API_PREFIX}/all-posts`);
      const postsData = await postsRes.json();
      const sortedPosts = (postsData.posts || []).slice().sort((a: Post, b: Post) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      setPosts(sortedPosts);
      setLoading(false);
    } catch (err: any) {
      setPostError(err.message || 'Failed to post news.');
    } finally {
      setPosting(false);
    }
  };

  // Cancel new post
  const handlePostCancel = () => {
    setShowNewPost(false);
    setNewPostText('');
    setNewPostImage('');
    setPostError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return <div className="App"><div className="post-tile">Loading...</div></div>;
  if (error) return <div className="App"><div className="post-tile">{error}</div></div>;
  if (!posts || posts.length === 0) return <div className="App"><div className="post-tile">No posts available yet.</div></div>;

  return (
    <div className="App">
      {/* New Post UI */}
      <div className="new-post-box" style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #eee', padding: 20, margin: '24px auto 24px auto', maxWidth: 600 }}>
        {!showNewPost ? (
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowNewPost(true)}>
            <img src="/user-avatar.png" alt="User" style={{ borderRadius: '50%', marginRight: 12, width: 40, height: 40, objectFit: 'cover', background: '#eee', border: '1px solid #ccc' }} />
            <input type="text" placeholder="What's happening in your area?" style={{ flex: 1, padding: 10, borderRadius: 20, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }} readOnly />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posting && (
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <span className="spinner" style={{ display: 'inline-block', width: 32, height: 32, border: '4px solid #1976d2', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                <div style={{ color: '#1976d2', marginTop: 6 }}>Posting...</div>
              </div>
            )}
            <textarea
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              placeholder="Describe the issue or news..."
              style={{ borderRadius: 8, border: '1px solid #ccc', padding: 10, minHeight: 60 }}
              disabled={posting}
            />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} disabled={posting} />
            {newPostImage && <img src={newPostImage} alt="Preview" style={{ maxWidth: 180, borderRadius: 8, margin: '8px 0' }} />}
            {postError && <div style={{ color: 'red', marginBottom: 4 }}>{postError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={handlePostCancel} style={{ background: '#eee', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }} disabled={posting}>Cancel</button>
              <button onClick={handlePostSubmit} style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }} disabled={posting || !newPostText.trim() || !newPostImage}>Post</button>
            </div>
          </div>
        )}
      </div>
      {/* Posts Feed */}
      {posts.map((post, idx) => {
        const comments = Array.isArray(post.comments) ? post.comments : [];
        return (
          <div className="post-tile" key={idx}>
            <img
              src={post.image}
              alt="Post"
              className="post-image"
              style={{ border: '1px solid #ccc', background: '#fafafa', minHeight: 200, minWidth: 200 }}
              onError={e => {
                const img = e.currentTarget as HTMLImageElement | null;
                if (!img) return;
                img.src = 'https://placehold.co/400x400?text=No+Image';
              }}
            />
            <div className="post-content">
              <h2 className="post-title">
                <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: '#222', textDecoration: 'none' }}>{post.title}</a>
              </h2>
              {/* Show time below title */}
              <div className="post-timestamp" style={{ color: '#888', fontSize: 14, marginBottom: 8 }}>
                {post.timestamp ? new Date(post.timestamp).toLocaleString() : ''}
              </div>
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

/* Add spinner animation to App.css */

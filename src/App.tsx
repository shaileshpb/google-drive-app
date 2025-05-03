import React, { useEffect, useState, ChangeEvent } from 'react';
import './App.css';
import { GoogleAuth } from './GoogleAuth';
import UserMenu from './components/UserMenu';
import UserProfile from './components/UserProfile';

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
  userName?: string;
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

  // --- Authentication State ---
  const [user, setUser] = useState<{ email: string; name: string; picture: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- Comment State ---
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [commentLoading, setCommentLoading] = useState<{ [key: string]: boolean }>({});
  const [commentError, setCommentError] = useState<{ [key: string]: string }>({});

  // Persist user in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('dd_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('dd_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dd_user');
    }
  }, [user]);

  // Handle Google login success
  const handleGoogleLogin = async (credential: string) => {
    try {
      const res = await fetch(`${API_PREFIX}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      if (!res.ok) throw new Error('Auth failed');
      const data = await res.json();
      setUser({ email: data.email, name: data.name, picture: data.picture });
      setAuthError(null);
    } catch (e) {
      setAuthError('Google authentication failed.');
    }
  };

  // Logout function
  const handleLogout = () => {
    setUser(null);
    setProfileOpen(false);
    localStorage.removeItem('dd_user');
  };

  // Move fetchAllPosts to top-level so it can be used in multiple hooks
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

  useEffect(() => {
    fetchAllPosts();
  }, []);

  // Real-time polling for posts and comments
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_PREFIX}/all-posts`);
        const data = await res.json();
        const sortedPosts = (data.posts || []).slice().sort((a: Post, b: Post) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return dateB - dateA;
        });
        setPosts(prevPosts => {
          // Only update if posts or comments have changed
          if (prevPosts.length !== sortedPosts.length) return sortedPosts;
          for (let i = 0; i < prevPosts.length; i++) {
            if (
              prevPosts[i].timestamp !== sortedPosts[i].timestamp ||
              prevPosts[i].title !== sortedPosts[i].title ||
              prevPosts[i].image !== sortedPosts[i].image ||
              prevPosts[i].url !== sortedPosts[i].url ||
              prevPosts[i].userName !== sortedPosts[i].userName ||
              prevPosts[i].likes !== sortedPosts[i].likes ||
              prevPosts[i].dislikes !== sortedPosts[i].dislikes ||
              JSON.stringify(prevPosts[i].comments) !== JSON.stringify(sortedPosts[i].comments)
            ) {
              return sortedPosts;
            }
          }
          return prevPosts;
        });
      } catch {}
    }, 5000); // 5 seconds
    return () => clearInterval(interval);
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
          userName: user?.name || '',
        }),
      });
      if (!res.ok) throw new Error('Failed to post news');
      await res.json();
      // Create the new post object (simulate as backend returns only success)
      const newPost: Post = {
        timestamp: new Date().toISOString(),
        title: newPostText,
        image: newPostImage,
        url: '',
        userName: user?.name || '',
        likes: 0,
        dislikes: 0,
        comments: [],
      };
      setPosts(prev => [newPost, ...prev]);
      setShowNewPost(false);
      setNewPostText('');
      setNewPostImage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Handle comment input change
  const handleCommentInputChange = (postIdx: number, value: string) => {
    setCommentInputs((prev) => ({ ...prev, [postIdx]: value }));
  };

  // Handle comment submit
  const handleCommentSubmit = async (postIdx: number) => {
    if (!user) {
      setCommentError((prev) => ({ ...prev, [postIdx]: 'You must be logged in to comment.' }));
      return;
    }
    const commentText = commentInputs[postIdx]?.trim();
    if (!commentText) {
      setCommentError((prev) => ({ ...prev, [postIdx]: 'Comment cannot be empty.' }));
      return;
    }
    setCommentLoading((prev) => ({ ...prev, [postIdx]: true }));
    setCommentError((prev) => ({ ...prev, [postIdx]: '' }));
    try {
      const post = posts[postIdx];
      const res = await fetch(`${API_PREFIX}/add-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: post.timestamp,
          comment: {
            user: user.name,
            avatar: '',
            comment: commentText,
            favor: true
          }
        })
      });
      if (!res.ok) throw new Error('Failed to add comment.');
      // Update only the comments for this post in UI
      setPosts(prev => prev.map((p, idx) => idx === postIdx ? {
        ...p,
        comments: [...(p.comments || []), {
          user: user.name,
          avatar: '',
          comment: commentText,
          favor: true
        }]
      } : p));
      setCommentInputs((prev) => ({ ...prev, [postIdx]: '' }));
    } catch (e: any) {
      setCommentError((prev) => ({ ...prev, [postIdx]: e.message || 'Failed to add comment.' }));
    } finally {
      setCommentLoading((prev) => ({ ...prev, [postIdx]: false }));
    }
  };

  // --- UI: Show Google Login if not authenticated ---
  if (!user) {
    return (
      <div className="App auth-center">
        <div className="auth-card">
          <img src="/revolution.avif" alt="Direct Democracy Logo" className="auth-logo" />
          <h2>Sign in to <span className="highlight">Direct Democracy</span></h2>
          <p className="auth-desc">Welcome! Sign in with your Google account to join the conversation and share your voice.</p>
          <GoogleAuth onSuccess={handleGoogleLogin} onError={() => setAuthError('Google authentication failed.')} />
          {authError && <div className="auth-error">{authError}</div>}
        </div>
      </div>
    );
  }

  // --- UI: Show user profile page if open ---
  if (profileOpen && user) {
    return <UserProfile user={user} onClose={() => setProfileOpen(false)} />;
  }

  if (loading) return <div className="App"><div className="post-tile">Loading...</div></div>;
  if (error) return <div className="App"><div className="post-tile">{error}</div></div>;
  if (!posts || posts.length === 0) return <div className="App"><div className="post-tile">No posts available yet.</div></div>;

  return (
    <div className="App">
      {/* Top bar with user menu */}
      <header className="app-header">
        <h1 className="app-title">Direct Democracy</h1>
        <div className="app-header-right">
          <UserMenu user={user} onProfile={() => setProfileOpen(true)} onLogout={handleLogout} />
        </div>
      </header>
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
      {posts.map((post, idx) => (
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
            {post.userName && <div className="post-user">By {post.userName}</div>}
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
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, idx2) => (
                    <li key={idx2} className="comment-item">
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
              <form
                onSubmit={e => { e.preventDefault(); handleCommentSubmit(idx); }}
                style={{ display: 'flex', gap: 8, marginTop: 8 }}
              >
                <input
                  type="text"
                  className="comment-input"
                  placeholder="Add a comment..."
                  value={commentInputs[idx] || ''}
                  onChange={e => handleCommentInputChange(idx, e.target.value)}
                  disabled={commentLoading[idx]}
                  maxLength={200}
                  style={{ flex: 1 }}
                />
                <button
                  className="comment-submit"
                  type="submit"
                  disabled={commentLoading[idx] || !user}
                >
                  {commentLoading[idx] ? '...' : 'Post'}
                </button>
              </form>
              {commentError[idx] && (
                <div style={{ color: 'red', fontSize: 13, marginTop: 3 }}>{commentError[idx]}</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;

/* Add spinner animation to App.css */

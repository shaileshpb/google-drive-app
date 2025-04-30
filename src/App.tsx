import React, { useState } from 'react';
import './App.css';

const App: React.FC = () => {
  // State for like/dislike and comments
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [comments, setComments] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const handleLike = () => setLikes(likes + 1);
  const handleDislike = () => setDislikes(dislikes + 1);
  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => setCommentInput(e.target.value);
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentInput.trim()) {
      setComments([...comments, commentInput.trim()]);
      setCommentInput('');
    }
  };

  return (
    <div className="App">
      <div className="post-tile">
        <img
          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"
          alt="Post"
          className="post-image"
        />
        <div className="post-content">
          <h2 className="post-title">Holding the government accountable</h2>
          <div className="post-actions">
            <button className="like-btn" onClick={handleLike} aria-label="Like">👍 {likes}</button>
            <button className="dislike-btn" onClick={handleDislike} aria-label="Dislike">👎 {dislikes}</button>
          </div>
          <div className="post-comments">
            <form onSubmit={handleCommentSubmit} className="comment-form">
              <input
                type="text"
                value={commentInput}
                onChange={handleCommentChange}
                placeholder="Add a comment..."
                className="comment-input"
              />
              <button type="submit" className="comment-submit">Post</button>
            </form>
            <ul className="comments-list">
              {comments.map((comment, idx) => (
                <li key={idx} className="comment-item">{comment}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

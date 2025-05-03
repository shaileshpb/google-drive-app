import React from 'react';

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    picture?: string;
    createdAt?: string;
  };
}

function daysSince(dateString?: string) {
  if (!dateString) return '?';
  const created = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="user-profile-page">
      <div className="user-profile-card">
        {user.picture && <img src={user.picture} alt={user.name} className="user-profile-avatar" />}
        <h2>{user.name}</h2>
        <p className="user-profile-email">{user.email}</p>
        <p className="user-profile-member-since">Member since: <b>{user.createdAt ? daysSince(user.createdAt) : '?'}</b> days</p>
      </div>
    </div>
  );
};

export default UserProfile;

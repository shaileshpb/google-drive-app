import React from 'react';

interface UserMenuProps {
  user: {
    name: string;
    picture?: string;
  };
  onProfile: () => void;
  onLogout?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onProfile, onLogout }) => {
  return (
    <div className="user-menu" title="User settings">
      {user.picture ? (
        <img src={user.picture} alt={user.name} className="user-menu-avatar" onClick={onProfile} />
      ) : (
        <div className="user-menu-avatar user-menu-initials" onClick={onProfile}>{user.name[0]}</div>
      )}
      {onLogout && (
        <button className="user-menu-logout" onClick={e => { e.stopPropagation(); onLogout(); }} title="Logout">Logout</button>
      )}
    </div>
  );
};

export default UserMenu;

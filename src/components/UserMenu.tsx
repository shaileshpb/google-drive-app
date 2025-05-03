import React from 'react';

interface UserMenuProps {
  user: {
    name: string;
    picture?: string;
  };
  onProfile: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onProfile }) => {
  return (
    <div className="user-menu" onClick={onProfile} title="User settings">
      {user.picture ? (
        <img src={user.picture} alt={user.name} className="user-menu-avatar" />
      ) : (
        <div className="user-menu-avatar user-menu-initials">{user.name[0]}</div>
      )}
    </div>
  );
};

export default UserMenu;

import React from 'react';
import './App.css';

function App() {
  const openGoogleDrive = () => {
    window.open('https://drive.google.com', '_blank');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Google Drive Launcher</h1>
        <button 
          onClick={openGoogleDrive}
          className="drive-button"
        >
          Open Google Drive
        </button>
      </header>
    </div>
  );
}

export default App;

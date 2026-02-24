
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Sentry Test</h1>
      <button
        onClick={() => {
          throw new Error("This is a test error from the client!");
        }}
      >
        Break the world
      </button>
    </div>
  );
}

export default App;
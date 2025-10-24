import React from 'react';

const App = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>SnipShift React Application</h1>
      <p>This is the actual React app with createRoot working!</p>
      <p>React version: {React.version}</p>
    </div>
  );
};

export default App;

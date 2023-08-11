import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Button } from 'antd';

function App() {
  return (
    <Router>
      <div className="App">
        <Button type="primary">Button</Button>
      </div>
    </Router>
  );
}

export default App;

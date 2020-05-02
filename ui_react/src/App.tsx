import React from 'react';
import logo from './logo.svg';
import './App.css';

var state = {
  name: null,
  conn: null, // also means Identified.
  room: null,
}

function App() {

  return (
    <div className="App">
      <h1>Goretro</h1>

      { childComponent(state) }
    </div>
  );
}

function childComponent(state) {
  if (!state.name) {
    return "Login Component"
  }

  if (!state.room) {
    return "Join Room"
  }

  return "Room Component"
}

export default App;

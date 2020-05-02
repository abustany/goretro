import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';

import './index.css';
import App from './App';
import Conn from './conn';

const conn = new Conn()

conn.baseUrl = '/api';

conn.onMessage((message) => {
  console.log('received message: ' + message.name);
});

conn.onConnectionStateChange((connected) => {
  console.log(`connected: ${connected}`)

  if (connected) {
    conn.identify("Charles")
  }
});

conn.start();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

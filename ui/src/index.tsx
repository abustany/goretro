import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';

import { Connection, generateClientId, generateSecret } from './connection';
import { getSetLocalStorage, trimBase64Padding } from './utils'
import './index.scss';
import App from './App';

// the ID/secret generation functions already generate unpadded values, but we
// might still have some old padded values in the local storage.
const clientId = trimBase64Padding(getSetLocalStorage("clientId", generateClientId))
const secret = trimBase64Padding(getSetLocalStorage("secret", generateSecret))
const connection = new Connection('/api', clientId, secret);

ReactDOM.render(
  <React.StrictMode>
    <App connection={connection}/>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

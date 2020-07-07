import React from 'react';
import ReactDOM from 'react-dom';
import * as serviceWorker from './serviceWorker';

import { Connection } from './connection';
import { generateClientId, generateSecret } from './credentials'
import { API } from './api';
import { getSetLocalStorage } from './utils'

import App from './App';
import './index.scss';

// the ID/secret generation functions already generate unpadded values, but we
// might still have some old padded values in the local storage.
const clientId = getSetLocalStorage("clientId", generateClientId)
const secret = getSetLocalStorage("secret", generateSecret)
const connection = new Connection('/api', clientId, secret);
const api = new API(connection);

ReactDOM.render(
  <React.StrictMode>
    <App connection={connection} api={api}/>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

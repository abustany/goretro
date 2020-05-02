import React, { useReducer } from 'react';
import logo from './logo.svg';
import './App.css';

import Connection from './connection';
import Login from './components/Login';
import RoomJoin from './components/RoomJoin';

const initialState = {
  connection: null,
  connected: false,
  identified: false,
  name: null,
  room: null,
}

function reducer(state, action) {
  console.log(`Reducing ${action.type}`)
  console.log(action.payload)

  switch (action.type) {
    case 'changeConnection':
      return {...state, connection: action.payload}
    case 'changeConnectionStatus':
      return {...state, connected: action.payload}
    case 'setName':
      return {...state, name: action.payload}
    case 'identify':
      return {...state, identified: action.payload}
    default:
      throw new Error(`Unknown action ${action}`);
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  console.log("App()")
  console.log(JSON.stringify(state))

  if (!state.connection) {
    connect(dispatch)
  }

  if (state.connected && state.name && !state.identified) {
    identify(state, dispatch)
  }

  return (
    <div className="App">
      <h1>Goretro{ state.name && <span> (con {state.name})</span> }</h1>

      { childComponent(state, dispatch) }
    </div>
  );
}

function childComponent(state, dispatch) {
  if (!state.name) {
    return <Login setName={(name) => dispatch({type: 'setName', payload: name})}/>
  }

  if (!state.room) {
    return <RoomJoin
      // createRoom

    />
  }

  return "Room Component"
}

async function connect(dispatch) {
  console.log("connecting ...")

  const c = new Connection()
  dispatch({type: 'changeConnection', payload: c})

  c.baseUrl = '/api';

  c.onMessage((message) => {
    console.log('received message: ' + message.name);
  });

  c.onConnectionStateChange((connected) => {
    console.log(`connected: ${connected}`)
    dispatch({type: 'changeConnectionStatus', payload: connected})
  });

  c.start();
}

async function identify(state, dispatch) {
  await state.connection.identify(state.name)
  dispatch({type: 'identify', payload: true})
}

import React, { useReducer, useEffect } from 'react';

import Connection from './connection';
import Err from './components/Error';
import Loading from './components/Loading';
import Login from './components/Login';
import Room from './components/Room';

import './App.scss'

// - If the room doesn't exist.
// - Bug when creating the room.

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(state.connection, dispatch)
    readRoomIdFromURL(dispatch)
  }, [])

  useEffect(() => {
    if (state.identified) {
      if (state.roomId) {
        state.connection.joinRoom(state.roomId)
      } else {
        state.connection.createRoom(state.roomId)
      }
    }
  }, [state.identified, state.roomId])

  return (
    <div className="App">
      <header className="App__header">
        <h1 className="retro-font">Goretro</h1>
        { state.name ? <span>with <strong>{state.name}</strong></span> : <span>Here comes a new challenger!</span> }
      </header>

      { mainComponent(state, dispatch) }
    </div>
  );
}

function mainComponent(state, dispatch) {
  // TODO: Have a generic central component.

  if (state.err) {
    return <Err message={state.err}/>
  }

  if (!state.name) {
    return <Login onNameSet={(name) => handleNameSet(state, dispatch, name) }/>
  }

  if (!state.room) {
    return <Loading/>
  }

  return <Room
    room={state.room}
    isAdmin={state.roomAdmin}
    notes={state.notes}
    onNoteCreate={(note) => { handleNoteCreate(state, dispatch, note) }}
    onStateTransition={() => { handleRoomStateIncrement(state) }}
  />
}

function handleNameSet(state, dispatch, name) {
  dispatch({type: 'name', payload: name})
  state.connection.identify(name).then(() => {
    dispatch({type: 'identifyReceived', payload: true})
  })
}

function handleRoomStateIncrement(state) {
  state.connection.setRoomState(state.room.state + 1)
}

function handleNoteCreate(state, dispatch, note) {
  dispatch({type: 'noteCreated', payload: note})
  state.connection.saveNote(note)
}

// Connect the EventSource to the store.
async function connect(connection, dispatch) {
  connection.baseUrl = '/api';

  connection.onMessage((message) => {
    switch (message.event) {
      case "state-changed":
        dispatch({type: 'roomStateChanged', payload: message.payload})
        break
      case "current-state":
        dispatch({type: 'roomReceive', payload: message.payload})
        // Change URL
        window.history.replaceState(null, document.title, `/?roomId=${message.payload.id}`);
        break
      case "participant-added":
        dispatch({type: 'roomParticipantAdd', payload: message.payload})
        break
    }
  });

  connection.onConnectionStateChange((connected) => {
    dispatch({type: 'connectionStatus', payload: connected})
  });

  connection.start().then(() => {
    // Connected
  }).catch((err) => {
    dispatch({type: 'connectionError', payload: err})
  })
}

async function readRoomIdFromURL(dispatch) {
  const roomId = (new URL(window.location.toString())).searchParams.get('roomId')
  console.log(`roomId: ${roomId}`)
  if (!roomId) {
    return
  }
  dispatch({type: 'roomIdSetFromURL', payload: roomId})
}

// State

const initialState = {
  connection: new Connection(),
  error: null,
  connected: false,

  name: null,
  identified: false,

  roomId: null,
  roomAdmin: true,
  room: null,

  notes: [],
}

// const initialState = {
//   connection: new Connection(),
//   error: null,
//   connected: false,

//   name: "Charles",
//   identified: false,

//   roomId: "nullasdfs",
//   roomAdmin: true,
//   room: {
//     state: 2,
//     participants: [
//       {
//         id: 'ID',
//         name: 'Charles'
//       }
//     ]
//   },

//   notes: [],
// }

function reducer(state, action) {
  switch (action.type) {
    case 'connectionStatus':
      return {...state, connected: action.payload}
    case 'connectionError':
      return {...state, err: action.payload}

    case 'name':
      return {...state, name: action.payload}
    case 'identifyReceived':
      return {...state, identified: action.payload}

    case 'roomIdSetFromURL':
      return {...state, roomAdmin: false, roomId: action.payload}
    case 'roomReceive':
      return {...state, roomLoading: false, room: action.payload}
    case 'roomParticipantAdd':
      return {
        ...state,
        room: {
          ...state.room,
          participants: [
            ...state.room.participants,
            action.payload
          ]
        }
      }
    case 'roomStateChanged':
      return {...state, room: {...state.room, state: action.payload}}

    case 'noteCreated':
      return {...state, notes: [...state.notes, action.payload]}

    default:
      throw new Error(`Unknown action ${action}`);
  }
}

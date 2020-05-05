import React, { useReducer, useEffect } from 'react';

import Connection from './connection';
import Login from './components/Login';
import RoomJoin from './components/RoomJoin';
import Room from './components/Room';

import './App.scss'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(state.connection, dispatch)
    readRoomIdFromURL(dispatch)
  }, [])

  return (
    <div className="App">
      <header className="App__header">
        <h1 className="App__title">Goretro</h1>
        { state.name ? <span>with <strong>{state.name}</strong></span> : <span>Here comes a new challenger!</span> }
      </header>

      { mainComponent(state, dispatch) }
    </div>
  );
}

async function readRoomIdFromURL(dispatch) {
  const roomId = window.location.pathname.substring(1);
  if (!roomId) {
    return
  }
  // TODO: Find other way.
  dispatch({type: 'roomIdFromURL', payload: roomId})
}

function mainComponent(state, dispatch) {
  if (!state.name) {
    return <Login onNameSet={(name) => handleNameSet(state, dispatch, name) }/>
  }

  if (state.roomLoading) {
    return <div className="App__Loading center-form vmargin-20">Loading...</div>
  }

  if (state.room) {
    return <Room
      room={state.room}
      isAdmin={state.roomAdmin}
      notes={state.notes}
      onNoteCreate={(note) => { handleNoteCreate(state, dispatch, note) }}
      onStateIncrement={() => { handleRoomStateIncrement(state) }}
    />
  }

  return <RoomJoin
    onCreate={() => { handleRoomCreate(state, dispatch) }}
    onJoin={(roomId) => {handleRoomJoin(state, dispatch, roomId)}}
    roomIdFromURL={state.roomIdFromURL}
  />
}

function handleNameSet(state, dispatch, name) {
  dispatch({type: 'name', payload: name})
  state.connection.identify(name).then(() => {
    dispatch({type: 'identified', payload: true})
  })
}

function handleRoomStateIncrement(state) {
  state.connection.setRoomState(state.room.state + 1)
}

function handleNoteCreate(state, dispatch, note) {
  dispatch({type: 'noteCreated', payload: note})
  state.connection.saveNote(note)
}

function handleRoomJoin(state, dispatch, roomId) {
  dispatch({type: 'roomJoining'})
  state.connection.joinRoom(roomId)
}

function handleRoomCreate(state, dispatch) {
  // TODO: roomCreating could possibly be processed _after_ roomReceived.
  dispatch({type: 'roomCreating'})
  state.connection.createRoom()
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
        dispatch({type: 'roomReceived', payload: message.payload})
        // Change URL
        window.history.replaceState(null, document.title, message.payload.id);
        break
      case "participant-added":
        dispatch({type: 'roomParticipantAdded', payload: message.payload})
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

// State

const real = {
  connection: new Connection(),
  connectionError: null,
  connected: false,

  name: null,
  identified: false,

  roomIdFromURL: null,
  roomLoading: false,
  roomAdmin: false,
  room: null,

  notes: [],
}

const debugRoom = {
  connection: new Connection(),
  connectionError: null,
  connected: false,

  name: "Charles",
  identified: false,

  roomLoading: false,
  roomAdmin: false,
  room: {
    id: "ROOMID",
    state: 2,
    participants: [{
      name: "Charles",
    }]
  },

  notes: [],
}

const initialState = real

function reducer(state, action) {
  console.log(`Reducing ${action.type} - ${action.payload}`)
  // console.log(action.payload)

  switch (action.type) {
    case 'connectionStatus':
      return {...state, connected: action.payload}
    case 'connectionError':
      return {...state, connectionError: action.payload}

    case 'name':
      return {...state, name: action.payload}
    case 'identified':
      return {...state, identified: action.payload}

    case 'roomIdFromURL':
      return {...state, roomAdmin: false, roomIdFromURL: action.payload}
    case 'roomJoining':
      return {...state, roomLoading: true, roomAdmin: false}
    case 'roomCreating':
      return {...state, roomLoading: true, roomAdmin: true}
    case 'roomReceived':
      return {...state, roomLoading: false, room: action.payload}
    case 'roomParticipantAdded':
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

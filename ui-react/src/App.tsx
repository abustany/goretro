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

  useEffect(() => {
    if (state.identified && state.roomId) {
      state.connection.joinRoom(state.roomId)
    }
  }, [state.identified, state.roomId])

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
  dispatch({type: 'roomId', payload: roomId})
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
    onJoin={(roomId) => {handleRoomJoin(dispatch, roomId)}}
    roomId={state.roomId}
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

function handleRoomCreate(state, dispatch) {
  // TODO: roomCreateRequest could possibly be processed _after_ roomReceive.
  dispatch({type: 'roomCreateRequest'})
  state.connection.createRoom()
}

function handleRoomJoin(dispatch, roomId) {
  dispatch({type: 'roomJoinRequest', payload: roomId})
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
        window.history.replaceState(null, document.title, message.payload.id);
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

// State

const real = {
  connection: new Connection(),
  connectionError: null,
  connected: false,

  name: null,
  identified: false,

  roomId: null,
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

  roomId: null,
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
    case 'identifyReceived':
      return {...state, identified: action.payload}

    case 'roomId':
      return {...state, roomAdmin: false, roomId: action.payload}
    case 'roomJoinRequest':
      return {...state, roomLoading: true, roomAdmin: false, roomId: action.payload}
    case 'roomCreateRequest':
      return {...state, roomLoading: true, roomAdmin: true}
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

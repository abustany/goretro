import React, { useReducer, useEffect } from 'react';
import { css, cx } from 'emotion'

import Connection from './connection';
import Login from './components/Login';
import RoomJoin from './components/RoomJoin';
import Room from './components/Room';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(dispatch)
  }, [])

  return (
    <div className={appCss}>
      {state.connectionError && <h1>⚠ Connection Down</h1>}

      <h1>Goretro</h1>

      {state.name && <em>with {state.name}</em>}

      { mainComponent(state, dispatch) }
    </div>
  );
}

const appCss = css`
  text-align: center;
  height: 100%;
`

function mainComponent(state, dispatch) {
  if (!state.name) {
    return <Login onNameSet={(name) => handleSetName(state, dispatch, name) }/>
  }

  if (state.roomLoading) {
    return <div>Loading...</div>
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
  />
}

function handleSetName(state, dispatch, name) {
  dispatch({type: 'name', payload: name})
  state.connection.identify(state.name).then(() => {
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
  // TODO: roomCreating reducer could possibly be processed after roomReceived reducer.
  dispatch({type: 'roomCreating'})
  state.connection.createRoom()
}

async function connect(dispatch) {
  const c = new Connection()
  dispatch({type: 'connection', payload: c})

  c.baseUrl = '/api';

  c.onMessage((message) => {
    switch (message.event) {
      case "state-changed":
        dispatch({type: 'roomStateChanged', payload: message.payload})
        break
      case "current-state":
        dispatch({type: 'roomReceived', payload: message.payload})
        break
      case "participant-added":
        dispatch({type: 'roomParticipantAdded', payload: message.payload})
        break
    }
  });

  c.onConnectionStateChange((connected) => {
    dispatch({type: 'connectionStatus', payload: connected})
  });

  c.start().catch((err) => {
    dispatch({type: 'connectionError', payload: err})
  })
}

// State

const initialState = {
  connection: null,
  connectionError: null,
  connected: false,

  name: null,
  identified: false,

  roomLoading: false,
  roomAdmin: false,
  room: null,

  notes: [],
}

function reducer(state, action) {
  console.log(`Reducing ${action.type} - ${action.payload}`)
  // console.log(action.payload)

  switch (action.type) {
    case 'connection':
      return {...state, connection: action.payload}
    case 'connectionStatus':
      return {...state, connected: action.payload}
    case 'connectionError':
      return {...state, connectionError: action.payload}

    case 'name':
      return {...state, name: action.payload}
    case 'identified':
      return {...state, identified: action.payload}

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

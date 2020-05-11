import React, { useReducer, useEffect, Dispatch } from 'react';

import Err from './components/Error';
import Loading from './components/Loading';
import Login from './components/Login';
import Room from './components/Room';
import WebGLBanner from './components/WebGLBanner';
import * as types from './types';
import { Connection } from './connection';

import './App.scss'

// - If the room doesn't exist.
// - Bug when creating the room.

export default function App(props: {connection: Connection}) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(props.connection, dispatch)
    readRoomIdFromURL(dispatch)
  }, [props.connection])

  useEffect(() => {
    if (state.identified) {
      if (state.roomId) {
        props.connection.joinRoom(state.roomId)
      } else {
        props.connection.createRoom("This room has no name :-(") // TODO(abustany): What do we do for the room name?
      }
    }
  }, [state.identified, state.roomId, props.connection])

  return (
    <div className="App">
      { headerComponent(state, dispatch) }

      { mainComponent(props.connection, state, dispatch) }
    </div>
  );
}

function headerComponent(state: types.State, dispatch: Dispatch<types.Action>) {
  if (state.webGLBanner && !state.error && !state.name) {
    return <WebGLBanner onNotDisplayable={() => { dispatch({type: 'webGLBannerDisabled'}) }}/>
  }

  return <header>
    <div className="App__header">
      <h1 className="retro-font">Goretro</h1>
      { state.name ? <span>with <strong>{state.name}</strong></span> : <span>Here comes a new challenger!</span> }
    </div>
  </header>
}

function mainComponent(connection: Connection, state: types.State, dispatch: Dispatch<types.Action>) {
  // TODO: Have a generic central component.

  if (state.error) {
    return <Err message={state.error}/>
  }

  if (!state.name) {
    return <Login onNameSet={(name) => handleNameSet(connection, dispatch, name) }/>
  }

  if (!state.room) {
    return <Loading/>
  }

  return <Room
    room={state.room}
    link={window.location.toString()}
    isAdmin={state.roomAdmin}
    onNoteCreate={(mood, text) => { handleNoteCreate(connection, state, dispatch, mood, text) }}
    onStateTransition={() => { handleRoomStateIncrement(connection, state) }}
  />
}

function handleNameSet(connection: Connection, dispatch: Dispatch<types.Action>, name: string): void {
  dispatch({type: 'name', payload: name})
  connection.identify(name).then(() => {
    dispatch({type: 'identifyReceived', payload: true})
  })
}

function handleRoomStateIncrement(connection: Connection, state: types.State): void {
  connection.setRoomState(state.room!.state + 1)
}

function handleNoteCreate(connection: Connection, state: types.State, dispatch: Dispatch<types.Action>, mood: types.Mood, text: string): void {
  const note = {
    authorId: connection.clientId,
    id: state.room!.notes.length,
    text: text,
    mood: mood,
  };
  dispatch({type: 'noteCreated', payload: note})
  connection.saveNote(note.id, note.text, note.mood)
}

// Connect the EventSource to the store.
function connect(connection: Connection, dispatch: Dispatch<types.Action>): void {
  connection.onMessage((message) => {
    switch (message.event) {
      case "state-changed":
        dispatch({type: 'roomStateChanged', payload: message.payload})
        break
      case "current-state":
        // TODO(charles): change when BE changes.
        const room = message.payload
        room.notes = restructureRoomNotes(room.notes)
        dispatch({type: 'roomReceive', payload: room})
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
    dispatch({type: 'connectionError', payload: err.toString()})
  })
}

function readRoomIdFromURL(dispatch: Dispatch<types.Action>): void {
  const roomId = (new URL(window.location.toString())).searchParams.get('roomId')
  console.log(`roomId: ${roomId}`)
  if (!roomId) {
    return
  }
  dispatch({type: 'roomIdSetFromURL', payload: roomId})
}

// State

const initialState: types.State = {
  connected: false,
  webGLBanner: true,
  identified: false,
  roomAdmin: true,
}

function reducer(state: types.State, action: types.Action): types.State {
  switch (action.type) {
    case 'connectionStatus':
      return {...state, connected: action.payload}
    case 'connectionError':
      return {...state, error: action.payload}
    case 'webGLBannerDisabled':
      return {...state, webGLBanner: false}
    case 'name':
      return {...state, name: action.payload}
    case 'identifyReceived':
      return {...state, identified: action.payload}

    case 'roomIdSetFromURL':
      return {...state, roomAdmin: false, roomId: action.payload}
    case 'roomReceive':
      return {...state, room: action.payload}
    case 'roomParticipantAdd':
      return {
        ...state,
        room: {
          ...state.room!,
          participants: [
            ...state.room!.participants,
            action.payload,
          ]
        }
      }
    case 'roomStateChanged':
      return {...state, room: {...state.room!, state: action.payload}}

    case 'noteCreated':
      return {
        ...state,
        room: {
          ...state.room!,
          notes: [
            ...state.room!.notes,
            action.payload,
          ]
        }
      }

    default:
      throw new Error(`Unknown action ${action}`);
  }
}

function restructureRoomNotes(notes: {[clientId: string]: types.Note[]}): types.Note[] {
  return Object.values(notes).flat();
}

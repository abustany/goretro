import React, { useReducer, useEffect, Dispatch } from 'react';

import { Connection } from './connection';
import * as types from './types';

import Err from './components/Error';
import Loading from './components/Loading';
import Header from './components/Header';
import Login from './components/Login';
import Room from './components/Room';

import './App.scss'

export default function App(props: {connection: Connection}) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(props.connection, dispatch)
    readRoomIdFromURL(dispatch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state.identified) {
      if (state.roomId) {
        props.connection.joinRoom(state.roomId)
      } else {
        props.connection.createRoom()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.identified, state.roomId])

  return (
    <div className="App">
      <Header name={state.name}/>

      { mainComponent(props.connection, state, dispatch) }
    </div>
  );
}

function mainComponent(connection: Connection, state: types.State, dispatch: Dispatch<types.Action>) {
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

// Connect the EventSource to the State via Actions.
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
        // Change URL
        window.history.replaceState(null, document.title, `/?roomId=${message.payload.id}`);
        dispatch({type: 'roomReceive', payload: room})
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
  identified: false,
  roomAdmin: true,
}

function reducer(state: types.State, action: types.Action): types.State {
  switch (action.type) {
    case 'connectionStatus':
      return {...state, connected: action.payload}
    case 'connectionError':
      return {...state, error: action.payload}
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

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
  console.log(state)

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
    userClientId={connection.clientId}
    link={window.location.toString()}
    onNoteSave={(mood, text, id) => { handleNoteSave(connection, state, dispatch, mood, text, id) }}
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

function handleNoteSave(connection: Connection, state: types.State, dispatch: Dispatch<types.Action>, mood: types.Mood, text: string, id?: number): void {
  if (id !== undefined) {
    dispatch({type: 'noteUpdated', payload: {noteId: id, text: text}})
    connection.saveNote(id, text, mood)
  } else {
    const note = {
      authorId: connection.clientId,
      id: id || state.room!.notes.length,
      text: text,
      mood: mood,
    }
    dispatch({type: 'noteCreated', payload: note})
    connection.saveNote(note.id, note.text, note.mood)
  }
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
      case "host-changed":
        dispatch({type: 'hostChange', payload: message.payload})
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
  if (!roomId) {
    return
  }
  dispatch({type: 'roomIdSetFromURL', payload: roomId})
}

// State

const initialState: types.State = {
  connected: false,
  identified: false,
}

// TMP
// const initialState: types.State = {
//   connected: false,
//   identified: false,
//   name: "Charles",
//   room: {
//     state: 2,
//     hostId: "111",
//     notes: [
//       {authorId: "111", id: 1, text: "Lorem ipsum, or lipsum as it is sometimes known, is dummy text used in laying out print, graphic or web designs. The passage is attributed to an unknown typesetter in the 15th century who is thought to have scrambled parts of Cicero's De Finibus Bonorum. Lorem ipsum, or lips", mood: 2},
//       {authorId: "111", id: 2, text: "Lorem ipsum, or lipsum as it is sometimes known, is dummy text used in laying out print, graphic or web designs. The passage is attributed to an unknown typesetter in the 15th century who is thought to have scrambled parts of Cicero's De Finibus Bonorum.", mood: 2},
//     ],
//     participants: [
//       {name: "Charles", clientId: "111"}
//     ]
//   }
// }

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
      return {...state, roomId: action.payload}
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
    case 'hostChange':
      return {...state, room: {...state.room!, hostId: action.payload}}
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
    case 'noteUpdated':
      const {noteId, text} = action.payload
      const notes = [...state.room!.notes] // copy
      const noteIndex = notes.findIndex((n: types.Note) => n.id === noteId)!
      notes[noteIndex] = {
        ...notes[noteIndex],
        text: text,
      }
      return {
        ...state,
        room: {
          ...state.room!,
          notes: notes,
        }
      }
    default:
      throw new Error(`Unknown action ${action}`);
  }
}

function restructureRoomNotes(notes: {[clientId: string]: types.Note[]}): types.Note[] {
  return Object.values(notes).flat();
}

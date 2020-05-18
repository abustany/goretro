import React, { useReducer, useEffect, Dispatch } from 'react';

import { Connection, Message } from './connection';
import { API } from './api';
import * as types from './types';

import AppGlobalMessage from './components/AppGlobalMessage';
import Header from './components/Header';
import Login from './components/Login';
import Room from './components/Room';

import './App.scss'

interface Props {
  connection: Connection
  api: API
}
const nameLocalStorageKey: string = "nickname"
const ROOMID_PARAM = `id`

export default function({connection, api}: Props) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    connect(connection, dispatch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Identify on name change when connected
  useEffect(() => {
    if (state.connected && state.name)
      api.identify(state.name).then(() => {
        dispatch({type: 'identifyReceived', payload: true})
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.connected, state.name])

  // Join or Create room when identified
  useEffect(() => {
    if (state.identified) {
      if (state.roomId) {
        api.joinRoom(state.roomId)
      } else {
        api.createRoom()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.identified, state.roomId])

  return (
    <div className="App">
      { state.lagging && disconnectedComponent()}
      <Header name={state.name}/>

      <main className="App__main">
        { mainComponent(api, connection.clientId, state, dispatch) }
      </main>
    </div>
  );
}

function mainComponent(api: API, userId: string, state: types.State, dispatch: Dispatch<types.Action>) {
  if (state.error) {
    return <AppGlobalMessage title="Error :(">{ state.error }</AppGlobalMessage>
  }

  if (!state.name) {
    return <Login onNameSet={(name) => handleNameSet(dispatch, name) }/>
  }

  if (!state.room) {
    return <AppGlobalMessage title="Loading..."/>
  }

  return <Room
    room={state.room}
    userId={userId}
    link={window.location.toString()}
    onNoteSave={(mood, text, id) => { handleNoteSave(api, userId, state, dispatch, mood, text, id) }}
    onStateTransition={() => { handleRoomStateIncrement(api, state) }}
    onHasFinishedWriting={(hasFinished) => { handleFinishedWriting(api, hasFinished)} }
  />
}

const disconnectedComponent = () => <div className="App_warning">
  <div>Reconnecting...</div>
  <div className="indication">The connection has been lost, you may not be up to date.</div>
</div>

function handleNameSet(dispatch: Dispatch<types.Action>, name: string): void {
  const trimmedName = name.trim()
  if (!trimmedName) return
  localStorage.setItem(nameLocalStorageKey, trimmedName)

  dispatch({type: 'name', payload: trimmedName})
}

function handleRoomStateIncrement(api: API, state: types.State): void {
  api.setRoomState(state.room!.state + 1)
}

function handleNoteSave(api: API, userId: string, state: types.State, dispatch: Dispatch<types.Action>, mood: types.Mood, text: string, noteId?: number): void {
  if (noteId !== undefined) {
    dispatch({type: 'noteUpdated', payload: {noteId: noteId, text: text}})
    api.saveNote(noteId, text, mood)
  } else {
    const note = {
      authorId: userId,
      id: noteId || state.room!.notes.length,
      text: text,
      mood: mood,
    }
    dispatch({type: 'noteCreated', payload: note})
    api.saveNote(note.id, note.text, note.mood)
  }
}

function handleFinishedWriting(api: API, hasFinished: boolean) {
  api.setFinishedWriting(hasFinished)
}

function handleMessage(message: Message, dispatch: Dispatch<types.Action>): void {
  switch (message.event) {
    case "state-changed":
      dispatch({type: 'roomStateChanged', payload: message.payload})
      break
    case "current-state":
      // TODO(charles): change when BE changes.
      const room = message.payload
      room.notes = restructureRoomNotes(room.notes)
      // Change URL
      writeRoomIdInURL(message.payload.id)
      dispatch({type: 'roomReceive', payload: room})
      break
    case "participant-added":
      dispatch({type: 'roomParticipantAdd', payload: message.payload})
      break
    case "participant-removed":
      dispatch({type: 'roomParticipantRemoved', payload: message.payload})
      break
    case "participant-updated":
      dispatch({type: 'roomParticipantUpdated', payload: message.payload})
      break
    case "host-changed":
      dispatch({type: 'hostChange', payload: message.payload})
      break
  }
}

// Connect the EventSource to the State via Actions.
function connect(connection: Connection, dispatch: Dispatch<types.Action>): void {
  connection.onMessage((message) => {
    handleMessage(message, dispatch)
  });

  connection.onLagging((lagging) => {
    dispatch({type: 'connectionLagging', payload: lagging})
  });

  connection.onLost(() => {
    dispatch({type: 'connectionLost'})
  });

  connection.start().then(() => {
    dispatch({type: 'connectionStarted'})
  }).catch((err) => {
    dispatch({type: 'connectionError', payload: err.toString()})
  })
}

// State

const initialState: types.State = {
  lagging: false,
  name: localStorage.getItem(nameLocalStorageKey) || "",
  roomId: readRoomIdFromURL() || "",
  room: null,

  connected: false,
  identified: false,
}

function reducer(state: types.State, action: types.Action): types.State {
  switch (action.type) {
    case 'connectionLagging':
      return {...state, lagging: action.payload}
    case 'connectionError':
      return {...state, error: action.payload}
    case 'connectionStarted':
      return {...state, connected: true}
    case 'connectionLost':
      return {
        ...state,
        connected: false,
        identified: false,
        room: null,
      }
    case 'name':
      return {...state, name: action.payload}
    case 'identifyReceived':
      return {...state, identified: action.payload}
    case 'roomIdSet':
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
    case 'roomParticipantRemoved':
      return {
        ...state,
        room: {
          ...state.room!,
          participants: state.room!.participants.filter((p) => p.clientId !== action.payload.clientId),
        }
      }
    case 'roomParticipantUpdated':
      const updatedParticipants = [...state.room!.participants]
      const updatedIndex = updatedParticipants.findIndex((p) => p.clientId === action.payload.clientId)
      updatedParticipants[updatedIndex] = action.payload
      return {
        ...state,
        room: {
          ...state.room!,
          participants: updatedParticipants
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
      const notes = [...state.room!.notes]
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

// URL

function writeRoomIdInURL(roomId: string) {
  window.history.replaceState(null, document.title, `/?${ROOMID_PARAM}=${roomId}`);
}

function readRoomIdFromURL(): string | null {
  const roomId = (new URL(window.location.toString())).searchParams.get(ROOMID_PARAM)
  return roomId || null
}

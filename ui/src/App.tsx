import React, { useReducer, useEffect, Dispatch } from 'react';

import { Connection, Message } from './connection';
import { API } from './api';
import { setURLParam, getURLParam } from './utils'
import Reducer from './reducer'

import * as types from './types';

import AppGlobalMessage from './components/AppGlobalMessage';
import Header from './components/Header';
import Login from './components/Login';
import Room from './components/Room';

import './App.scss'

const ERROR_START_FAILED = "Couldn't reach the service."
const NAME_LS_KEY: string = "nickname"
const ROOMID_PARAM = "id"

const initialState: types.State = {
  lagging: false,
  name: localStorage.getItem(NAME_LS_KEY) || "",
  roomId: getURLParam(ROOMID_PARAM) || "",
  room: null,

  connected: false,
  identified: false,
}

interface Props {
  connection: Connection
  api: API
}
export default function({connection, api}: Props) {
  const [state, dispatch] = useReducer(Reducer, initialState)

  useEffect(() => {
    configureConnection(connection, dispatch)
  }, [connection])

  // (Re)connect
  useEffect(() => {
    if (state.connected) return
    connection.start().then(() => {
      dispatch({type: 'connectionStarted'})
    }).catch((err) => {
      console.log(err)
      dispatch({type: 'error', payload: ERROR_START_FAILED})
    })
  }, [connection, state.connected])

  // Identify on name change when connected
  useEffect(() => {
    if (!(state.connected && state.name)) return
    api.identify(state.name).then(() => {
      dispatch({type: 'identifyReceived', payload: true})
    })
  }, [api, state.connected, state.name])

  // Join or Create room when identified
  useEffect(() => {
    if (!state.identified) return
    if (state.roomId) {
      api.joinRoom(state.roomId)
    } else {
      api.createRoom()
    }
  }, [api, state.identified, state.roomId])

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

// Components

function mainComponent(api: API, userId: string, state: types.State, dispatch: Dispatch<types.Action>) {
  if (state.error) {
    return <AppGlobalMessage title="Error :(">{ state.error }</AppGlobalMessage>
  }

  if (!state.name) {
    return <Login onNameSet={(name) => handleNameSet(dispatch, name)} label="Let me in!"/>
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
    onNameUpdate={(name) => handleNameSet(dispatch, name)}
  />
}

const disconnectedComponent = () => <div className="App_warning">
  <div>Reconnecting...</div>
  <div className="indication">The connection has been lost, you may not be up to date.</div>
</div>

// Handlers

function handleNameSet(dispatch: Dispatch<types.Action>, name: string): void {
  const trimmedName = name.trim()
  if (!trimmedName) return
  localStorage.setItem(NAME_LS_KEY, trimmedName)

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
      setURLParam(ROOMID_PARAM, message.payload.id)
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

function restructureRoomNotes(notes: {[clientId: string]: types.Note[]}): types.Note[] {
  return Object.values(notes).flat();
}

// Misc.

function configureConnection(connection: Connection, dispatch: Dispatch<types.Action>): void {
  connection.onMessage((message) => {
    handleMessage(message, dispatch)
  });

  connection.onLagging((lagging) => {
    dispatch({type: 'connectionLagging', payload: lagging})
  });

  connection.onLost(() => {
    dispatch({type: 'connectionLost'})
  });
}

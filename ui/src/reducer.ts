
import * as types from './types';

export default function(state: types.State, action: types.Action): types.State {
  switch (action.type) {
    case 'error':
      return {...state, error: action.payload}
    case 'connectionLagging':
      return {...state, lagging: action.payload}
    case 'connectionStarted':
      return {...state, connected: true}
    case 'connectionLost':
      return {
        ...state,
        connected: false,
        identified: false,
        lagging: false,
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

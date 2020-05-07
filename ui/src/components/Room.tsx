import React from 'react';

import * as types from '../types';

import Column from './Column'
import './Room.scss'
import '../stylesheets/utils.scss'

type OnNoteCreateCallback = (mood: types.Mood, text: string) => void;

interface RoomProps {
  room: types.Room;
  isAdmin: boolean;
  notes: types.Note[];
  onNoteCreate: OnNoteCreateCallback;
  onStateTransition: () => void;
}

const MoodIcons = {
  [types.Mood.POSITIVE]: "👍",
  [types.Mood.NEGATIVE]: "👎",
  [types.Mood.CONFUSED]: "🤔",
}

const StateLabel = {
  [types.RoomState.WAITING_FOR_PARTICIPANTS]: "Waiting for people to join...",
  [types.RoomState.RUNNING]: "Running",
  [types.RoomState.ACTION_POINTS]: "Finding action points"
}

function onNoteCreateHandler(callback: OnNoteCreateCallback, mood: types.Mood): (text: string) => void {
  return (text) => callback(mood, text);
}

export default function Room({room, isAdmin, notes, onNoteCreate, onStateTransition}: RoomProps) {
  console.log(room.participants)
  const participants = normalizeParticipants(room.participants)
  console.log(participants)

  const isWaiting = room.state === types.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === types.RoomState.RUNNING
  const isReviewing = room.state === types.RoomState.ACTION_POINTS
  const editable = isRunning

  const actualNotes = isReviewing ? restructureRoomNotes(room.notes) : notes
  const notesByMood = (mood: types.Mood) => actualNotes.filter((n) => n.mood === mood)

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      { [types.Mood.POSITIVE, types.Mood.NEGATIVE, types.Mood.CONFUSED].map(mood =>
        <Column icon={ MoodIcons[mood] } editable={editable} participants={participants} notes={ notesByMood(mood) } onNoteCreate={ onNoteCreateHandler(onNoteCreate, mood) }/>
      ) }
    </div> }

    <div className={`centered-col-300 center-form ${isWaiting ? "vmargin-20pc" : "Room__footer"}`}>
      { participantsList(participants) }

      { isAdmin && isWaiting && <div>
        <button onClick={onStateTransition}>Start</button>
      </div> }

      { isAdmin && isRunning && <div>
        <button onClick={onStateTransition}>Close &amp; Review</button>
      </div> }

      <div>
        { StateLabel[room.state] }
      </div>
    </div>
  </div>
}

function normalizeParticipants(arr: types.Participant[]): Map<string, types.Participant> {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}

function participantsList(participants: Map<string, types.Participant>) {
  return <div>{ Array.from(participants.values()).map(el => el.name ).join(", ") }</div>
}

function restructureRoomNotes(notes: {[clientId: string]: types.Note[]}): types.Note[] {
  return Object.values(notes).flat();
}

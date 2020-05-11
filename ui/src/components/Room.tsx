import React from 'react';

import * as types from '../types';

import Column from './Column'
import './Room.scss'
import '../stylesheets/utils.scss'

type OnNoteCreateCallback = (mood: types.Mood, text: string) => void;

interface RoomProps {
  room: types.Room;
  isAdmin: boolean;
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
  [types.RoomState.REVIEWING]: "Finding action points"
}

function onNoteCreateHandler(callback: OnNoteCreateCallback, mood: types.Mood): (text: string) => void {
  return (text) => callback(mood, text);
}

export default function Room({room, isAdmin, onNoteCreate, onStateTransition}: RoomProps) {
  const participants = normalizeParticipants(room.participants)

  const isWaiting = room.state === types.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === types.RoomState.RUNNING
  const editable = isRunning

  const notesByMood = (mood: types.Mood) => room.notes.filter((n) => n.mood === mood)

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      { [types.Mood.POSITIVE, types.Mood.NEGATIVE, types.Mood.CONFUSED].map(mood =>
        <Column
          key={mood}
          icon={ MoodIcons[mood] }
          editable={editable}
          participants={participants}
          notes={ notesByMood(mood) }
          onNoteCreate={ onNoteCreateHandler(onNoteCreate, mood) }
        />
      ) }
    </div> }

    <div className={`centered-col-300 center-form ${isWaiting ? "vmargin-20pc" : "Room__footer"}`}>
      { participantsListComponent(participants) }

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

function participantsListComponent(participants: Map<string, types.Participant>) {
  return <div>{ Array.from(participants.values()).map(el => el.name ).join(", ") }</div>
}

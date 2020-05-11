import React from 'react';

import * as types from '../types';

import Column from './Column'
import './Room.scss'
import '../stylesheets/utils.scss'

type OnNoteCreateCallback = (mood: types.Mood, text: string) => void;

interface RoomProps {
  room: types.Room;
  link: string;
  isAdmin: boolean;
  onNoteCreate: OnNoteCreateCallback;
  onStateTransition: () => void;
}

const MoodIcons = {
  [types.Mood.POSITIVE]: "👍",
  [types.Mood.NEGATIVE]: "👎",
  [types.Mood.CONFUSED]: "🤔",
}

function onNoteCreateHandler(callback: OnNoteCreateCallback, mood: types.Mood): (text: string) => void {
  return (text) => callback(mood, text);
}

export default function Room({room, link, isAdmin, onNoteCreate, onStateTransition}: RoomProps) {
  const participants = normalizeParticipants(room.participants)
  const isWaiting = room.state === types.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === types.RoomState.RUNNING
  const notesByMood = (mood: types.Mood) => room.notes.filter((n) => n.mood === mood)

  const participantsListComponent = () => <div>
    <h2>Participants</h2>
    <ul>{ Array.from(participants.values()).map(el => <li key={el.clientId}>{el.name}</li> ) }</ul>
  </div>

  const joinInvitationComponent = () => <div>
    <h2>Join Link</h2>
    <span>{link}</span>
  </div>

  const stateControlComponent = () => {
    if (isWaiting) return <div className="centered-col-300"><button onClick={onStateTransition}>Start</button></div>
    if (isRunning) return <div className="centered-col-300"><button onClick={onStateTransition}>Close &amp; Review</button></div>
    return null
  }

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      { [types.Mood.POSITIVE, types.Mood.NEGATIVE, types.Mood.CONFUSED].map(mood =>
        <Column
          key={mood}
          icon={ MoodIcons[mood] }
          editable={isRunning}
          participants={participants}
          notes={ notesByMood(mood) }
          onNoteCreate={ onNoteCreateHandler(onNoteCreate, mood) }
        />
      ) }
    </div> }

    <div className={`Room__footer center-form`}>
      { isWaiting && joinInvitationComponent() }

      { participantsListComponent() }

      { isAdmin && stateControlComponent() }
    </div>
  </div>
}

function normalizeParticipants(arr: types.Participant[]): Map<string, types.Participant> {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}


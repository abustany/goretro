import React, { useEffect } from 'react';

import * as types from '../types';

import Column from './Column'
import Participants from './Participants'
import StatusParticipant from './StatusParticipant'
import StatusHost from './StatusHost'
import Link from './Link'

import './Room.scss'

const moodIcons = {
  [types.Mood.POSITIVE]: "👍",
  [types.Mood.NEGATIVE]: "👎",
  [types.Mood.CONFUSED]: "🤔",
}

interface Props {
  room: types.Room;
  userId: string;
  link: string;
  onNoteSave: (mood: types.Mood, text: string, id?: number) => void;
  onStateTransition: () => void;
}
export default function({room, userId, link, onNoteSave, onStateTransition}: Props) {
  const participants = normalizeParticipants(room.participants)
  const notesByMood = sortNotesByMoods(room.notes)
  const isHost = userId === room.hostId
  const isWaiting = room.state === types.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === types.RoomState.RUNNING

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      { [types.Mood.POSITIVE, types.Mood.NEGATIVE, types.Mood.CONFUSED].map((mood, index) =>
        <Column
          key={mood}
          icon={ moodIcons[mood] }
          editable={isRunning}
          participants={participants}
          notes={ notesByMood[mood] }
          onNoteSave={ (text, id) => onNoteSave(mood, text, id) }
          data-test-id={ "room-column-" + types.Mood[mood].toLowerCase() }
          tabIndex={index + 1}
        />
      ) }
    </div> }

    <div className={`Room__footer ${isWaiting ? null : "Room__footer--btm"}`}>
      <Participants participants={participants} hostId={room.hostId} userId={userId}/>

      { isWaiting && <Link link={link}/> }

      { isHost ? <StatusHost state={room.state} onStateTransition={onStateTransition}/> : <StatusParticipant state={room.state}/> }
    </div>
  </div>
}

function sortNotesByMoods(notes: types.Note[]): { [key: number]: types.Note[] } {
  const notesByMood: { [key: number]: types.Note[] } = {
    [types.Mood.POSITIVE]: [],
    [types.Mood.NEGATIVE]: [],
    [types.Mood.CONFUSED]: [],
  }
  for (const note of notes) {
    notesByMood[note.mood].push(note)
  }
  return notesByMood
}

function normalizeParticipants(arr: types.Participant[]): Map<string, types.Participant> {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}

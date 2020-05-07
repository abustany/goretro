import React from 'react';

import * as Mood from '../models/mood'
import { Key, States } from '../models/room'
import * as Note from '../models/note'

import RoomColumn from './RoomColumn'
import './Room.scss'
import '../stylesheets/utils.scss'

export default function Room({room, isAdmin, notes, onNoteCreate, onStateTransition}) {
  console.log(room.participants)
  const participants = normalizeParticipants(room.participants)
  console.log(participants)

  const isWaiting = room.state === Key.Waiting
  const isRunning = room.state === Key.Running
  const isReviewing = room.state === Key.Reviewing
  const editable = isRunning

  const actualNotes = isReviewing ? restructureRoomNotes(room.notes) : notes
  const notesByMood = (mood) => actualNotes.filter((n) => n.mood === mood)

  const handleNoteCreation = (note) => { onNoteCreate(note) }
  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      <RoomColumn mood={ Mood.Up }      editable={editable} participants={participants} notes={ notesByMood(Mood.Up) }      onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Down }    editable={editable} participants={participants} notes={ notesByMood(Mood.Down) }    onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Discuss } editable={editable} participants={participants} notes={ notesByMood(Mood.Discuss) } onNoteCreate={ handleNoteCreation }/>
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
        { States[room.state].name }
      </div>
    </div>
  </div>
}

function normalizeParticipants(arr) {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}

function participantsList(participants) {
  return <div>{ Array.from(participants.values()).map((el: any) => el.name ).join(", ") }</div>
}

function restructureRoomNotes(notes) {
  let res: Note.Note[] = [];
  for (let k of Object.keys(notes)) {
    for (let n of notes[k]) {
      res.push({
        id: n.ID,
        mood: Mood.Moods[n.Mood],
        content: n.Text,
        authorId: n.AuthorID,
      })
    }
  }
  return res
}

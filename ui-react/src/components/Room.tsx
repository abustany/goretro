import React from 'react';

import * as Mood from '../models/mood'
import { Key, States } from '../models/room'
import * as Note from '../models/note'

import RoomColumn from './RoomColumn'
import './Room.scss'
import '../stylesheets/utils.scss'

export default function Room({room, isAdmin, notes, onNoteCreate, onStateIncrement}) {
  const isWaiting = room.state === Key.Waiting
  const isRunning = room.state === Key.Running
  const isReviewing = room.state === Key.Reviewing

  const handleNoteCreation = (note) => { onNoteCreate(note) }
  const actualNotes = isReviewing ? restructureNotes(room.notes) : notes
  const notesByMood = (mood) => actualNotes.filter((n) => n.mood === mood)
  const editable = isRunning

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      <RoomColumn mood={ Mood.Up }      notes={ notesByMood(Mood.Up) }      editable={editable} onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Down }    notes={ notesByMood(Mood.Down) }    editable={editable} onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Discuss } notes={ notesByMood(Mood.Discuss) } editable={editable} onNoteCreate={ handleNoteCreation }/>
    </div> }

    <div className={`centered-col-300 center-form ${isWaiting ? "vmargin-20" : "Room__footer"}`}>
      <div>{ room.participants.map(p => p.name ).join(", ") }</div>

      { isAdmin && isWaiting && <div>
        <button onClick={onStateIncrement}>Start</button>
      </div> }

      { isAdmin && isRunning && <div>
        <button onClick={onStateIncrement}>Close &amp; Review</button>
      </div> }

      <div>
        { States[room.state].name }
      </div>
    </div>
  </div>
}

function restructureNotes(notes) {
  let res: Note.Note[] = [];
  for (let k of Object.keys(notes)) {
    for (let n of notes[k]) {
      res.push({
        id: n.ID,
        mood: Mood.Moods[n.Mood],
        content: n.Text,
      })
    }
  }
  return res
}

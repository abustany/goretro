import React from 'react';

import * as Mood from '../models/mood'
import { Key, States } from '../models/room'
import * as Note from '../models/note'

import RoomColumn from './RoomColumn'
import './Room.css'

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

export default function Room({room, isAdmin, notes, onNoteCreate, onStateIncrement}) {
  const handleNoteCreation = (note) => { onNoteCreate(note) }
  const actualNotes = room.state === Key.Reviewing ? restructureNotes(room.notes) : notes
  const notesByMood = (mood) => actualNotes.filter((n) => n.mood === mood)
  const editable = room.state === Key.Running

  return <div>
    { room.state !== Key.Waiting && <div className="Room">
      <RoomColumn mood={ Mood.Up }      notes={ notesByMood(Mood.Up) }      editable={editable} onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Down }    notes={ notesByMood(Mood.Down) }    editable={editable} onNoteCreate={ handleNoteCreation }/>
      <RoomColumn mood={ Mood.Discuss } notes={ notesByMood(Mood.Discuss) } editable={editable} onNoteCreate={ handleNoteCreation }/>
    </div> }

    <div>{ room.participants.map(p => p.name ).join(", ") }</div>

    { isAdmin && room.state === Key.Waiting && <div>
      <button onClick={onStateIncrement}>Start</button>
    </div> }

    { isAdmin && room.state === Key.Running && <div>
      <button onClick={onStateIncrement}>Close &amp; Review</button>
    </div> }

    <div>
      { States[room.state].name }
    </div>

    <div>{ room.id }</div>

  </div>
}


import React, { useState, useRef } from 'react';

import './RoomColumn.scss'
import '../stylesheets/utils.scss'

export default function RoomColumn({editable, mood, notes, participants, onNoteCreate}) {
  const [note, setNote] = useState("")
  const textArea = useRef<any>(null);

  const noteElements = notes.map((n) => noteComponent(n, editable, participants))

  const editor = <div>
    <textarea
      ref={textArea}
      onChange={(e) => setNote(e.target.value) }
      value={note}
      className="RoomColumn__Editor"
    />
    <button onClick={(e) => handleCreate(textArea, setNote, onNoteCreate, mood, note)}>Add</button>
  </div>

  return <div className='RoomColumn center-form'>
    <h2>{mood.icon}</h2>

    <div className='RoomColumn__Notes'>
      { noteElements }

      { editable && editor }
    </div>
  </div>
}

function noteComponent(note, editable, participants) {
  return <div className='RoomColumn__Note' key={note.id}>
    <p>
      {note.content}
    </p>
    {!editable && <em className="RoomColumn__NoteAuthor">
      {participants.get(note.authorId).name}
    </em>}
  </div>
}

function handleCreate(textArea, setNote, onNoteCreate, mood, note){
  onNoteCreate({
    id: ((new Date().valueOf()) % 2**32),
    mood: mood,
    content: note,
  })

  setNote("")
  textArea.current.focus()
}

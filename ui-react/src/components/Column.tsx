import React, { useState, useRef } from 'react';

import './Column.scss'
import '../stylesheets/utils.scss'

export default function Column({editable, mood, notes, participants, onNoteCreate}) {
  const [note, setNote] = useState("")
  const textArea = useRef<any>(null);

  const noteElements = notes.map((n) => noteComponent(n, editable, participants))

  const editor = <div>
    <textarea
      ref={textArea}
      onChange={(e) => setNote(e.target.value) }
      value={note}
      className="Column__Editor"
    />
    <button onClick={(e) => handleCreate(textArea, setNote, onNoteCreate, mood, note)}>Add</button>
  </div>

  return <div className='Column center-form'>
    <h2>{mood.icon}</h2>

    <div className='Column__Notes'>
      { noteElements }

      { editable && editor }
    </div>
  </div>
}

function noteComponent(note, editable, participants) {
  return <div className='Column__Note' key={note.id}>
    <p>
      {note.content}
    </p>
    {!editable && <em className="Column__NoteAuthor">
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

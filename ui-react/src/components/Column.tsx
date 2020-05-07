import React, { useState, useRef } from 'react';

import NoteEditor from './NoteEditor'
import './Column.scss'
import '../stylesheets/utils.scss'

export default function Column({editable, mood, notes, participants, onNoteCreate}) {
  const handleNoteCreate = function(note) {
    onNoteCreate({
      id: ((new Date().valueOf()) % 2**32),
      mood: mood,
      content: note,
    })
  }

  const notesComponent = notes.map((n) => noteComponent(n, editable, participants))

  return <div className='Column center-form'>
    <h2>{mood.icon}</h2>

    <div className='Column__Notes'>
      { notesComponent }

      { editable && <NoteEditor
        onNoteCreate={handleNoteCreate}
      />}
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

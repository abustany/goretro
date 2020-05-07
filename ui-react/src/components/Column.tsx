import React, { useState, useRef } from 'react';

import NoteEditor from './NoteEditor'
import Note from './Note'
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

  const notesComponent = notes.map((n) => <Note note={n} showAuthor={!editable} participants={participants}/>)

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

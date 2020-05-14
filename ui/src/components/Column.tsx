import React, { useState } from 'react';

import NoteEditor from './NoteEditor'
import Note from './Note'
import './Column.scss'
import '../stylesheets/utils.scss'
import * as types from '../types';

interface ColumnProps {
  editable: boolean;
  icon: string;
  notes: types.Note[];
  participants: Map<string, types.Participant>;
  onNoteSave: (text: string, id?: number) => void;
  tabIndex: number;
}

export default function Column({editable, icon, notes, participants, onNoteSave, tabIndex, ...rest}: ColumnProps) {
  const [editedNote, setEditedNote] = useState<types.Note | null>(null)

  console.log("editedNote")
  console.log(editedNote)

  const handleEdit = (note: types.Note) => {
    console.log("here :)")
    setEditedNote(note)
  }

  const notesComponent = notes.map((n) => <Note
      key={n.authorId + n.id}
      note={n}
      showAuthor={!editable}
      participants={participants}
      onNoteEdit={handleEdit}
  />)

  // TODO: Later: It's enough to save the note.
  const handleCancelEdit = () => {
    setEditedNote(null)
  }

  const handleNoteSave = (text: string) => {
    let noteId
    if (editedNote) noteId = editedNote.id
    onNoteSave(text, noteId)
    setEditedNote(null)
  }

  return <div className='Column' {...rest}>
    <div className="Column__top">
      <h2>{icon}</h2>

      { notesComponent }
    </div>

    <div className="Column__bottom">
      { editable && <NoteEditor
        onNoteSave={handleNoteSave}
        tabIndex={tabIndex}
        submitLabel={"↵"}
        initialValue={editedNote?.text}
      />}
    </div>
  </div>
}

// ⏎ ↵ …

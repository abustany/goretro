import React from 'react';

import * as types from '../types';

import './Note.scss'

interface NoteProps {
  text: string;
  id: number;
  author: string;

  note: types.Note;
  showAuthor: boolean;
  participants: Map<string, types.Participant>;
  onNoteEdit: (note: types.Note) => void;
}

export default function Note({note, showAuthor, participants, onNoteEdit}: NoteProps) {
  const handleEdit = () => {
    onNoteEdit(note)
  }

  return <div className='Note' key={note.id}>
    {note.text}

    {showAuthor && <em className="Note__badge">
      {participants.get(note.authorId)?.name || "Unknown author"}
    </em>}

    {!showAuthor && <button onClick={handleEdit} className="Note__badge Note__edit"> ✎ </button>}
  </div>
}

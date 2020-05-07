import React from 'react';

import * as types from '../types';

import './Note.scss'

interface NoteProps {
  note: types.Note;
  showAuthor: boolean;
  participants: Map<string, types.Participant>;
}

export default function noteComponent({note, showAuthor, participants}: NoteProps) {
  return <div className='Note' key={note.id}>
    <p>
      {note.text}
    </p>
    {showAuthor && <em className="Note__Author">
      {participants.get(note.authorId)?.name || "Unknown author"}
    </em>}
  </div>
}

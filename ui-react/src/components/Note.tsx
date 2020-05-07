import React from 'react';

import './Note.scss'

export default function noteComponent({note, showAuthor, participants}) {
  return <div className='Note' key={note.id}>
    <p>
      {note.content}
    </p>
    {showAuthor && <em className="Note__Author">
      {participants.get(note.authorId).name}
    </em>}
  </div>
}

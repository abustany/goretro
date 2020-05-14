import React from 'react';

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
  onNoteCreate: (text: string) => void;
  tabIndex: number;
}

export default function Column({editable, icon, notes, participants, onNoteCreate, tabIndex, ...rest}: ColumnProps) {
  const notesComponent = notes.map((n) => <Note key={n.authorId + n.id} note={n} showAuthor={!editable} participants={participants}/>)

  return <div className='Column' {...rest}>
    {/* Top */}
    <div className="Column__top">
      <h2>{icon}</h2>

      { notesComponent }
    </div>

    {/* Bottom */}
    <div className="Column__bottom">
      { editable && <NoteEditor
        onNoteCreate={onNoteCreate}
        tabIndex={tabIndex}
        submitLabel={"↵"}
      />}
    </div>
  </div>
}

// ⏎ ↵ …

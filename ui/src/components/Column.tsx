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
  const notesComponent = notes.map((n) => <Note
      key={n.authorId + n.id}

      note={n}
      editable={editable}
      participants={participants}
      onNoteSave={onNoteSave}
  />)

  if (editable) {
    notesComponent.push(<Note
      key="editor"

      editable={editable}
      participants={participants}
      onNoteSave={onNoteSave}
    />)
  }

  return <div className='Column' {...rest}>
    <h2>{icon}</h2>

    { notesComponent }
  </div>
}

// ⏎ ↵ …

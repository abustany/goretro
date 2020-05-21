import React from 'react';

import Note from './Note'
import './Column.scss'
import * as types from '../types';

interface Props {
  editable: boolean;
  icon: string;
  notes: types.Note[];
  participants: Map<string, string>;
  onNoteSave: (text: string, id?: number) => void;
  tabIndex: number;
}

export default function({editable, icon, notes, participants, onNoteSave, tabIndex, ...rest}: Props) {
  const noteComponents = notes.filter((n) => n.text !== "").map((n) => <Note
    key={n.authorId + n.id}

    note={n}
    author={participants.get(n.authorId)}
    editable={editable}
    onNoteSave={onNoteSave}
  />)

  if (editable) {
    noteComponents.push(<Note
      key="editor"

      editable={editable}
      onNoteSave={onNoteSave}
      tabIndex={tabIndex}
    />)
  }

  return <div className='Column' {...rest}>
    <h2>{icon}</h2>

    { noteComponents }
  </div>
}

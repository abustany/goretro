import React, { useState } from 'react';

import * as types from '../types';

import './Note.scss'

interface NoteProps {
  note?: types.Note;
  participants: Map<string, types.Participant>;

  editable: boolean;
  onNoteSave: (text: string, id?: number) => void;
}

export default function Note({note, editable, participants, onNoteSave}: NoteProps) {
  // const [editText, setEditText] = useState<string | null>(note ? null : "")
  // const [beingEdited, setBeingEdited] = useState<boolean>(!note)

  // const [st, set] = useState<[string, boolean]>(["", false])
  const [{editText, beingEdited}, setEdit] = useState<{editText?: string, beingEdited?: boolean}>({editText: "", beingEdited: false})

  const showTextArea = beingEdited || !note
  const author = note ? (participants.get(note.authorId)?.name || "Unknown author") : null

  // Callbacks

  const handleEdit = () => {
    setEdit({editText: note!.text, beingEdited: true})
  }

  const handleDelete = () => {
    onNoteSave("", note?.id)
  }

  const handleCancelEdition = () => {
    setEdit({beingEdited: false})
  }

  const handleSave = () => {
    onNoteSave(editText!, note?.id)
    setEdit({beingEdited: false})
  }

  // Badges

  const editBadge = () => <button onClick={handleEdit} className="Note__badge Note__edit"> { note ? "✎" : "↵"} </button>

  const authorBadge = () => <em className="Note__badge">{ author }</em>

  const editingBades = () => [
    <button key="delete" onClick={handleDelete} className="Note__badge"> ␡ </button>,
    <button key="cancel" onClick={handleCancelEdition} className="Note__badge"> ␘ </button>,
    <button key="save" onClick={handleSave} className="Note__badge"> ✓ </button>,
  ].reverse()

  // Logic

  const Tag = showTextArea ? `textarea` : `p`
  const text = showTextArea ? editText : note?.text

  const badges = () => {
    if (editable) {
      if (beingEdited) {
        return editingBades()
      } else {
        return editBadge()
      }
    } else {
      return authorBadge()
    }
  }

  const content = () => {
    if (showTextArea) {
      return <textarea onChange={(e) => setEdit({editText: e.target.value})} value={ text }/>
    } else {
      return <div>{ text }</div>
    }
  }

  // Render!

  return <div className='Note'>
    { content() }
    { badges() }
  </div>
}

// 🗑 💾

// ⏎ ↵ …

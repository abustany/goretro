import React, { useState, useRef } from 'react';

import * as types from '../types';

import './Note.scss'

interface NoteProps {
  note?: types.Note;
  participants: Map<string, types.Participant>;
  editable: boolean;
  onNoteSave: (text: string, id?: number) => void;
  tabIndex?: number
}

export default function Note({note, editable, participants, onNoteSave, tabIndex}: NoteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editState, setEdit] = useState<{editText?: string, beingEdited?: boolean}>({editText: "", beingEdited: false})
  const {editText, beingEdited} = editState
  const isCreateEditor = !note

  const textFromEdit = beingEdited || !note
  const author = note ? (participants.get(note.authorId)?.name || "Unknown author") : null

  // Callbacks

  const handleEdit = () => {
    setEdit({editText: note!.text, beingEdited: true})
  }

  const handleDelete = () => {
    onNoteSave("", note?.id)
    setEdit({beingEdited: false})
  }

  const handleCancelEdition = () => {
    setEdit({beingEdited: false})
  }

  const handleSave = () => {
    onNoteSave(editText!, note?.id)
    if (isCreateEditor) {
      // TODO: Find better solution.
      // This is it createEditor
      setEdit({editText: "", beingEdited: false})
      textareaRef.current?.focus()
    } else {
      setEdit({...editState, beingEdited: false})
    }
  }

  // Badges

  const editBadge = () => <button onClick={handleEdit} className="Note__badge Note__edit">✎</button>
  const authorBadge = () => <em className="Note__badge">{ author }</em>

  const saveBadge = () => <button key="save" onClick={handleSave} className="Note__badge"> { note ? "✓" : "↵" } </button>
  const cancelBadge = () => <button key="cancel" onClick={handleCancelEdition} className="Note__badge"> ␘ </button>
  const deleteBadge = () => <button key="delete" onClick={handleDelete} className="Note__badge"> ␡ </button>

  // Logic

  const text = textFromEdit ? editText : note?.text

  const badges = () => {
    if (editable) {
      if (!note) {
        return saveBadge()
      }

      if (beingEdited) {
        return [saveBadge(), cancelBadge(), deleteBadge()]
      } else {
        return editBadge()
      }
    } else {
      return authorBadge()
    }
  }

  const handleChange = (e: any) => {
    setEdit({...editState, editText: e.target.value}) // TODO: Why?
  }

  const content = () => {
    if (textFromEdit) {
      return <textarea
        onChange={ handleChange }
        value={ text }
        ref={ textareaRef }
        onKeyDown={ onMetaEnter(handleSave) }
        placeholder="…"
        tabIndex={tabIndex}
      />
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

function onMetaEnter(fn: (e: React.KeyboardEvent) => any) {
  return (e: React.KeyboardEvent) => {
    if (e.keyCode === 13 && (e.metaKey || e.ctrlKey)) fn(e)
  }
}

// 🗑 💾

// ⏎ ↵ …

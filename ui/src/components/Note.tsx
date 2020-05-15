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

  const [editState, setEdit] = useState<{textEdited?: string, isEditing: boolean}>({textEdited: "", isEditing: false})
  const {textEdited, isEditing} = editState

  const isCreateEditor = !note

  const textFromEdit = isEditing || !note // TODO: Wrong
  const author = note ? (participants.get(note.authorId)?.name || "Unknown author") : null

  // Callbacks

  const handleEdit = () => {
    setEdit({textEdited: note!.text, isEditing: true})
  }

  const handleDelete = () => {
    onNoteSave("", note?.id)
    setEdit({isEditing: false})
  }

  const handleCancelEdition = () => {
    setEdit({isEditing: false})
  }

  const handleSave = () => {
    onNoteSave(textEdited!, note?.id)
    if (isCreateEditor) {
      // TODO: Find better solution.
      // This is it createEditor
      setEdit({textEdited: "", isEditing: false})
      textareaRef.current?.focus()
    } else {
      setEdit({...editState, isEditing: false})
    }
  }

  // Badges

  const editBadge = () => <button onClick={handleEdit} className="Note__badge Note__edit">✎</button>
  const authorBadge = () => <em className="Note__badge">{ author }</em>
  const saveBadge = () => <button key="save" onClick={handleSave} className="Note__badge"> { note ? "✓" : "✓" } </button>
  const cancelBadge = () => <button key="cancel" onClick={handleCancelEdition} className="Note__badge"> ✕ </button>
  const deleteBadge = () => <button key="delete" onClick={handleDelete} className="Note__badge"> ␡ </button>

  // Logic

  const text = textFromEdit ? textEdited : note?.text

  const badges = () => {
    if (!editable) {
      return authorBadge()
    } else {
      if (isEditing) {
        if (isCreateEditor) {
          return saveBadge()
        } else {
          // reversed because of the float:right.
          return [saveBadge(), cancelBadge(), deleteBadge()]
        }
      } else {
        return editBadge()
      }
    }
  }

  const handleChange = (e: any) => {
    setEdit({...editState, textEdited: e.target.value}) // TODO: Why?
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

// 🗑 💾✓ ↵

// ⏎ ↵ …␘␡

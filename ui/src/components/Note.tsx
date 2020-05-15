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

// Kept alive if (note.id || "editor") didn't change.
// Thus, the Create widget is stable, and the Edit widgets are stable as well.
export default function Note({note, editable, participants, onNoteSave, tabIndex}: NoteProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editState, setEdit] = useState<{editedText?: string, isEditingToggled: boolean}>({editedText: "", isEditingToggled: false})
  const {editedText, isEditingToggled} = editState
  const isCreate = !note
  const takeEditedText = isEditingToggled || !note

  const author = note ? (participants.get(note.authorId)?.name || "Unknown author") : null

  // Callbacks

  const handleEdit = () => {
    setEdit({editedText: note!.text, isEditingToggled: true})
  }

  const handleDelete = () => {
    onNoteSave("", note?.id)
    setEdit({isEditingToggled: false})
  }

  const handleCancelEdition = () => {
    setEdit({isEditingToggled: false})
  }

  const handleSave = () => {
    onNoteSave(editedText!, note?.id)
    if (isCreate) {
      setEdit({editedText: "", isEditingToggled: false})
      textareaRef.current?.focus()
    } else {
      setEdit({...editState, isEditingToggled: false})
    }
  }

  // Badges

  const editBadge = () => <button onClick={handleEdit} className="Note__badge Note__edit">✎</button>
  const authorBadge = () => <em className="Note__badge">{ author }</em>
  const saveBadge = () => <button key="save" onClick={handleSave} className="Note__badge"> { isCreate ? "↵" : "✓" } </button>
  const cancelBadge = () => <button key="cancel" onClick={handleCancelEdition} className="Note__badge"> ✕ </button>
  const deleteBadge = () => <button key="delete" onClick={handleDelete} className="Note__badge"> ␡ </button>

  // Logic

  const text = takeEditedText ? editedText : note?.text

  const badges = () => {
    if (!editable) {
      return authorBadge()
    } else {
      if (isCreate) {
        return saveBadge()
      }
      if (isEditingToggled) {
        // reversed because of the float:right.
        return [saveBadge(), cancelBadge(), deleteBadge()]
      } else {
        return editBadge()
      }
    }
  }

  const container = () => {
    if (takeEditedText) {
      return <textarea
        onChange={ (e) => setEdit({...editState, editedText: e.target.value}) }
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
    { container() }
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

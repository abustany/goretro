import React, { useState, useRef, useEffect } from 'react';

import * as types from '../types';

import './Note.scss'

interface Props {
  note?: types.Note;
  author?: string;
  editable: boolean;
  onNoteSave: (text: string, id?: number) => void;
  tabIndex?: number
}

// If `note` is present, behaves as an Note that can be edited or deleted.
// Otherwise, behaves as a Note creator that gets empty after edition.
// `note` is not meant to change over the lifetime.
export default function({note, author, editable, onNoteSave, tabIndex}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editedText, setEditedText] = useState<string>("")
  const isCreate = !note
  const isInEditMode = editedText !== "" || isCreate

  useEffect(() => {
    if (!isCreate && isInEditMode) textAreaFocus(textareaRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedText])

  author = author || "Unknown author"

  // Callbacks

  const handleEdit = () => {
    setEditedText(note!.text)
  }

  const handleDelete = () => {
    onNoteSave("", note?.id)
    setEditedText("")
  }

  const handleCancelEdition = () => {
    setEditedText("")
  }

  const handleSave = () => {
    onNoteSave(editedText!, note?.id)
    setEditedText("")
    if (isCreate) {
      textareaRef.current?.focus()
    }
  }

  // Badges

  const editBadge = () => <button onClick={handleEdit} className="Note__badge Note__edit" data-test-id="noteeditor-edit">✎</button>
  const authorBadge = () => <em className="Note__badge">{ author }</em>
  const saveBadge = () => <button key="save" onClick={handleSave} className="Note__badge" data-test-id="noteeditor-save"> { isCreate ? "↵" : "✓" } </button>
  const cancelBadge = () => <button key="cancel" onClick={handleCancelEdition} className="Note__badge" data-test-id="noteeditor-cancel"> ✕ </button>
  const deleteBadge = () => <button key="delete" onClick={handleDelete} className="Note__badge" data-test-id="noteeditor-delete"> ␡ </button>

  // Logic

  const text = isInEditMode ? editedText : note?.text

  const badges = () => {
    if (!editable) {
      return authorBadge()
    } else {
      if (isCreate) {
        return saveBadge()
      }
      if (isInEditMode) {
        // reversed because of the float:right.
        return [saveBadge(), cancelBadge(), deleteBadge()]
      } else {
        return editBadge()
      }
    }
  }

  const container = () => {
    if (isInEditMode) {
      return <textarea
        onChange={ (e) => setEditedText(e.target.value) }
        value={ text }
        ref={ textareaRef }
        onKeyDown={ onMetaEnter(handleSave) }
        placeholder="…"
        tabIndex={tabIndex}
        data-test-id="noteeditor-text"
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

function textAreaFocus(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return
  textarea.focus()
  textarea.setSelectionRange(textarea.value.length,textarea.value.length);
}

// ✎
// …
// ✓
// ✕␘
// ⏎ ↵ 💾
// ␡⌫🗑

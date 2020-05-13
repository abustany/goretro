import React, { useState, useRef } from 'react';

import './NoteEditor.scss'

interface NoteEditorProps {
  onNoteCreate: (text: string) => void;
}

export default function NoteEditor({onNoteCreate}: NoteEditorProps) {
  const [note, setNote] = useState("")
  const textArea = useRef<HTMLTextAreaElement>(null);

  const handleCreate = function() {
    onNoteCreate(note)

    setNote("")
    textArea.current?.focus()
  }

  const onMetaEnter = (fn: (e: React.KeyboardEvent) => any) => {
    return (e: React.KeyboardEvent) => {
      if (e.keyCode === 13 && (e.metaKey || e.ctrlKey)) fn(e)
    }
  }

  return <div>
    <textarea
      ref={textArea}
      onChange={(e) => setNote(e.target.value) }
      onKeyDown={onMetaEnter(handleCreate)}
      value={note}
      className="NoteEditor"
      data-test-id="noteeditor-text"
    />
    <button data-test-id="noteeditor-add" onClick={handleCreate}>Add</button>
  </div>
}

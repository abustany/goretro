import React, { useState, useRef } from 'react';

import './NoteEditor.scss'

interface NoteEditorProps {
  onNoteCreate: (text: string) => void;
  tabIndex: number
  submitLabel?: string;
}

const defaultSubmitLabel = "Add"

export default function NoteEditor({onNoteCreate, tabIndex, submitLabel}: NoteEditorProps) {
  const [note, setNote] = useState("")
  if (!submitLabel) submitLabel = defaultSubmitLabel
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
      tabIndex={tabIndex}
      data-test-id="noteeditor-text"
      placeholder="…"
    />
    <button onClick={handleCreate} data-test-id="noteeditor-add">{submitLabel}</button>
  </div>
}

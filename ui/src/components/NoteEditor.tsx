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

  return <div>
    <textarea
      ref={textArea}
      onChange={(e) => setNote(e.target.value) }
      value={note}
      className="NoteEditor"
    />
    <button onClick={handleCreate}>Add</button>
  </div>
}

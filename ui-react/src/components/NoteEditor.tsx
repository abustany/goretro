import React, { useState, useRef } from 'react';

import '../stylesheets/utils.scss'
import './NoteEditor.scss'

export default function NoteEditor({onNoteCreate}) {
  const [note, setNote] = useState("")
  const textArea = useRef<any>(null);

  const handleCreate = function() {
    onNoteCreate(note)

    setNote("")
    textArea.current.focus()
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

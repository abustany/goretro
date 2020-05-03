import React, { useState, useRef } from 'react';

import './RoomColumn.css'

export default function RoomColumn({editable, mood, notes, onNoteCreate}) {
  const [note, setNote] = useState("")
  const textArea = useRef<any>(null);

  const noteDivs = notes.map((n) => <div className='Note' key={n.id}>{n.content}</div>)

  const editor = <div>
    <textarea ref={textArea} onChange={(e) => setNote(e.target.value) } value={note}/>
    <button onClick={(e) => handleCreate(textArea, setNote, onNoteCreate, mood, note)}>Add</button>
  </div>

  return <div className='RoomColumn'>
    <h2>{mood.icon}</h2>

    <div className='Notes'>
      { noteDivs }

      { editable && editor }
    </div>
  </div>
}

function handleCreate(textArea, setNote, onNoteCreate, mood, note){
  onNoteCreate({
    id: ((new Date().valueOf()) % 2**32),
    mood: mood,
    content: note,
  })

  setNote("")
  textArea.current.focus()
}

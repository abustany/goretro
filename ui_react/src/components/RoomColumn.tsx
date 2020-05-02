import React from 'react';

import './RoomColumn.css'

export default function RoomColumn({mood}) {
  return <div className='RoomColumn'>
    <h2>{mood}</h2>

    <h3>Add</h3>
    <input/>
    <button>Add new message</button>
  </div>
}

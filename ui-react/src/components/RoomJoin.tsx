import React, { useState } from 'react';

import '../stylesheets/utils.scss'

export default function RoomJoin({onCreate, onJoin, roomIdFromURL}) {
  const [roomId, setRoomId] = useState(roomIdFromURL)

  const handleJoin = function() {
    onJoin(roomId)
    // TODO: Manage when Room doesn't exist
  }

  return <div className="centered-col-300 center-form vmargin-20">
    <div>
      <button onClick={ onCreate } >Create a new room</button>

      <h2 className="center-form__section">or</h2>
      <input
        type="text"
        placeholder="Room ID"
        onChange={(e) => setRoomId(e.target.value)}
        value={roomId}
        onKeyDown={(e) => { e.key === 'Enter' && handleJoin() }}
      />
      <button onClick={handleJoin}>Join existing Room</button>
    </div>
  </div>
}

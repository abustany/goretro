import React, { useState } from 'react';

import '../stylesheets/utils.scss'

export default function RoomJoin({onCreate, onJoin, roomId}) {
  const [innerRoomId, setInnerRoomId] = useState(roomId)

  const handleJoin = function() {
    onJoin(innerRoomId)
    // TODO: Manage when Room doesn't exist
  }

  return <div className="centered-col-300 center-form vmargin-20">
    <div>
      <button onClick={ onCreate } >Create a new room</button>

      <h2 className="center-form__section">or</h2>
      <input
        type="text"
        placeholder="Room ID"
        onChange={(e) => setInnerRoomId(e.target.value)}
        value={innerRoomId}
        onKeyDown={(e) => { e.key === 'Enter' && handleJoin() }}
      />
      <button onClick={handleJoin}>Join existing Room</button>
    </div>
  </div>
}

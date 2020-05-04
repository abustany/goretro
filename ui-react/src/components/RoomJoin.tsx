import React, { useState } from 'react';

import '../stylesheets/utils.scss'

export default function RoomJoin({onCreate, onJoin}) {
  const [roomId, setRoomId] = useState("")

  const handleJoin = function() {
    onJoin(roomId)
    // TODO: Manage when Room doesn't exist
  }

  return <div className="CenterForm VCenter">
    <div>
      <button onClick={ onCreate } >Create a new room</button>

      <h2 className="Separator">or</h2>
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

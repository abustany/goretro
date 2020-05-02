import React, { useState } from 'react';

export default function RoomJoin({onCreate, onJoin}) {
  const [roomId, setRoomId] = useState("")

  const handleJoin = function() {
    onJoin(roomId)
    // TODO: Manage when Room doesn't exist
  }

  return <>
    <h2>Create new room</h2>
    <button onClick={ onCreate } >Create</button>

    <h2>Join existing room</h2>
    <input type="text" onChange={(e) => setRoomId(e.target.value)} value={roomId} onKeyDown={(e) => { e.key === 'Enter' && handleJoin() }}/>
    <button onClick={handleJoin}>Join</button>
  </>
}

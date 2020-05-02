import React from 'react';

import RoomColumn from './RoomColumn'
import './Room.css'

export default function Room() {
  return <div className="Room">
    <RoomColumn mood="Cool"/>
    <RoomColumn mood="Not Cool"/>
    <RoomColumn mood="To Discuss"/>
  </div>
}

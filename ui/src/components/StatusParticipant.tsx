import React from 'react';

import * as t from '../types'

import './StatusParticipant.scss'

const stateDescription = {
  [t.RoomState.WAITING_FOR_PARTICIPANTS]: "Waiting for the host to press start...",
  [t.RoomState.RUNNING]: "Notes will be shared and reviewed in the next stage.",
  [t.RoomState.REVIEWING]: "Review & Action points",
}

interface Props {
  state: t.RoomState
}
export default function({state}: Props) {
  return <div>
    <h2>▼</h2>
    <div className="Room__status">{ stateDescription[state] }</div>
  </div>
}

import React from 'react';

import * as t from '../types'

import './StatusHost.scss'

const stateDescription = {
  [t.RoomState.WAITING_FOR_PARTICIPANTS]: "Press start when everyone is ready.",
  [t.RoomState.RUNNING]: "Give participants time to write notes.",
  [t.RoomState.REVIEWING]: null,
}

const nextButton = {
  [t.RoomState.WAITING_FOR_PARTICIPANTS]: {text: "Start!", testId: "room-start"},
  [t.RoomState.RUNNING]: {text: "Close & Review", testId: "room-close"},
  [t.RoomState.REVIEWING]: null,
}

interface Props {
  state: t.RoomState
  onStateTransition: () => void;
}
export default function({state, onStateTransition}: Props) {
  const btn = nextButton[state]
  const descr = stateDescription[state]

  if (!descr && !btn) return null
  return <div className="StatusHost">
    <h2>Host Controls</h2>
    { btn && <button className="Room__info-block" onClick={onStateTransition} data-test-id={btn.testId}>{ btn.text }</button> }
    { descr && <div className="Room__status">{ descr }</div> }
  </div>
}

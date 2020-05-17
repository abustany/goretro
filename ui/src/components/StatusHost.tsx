import React from 'react';

import * as t from '../types'

import './StatusHost.scss'
import '../stylesheets/utils.scss'

const stateDescription = {
  [t.RoomState.WAITING_FOR_PARTICIPANTS]: "Press start when everyone is ready.",
  [t.RoomState.RUNNING]: "Time to write notes!",
  [t.RoomState.REVIEWING]: "Review & Action points",
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
  const hostButton = () => {
    const btn = nextButton[state]
    if (!btn) return null
    return <div className="centered-col-300">
      <button onClick={onStateTransition} data-test-id={btn.testId}>{ btn.text }</button>
    </div>
  }

  return <div className="section-topmargin">
    { hostButton() }
    <p className="Room__status">{ stateDescription[state] }</p>
  </div>
}

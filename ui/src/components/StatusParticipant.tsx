import React, { useState } from 'react';

import * as t from '../types'

import './StatusParticipant.scss'

function stateDescription(state: t.RoomState, hasFinished: number) {
  switch(state) {
    case t.RoomState.WAITING_FOR_PARTICIPANTS:
      return "Waiting for the host to press start..."
    case t.RoomState.RUNNING:
      switch(hasFinished) {
        case 0:
          return "Notes will be shared and reviewed in the next stage."
        case 1:
          return "Waiting for other participants to be ready..."
      }
    case t.RoomState.REVIEWING:
      return "Review & Action Points"
  }
}

const hasFinishedToBtnLabel: {[key: number]: string} = {
  0: "I'm done!",
  1: "Back to editing"
}

interface Props {
  state: t.RoomState
  onHasFinishedWriting?: (ready: boolean) => void;
}
export default function({state, onHasFinishedWriting}: Props) {
  const [hasFinished, setHasFinished] = useState(0)
  const showHasFinishedBtn = state === t.RoomState.RUNNING && onHasFinishedWriting
  const disableHasFinishedBtn = !onHasFinishedWriting
  const handleHasFinished = () => {
    const nextHasFinished = 1 - hasFinished
    setHasFinished(nextHasFinished)
    if (onHasFinishedWriting) onHasFinishedWriting(!!nextHasFinished)
  }

  return <div>
    <div className="Room__status">{ stateDescription(state, hasFinished) }</div>
    { showHasFinishedBtn && <button disabled={disableHasFinishedBtn} className="-vs" onClick={handleHasFinished}>{hasFinishedToBtnLabel[hasFinished]}</button> }
  </div>
}
/* <h2>▼</h2> */

import React, { useState } from 'react';

import * as t from '../types'

import './StatusParticipant.scss'

function stateDescription(state: t.RoomState, hasFinished: boolean) {
  switch(state) {
    case t.RoomState.WAITING_FOR_PARTICIPANTS:
      return "Waiting for the host to press start..."
    case t.RoomState.RUNNING:
      if (hasFinished) {
        return "Waiting for other participants to be ready..."
      } else {
        return "Notes will be shared and reviewed in the next stage."
      }
    case t.RoomState.REVIEWING:
      return "Review & Action Points"
  }
}

const hasFinishedToBtnLabel: {[key: string]: string} = {
  false: "I'm done!",
  true: "Back to editing"
}

interface Props {
  state: t.RoomState
  onHasFinishedWriting?: (ready: boolean) => void;
}
export default function({state, onHasFinishedWriting}: Props) {
  const [hasFinished, setHasFinished] = useState(false)
  const showHasFinishedBtn = state === t.RoomState.RUNNING && onHasFinishedWriting
  const disableHasFinishedBtn = !onHasFinishedWriting

  const handleHasFinished = () => {
    const nextHasFinished = !hasFinished
    setHasFinished(nextHasFinished)
    if (onHasFinishedWriting) onHasFinishedWriting(nextHasFinished)
  }

  return <div>
    <div className="Room__status">{ stateDescription(state, hasFinished) }</div>
    { showHasFinishedBtn && <button disabled={disableHasFinishedBtn} className="Room__info-block" onClick={handleHasFinished}>
      { hasFinishedToBtnLabel[hasFinished.toString()] }
    </button> }
  </div>
}
/* <h2>▼</h2> */

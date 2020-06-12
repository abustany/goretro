import React from 'react';

import './Participants.scss'
import * as t from '../types';

interface Props {
  participants: Map<string, t.Participant>
  participantNames: Map<string, string>
  hostId: string
  userId: string
}

export default function({participants, participantNames, hostId, userId}: Props){
  return <div className="Participants">
    <h2>Online ({ participants.size })</h2>
    <ul>{ Array.from(participantNames).map(([id, name]) => {
      let badgesArr = []
      if (participants.get(id)?.finishedWriting) badgesArr.push(flagComponent('READY'))
      if (id === userId) badgesArr.push(flagComponent('YOU'))
      if (id === hostId) badgesArr.push(flagComponent('HOST'))

      return <li key={id} data-test-id="room-participant-list-item">{name}{badgesArr}</li>
    })}</ul>
  </div>
}

function flagComponent(text: string) {
  return <span key={text} className="Participants__flag">
    <span className="Participants__flag-pointer">◄</span> <span className="Participants__flag-text">{text}</span>
  </span>
}

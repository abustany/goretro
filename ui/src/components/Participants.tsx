import React from 'react';

import * as t from '../types'
import './Participants.scss'

interface ParticipantsProps {
  participants: Map<string, t.Participant>
  hostId: string
  userId: string
}

export default function Participants({participants, hostId, userId}: ParticipantsProps){
  return <div>
    <h2>Online ({ participants.size })</h2>
    <ul>{ Array.from(participants.values()).map(el => {
      let badgesArr = []
      if (el.clientId === userId) badgesArr.push(flagComponent('YOU'))
      if (el.clientId === hostId) badgesArr.push(flagComponent('HOST'))

      return <li key={el.clientId} data-test-id="room-participant-list-item">{el.name}{badgesArr}</li>
    })}</ul>
  </div>
}

function flagComponent(text: string) {
  return <span key={text} className="Participants__flag"><span className="Participants__flag-pointer">◄</span> <span className="Participants__flag-text">{text}</span></span>
}

import React from 'react';

import './Participants.scss'

interface Props {
  participants: Map<string, string>
  hostId: string
  userId: string
}

export default function({participants, hostId, userId}: Props){
  return <div className="Participants">
    <h2>Online ({ participants.size })</h2>
    <ul>{ Array.from(participants).map(([id, name]) => {
      let badgesArr = []
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

import React, { useState } from 'react';

import Login from './Login'
import './Participants.scss'
import * as t from '../types';

interface Props {
  participants: Map<string, t.Participant>
  participantNames: Map<string, string>
  hostId: string
  userId: string
  onNameUpdate: (name: string) => void;
}

export default function({participants, participantNames, hostId, userId, onNameUpdate}: Props){
  const [renaming, setRenaming] = useState(false)

  return <div className="Participants">
    <h2>Online ({ participants.size })</h2>
    <ul>{ Array.from(participantNames).map(([id, name]) => {
      let badgesArr = []
      if (participants.get(id)?.finishedWriting) badgesArr.push(flagComponent('READY'))
      const isUser = id === userId
      const isHost = id === hostId
      const isEditable = renaming && isUser
      if (isUser) badgesArr.push(flagComponent('YOU'))
      if (isHost) badgesArr.push(flagComponent('HOST'))

      const handleClick = () => {
        if (!isUser || renaming) return undefined
        setRenaming(true)
      }

      const handleNameUpdate = (name: string) => {
        onNameUpdate(name)
        setRenaming(false)
      }

      return <li key={id} data-test-id="room-participant-list-item" onClick={handleClick}>
        { isEditable && <div className="Participants__Login"><Login onNameSet={handleNameUpdate} initialName={name}/></div> }
        { !isEditable && name }
        { badgesArr }
      </li>
    })}</ul>
  </div>
}

function flagComponent(text: string) {
  return <span key={text} className="Participants__flag">
    <span className="Participants__flag-pointer">◄</span> <span className="Participants__flag-text">{text}</span>
  </span>
}

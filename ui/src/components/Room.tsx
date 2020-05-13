import React from 'react';

import * as types from '../types';

import Column from './Column'
import './Room.scss'
import '../stylesheets/utils.scss'

type OnNoteCreateCallback = (mood: types.Mood, text: string) => void;

interface RoomProps {
  room: types.Room;
  participantId: string;
  link: string;
  onNoteCreate: OnNoteCreateCallback;
  onStateTransition: () => void;
}

const MoodIcons = {
  [types.Mood.POSITIVE]: "👍",
  [types.Mood.NEGATIVE]: "👎",
  [types.Mood.CONFUSED]: "🤔",
}

const nextButton = {
  [types.RoomState.WAITING_FOR_PARTICIPANTS]: {text: "Start!", testId: "room-start"},
  [types.RoomState.RUNNING]: {text: "Close & Review", testId: "room-close"},
  [types.RoomState.REVIEWING]: null,
}

const stateDescriptionParticipant = {
  [types.RoomState.WAITING_FOR_PARTICIPANTS]: "Waiting for the host to press start...",
  [types.RoomState.RUNNING]: "Notes will be shared and reviewed in the next stage.",
  [types.RoomState.REVIEWING]: "Review & Action points",
}

const stateDescriptionAdmin = {
  [types.RoomState.WAITING_FOR_PARTICIPANTS]: "Press start when everyone is ready.",
  [types.RoomState.RUNNING]: "Time to write notes!",
  [types.RoomState.REVIEWING]: stateDescriptionParticipant[types.RoomState.REVIEWING],
}

function onNoteCreateHandler(callback: OnNoteCreateCallback, mood: types.Mood): (text: string) => void {
  return (text) => callback(mood, text);
}

export default function Room({room, participantId, link, onNoteCreate, onStateTransition}: RoomProps) {
  const participants = normalizeParticipants(room.participants)
  const isAdmin = participantId === room.hostId
  const isWaiting = room.state === types.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === types.RoomState.RUNNING
  const notesByMood = (mood: types.Mood) => room.notes.filter((n) => n.mood === mood)

  const participantsListComponent = () => <div>
    <h2 className="Room__footer-section">Online ({ participants.size })</h2>
    <ul>{ Array.from(participants.values()).map(el => {
      let badgesArr = []
      if (el.clientId === participantId) badgesArr.push(flagComponent('YOU'))
      if (el.clientId === room.hostId) badgesArr.push(flagComponent('HOST'))

      return <li key={el.clientId} data-test-id="room-participant-list-item">{el.name}{badgesArr}</li>
    })}</ul>
  </div>

  const joinInvitationComponent = () => <div>
    <h2 className="Room__footer-section">Invite participants!</h2>
    <span>{link}</span>
  </div>

  const statusAdminComponent = () => {
    return <div className="Room__footer-section">
      { hostButton() }
      <p className="Room__status">{ stateDescriptionAdmin[room.state] }</p>
    </div>
  }

  const statusParticipantComponent = () => {
    return <div className="Room__footer-section">
      <h2>▼</h2>
      <div className="Room__status">{ stateDescriptionParticipant[room.state] }</div>
    </div>
  }

  const hostButton = () => {
    const btn = nextButton[room.state]
    if (!btn) return null
    return <div className="centered-col-300">
      <button onClick={onStateTransition} data-test-id={btn.testId}>{ btn.text }</button>
    </div>
  }

  return <div className="Room">
    { !isWaiting && <div className="Room__columns">
      { [types.Mood.POSITIVE, types.Mood.NEGATIVE, types.Mood.CONFUSED].map((mood, index) =>
        <Column
          key={mood}
          icon={ MoodIcons[mood] }
          editable={isRunning}
          participants={participants}
          notes={ notesByMood(mood) }
          onNoteCreate={ onNoteCreateHandler(onNoteCreate, mood) }
          data-test-id={ "room-column-" + types.Mood[mood].toLowerCase() }
          tabIndex={index + 1}
        />
      ) }
    </div> }

    <div className={`Room__footer`}>
      { participantsListComponent() }

      { isWaiting && joinInvitationComponent() }

      { isAdmin ? statusAdminComponent() : statusParticipantComponent() }
    </div>
  </div>
}

function normalizeParticipants(arr: types.Participant[]): Map<string, types.Participant> {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}

function flagComponent(text: string) {
  return <span key={text} className="Room__flag"><span className="Room__flag-pointer">◄</span> <span className="Room_flag-text">{text}</span></span>
}

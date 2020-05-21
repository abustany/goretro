import React from 'react';

import * as t from '../types';

import Column from './Column'
import Participants from './Participants'
import StatusParticipant from './StatusParticipant'
import StatusHost from './StatusHost'
import Link from './Link'

import './Room.scss'

const moodIcons = {
  [t.Mood.POSITIVE]: "👍",
  [t.Mood.NEGATIVE]: "👎",
  [t.Mood.CONFUSED]: "🤔",
}

interface Props {
  room: t.Room;
  userId: string;
  link: string;
  onNoteSave: (mood: t.Mood, text: string, id?: number) => void;
  onStateTransition: () => void;
}

export default function({room, userId, link, onNoteSave, onStateTransition}: Props) {
  const participants = normalizeParticipants(room.participants)
  const notesByMood = sortNotesByMoods(room.notes)
  const isHost = userId === room.hostId
  const isWaiting = room.state === t.RoomState.WAITING_FOR_PARTICIPANTS
  const isRunning = room.state === t.RoomState.RUNNING
  const isReviewing = room.state === t.RoomState.REVIEWING

  const handleExport = () => {
    const now = new Date()
    const fileName = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-retrospective.json`
    saveData(fileName, JSON.stringify(buildExportData(room.notes, room.participants), null, 2))
  }

  return <div className="Room">
    { !isWaiting && <div className="Room__notes">
      { [t.Mood.POSITIVE, t.Mood.NEGATIVE, t.Mood.CONFUSED].map((mood, index) =>
        <Column
          key={mood}
          icon={ moodIcons[mood] }
          editable={isRunning}
          participants={participants}
          notes={ notesByMood[mood] }
          onNoteSave={ (text, id) => onNoteSave(mood, text, id) }
          data-test-id={ "room-column-" + t.Mood[mood].toLowerCase() }
          tabIndex={index + 1}
        />
      ) }
    </div> }

    <div className="Room__info">
      <div className="Room__info-centered">
        <StatusParticipant state={room.state}/>
        { isWaiting && <Link link={link}/> }
      </div>

      <div className="Room__info-bottom">
        { isReviewing && <button onClick={handleExport}>Export</button> }
        <Participants participants={participants} hostId={room.hostId} userId={userId}/>
      </div>
    </div>

    <div className="Room__host">
      { isHost && <StatusHost state={room.state} onStateTransition={onStateTransition}/> }
    </div>
  </div>
}

function sortNotesByMoods(notes: t.Note[]): { [key: number]: t.Note[] } {
  const notesByMood: { [key: number]: t.Note[] } = {
    [t.Mood.POSITIVE]: [],
    [t.Mood.NEGATIVE]: [],
    [t.Mood.CONFUSED]: [],
  }
  for (const note of notes) {
    notesByMood[note.mood].push(note)
  }
  return notesByMood
}

function normalizeParticipants(arr: t.Participant[]): Map<string, t.Participant> {
  return arr.reduce((map, el) => map.set(el.clientId, el), new Map())
}

const saveData = (fileName: string, data: string) => {
  const a = document.createElement("a");
  document.body.appendChild(a);
  a.style.cssText = "display: none;";

  const blob = new Blob([data], {type: "octet/stream"})
  const url = window.URL.createObjectURL(blob)

  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

function buildExportData(notes: t.Note[], participants: t.Participant[]): any {
  const idsToName = participantIdToName(participants)
  const res: any[] = []
  notes.forEach(n => {
    res.push({
      mood: moodIcons[n.mood],
      content: n.text,
      author: idsToName.get(n.authorId),
    })
  })
  return res
}

// Return a mapping of ID the corresponding participant name PLUS a number if needed to make the name unique.
// e.g. { AH13ubga71ef901: "Joe (1)", 9nd16vf00shBBs: "Joe (2)"}
function participantIdToName(participants: t.Participant[]): Map<string, string> {
  const nameToIDs = new Map<string, string[]>()
  participants.forEach(p => {
    let ids = nameToIDs.get(p.name)
    if (ids === undefined) {
      ids = []
      nameToIDs.set(p.name, ids)
    }
    ids.push(p.clientId)
  })

  const res = new Map()
  nameToIDs.forEach((ids, name: string) => {
    if (ids.length > 1) {
      ids.forEach((id, index) => {
        res.set(id, `${name} (${index + 1})`)
      })
    } else {
      res.set(ids[0], name)
    }
  })

  return res
}

export interface Participant {
  clientId: string;
  name: string;
  finishedWriting?: boolean;
};

export enum RoomState {
  WAITING_FOR_PARTICIPANTS = 1,
  RUNNING = 2,
  REVIEWING = 3
}

export interface Room {
  state: RoomState;
  participants: Participant[];
  notes: Note[];
  hostId: string;
}

export enum Mood {
  POSITIVE = 1,
  NEGATIVE = 2,
  CONFUSED = 3
}

export interface Note {
  authorId: string;
  id: number;
  text: string;
  mood: Mood;
}

export interface State {
  // Local state
  error?: string;
  lagging: boolean;
  name: string;
  roomId: string;

  // Reflecting BE state
  connected: boolean;
  identified: boolean;
  room: Room | null;
}

export type Action = {
  type: 'connectionLagging';
  payload: boolean; // connected or not
} | {
  type: 'error';
  payload: string; // error message
} | {
  type: 'connectionStarted';
} | {
  type: 'connectionLost';
} | {
  type: 'name';
  payload: string; // name
} | {
  type: 'identifyReceived';
  payload: boolean; // identified or not
} | {
  type: 'roomIdSet';
  payload: string; // room ID
} | {
  type: 'roomReceive';
  payload: Room; // the current room state
} | {
  type: 'roomParticipantAdd';
  payload: Participant;
} | {
  type: 'roomParticipantRemoved';
  payload: Participant;
} | {
  type: 'roomParticipantUpdated';
  payload: Participant;
} | {
  type: 'hostChange';
  payload: string; // host clientId
} | {
  type: 'roomStateChanged';
  payload: RoomState;
} | {
  type: 'noteCreated';
  payload: Note;
} | {
  type: 'noteUpdated';
  payload: {noteId: number, text: string}
}

export enum Chars {
  EDIT =     '✎',
  VALIDATE = '✓',
  CANCEL =   '✕',
  DELETE =   '␡',
}

// …
// ✕␘
// ⏎ ↵ 💾
// ␡⌫🗑

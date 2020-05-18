import { Connection } from './connection';
import { Mood, RoomState } from './types';

export class API {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  async identify(nickname: string): Promise<void> {
    return this.connection.dataCommand({name: 'identify', nickname: nickname})
  }

  async createRoom() {
     // TODO(abustany): What do we do for the room name?
    return this.connection.dataCommand({name: 'create-room', roomName: "name"})
  }

  async joinRoom(roomId: string) {
    return this.connection.dataCommand({name: 'join-room', roomId: roomId})
  }

  async setRoomState(state: RoomState) {
    return this.connection.dataCommand({name: 'set-state', state: state})
  }

  async saveNote(noteId: number, text: string, mood: Mood) {
    return this.connection.dataCommand({name: 'save-note', noteId, text, mood})
  }

  async setFinishedWriting(hasFinished: boolean) {
    return this.connection.dataCommand({name: 'set-finished-writing', finished: hasFinished})
  }

}

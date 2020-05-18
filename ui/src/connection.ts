import { Mood, RoomState } from './types';
import { trimBase64Padding } from './utils';

const CLIENT_ID_LEN = 16;
const SECRET_LEN = 64;

const MONITORING_PACE_MS = 2000;
const KEEPALIVE_EXPECTED_PACE_MS = 12000

type ConnectionStateChangeCallback = (connected: boolean) => void;

export type Message = {name: string} & Record<string, any>
type MessageCallback = (message: Message) => void;

export class Connection {
  baseUrl: string
  clientId: string
  secret: string
  lastKeepAlive?: number

  connectionStateChangeListeners: ConnectionStateChangeCallback[] = [];
  messageListeners: MessageCallback[] = [];

  connected = false // EventSource

  constructor(baseUrl: string, clientId: string, secret: string) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.secret = secret;
  }

  async start(): Promise<void> {
    if (this.connected) {
      return;
    }

    const res = await this.hello()

    const eventSource = new EventSource(res.eventsUrl);
    eventSource.onerror = (err) => {
      console.error('Event source error', err);
    }

    eventSource.onopen = () => {
      this.connected = true;
      this.lastKeepAlive = Date.now()
      this.startMonitoringConnection()
      this.connectionStateChangeListeners.forEach(x => x(true));
    }

    eventSource.onmessage = (evt) => {
      const parsed = JSON.parse(evt.data);

      if (parsed.event === 'keep-alive') {
        console.log("keep-alive")
        this.lastKeepAlive = Date.now()
        return
      }

      this.messageListeners.forEach(x => x(parsed));
    }
  }

  monitorConnection = () => {
    // console.log(`monitor connection ${Date.now()}`)
    const timeElapsed = (Date.now() - this.lastKeepAlive!)
    console.log(timeElapsed)
    const stillConnected = (timeElapsed < KEEPALIVE_EXPECTED_PACE_MS)
    if (this.connected !== stillConnected) {
      this.connected = stillConnected
      this.connectionStateChangeListeners.forEach(x => x(stillConnected));
    }
    setTimeout(this.monitorConnection, MONITORING_PACE_MS)
  }
  startMonitoringConnection = () => setTimeout(this.monitorConnection, MONITORING_PACE_MS)

  onConnectionStateChange(callback: (connected: boolean) => void) {
    this.connectionStateChangeListeners.push(callback);
  }

  onMessage(callback: (msg: Message) => void) {
    this.messageListeners.push(callback);
  }

  async hello() {
    return rawCommand<HelloResponse>(this.baseUrl, {name: 'hello', clientId: this.clientId, secret: this.secret})
  }

  // API

  async identify(nickname: string): Promise<void> {
    return this.dataCommand({name: 'identify', nickname: nickname})
  }

  async createRoom() {
     // TODO(abustany): What do we do for the room name?
    return this.dataCommand({name: 'create-room', roomName: "name"})
  }

  async joinRoom(roomId: string) {
    return this.dataCommand({name: 'join-room', roomId: roomId})
  }

  async setRoomState(state: RoomState) {
    return this.dataCommand({name: 'set-state', state: state})
  }

  async saveNote(noteId: number, text: string, mood: Mood) {
    return this.dataCommand({name: 'save-note', noteId, text, mood})
  }

  async setFinishedWriting(hasFinished: boolean) {
    return this.dataCommand({name: 'set-finished-writing', finished: hasFinished})
  }

  // END OF API

  async dataCommand<T>(payload: unknown): Promise<T> {
    if (!this.connected) {
      throw Error('Cannot send data command on disconnected connection');
    }

    return rawCommand(this.baseUrl, {name: 'data', clientId: this.clientId, secret: this.secret, payload: payload})
  }
}

function randomID(length: number) {
  const data = new Uint8Array(length);
  window.crypto.getRandomValues(data);
  return trimBase64Padding(btoa(String.fromCharCode.apply(null, data as unknown as number[])).replace(/\+/g, '-').replace(/\//g, '_'));
}

export function generateClientId(): string {
  return randomID(CLIENT_ID_LEN)
}

export function generateSecret(): string {
  return randomID(SECRET_LEN)
}

async function rawCommand<T>(baseUrl: string, command: unknown): Promise<T> {
  return fetch(`${baseUrl}/command`, {
    method: 'POST',
    mode: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  }).then(res => {
    if (res.status !== 200) {
      throw new Error('Unexpected status code: ' + res.status);
    }

    return res.json()
  }).catch(e => {
    console.error('API command error: ', e);
    throw e;
  });
}

interface HelloResponse {
  eventsUrl: string;
}

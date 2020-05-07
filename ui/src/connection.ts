import { EventBus } from './event_bus';

const CLIENT_ID_LEN = 16;
const SECRET_LEN = 64;

export class Connection {
  baseUrl: string
  clientId: string
  secret: string

  eventBus = new EventBus()

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

    const res = await rawCommand<HelloResponse>(this.baseUrl, {name: 'hello', clientId: this.clientId, secret: this.secret})

    // console.log('Connection up, events URL: ' + res.eventsUrl)

    const eventSource = new EventSource(res.eventsUrl);
    eventSource.onerror = (err) => {
      console.error('Event source error', err);
    }
    // maybe useless (just for logging)
    eventSource.onopen = () => {
      // Lost connection but can ignore
      // console.log('Event source connected');
      this.connected = true;
      this.eventBus.$emit('connection-state-change', true);
    }

    eventSource.onmessage = (evt) => {
      // console.log("Event received")
      // console.log(evt)

      const parsed = JSON.parse(evt.data);

      if (parsed.event === 'keep-alive') {
        return;
      }

      this.eventBus.$emit('message', parsed);
    }
  }

  onConnectionStateChange(callback: (connected: boolean) => void) {
    this.eventBus.$on('connection-state-change', callback);
  }

  onMessage(callback: (msg: Message) => void) {
    this.eventBus.$on('message', callback);
  }

  // API

  async identify(nickname: string): Promise<void> {
    return this.dataCommand({name: 'identify', nickname: nickname})
  }

  async createRoom() {
    return this.dataCommand({name: 'create-room', roomName: "My Room"})
  }

  async joinRoom(roomId) {
    return this.dataCommand({name: 'join-room', roomId: roomId})
  }

  async setRoomState(state) {
    return this.dataCommand({name: 'set-state', state: state})
  }

  async saveNote(note) {
    return this.dataCommand({name: 'save-note', noteId: note.id, text: note.content, mood: note.mood.key})
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
  return btoa(String.fromCharCode.apply(null, data as unknown as number[])).replace(/\+/g, '-').replace(/\//g, '_');
}

export function generateClientId(): string {
  return randomID(CLIENT_ID_LEN);
}

export function generateSecret(): string {
  return randomID(SECRET_LEN);
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

type Message = {name: string} & Record<string, any>

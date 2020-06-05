import { Mood, RoomState } from './types';
import { trimBase64Padding } from './utils';

const CLIENT_ID_LEN = 16;
const SECRET_LEN = 64;

const MONITORING_INTERVAL_MS = 2000;
const KEEPALIVE_EXPECTED_INTERVAL_MS = 12000
const DROPPED_SESSION_BODY = "Unknown client\n"

type ConnectionStateChangeCallback = (connected: boolean) => void;

export type Message = {name: string} & Record<string, any>
type MessageCallback = (message: Message) => void;

export class Connection {
  baseUrl: string
  clientId: string
  secret: string
  lastKeepAlive?: number
  firstConnectionPromise?: Promise<unknown>

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

    // Create an un-resolved Promise and keep a ref of the solver.
    let solver: (value?: unknown) => void
    this.firstConnectionPromise = new Promise((resolve, _) => { solver = resolve })
    solver = solver!

    const res = await this.hello()
    this.connectEventSource(res.eventsUrl, solver);
  }

  connectEventSource(url: string, onConnected: ((value?: unknown) => void)) {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      onConnected()
      this.connected = true;

      // Monitor connection
      this.lastKeepAlive = Date.now()
      this.startMonitoringConnection()

      // Notify listeners
      this.connectionStateChangeListeners.forEach(x => x(true));
    }

    // Triggered:
    // - When the EventSource cannot _establish_ connection.
    // - When I put my laptop to sleep.
    // - When I close the Go server (but not with the development proxy server).
    eventSource.onerror = (err) => {
      console.error('Event source error', err);
    }

    eventSource.onmessage = (evt) => {
      const parsed = JSON.parse(evt.data);

      // Update keep-alive
      if (parsed.event === 'keep-alive') {
        this.lastKeepAlive = Date.now()
        return
      }

      // Notify listeners
      this.messageListeners.forEach(x => x(parsed));
    }
  }

  // Notify listeners about the EventSource connection status
  monitorConnection = () => {
    console.log("monitoring")
    const timeElapsed = (Date.now() - this.lastKeepAlive!)
    const stillConnected = (timeElapsed < KEEPALIVE_EXPECTED_INTERVAL_MS)
    if (this.connected !== stillConnected) {

      this.connected = stillConnected
      this.connectionStateChangeListeners.forEach(x => x(stillConnected));
    }
    setTimeout(this.monitorConnection, MONITORING_INTERVAL_MS)
  }
  startMonitoringConnection = () => setTimeout(this.monitorConnection, MONITORING_INTERVAL_MS)

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
    return this.firstConnectionPromise!.then(() =>
      rawCommand(this.baseUrl, {name: 'data', clientId: this.clientId, secret: this.secret, payload: payload})
    )
  }
}

export function generateClientId(): string {
  return randomID(CLIENT_ID_LEN)
}

export function generateSecret(): string {
  return randomID(SECRET_LEN)
}

async function rawCommand<T>(baseUrl: string, command: unknown, attempt?: number): Promise<T> {
  if (attempt === undefined) attempt = 1

  const retry = async () => {
    const wait = Math.min((2 ** (attempt! - 1)) * 100, 10000)
    await sleep(wait)
    return rawCommand<T>(baseUrl, command, attempt! + 1)
  }

  // Retry networking errors
  let res;
  try {
    res = await fetch(`${baseUrl}/command`, {
      method: 'POST',
      mode: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    })
  } catch(e) {
    return await retry()
  }

  // Manage dropped session & Server errors
  if (res.status !== 200) {
    const body = await res.text()

    if (body === DROPPED_SESSION_BODY) {
      // TODO: Do Hello() again (prob not smart because the whole room has been deleted)
      //  or trigger a new onError event instead.
      throw new Error('Session has expired.')
    }

    // TODO: Only retry known networking errors?
    return await retry()
  }

  return res.json()
}
const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
interface HelloResponse {
  eventsUrl: string;
}

function randomID(length: number) {
  const data = new Uint8Array(length);
  window.crypto.getRandomValues(data);
  return trimBase64Padding(btoa(String.fromCharCode.apply(null, data as unknown as number[])).replace(/\+/g, '-').replace(/\//g, '_'));
}

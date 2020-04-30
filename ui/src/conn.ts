import Vue from 'vue'

const CLIENT_ID_LEN = 16;
const SECRET_LEN = 64;

function randomID(length: number) {
  const data = new Uint8Array(length);
  window.crypto.getRandomValues(data);
  return btoa(String.fromCharCode.apply(null, data as unknown as number[])).replace(/\+/g, '-').replace(/\//g, '_');
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

export class Conn {
  clientId = randomID(CLIENT_ID_LEN)
  secret = randomID(SECRET_LEN)
  eventBus = new Vue()

  baseUrl: string = ''
  connected = false

  async start(): Promise<void> {
    if (this.connected) {
      return;
    }

    const res = await rawCommand<HelloResponse>(this.baseUrl, {name: 'hello', clientId: this.clientId, secret: this.secret})

    console.log('Connection up, events URL: ' + res.eventsUrl)

    const eventSource = new EventSource(res.eventsUrl);

    eventSource.onerror = (err) => {
      console.error('Event source error', err);
    }

    eventSource.onopen = () => {
      console.log('Event source connected');
      this.connected = true;
      this.eventBus.$emit('connection-state-change', true);
    }

    eventSource.onmessage = (evt) => {
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

  async identify(nickname: string): Promise<void> {
    return this.dataCommand({name: 'identify', nickname: nickname})
  }

  async dataCommand<T>(payload: unknown): Promise<T> {
    if (!this.connected) {
      throw Error('Cannot send data command on disconnected connection');
    }

    return rawCommand(this.baseUrl, {name: 'data', clientId: this.clientId, secret: this.secret, payload: payload})
  }
}

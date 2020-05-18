import { sleep } from './utils'

const MONITORING_INTERVAL_MS = 2000;
const KEEPALIVE_EXPECTED_INTERVAL_MS = 12000
const UNKNOWN_CLIENT_REQUEST_BODY = "Unknown client\n"

export type Message = {name: string} & Record<string, any>
type LaggingCallback = (connected: boolean) => void;
type MessageCallback = (message: Message) => void;
type LostCallback = () => void;

interface HelloResponse {
  eventsUrl: string;
}

class UnknownClientError extends Error {
  constructor() {
    super();
    this.name = "UnknownClientError";
  }
}

// A connection is either open (when `start`) or close (no `start` or it's been Lost).
// When open, it allows sending commands with dataCommand.
// When open, it also maintains an SSE connection which receives messages from the backend. This connection can be lagging, meaning it's not certain anymore that messages are received.
export class Connection {
  clientId: string
  private secret: string
  private baseUrl: string

  private sseConn?: EventSource
  private sseLastKeepAliveAt?: number
  private sseMonitor?: NodeJS.Timeout
  private sseLagging?: boolean
  private sseUrl?: string

  private commandsChain?: Promise<unknown>
  private startServingCommands?: (value?: unknown) => void

  private lostSession?: boolean

  messageListeners: MessageCallback[] = [];
  laggingListeners: LaggingCallback[] = [];
  lostListeners: LostCallback[] = [];

  constructor(baseUrl: string, clientId: string, secret: string) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.secret = secret;
  }

  public async start(): Promise<void> {
    this.restart()
  }

  public async restart() {
    this.lostSession = false
    this.sseLagging = false
    this.resetCommandsQueue()
    // Start monitoring here already, as we expect it in fact from there on.
    this.ensureSSEMonitoring()

    return this.createSession().then((helloResponse) => {
      this.startServingCommands!() // Could also be in launchSSE
      this.sseUrl = helloResponse.eventsUrl
      this.launchSSE()
    })
  }

  private resetCommandsQueue() {
    const [promise, resolver] = makeUnresolvedPromise()
    this.commandsChain = promise
    this.startServingCommands = resolver
  }

  private ensureSSEMonitoring() {
    this.sseLastKeepAliveAt = Date.now() // restart grace period
    if (this.sseMonitor) return

    this.sseMonitor = setInterval(() => {
      const sinceLastAlive = (Date.now() - this.sseLastKeepAliveAt!)
      const laggingNow = (sinceLastAlive > KEEPALIVE_EXPECTED_INTERVAL_MS)
      if (this.sseLagging !== laggingNow) {
        this.sseLagging = laggingNow
        this.laggingListeners.forEach(l => l(laggingNow));
      }
    }, MONITORING_INTERVAL_MS)
  }

  private launchSSE() {
    this.sseConn = new EventSource(this.sseUrl!);

    this.sseConn.onopen = () => {}

    this.sseConn.onerror = (_) => {
      // The error being passed isn't descriptive.
      if (this.sseConn!.readyState === EventSource.CLOSED) {
        this.relaunchSSE()
      }
    }

    this.sseConn.onmessage = (evt) => {
      const parsed = JSON.parse(evt.data);

      // Update keep-alive
      if (parsed.event === 'keep-alive') {
        this.sseLastKeepAliveAt = Date.now()
        return
      }

      // Notify listeners
      this.messageListeners.forEach(l => l(parsed));
    }
  }

  private relaunchSSE() {
    this.sseConn?.close()
    this.recoverSession().then(this.launchSSE)
  }

  private handleLost() {
    if (this.lostSession) return
    this.lostSession = true

    this.resetCommandsQueue()
    this.lostListeners.forEach(l => l());
  }

  public async dataCommand<T>(payload: unknown): Promise<T> {
    this.commandsChain = this.commandsChain!
      .catch(() => {})
      .then(() => {
        if (this.lostSession) return makeUnresolvablePromise<T>()
        return rawCommand<T>(this.baseUrl, {name: 'data', clientId: this.clientId, secret: this.secret, payload: payload})
      }).catch((err) => {
        if (err instanceof UnknownClientError) {
          this.handleLost()
          return makeUnresolvablePromise<T>()
        } else {
          throw err
        }
      })
    return this.commandsChain as Promise<T>
  }

  public onMessage(callback: MessageCallback) { this.messageListeners.push(callback) }
  public onLagging(callback: LaggingCallback) { this.laggingListeners.push(callback) }
  public onLost(callback: LostCallback) { this.lostListeners.push(callback) }

  private async createSession() {
    return rawCommand<HelloResponse>(this.baseUrl, {name: 'hello', clientId: this.clientId, secret: this.secret})
  }

  private async recoverSession() {
    // TODO:
    // - the command doesn't exist in the backend
    // - <any>
    return rawCommand<any>(this.baseUrl, {name: 'resume', clientId: this.clientId, secret: this.secret}).catch((err) => {
      if (err instanceof UnknownClientError) {
        this.handleLost()
      }

      throw err
    })
  }
}

// TODO: Possibly handle the UnknownClient logic in rawCommand. Requires rawCommand to be part of the class.
async function rawCommand<T>(baseUrl: string, command: unknown, attempt?: number): Promise<T> {
  // TODO: Extract retry logic?

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

    if (body === UNKNOWN_CLIENT_REQUEST_BODY) {
      throw new UnknownClientError()
    }

    if (res.status >= 500) {
      return await retry()
    }

    console.log(command)
    console.log(body)
    throw new Error(`Unexpected Error for ${command}: ${res.status}, ${body}`)
  }

  return res.json()
}

function makeUnresolvedPromise(): [Promise<unknown>, (value?: unknown) => void] {
  let outerResolve: (value?: unknown) => void
  const promise = new Promise((innerResolve, _) => { outerResolve = innerResolve })
  outerResolve = outerResolve!
  return [promise, outerResolve]
}

function makeUnresolvablePromise<T>() {
  // unresolved Promise
  return new Promise<T>(() => {})
}

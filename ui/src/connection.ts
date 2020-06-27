import * as u from './utils'

export type Message = {name: string} & Record<string, any>

// A connection is either open (when `start` has successfully ran) or close (no `start` or session has been Lost).
// When open, a Session exists.
// When open, it allows sending commands with dataCommand.
// When open, it also maintains an SSE connection which receives messages from the backend. This connection can be lagging, meaning it's not certain anymore that messages are received.
export class Connection {
  public clientId: string

  private secret: string
  private baseUrl: string

  private sseConn?: EventSource
  private sseLastKeepAliveAt?: number
  private sseMonitor?: NodeJS.Timeout
  private sseLagging?: boolean
  private sseUrl?: string

  private commandsChain?: Promise<any>
  private startServingCommands?: (value?: unknown) => void

  private lostSession?: boolean

  private messageListeners: MessageCallback[] = [];
  private laggingListeners: LaggingCallback[] = [];
  private lostListeners: LostCallback[] = [];

  constructor(baseUrl: string, clientId: string, secret: string) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.secret = secret;
  }

  public onMessage(callback: MessageCallback) { this.messageListeners.push(callback) }
  public onLagging(callback: LaggingCallback) { this.laggingListeners.push(callback) }
  public onLost(callback: LostCallback) { this.lostListeners.push(callback) }

  public async start(): Promise<void> {
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

  public async restart(): Promise<void> {
    return this.start()
  }

  public async dataCommand<T>(payload: unknown): Promise<T> {
    this.commandsChain = this.commandsChain!.catch(() => {})
      .then(() => {
        if (this.lostSession) return u.makeUnresolvablePromise<T>()
        return this.rawCommand<T>({name: 'data', clientId: this.clientId, secret: this.secret, payload: payload})
      }).catch((err) => {
        if (err instanceof UnknownClientError) return u.makeUnresolvablePromise<T>()
        throw err
      })
    return this.commandsChain
  }

  private resetCommandsQueue(): void {
    const [promise, resolver] = u.makeUnresolvedPromise()
    this.commandsChain = promise
    this.startServingCommands = resolver
  }

  private async createSession(): Promise<HelloResponse> {
    return this.rawCommand<HelloResponse>({name: 'hello', clientId: this.clientId, secret: this.secret})
  }

  // TODO: Temporary work-around, see Issues.
  private async resumeSession(): Promise<any> {
    // Triggers handleLostSession if session has been lost.
    this.dataCommand({name: 'identify', nickname: localStorage.getItem('nickname')})
  }

  private handleLostSession(): void {
    if (this.lostSession) return
    this.lostSession = true

    this.resetCommandsQueue()
    this.lostListeners.forEach(l => l());
  }

  private ensureSSEMonitoring(): void {
    this.sseLastKeepAliveAt = Date.now() // restart grace period
    if (this.sseMonitor) return

    this.sseMonitor = setInterval(() => {
      const sinceLastAlive = (Date.now() - this.sseLastKeepAliveAt!)
      const laggingNow = (sinceLastAlive > Connection.KEEPALIVE_EXPECTED_INTERVAL_MS)
      if (this.sseLagging !== laggingNow) {
        this.sseLagging = laggingNow
        this.laggingListeners.forEach(l => l(laggingNow));
      }
    }, Connection.MONITORING_INTERVAL_MS)
  }

  private launchSSE(): void {
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

  private relaunchSSE(): void {
    this.sseConn?.close()
    this.resumeSession().then(() => this.launchSSE)
  }

  private async rawCommand<T>(command: unknown): Promise<T> {
    return u.withRetry(async () => {
      const res = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        mode: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      }).catch(() => { throw new RetriableError() })

      if (res.status === 200) return res.json()

      const body = await res.text()

      if (body === Connection.UNKNOWN_CLIENT_REQUEST_BODY) {
        this.handleLostSession()
        throw new UnknownClientError()
      } else if (res.status >= 500) {
        throw new RetriableError()
      } else {
        const msg = {command, response: {body, status: res.status}}
        throw new UnexpectedCommandError(JSON.stringify(msg))
      }
    }, {only: [RetriableError]})
  }

  private static readonly MONITORING_INTERVAL_MS = 2000;
  private static readonly KEEPALIVE_EXPECTED_INTERVAL_MS = 12000
  private static readonly UNKNOWN_CLIENT_REQUEST_BODY = "Unknown client\n"

}

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
class UnexpectedCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedCommandError";
  }
}
class RetriableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "RetriableError";
  }
}

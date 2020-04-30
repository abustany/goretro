export interface State {
  connected: boolean;
  clientId: string | undefined;
}

export function createStore() {
  const state: State = {
    connected: false,
    clientId: undefined
  }

  return {
    state,

    connectionUp(clientId: string) {
      this.state.clientId = clientId;
      this.state.connected = true;
    }
  };
}

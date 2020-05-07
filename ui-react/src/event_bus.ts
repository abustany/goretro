export class EventBus {
  bus: any;

  constructor() {
      this.bus = {};
  }

  $on(id, callback) {
      this.bus[id] = callback;
  }

  $emit(id, ...msg) {
      this.bus[id](...msg);
  }
}

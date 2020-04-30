<template>
  <div id="app">
    <Connecting v-if="!connected"/>
    <WelcomeScreen :conn="conn" v-else/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Connecting from './components/Connecting.vue';
import WelcomeScreen from './components/WelcomeScreen.vue';

import { Conn } from './conn';
import { createStore } from './store';


@Component({
  components: {
    Connecting,
    WelcomeScreen,
  },
})
export default class App extends Vue {
  store = createStore()
  conn = new Conn();

  created() {
    this.conn.baseUrl = '/api';

    this.conn.onMessage((message) => {
      console.log('received message ' + message.name);
    });

    this.conn.onConnectionStateChange((connected) => {
      this.store.connectionUp(this.conn.clientId);
    });

    this.conn.start();
  }

  get connected() {
      return !!this.store.state.clientId;
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

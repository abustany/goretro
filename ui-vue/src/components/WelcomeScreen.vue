<template>
  <div>
    <h1>GoRetro</h1>
    <div>
      <input type="text" v-model="nickname">
      <input type="button" value="Set name" v-on:click="setNickname"/>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

interface Conn {
  identify(nickname: string): void;
}

@Component
export default class WelcomeScreen extends Vue {
  @Prop() conn!: Conn;

  nickname: string = ''

  setNickname() {
    this.conn.identify(this.nickname);
  }
}
</script>


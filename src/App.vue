<template>
  <main-screen v-if="!auth" @onAuthSuccess="auth = true"></main-screen>
  <password-list v-if="auth" @logout="auth = false"></password-list>
</template>
<script setup>
import MainScreen from './components/MainScreen.vue'
import PasswordList from './components/PasswordList.vue'
import { ref } from 'vue';

const auth = ref(false);

</script>

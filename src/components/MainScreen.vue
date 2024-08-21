<template>
  <div class="flex items-center justify-center h-screen">
    <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
      <div class="flex flex-col items-center gap-1 mb-4">
        <h1 class="text-2xl font-bold text-center">Lockity</h1>
        <span class="text-lg font-normal">Open your vault or create new one</span>
      </div>
      <template v-if="!createVaultForm">
        <div class="flex flex-col gap-2" v-if="!isVaultLoaded">
          <button
            class="w-full from-[#3f68d3] to-[#b397e1] bg-gradient-to-r hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg"
            @click="openVault">
            Open Vault
          </button>
          <button
            class="w-full from-[#7797e7] to-[#8f6ec4] bg-gradient-to-r hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg"
            @click="createVaultForm = true">
            Create
          </button>
        </div>

        <div v-else-if="isVaultLoaded">
          <h3 class="text-xl mb-4 text-center">Enter Master Password</h3>
          <input v-model="masterPassword" type="password" autocomplete="off" spellcheck="false" autocorrect="off"
            autocapitalize="off" placeholder="Enter your master password" class="w-full p-3 border rounded-lg mb-4" />
          <div class="flex flex-col gap-2">
            <button @click="unlockVault(true)"
              class="w-full bg-green-500 hover:bg-green-600 hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg">
              Unlock Vault
            </button>
            <button
              class="w-full from-[#3f68d3] to-[#b397e1] bg-gradient-to-r hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg"
              @click="logout">
              Cancel
            </button>
          </div>
        </div>

      </template>


      <div v-else>
        <h3 class="text-xl mb-4 text-center">Create a New Vault</h3>
        <input v-model="newMasterPassword" type="password" autocomplete="off" spellcheck="false" autocorrect="off"
          autocapitalize="off" placeholder="Create master password" class="w-full p-3 border rounded-lg mb-4" />
        <input v-model="confirmMasterPassword" type="password" autocomplete="off" spellcheck="false" autocorrect="off"
          autocapitalize="off" placeholder="Confirm master password" class="w-full p-3 border rounded-lg mb-4" />
        <div class="flex flex-col gap-2">
          <button @click="createVault"
            class="w-full bg-green-500 hover:bg-green-600 hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg">
            Confirm
          </button>
          <button @click="createVaultForm = false; error = null"
            class="w-full from-[#3f68d3] to-[#b397e1] bg-gradient-to-r hover:shadow-lg hover:scale-110 text-white font-bold py-2 px-4 rounded-lg">
            Cancel
          </button>
        </div>
      </div>

      <p v-if="error" class="text-red-500 mt-4 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const masterPassword = ref('');
const newMasterPassword = ref('');
const confirmMasterPassword = ref('');
const error = ref(null);

onMounted(async () => {
  isVaultLoaded.value = await window.vaultAPI.vaultExists();
  if (isVaultLoaded.value) {
    unlockVault();
  }
});

const emit = defineEmits(['onAuthSuccess']);

const createVaultForm = ref(false);
const createVault = async () => {
  if (!newMasterPassword.value || !confirmMasterPassword.value) {
    error.value = "Master password cannot be empty!";
    return;
  }

  if (newMasterPassword.value !== confirmMasterPassword.value) {
    error.value = "Passwords do not match!";
    return;
  }

  const response = await window.vaultAPI.createVault(newMasterPassword.value);
  if (response.success) {
    emit('onAuthSuccess');
  } else {
    error.value = response.error;
    newMasterPassword.value = '';
    confirmMasterPassword.value = '';
  }
};

const unlockVault = async (pass = false) => {
  if (pass && !masterPassword.value) {
    error.value = "Master password cannot be empty!";
    return;
  }

  const response = await window.vaultAPI.unlockVault(masterPassword.value);
  if (response?.success) {
    emit('onAuthSuccess');
  } else {
    error.value = response?.error;
  }
};

const isVaultLoaded = ref(false);
const openVault = async () => {
  const response = await window.vaultAPI.openVault();

  if (response.success) {
    isVaultLoaded.value = true;
  }
}

const logout = async () => {
  await window.vaultAPI.logout();
  isVaultLoaded.value = false;
  error.value = null;
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Навігаційна панель -->
    <div class="h-14 bg-gray-900 text-white flex justify-between items-center px-4 py-5">
      <h1 class="text-lg font-semibold">Your Vault</h1>
      <button @click="logout" class="bg-red-600 text-white py-1 px-3 rounded-lg">
        Logout
      </button>
    </div>

    <!-- Основна частина з двома колонками для великих екранів та одна колонка для мобільних пристроїв -->
    <div class="flex flex-grow overflow-hidden">
      <!-- Ліва колонка зі списком сервісів -->
      <div :class="selectedServiceDetails ? 'hidden md:flex md:w-2/5' : 'w-full md:w-2/5'"
        class="flex flex-col h-full  bg-gray-100 p-4">
        <div class="flex flex-col gap-2 mb-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-medium">Saved Services</h2>
            <!-- Кнопка для відкриття модального вікна -->
            <button v-if="!selectedServiceDetails" @click="openAddPasswordModal"
              class="bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg md:hidden">
              +
            </button>
          </div>
          <input v-model="search" type="text" placeholder="Search Service"
            class="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="h-full overflow-y-auto p-4 bg-gray-50 rounded-lg shadow-md">
          <ul class="space-y-4">
            <li v-for="service in servicesComputed" :key="service.service" @click="selectService(service.service)"
              class="flex justify-between items-center space-x-2 p-4 rounded-lg shadow-sm hover:shadow-md hover:cursor-pointer w-full bg-white  hover:bg-violet-300">
              <h3 class="text-sm font-medium truncate">{{ service.service }}</h3>
            </li>
          </ul>

          <span v-if="listError" class="w-full text-red-400 font-normal">
            {{ listError }}
          </span>
        </div>
      </div>

      <!-- Права колонка з деталями сервісу -->
      <div :class="selectedServiceDetails ? 'w-full md:w-2/3' : 'hidden md:block md:w-2/3'"
        class="h-full overflow-y-auto bg-white shadow-md p-6 flex flex-col items-center">
        <div v-if="selectedServiceDetails" class="w-full">
          <h2 class="text-2xl font-semibold mb-4">Edit Service</h2>
          <div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Service Name</label>
              <input v-model="selectedServiceDetails.service" type="text" disabled
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">Username</label>
              <input v-model="selectedServiceDetails.username" type="text"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div class="mb-4 relative">
              <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
              <div class="flex flex-col gap-2">
                <div class="relative">
                  <input :type="showPasswordInput ? 'text' : 'password'" v-model="selectedServiceDetails.password"
                    placeholder="Password"
                    class="w-full pl-2 pr-16 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <div class="flex justify-between absolute inset-y-0 right-0 pr-3 gap-2">
                    <button @click="copyAndClearText(selectedServiceDetails.password)" type="button"
                      class="flex items-center text-gray-400">
                      <span class="text-md">🗐</span>
                    </button>
                    <button @click="showPasswordInput = true; selectedServiceDetails.password = generatePassword();"
                      type="button" class="flex items-center text-gray-400">
                      <span class="text-xl">⚄</span>
                    </button>
                    <button @click="showPasswordInput = !showPasswordInput" type="button"
                      class="flex items-center text-gray-400 text-xl">
                      <span v-if="showPasswordInput">🙈</span>
                      <span v-else>👁</span>
                    </button>
                  </div>
                </div>
                <div class="flex flex-col items-start gap-2 md:flex-row md:items-center">
                  <label>
                    <input v-model="length" type="number" min="8" class="w-20 border p-2 rounded-lg" />
                  </label>
                  <label>
                    <input type="checkbox" v-model="includeSymbols" /> Include Symbols
                  </label>
                  <label>
                    <input type="checkbox" v-model="includeNumbers" /> Include Numbers
                  </label>
                </div>
              </div>

            </div>
            <div class="mt-6 flex justify-end space-x-4">
              <button @click="updatePassword" class="bg-blue-500 text-white py-2 px-4 rounded-lg">Update</button>
              <button @click.prevent="deleteService(selectedServiceDetails.service)"
                class="bg-red-500 text-white py-2 px-4 rounded-lg">
                Delete
              </button>
              <button @click="clearSelectedService" class="bg-gray-500 text-white py-2 px-4 rounded-lg">
                Close Details
              </button>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center h-full">
          <p class="text-xl text-gray-500 mb-6">Select a service to view details or add new</p>
          <button @click="openAddPasswordModal"
            class="bg-blue-600 text-white rounded-full w-14 h-14 px-4 py-2 shadow-lg">
            +
          </button>
        </div>
      </div>
    </div>

    <!-- Модальне вікно для додавання нового пароля -->
    <div v-if="showAddPasswordModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-xl font-medium mb-4">Add New Entry</h2>
        <div class="space-y-4">
          <input v-model="newEntry.service" type="text" placeholder="Service name"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input v-model="newEntry.username" type="text" placeholder="Username"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div class="flex flex-col gap-2">
            <div class="relative">
              <input :type="showAddPasswordInput ? 'text' : 'password'" v-model="newEntry.password"
                placeholder="Password"
                class="w-full pl-2 pr-16 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <div class="flex justify-between absolute inset-y-0 right-0 pr-3 gap-2">
                <button @click="copyAndClearText(newEntry.password)" type="button"
                  class="flex items-center text-gray-400">
                  <span class="text-md">🗐</span>
                </button>
                <button @click="showAddPasswordInput = true; newEntry.password = generatePassword();" type="button"
                  class="flex items-center text-gray-400">
                  <span class="text-xl">⚄</span>
                </button>
                <button @click="showAddPasswordInput = !showAddPasswordInput" type="button"
                  class="flex items-center text-gray-400 text-xl">
                  <span v-if="showAddPasswordInput">🙈</span>
                  <span v-else>👁</span>
                </button>
              </div>
            </div>
            <div class="flex flex-col items-start gap-2 md:flex-row md:items-center">
              <label>
                <input v-model="length" type="number" min="8" class="w-20 border p-2 rounded-lg" />
              </label>
              <label>
                <input type="checkbox" v-model="includeSymbols" /> Include Symbols
              </label>
              <label>
                <input type="checkbox" v-model="includeNumbers" /> Include Numbers
              </label>
            </div>
          </div>
        </div>
        <span v-if="formError" class="text-red-400 mt-2 block">{{ formError }}</span>
        <div class="mt-6 flex justify-end space-x-4">
          <button @click="addPassword" class="bg-blue-500 text-white py-2 px-4 rounded-lg">Add</button>
          <button @click="closeAddPasswordModal" class="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePasswordGenerator } from '../hooks/usePasswordGenerator';

const emit = defineEmits(['logout']);

const {
  length,
  includeSymbols,
  includeNumbers,
  generatePassword,
} = usePasswordGenerator();

const services = ref([]);
const selectedServiceDetails = ref(null);
const newEntry = ref({
  service: '',
  username: '',
  password: '',
});

const search = ref('');
const servicesComputed = computed(() => {
  return services.value.filter(s => !search.value || s.service.toLowerCase().includes(search.value.toLowerCase()));
});

const showPasswordInput = ref(false);
const showAddPasswordModal = ref(false);
const showAddPasswordInput = ref(false);
const formError = ref('');
const listError = ref('');

onMounted(async () => {
  const response = await window.vaultAPI.unlockVault();
  if (response.success) {
    services.value = response.data;
  } else {
    listError.value = response.error;
    console.error(response.error);
  }
});

const openAddPasswordModal = () => {
  showAddPasswordModal.value = true;
};

const closeAddPasswordModal = () => {
  showAddPasswordModal.value = false;
  formError.value = '';
  newEntry.value = { service: '', username: '', password: '' };
};

const addPassword = async () => {
  if (!newEntry.value.service || !newEntry.value.username || !newEntry.value.password) {
    formError.value = 'Please fill all fields.';
    return;
  }

  const passwordData = {
    service: newEntry.value.service,
    username: newEntry.value.username,
    password: newEntry.value.password,
  };

  const response = await window.vaultAPI.createEntry(passwordData);
  if (response.success) {
    services.value.push({ service: newEntry.value.service });
    closeAddPasswordModal();
  } else {
    formError.value = response.error;
    console.error(response.error);
  }
};

const selectService = async (serviceName) => {
  const response = await window.vaultAPI.getEntry(serviceName);
  if (response.success) {
    selectedServiceDetails.value = response.data;
  } else {
    listError.value = response.error;
    console.error(response.error);
  }
};

const updatePassword = async () => {
  if (!selectedServiceDetails.value.username || !selectedServiceDetails.value.password) {
    formError.value = 'Please fill all fields.';
    return;
  }

  const passwordData = {
    service: selectedServiceDetails.value.service,
    username: selectedServiceDetails.value.username,
    password: selectedServiceDetails.value.password,
  };

  const response = await window.vaultAPI.createEntry(passwordData);
  if (!response.success) {
    formError.value = response.error;
    console.error(response.error);
  }
};

const deleteService = async (serviceName) => {
  const response = await window.vaultAPI.deleteEntry(serviceName);
  if (response.success) {
    services.value = services.value.filter((service) => service.service !== serviceName);
    selectedServiceDetails.value = null;
  } else {
    listError.value = response.error;
    console.error(response.error);
  }
};

const clearSelectedService = () => {
  selectedServiceDetails.value = null;
  showPasswordInput.value = false;
};

const logout = async () => {
  const response = await window.vaultAPI.logout();
  if (response.success) {
    emit('logout');
  } else {
    listError.value = response.error;
    console.error(response.error);
  }
};

const copyAndClearText = async (pass) => {
  await window.vaultAPI.copyToClipboard(pass);
}
</script>

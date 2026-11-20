import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/main.css'
import { router, trySingleChunkReload } from './router'
import { useStudyStore } from './stores/studyStore'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  trySingleChunkReload()
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const studyStore = useStudyStore(pinia)
window.addEventListener('storage', studyStore.syncFromStorageEvent)

router.isReady().then(() => {
  try {
    sessionStorage.removeItem('chunk-reload-attempted')
  } catch {
    // Ignore storage restriction
  }
  app.mount('#app')
})

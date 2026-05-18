import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { setupHapticsBridge } from './plugins/haptics-bridge'
import { setupMediaBridge, storeCredentials } from './plugins/media-bridge'
import { isNativeApp } from './api/client'

setupHapticsBridge()
setupMediaBridge()

// Sync stored credentials to native layer on startup
if (isNativeApp()) {
  const token = localStorage.getItem('abs_token') ?? ''
  const host = localStorage.getItem('abs_host') ?? ''
  if (token && host) storeCredentials(token, host)
}

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .mount('#app')

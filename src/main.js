import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/theme.css'
import './style.css'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import './styles/vueflow-theme.css'
import App from './App.vue'
import { registerAllNodes } from './lib/register-nodes'

// Register all node types
registerAllNodes()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

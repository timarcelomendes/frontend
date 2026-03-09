import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 1. Estilos globais (Tailwind)
import './style.css'; 


// 2. Estilos do PrimeVue e Ícones
import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

// Configuração do PrimeVue
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';

const app = createApp(App);

app.use(router);
app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(ConfirmationService);

app.mount('#app');
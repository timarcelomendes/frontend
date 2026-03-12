import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 1. Estilos globais (Tailwind)
import './style.css'; 

// 2. Estilos do PrimeVue 3 (Saga é o padrão claro)
import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

// Configuração do PrimeVue
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

const app = createApp(App);

app.use(router);
// No PrimeVue 3, usamos apenas a configuração simples
app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(ConfirmationService);

app.directive('tooltip', Tooltip);

app.mount('#app');
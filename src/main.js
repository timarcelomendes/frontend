import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 1. Estilos globais (Tailwind)
import './style.css'; 

// 2. Estilos do PrimeVue 3
import 'primevue/resources/themes/saga-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

// Configuração do PrimeVue
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

// 🎯 3. IMPORTAR COMPONENTES GLOBAIS
import Tag from 'primevue/tag';

const app = createApp(App);

app.use(router);
app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(ConfirmationService);

app.directive('tooltip', Tooltip);

// 🎯 4. REGISTAR COMPONENTES GLOBAIS
// Ao fazer isto aqui, você não precisa mais importar o Tag dentro de cada View (.vue)
app.component('Tag', Tag);

app.mount('#app');
<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';

const sidebarExpandida = ref(true);

const toggleSidebar = () => {
  sidebarExpandida.value = !sidebarExpandida.value;
};

const router = useRouter();
const isDark = ref(false);

// 👤 ESTADOS DO UTILIZADOR
const nomeExibido = ref('Utilizador');
const cargoExibido = ref('Carregando...');
const iniciais = ref('U');

onMounted(() => {
  // 1. Recuperar dados do localStorage
  const nome = localStorage.getItem('usuario_nome');
  const cargo = localStorage.getItem('usuario_cargo');

  if (nome) {
    nomeExibido.value = nome;
    cargoExibido.value = cargo || 'Analista';

    // 2. Gerar iniciais (Ex: Marcelo Mendes -> MM)
    const partes = nome.trim().split(' ');
    iniciais.value = partes.length > 1 
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : partes[0][0].toUpperCase();
  }
  
  // Lógica de tema
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }
});

const toggleTema = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

const fazerLogout = () => {
  try {
    // 1. ⚠️ NÃO use clear(). Remova apenas o que é sessão.
    localStorage.removeItem('token');
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('usuario_nome');
    localStorage.removeItem('usuario_cargo');
    localStorage.removeItem('usuario_tipo');

    // 2. Redirecionamento usando o Router (mais estável que o location.href)
    router.push('/login');
    
  } catch (error) {
    console.error("Erro ao sair:", error);
    window.location.href = '/login';
  }
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 antialiased overflow-hidden transition-colors duration-300">
    
    <Toast /> 
    <ConfirmDialog />
    
    <aside 
      v-if="!['/login', '/forgot-password', '/reset-password'].includes($route.path)" 
      class="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shadow-sm dark:shadow-none z-10 transition-all duration-300 ease-in-out"
      :class="[sidebarExpandida ? 'w-64' : 'w-20']"
    >
      <div class="h-20 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 overflow-hidden shrink-0">
        <div class="flex items-center gap-3 w-full" :class="{ 'justify-center': !sidebarExpandida }">
          <img src="/nps.svg" alt="Logo" class="w-10 h-10 object-contain shrink-0" />
          
          <div v-if="sidebarExpandida" class="flex flex-col animate-fadein">
            <h1 class="text-lg font-black tracking-tighter text-slate-800 dark:text-white leading-none uppercase">
              NPS<span class="text-orange-500">PRO</span>
            </h1>
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Intelligence</span>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        
        <router-link to="/" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Dashboard' : ''">
          <i class="pi pi-chart-bar"></i>
          <span v-if="sidebarExpandida">Dashboard</span>
        </router-link>

        <router-link to="/clientes" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Contas' : ''">
          <i class="pi pi-building"></i>
          <span v-if="sidebarExpandida">Contas</span>
        </router-link>
        
        <router-link to="/audiencia" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Audiência' : ''">
          <i class="pi pi-users"></i>
          <span v-if="sidebarExpandida">Audiência</span>
        </router-link>

        <router-link to="/respostas" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Respostas' : ''">
          <i class="pi pi-comments"></i>
          <span v-if="sidebarExpandida">Respostas</span>
        </router-link>

        <router-link to="/importacao" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Importação' : ''">
          <i class="pi pi-cloud-upload"></i>
          <span v-if="sidebarExpandida">Importação</span>
        </router-link>

        <router-link to="/configuracoes" class="nav-item" active-class="active-nav" :title="!sidebarExpandida ? 'Configurações' : ''">
          <i class="pi pi-cog"></i>
          <span v-if="sidebarExpandida">Configurações</span>
        </router-link>

      </nav>

      <div class="p-4 border-t border-slate-100 dark:border-slate-800">
        <button 
          @click="toggleSidebar" 
          class="w-full flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all"
        >
          <i :class="sidebarExpandida ? 'pi pi-chevron-left' : 'pi pi-bars'" class="text-lg"></i>
        </button>
      </div>

      <div class="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
        <div 
          class="flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
          :class="[sidebarExpandida ? 'p-3 justify-between' : 'p-2 justify-center']"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-10 h-10 bg-orange-500 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black">
              {{ iniciais }}
            </div>

            <div v-if="sidebarExpandida" class="flex flex-col text-left overflow-hidden animate-fadein">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
                {{ nomeExibido }}
              </span>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                {{ cargoExibido }}
              </span>
            </div>
          </div>
          
          <div v-if="sidebarExpandida" class="flex items-center ml-2 border-l border-slate-100 dark:border-slate-800 pl-2">
            <button @click="toggleTema" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
              <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </button>
            <button @click="fazerLogout" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 ml-1">
              <i class="pi pi-sign-out"></i>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <main :class="['flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300', ['Login', 'ForgotPassword', 'ResetPassword'].includes($route.name) ? 'p-0' : 'p-8']">
      <router-view />
    </main>

  </div>
</template>

<style scoped>
/* 💡 ESSENCIAL PARA TAILWIND v4 */
@reference "tailwindcss";

/* Transições de Fade */
.animate-fadein {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Estilos de Navegação */
.nav-item {
  @apply flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-orange-500 transition-all duration-200;
}

.nav-item i {
  @apply text-xl flex-shrink-0 w-6 text-center;
}

.nav-item span {
  @apply text-sm font-bold whitespace-nowrap overflow-hidden;
}

.active-nav {
  @apply bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shadow-sm;
}

/* Scrollbar Customizada */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background-color: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 dark:bg-slate-700 rounded-full;
}
</style>
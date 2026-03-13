<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Sidebar from 'primevue/sidebar';
import Button from 'primevue/button';

const router = useRouter();
const route = useRoute();

const isAdmin = ref(false);
const nomeExibido = ref('');
const cargoExibido = ref('');
const iniciais = ref('');

const sidebarExpandida = ref(true);
const mobileMenuAberto = ref(false);
const isDark = ref(false);

// Lógica para esconder menus em páginas de login/senha
const exibirLayout = computed(() => {
  const paginasSemMenu = ['Login', 'ForgotPassword', 'ResetPassword'];
  // Verifica pelo nome da rota (definido no seu router/index.js)
  return !paginasSemMenu.includes(route.name);
});

const toggleSidebar = () => {
  sidebarExpandida.value = !sidebarExpandida.value;
};

onMounted(() => {
  const nome = localStorage.getItem('usuario_nome');
  const cargo = localStorage.getItem('usuario_cargo');
  
  const perfil = localStorage.getItem('usuario_tipo'); 
  isAdmin.value = (perfil || '').toLowerCase() === 'admin';
  console.log("---- DEBUG MENU ----");
  console.log("Valor bruto que está no storage:", perfil);
  console.log("É Admin?", isAdmin.value);
  console.log("--------------------");

  if (nome) {
    nomeExibido.value = nome;
    cargoExibido.value = cargo || 'Analista';
    
    const partes = nome.trim().split(' ');
    iniciais.value = partes.length > 1 
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : partes[0][0].toUpperCase();
  } 
  
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

const logout = () => {
  localStorage.clear();
  router.push('/login');
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased overflow-hidden flex-col md:flex-row transition-colors duration-300">
    
    <Toast /> 
    <ConfirmDialog />

    <header v-if="exibirLayout" 
            class="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
      <div class="flex items-center gap-2">
        <img src="/nps.png" alt="Logo" class="w-8 h-8 object-contain shrink-0" />
        
        <div class="flex flex-col justify-center">
          <h1 class="text-sm font-black tracking-tighter uppercase italic leading-none text-slate-800 dark:text-white">
            NPS PRO
          </h1>
          <span class="text-[9px] font-black tracking-widest uppercase text-orange-500 mt-0.5">
            INTELLIGENCE
          </span>
        </div>
      </div>
      <Button icon="pi pi-bars" @click="mobileMenuAberto = true" class="p-button-text !text-slate-600 dark:!text-slate-400" />
    </header>

    <Sidebar v-model:visible="mobileMenuAberto" class="w-72 dark:bg-slate-900 border-none">
      <template #header>
        <span class="font-black uppercase tracking-widest text-[10px] text-slate-400">Menu Principal</span>
      </template>
      
      <nav class="flex flex-col h-full gap-1 mt-4">
        <router-link to="/" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-chart-bar"></i> <span>Dashboard</span>
        </router-link>
        
        <router-link to="/clientes" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-building"></i> <span>Contas</span>
        </router-link>

        <router-link to="/respostas" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-comments"></i> <span>Respostas</span>
        </router-link>

        <router-link to="/importacao" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-upload"></i> <span>Importação</span>
        </router-link>

        <router-link to="/audiencia" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-users"></i> <span>Audiência</span>
        </router-link>

        <router-link v-if="isAdmin" to="/configuracoes" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-cog"></i> <span>Configurações</span>
        </router-link>

        <div class="mt-auto border-t border-slate-100 dark:border-slate-800 pt-6 pb-8">
          <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black shadow-lg">
                {{ iniciais }}
              </div>
              <div class="flex flex-col">
                <span class="font-black text-xs text-slate-800 dark:text-white">{{ nomeExibido }}</span>
                <span class="text-[9px] font-bold text-orange-500 uppercase tracking-widest">{{ cargoExibido }}</span>
                <span @click="logout" class="text-[9px] font-bold text-rose-500 uppercase tracking-widest cursor-pointer mt-1">Sair</span>
              </div>
            </div>
            <button @click="toggleTema" class="p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm border border-slate-100 dark:border-slate-600">
              <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" class="text-orange-500"></i>
            </button>
          </div>
        </div>
      </nav>
    </Sidebar>

    <aside v-if="exibirLayout" 
      class="hidden md:flex bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col shadow-sm z-20 transition-all duration-300"
      :class="[sidebarExpandida ? 'w-64' : 'w-20']"
    >
      <div class="p-6 flex items-center justify-between h-20">
      <div v-if="sidebarExpandida" class="flex items-center gap-3 animate-fadein">
        <img src="/nps.png" alt="Logo" class="w-12 h-12 object-contain shrink-0" />
        
        <div class="flex flex-col justify-center mt-1">
          <h1 class="text-lg font-black tracking-tighter uppercase italic leading-none text-slate-800 dark:text-white">
            NPS PRO
          </h1>
          <span class="text-[10px] font-black tracking-[0.2em] uppercase text-orange-500 mt-0.5">
            INTELLIGENCE
          </span>
        </div>
      </div>
        <button @click="toggleSidebar" class="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">
          <i :class="sidebarExpandida ? 'pi pi-angle-left' : 'pi pi-angle-right'"></i>
        </button>
      </div>

      <nav class="flex-1 px-3 space-y-1 mt-4">
        <router-link to="/" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Dashboard' : null">
          <i class="pi pi-chart-bar"></i> <span v-if="sidebarExpandida" class="animate-fadein">Dashboard</span>
        </router-link>

        <router-link to="/clientes" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Contas' : null">
          <i class="pi pi-building"></i> <span v-if="sidebarExpandida" class="animate-fadein">Contas</span>
        </router-link>

        <router-link to="/respostas" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Respostas' : null">
          <i class="pi pi-comments"></i> <span v-if="sidebarExpandida" class="animate-fadein">Respostas</span>
        </router-link>

        <router-link to="/importacao" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Importação' : null">
          <i class="pi pi-upload"></i> <span v-if="sidebarExpandida" class="animate-fadein">Importação</span>
        </router-link>

        <router-link to="/audiencia" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Audiência' : null">
          <i class="pi pi-users"></i> <span v-if="sidebarExpandida" class="animate-fadein">Audiência</span>
        </router-link>

        <router-link v-if="isAdmin" to="/configuracoes" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Configurações' : null">
          <i class="pi pi-cog"></i> <span v-if="sidebarExpandida" class="animate-fadein">Configurações</span>
        </router-link>
      </nav>

      <div class="p-4 space-y-2">
        <button @click="toggleTema" class="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
          <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
          <span v-if="sidebarExpandida" class="text-xs font-bold uppercase tracking-widest">{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</span>
        </button>

        <div class="flex items-center gap-3 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div class="w-10 h-10 rounded-xl bg-orange-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg">
            {{ iniciais }}
          </div>
          <div v-if="sidebarExpandida" class="flex-1 min-w-0 animate-fadein">
            <p class="text-[11px] font-black text-slate-800 dark:text-white truncate leading-none mb-1">
              {{ nomeExibido }}
            </p>
            <p class="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-none">
              {{ cargoExibido }}
            </p>
          </div>
          <button @click="logout" v-if="sidebarExpandida" class="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </aside>

    <main :class="['flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-all duration-300', exibirLayout ? 'p-4 md:p-8 lg:p-12' : 'p-0']">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss"; /* 👈 ESTA É A CHAVE NO TAILWIND V4! */

/* Transições suaves do menu */
.animate-fadein { 
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
}
@keyframes fadeIn { 
  from { opacity: 0; transform: translateX(-10px); } 
  to { opacity: 1; transform: translateX(0); } 
}

/* Formatação base dos botões do menu */
.nav-item {
  @apply flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold text-sm transition-all duration-300 w-full mb-1;
}

/* Efeito ao passar o rato (Hover) */
.nav-item:hover {
  @apply bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200;
}

/* Estado Ativo (Página atual selecionada) */
.router-link-active.nav-item {
  @apply bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-orange-500/20;
}

/* Ícones do menu */
.nav-item i {
  @apply text-lg transition-colors duration-300;
}
.router-link-active.nav-item i {
  @apply text-orange-500 dark:text-orange-400;
}
</style>
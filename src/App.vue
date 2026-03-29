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
  const rotasSemMenu = ['Login', 'ForgotPassword', 'redefinir-senha'];
  return !rotasSemMenu.includes(route.name);
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
            class="md:hidden flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
      
      <div class="flex items-center gap-3 cursor-default">
        
        <div class="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-800 dark:to-slate-950 shadow-md shrink-0 overflow-hidden group border border-slate-700/50">
          <div class="absolute inset-0 bg-gradient-to-tr from-orange-500/20 to-indigo-500/20 opacity-50"></div>
          <i class="pi pi-sparkles text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-rose-400 text-lg z-10"></i>
          <div class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-slate-800 dark:border-slate-900 animate-pulse"></div>
        </div>

        <div class="flex items-center gap-3 px-6 py-8">
          
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <i class="pi pi-chart-line text-white text-lg"></i>
          </div>
          
          <div class="flex flex-col justify-center">
            <span class="text-xl font-black tracking-wider text-slate-800 dark:text-white leading-none mb-1">
              NPS
            </span>
            <span class="text-[9px] font-bold tracking-[0.3em] text-indigo-500 dark:text-indigo-400 uppercase leading-none">
              Intelligence
            </span>
          </div>

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
          <i class="pi pi-chart-bar"></i> <span>Visão geral</span>
        </router-link>
        
        <router-link to="/relatorios" class="nav-item group" @click="mobileMenuAberto = false">
          <i class="pi pi-chart-line"></i> 
          <div class="flex items-center justify-between flex-1">
            <span>Relatórios</span>
            <span class="bg-indigo-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black tracking-tighter animate-pulse shadow-sm shadow-indigo-500/50">
              AI
            </span>
          </div>
        </router-link>
        
        <router-link to="/clientes" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-building"></i> <span>Contas</span>
        </router-link>

        <router-link to="/respostas" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-comments"></i> <span>Respostas</span>
        </router-link>

        <router-link to="/acoes" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-check-square"></i> <span>Planos de Ação</span>
        </router-link>
        <router-link to="/importacao" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-upload"></i> <span>Importação</span>
        </router-link>

        <router-link to="/audiencia" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-users"></i> <span>Audiência</span>
        </router-link>

        <router-link to="/acoes" class="nav-item border border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/10" @click="mobileMenuAberto = false">
          <i class="pi pi-check-square text-orange-500"></i> 
          <div class="flex items-center justify-between flex-1">
            <span class="text-orange-700 dark:text-orange-400 font-black">Planos de Ação</span>
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>
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
           :class="['hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 z-20 shadow-sm relative', sidebarExpandida ? 'w-64' : 'w-20']">
      
      <div class="flex items-center gap-3 py-6 px-4 mb-2 cursor-default overflow-hidden">

      <div class="flex items-center gap-3 px-6 py-8">
        
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <i class="pi pi-chart-line text-white text-lg"></i>
        </div>
        
        <div class="flex flex-col justify-center">
          <span class="text-xl font-black tracking-wider text-slate-800 dark:text-white leading-none mb-1">
            NPS
          </span>
          <span class="text-[9px] font-bold tracking-[0.3em] text-indigo-500 dark:text-indigo-400 uppercase leading-none">
            Intelligence
          </span>
        </div>

      </div>
        
      </div>

      <nav class="flex-1 px-3 space-y-1 mt-4">
        <router-link to="/" class="nav-item" v-tooltip.right="!sidebarExpandida ? 'Visão geral' : null">
          <i class="pi pi-chart-bar"></i> <span v-if="sidebarExpandida" class="animate-fadein">Visão geral</span>
        </router-link>

        <router-link to="/relatorios" class="nav-item group" v-tooltip.right="!sidebarExpandida ? 'Relatórios Inteligentes' : null">
          <i class="pi pi-chart-line"></i> 
          <div v-if="sidebarExpandida" class="flex items-center justify-between flex-1 animate-fadein">
            <span>Relatórios</span>
            <span class="bg-indigo-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black tracking-tighter animate-pulse shadow-sm shadow-indigo-500/50">
              AI
            </span>
          </div>
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

        <router-link to="/acoes" class="nav-item border border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/10" v-tooltip.right="!sidebarExpandida ? 'Planos de Ação' : null">
          <i class="pi pi-check-square text-orange-500"></i> 
          <div v-if="sidebarExpandida" class="flex items-center justify-between flex-1 animate-fadein">
            <span class="text-orange-700 dark:text-orange-400 font-black">Planos de Ação</span>
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>
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
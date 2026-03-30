<script setup>
// ==========================================
// 1. IMPORTS
// ==========================================
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Sidebar from 'primevue/sidebar';
import Button from 'primevue/button';

// ==========================================
// 2. SETUP (Router & Globals)
// ==========================================
const router = useRouter();
const route = useRoute();

// ==========================================
// 3. ESTADO (Variáveis)
// ==========================================
// -- UI / Layout
const sidebarExpandida = ref(true);
const mobileMenuAberto = ref(false);
const isDark = ref(false);

// -- Dados do Utilizador
const isAdmin = ref(false);
const nomeExibido = ref('');
const cargoExibido = ref('');
const iniciais = ref('');

// ==========================================
// 4. COMPUTED PROPERTIES
// ==========================================
// Esconde a sidebar/menu em páginas específicas
const exibirLayout = computed(() => {
  const rotasSemMenu = ['Login', 'ForgotPassword', 'redefinir-senha'];
  return !rotasSemMenu.includes(route.name);
});

// ==========================================
// 5. FUNÇÕES (Methods)
// ==========================================
const atualizarDadosUsuario = () => {
  const nome = localStorage.getItem('usuario_nome');
  const cargo = localStorage.getItem('usuario_cargo');
  const perfil = localStorage.getItem('usuario_tipo'); 
  
  isAdmin.value = (perfil || '').toLowerCase() === 'admin';

  // Debug mantido para ajudar nos seus testes
  console.log("---- DEBUG MENU ----");
  console.log("Valor bruto que está no storage:", perfil);
  console.log("É Admin?", isAdmin.value);
  console.log("--------------------");

  if (nome) {
    nomeExibido.value = nome;
    cargoExibido.value = cargo || 'Analista'; // Fallback de segurança
    
    // Lógica das iniciais do Avatar
    const partes = nome.trim().split(' ');
    iniciais.value = partes.length > 1 
      ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
      : partes[0].substring(0, 2).toUpperCase();
  } else {
    // Limpeza de segurança caso faça logout
    nomeExibido.value = '';
    cargoExibido.value = '';
    iniciais.value = '';
  }
};

const toggleSidebar = () => {
  sidebarExpandida.value = !sidebarExpandida.value;
};

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

// ==========================================
// 6. LIFECYCLE & WATCHERS
// ==========================================
// Executa quando a página carrega pela primeira vez (F5)
onMounted(() => {
  // 1. Carrega os dados do utilizador
  atualizarDadosUsuario();

  // 2. Inicializa o tema (Dark/Light)
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  }
});

// Reage a mudanças de rota (ex: transição suave pós-login)
watch(
  () => route.path,
  () => {
    atualizarDadosUsuario();
  }
);
</script>

<template>
  <div class="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 antialiased overflow-hidden flex-col md:flex-row transition-colors duration-300">
    
    <Toast /> 
    <ConfirmDialog />

    <header v-if="exibirLayout" 
            class="md:hidden flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
      
      <div class="flex items-center gap-3 cursor-default">
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

        <router-link to="/importacao" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-upload"></i> <span>Importação</span>
        </router-link>

        <router-link to="/audiencia" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-users"></i> <span>Audiência</span>
        </router-link>

        <router-link v-if="isAdmin" to="/configuracoes" class="nav-item" @click="mobileMenuAberto = false">
          <i class="pi pi-cog"></i> <span>Configurações</span>
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

    <aside v-if="exibirLayout" :class="[
        'hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 h-screen fixed md:relative z-40 transition-all duration-300 ease-in-out shrink-0',
        sidebarExpandida ? 'w-72' : 'w-20'
      ]">

      <button 
        @click="toggleSidebar" 
        class="absolute -right-3 top-8 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors z-50"
      >
        <i :class="['pi text-[10px] transition-transform duration-300', sidebarExpandida ? 'pi-chevron-left' : 'pi-chevron-right']"></i>
      </button>
      
      <div class="flex items-center gap-3 py-8 px-5 cursor-default overflow-hidden border-b border-transparent">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <i class="pi pi-chart-line text-white text-lg"></i>
        </div>
        
        <div class="flex flex-col justify-center whitespace-nowrap transition-opacity duration-300" :class="sidebarExpandida ? 'opacity-100' : 'opacity-0 w-0'">
          <span class="text-xl font-black tracking-wider text-slate-800 dark:text-white leading-none mb-1">
            NPS
          </span>
          <span class="text-[9px] font-bold tracking-[0.3em] text-indigo-500 dark:text-indigo-400 uppercase leading-none">
            Intelligence
          </span>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <router-link to="/" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Visão geral' : null">
          <i class="pi pi-chart-bar shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Visão geral</span>
        </router-link>

        <router-link to="/relatorios" :class="['nav-item group', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Relatórios Inteligentes' : null">
          <i class="pi pi-chart-line shrink-0"></i> 
          <div v-show="sidebarExpandida" class="flex items-center justify-between flex-1 whitespace-nowrap transition-opacity duration-300">
            <span>Relatórios</span>
            <span class="bg-indigo-500 text-[7px] text-white px-1.5 py-0.5 rounded-md font-black tracking-tighter animate-pulse shadow-sm shadow-indigo-500/50">
              AI
            </span>
          </div>
        </router-link>

        <router-link to="/clientes" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Contas' : null">
          <i class="pi pi-building shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Contas</span>
        </router-link>

        <router-link to="/respostas" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Respostas' : null">
          <i class="pi pi-comments shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Respostas</span>
        </router-link>

        <router-link to="/importacao" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Importação' : null">
          <i class="pi pi-upload shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Importação</span>
        </router-link>

        <router-link to="/audiencia" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Audiência' : null">
          <i class="pi pi-users shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Audiência</span>
        </router-link>

        <router-link v-if="isAdmin" to="/configuracoes" :class="['nav-item', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Configurações' : null">
          <i class="pi pi-cog shrink-0"></i> 
          <span v-show="sidebarExpandida" class="whitespace-nowrap transition-opacity duration-300">Configurações</span>
        </router-link>

        <router-link to="/acoes" :class="['nav-item border border-orange-100 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/10', sidebarExpandida ? 'justify-start px-4' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Planos de Ação' : null">
          <i class="pi pi-check-square text-orange-500 shrink-0"></i> 
          <div v-show="sidebarExpandida" class="flex items-center justify-between flex-1 whitespace-nowrap transition-opacity duration-300">
            <span class="text-orange-700 dark:text-orange-400 font-black">Planos de Ação</span>
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>
        </router-link>
      </nav>

      <div class="mt-auto border-t border-slate-100 dark:border-slate-800 p-3 space-y-2">
        <button @click="toggleTema" :class="['w-full flex items-center py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all', sidebarExpandida ? 'gap-4 px-4 justify-start' : 'justify-center px-0']" v-tooltip.right="!sidebarExpandida ? 'Alternar Tema' : null">
          <i :class="[isDark ? 'pi pi-sun' : 'pi pi-moon', 'shrink-0']"></i>
          <span v-show="sidebarExpandida" class="text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-opacity duration-300">{{ isDark ? 'Modo Claro' : 'Modo Escuro' }}</span>
        </button>

        <div :class="['flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800', sidebarExpandida ? 'gap-3 p-2 justify-start' : 'p-2 justify-center']">
          <div class="w-10 h-10 rounded-xl bg-orange-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg" v-tooltip.right="!sidebarExpandida ? nomeExibido : null">
            {{ iniciais }}
          </div>
          
          <div v-show="sidebarExpandida" class="flex-1 min-w-0 flex flex-col justify-center whitespace-nowrap transition-opacity duration-300 overflow-hidden">
            <p class="text-[11px] font-black text-slate-800 dark:text-white truncate leading-none mb-1">
              {{ nomeExibido }}
            </p>
            <p class="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-none truncate">
              {{ cargoExibido }}
            </p>
          </div>
          
          <button @click="logout" v-show="sidebarExpandida" class="p-2 text-slate-400 hover:text-rose-500 transition-colors shrink-0" title="Sair do sistema">
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
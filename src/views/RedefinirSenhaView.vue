<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300 relative overflow-hidden font-sans">
    <Toast />
    
    <div class="fixed inset-0 z-0 opacity-40 dark:opacity-100 pointer-events-none">
      <div v-for="n in 50" :key="n" 
           class="absolute bg-slate-300 dark:bg-white rounded-full animate-twinkle"
           :style="{
             width: Math.random() * 3 + 'px',
             height: Math.random() * 3 + 'px',
             top: Math.random() * 100 + '%',
             left: Math.random() * 100 + '%',
             animationDelay: Math.random() * 5 + 's',
             animationDuration: Math.random() * 3 + 2 + 's'
           }">
      </div>
    </div>

    <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300 relative z-10 p-10 animate-fadein">
      
      <div class="flex flex-col items-center text-center mb-8">
        <div class="w-16 h-16 bg-slate-950 dark:bg-white rounded-3xl flex items-center justify-center mb-6 shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <i class="pi pi-lock text-white dark:text-slate-900 text-2xl"></i>
        </div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
          Criar Nova Senha
        </h1>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400 mt-3">
          A sua nova senha deve ser diferente das senhas utilizadas anteriormente.
        </p>
      </div>

      <form @submit.prevent="submeterNovaSenha" class="flex flex-col gap-5">
        
        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">Nova Senha</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-key text-slate-400"></i>
            <Password 
              v-model="novaSenha" 
              :feedback="true"
              promptLabel="Digite uma senha"
              weakLabel="Fraca"
              mediumLabel="Média"
              strongLabel="Forte"
              toggleMask
              maxlength="70"
              class="w-full"
              inputClass="custom-input"
              placeholder="Digite a nova senha" 
            />
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">Confirmar Senha</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-check-circle text-slate-400"></i>
            <Password 
              v-model="confirmarSenha" 
              :feedback="false"
              toggleMask
              class="w-full"
              inputClass="custom-input"
              placeholder="Repita a nova senha" 
              @keyup.enter="submeterNovaSenha"
            />
          </span>
          <small v-if="senhasNaoCoincidem" class="text-red-500 font-semibold mt-1 flex items-center gap-1">
            <i class="pi pi-exclamation-circle text-xs"></i> As senhas não coincidem.
          </small>
        </div>

        <button 
          type="submit" 
          :disabled="loading || senhasNaoCoincidem || !novaSenha || !confirmarSenha"
          class="mt-4 w-full h-14 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-xl shadow-slate-900/10"
        >
          <i v-if="loading" class="pi pi-spinner pi-spin"></i>
          <span v-else>Redefinir Senha</span>
          <i v-if="!loading" class="pi pi-arrow-right text-xs opacity-70"></i>
        </button>
      </form>

      <div class="mt-8 text-center">
        <a @click.prevent="router.push('/login')" href="#" class="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors duration-200 flex items-center justify-center gap-2">
          <i class="pi pi-arrow-left text-xs"></i>
          Voltar para o Login
        </a>
      </div>

    </div>
  </div>
</template>

<script setup>
// 1. Corrigido o erro de digitação do 'vue'
import { ref, computed, onMounted } from 'vue'; 
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import Password from 'primevue/password';
import api from '../services/api'; 

const route = useRoute();
const router = useRouter();
const toast = useToast();

const novaSenha = ref('');
const confirmarSenha = ref('');
const loading = ref(false);
const tokenUrl = ref('');

// Configuração do Dark Mode Automático (Igual ao Login)
onMounted(() => {
  const savedTheme = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'true' || (savedTheme === null && prefersDark);
  document.documentElement.classList.toggle('dark', isDark);

  // Captura o token da URL (?token=...)
  if (route.query.token) {
    tokenUrl.value = route.query.token;
  } else {
    toast.add({ severity: 'error', summary: 'Link Inválido', detail: 'Nenhum token de recuperação encontrado na URL.', life: 5000 });
  }
});

// Computed property para travar o botão se as senhas forem diferentes
const senhasNaoCoincidem = computed(() => {
  return novaSenha.value && confirmarSenha.value && novaSenha.value !== confirmarSenha.value;
});

async function submeterNovaSenha() {
  if (!tokenUrl.value) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'O link de recuperação está incompleto ou é inválido.', life: 5000 });
    return;
  }

  if (novaSenha.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Senha muito curta', detail: 'A senha deve ter pelo menos 6 caracteres.', life: 4000 });
    return;
  }

  loading.value = true;

  try {
    const response = await api.post('/reset-password', {
      token: tokenUrl.value,
      nova_senha: novaSenha.value
    });

    toast.add({ severity: 'success', summary: 'Sucesso!', detail: 'A sua senha foi redefinida. Pode fazer login agora.', life: 5000 });
    
    setTimeout(() => {
      router.push('/login');
    }, 2000);

  } catch (error) {
    if (error.response && error.response.status === 429) {
      toast.add({
        severity: 'warn', 
        summary: 'Ação Bloqueada', 
        detail: 'Demasiadas tentativas. Por favor, aguarde 1 minuto.', 
        life: 5000 
      });
      return;
    }

    if (error.response && error.response.data && error.response.data.detail) {
      toast.add({ severity: 'error', summary: 'Erro', detail: error.response.data.detail, life: 5000 });
    } else {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Ocorreu um problema ao redefinir a senha. O link pode ter expirado.', life: 5000 });
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.animate-twinkle {
  animation-name: twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

/* Animação de entrada suave */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadein {
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Estilização profunda dos inputs do PrimeVue para combinarem com o teu design */
:deep(.custom-input) {
  width: 100% !important;
  border-radius: 1rem !important;
  padding: 0.9rem 1rem 0.9rem 2.8rem !important;
  border: 1px solid #e2e8f0 !important;
  background-color: #f8fafc !important;
  color: #0f172a !important;
  font-weight: 500 !important;
  font-size: 0.95rem !important;
  transition: all 0.3s ease !important;
  outline: none !important;
}

.dark :deep(.custom-input) {
  border-color: #334155 !important;
  background-color: #0f172a !important;
  color: #f8fafc !important;
}

:deep(.custom-input:focus) {
  border-color: #94a3b8 !important; 
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.1) !important;
}

.dark :deep(.custom-input:focus) {
  border-color: #475569 !important; 
  background-color: #1e293b !important;
  box-shadow: 0 0 0 4px rgba(71, 85, 105, 0.2) !important;
}

.p-input-icon-left > i {
  z-index: 10;
  margin-top: -0.5rem;
}
</style>
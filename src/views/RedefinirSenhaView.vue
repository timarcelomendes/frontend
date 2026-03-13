<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

import Button from 'primevue/button';
import Toast from 'primevue/toast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const token = route.query.token;
const novaSenha = ref('');
const loading = ref(false);

const salvarNovaSenha = async () => {
  if (!novaSenha.value || novaSenha.value.length < 6) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'A senha deve ter pelo menos 6 caracteres.', life: 3000 });
    return;
  }

  loading.value = true;
  try {
    await api.post('/reset-password', { 
      token: token, 
      nova_senha: novaSenha.value 
    });
    
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Senha alterada com sucesso! Faça login.', life: 4000 });
    
    setTimeout(() => {
      router.push('/login');
    }, 2000);

  } catch (error) {
    const msg = error.response?.data?.detail || 'Ocorreu um erro ao alterar a senha. O link pode ter expirado.';
    toast.add({ severity: 'error', summary: 'Erro', detail: msg, life: 5000 });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
    <Toast />
    
    <div class="relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-500">
      
      <div v-if="loading" class="absolute top-0 left-0 w-full h-1 bg-orange-500/20 overflow-hidden rounded-t-[2rem]">
        <div class="h-full bg-orange-500 animate-progress"></div>
      </div>

      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-3 mb-8">
          <img src="/nps.png" alt="Ícone NPS" class="h-10 w-auto drop-shadow-sm" />
          <div class="flex flex-col justify-center text-left">
            <span class="text-3xl font-black tracking-tighter uppercase italic leading-none text-slate-900 dark:text-white">
              NPS PRO
            </span>
            <span class="text-[10px] font-black tracking-[0.2em] uppercase text-orange-500 mt-1">
              INTELLIGENCE
            </span>
          </div>
        </div>

        <div class="w-16 h-16 bg-orange-50 dark:bg-orange-500/5 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
          <i class="pi pi-key text-2xl"></i>
        </div>
        
        <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Nova Senha</h2>
        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Crie uma credencial forte e segura para a sua conta.
        </p>
      </div>
      
      <form @submit.prevent="salvarNovaSenha" class="space-y-6">
        <div class="space-y-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nova Palavra-Passe</label>
          
          <div class="relative flex items-center group">
            <i class="pi pi-lock absolute left-4 z-20 text-slate-400 group-focus-within:text-orange-500 transition-colors"></i>
            <input 
              v-model="novaSenha" 
              type="password" 
              placeholder="••••••••" 
              class="custom-auth-input" 
            />
          </div>
        </div>

        <Button 
          type="submit" 
          :loading="loading"
          class="w-full p-4 !bg-slate-900 dark:!bg-orange-500 hover:scale-[1.02] active:scale-[0.98] border-none !text-white !rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <template #loadingIcon><i class="pi pi-spin pi-spinner mr-2"></i></template>
          <span>Confirmar Alteração</span>
        </Button>
      </form>

      <div class="mt-8 text-center border-t border-slate-100 dark:border-slate-800/60 pt-6">
        <button @click="router.push('/login')" class="group text-sm font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center gap-2 mx-auto">
          <i class="pi pi-arrow-left group-hover:-translate-x-1 transition-transform"></i> Voltar ao Login
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-progress {
  animation: progress 1.5s infinite linear;
}

/* --- INPUT PADRONIZADO (Anti-Saga Blue) --- */
.custom-auth-input {
  border-radius: 1.5rem !important; 
  padding-left: 3.2rem !important; 
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
  padding-right: 1rem !important;
  width: 100% !important;
  border: 1.5px solid #e2e8f0 !important;
  background-color: #f8fafc !important;
  color: #1e293b !important;
  font-weight: 500 !important;
  outline: none !important;
  transition: all 0.3s ease !important;
}

.custom-auth-input:focus {
  border-color: #f97316 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important;
}

:global(.dark) .custom-auth-input {
  background-color: #1e293b !important;
  border-color: #334155 !important;
  color: #f8fafc !important;
}

:global(.dark) .custom-auth-input:focus {
  background-color: #0f172a !important;
  border-color: #f97316 !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2) !important;
}

:global(.dark) .custom-auth-input::placeholder {
  color: #64748b !important;
}
</style>
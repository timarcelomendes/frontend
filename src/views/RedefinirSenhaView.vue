<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

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
  <div class="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
    <Toast />
    
    <div class="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadein">
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <i class="pi pi-lock text-3xl"></i>
        </div>
        <h2 class="text-3xl font-black text-slate-900 dark:text-white mb-2 italic tracking-tight">Nova Senha</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400">Crie uma credencial forte para a sua conta.</p>
      </div>
      
      <form @submit.prevent="salvarNovaSenha" class="space-y-6">
        <div class="space-y-2">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nova Palavra-Passe</label>
          <div class="relative">
            <i class="pi pi-key absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              v-model="novaSenha" 
              type="password" 
              placeholder="••••••••" 
              class="custom-input" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full p-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
        >
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span>{{ loading ? 'A processar...' : 'Confirmar Alteração' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { 
  animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); 
}

@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(20px); } 
  to { opacity: 1; transform: translateY(0); } 
}

/* Padronização do Input com o resto do sistema */
.custom-input {
  @apply w-full py-4 pr-4 pl-12 bg-slate-50 dark:bg-slate-800/50 
         border border-slate-200 dark:border-slate-700 
         rounded-2xl outline-none transition-all duration-300
         text-slate-800 dark:text-white font-medium
         focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10;
}

.custom-input::placeholder {
  @apply text-slate-300 dark:text-slate-600;
}
</style>
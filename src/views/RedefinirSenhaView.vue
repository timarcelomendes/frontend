<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api'; // Ajuste o caminho se a sua pasta api for noutro local

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
    // Vamos enviar o token e a nova senha para o backend
    await api.post('/reset-password', { 
      token: token, 
      nova_senha: novaSenha.value 
    });
    
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Senha alterada com sucesso! Faça login.', life: 4000 });
    
    // Aguarda um pouquinho e manda o utilizador de volta para o login
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
  <div class="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
    <Toast />
    
    <div class="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="pi pi-lock text-2xl"></i>
        </div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white mb-2">Criar Nova Senha</h2>
        <p class="text-sm text-slate-500">Insira a sua nova palavra-passe abaixo.</p>
      </div>
      
      <form @submit.prevent="salvarNovaSenha" class="space-y-5">
        <div class="space-y-1">
          <label class="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nova Senha</label>
          <input 
            v-model="novaSenha" 
            type="password" 
            placeholder="••••••••" 
            class="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-orange-500 transition-colors" 
          />
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full p-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all flex justify-center items-center gap-2"
        >
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <span>{{ loading ? 'A guardar...' : 'Salvar Senha' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
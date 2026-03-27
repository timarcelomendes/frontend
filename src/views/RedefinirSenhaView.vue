<template>
  <div class="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-white dark:bg-slate-900 font-sans overflow-hidden">
    <Toast />
    
    <div class="flex flex-col justify-center items-center px-6 py-12 md:px-20 bg-slate-50/50 dark:bg-slate-950/20 relative">
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-500 md:hidden"></div>
      
      <div class="w-full max-w-sm animate-fadein">
        <div class="flex flex-col items-center mb-10 text-center">
          <div class="relative flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl border border-slate-700/50">
            <i class="pi pi-lock-open text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-sky-400 text-3xl"></i>
          </div>
          <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-2">Nova Senha</h1>
          <p class="text-[11px] font-black uppercase tracking-[0.2em] text-sky-500 mt-1">
            NPS Intelligence
          </p>
        </div>

        <form @submit.prevent="salvarNovaSenha" class="space-y-6">
          <div class="space-y-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Nova Senha de Acesso</label>
            <span class="p-input-icon-left w-full relative">
              <i class="pi pi-lock !text-slate-400 z-20" />
              <Password 
                v-model="novaSenha" 
                toggleMask 
                placeholder="No mínimo 6 caracteres" 
                class="w-full"
                inputClass="custom-input w-full"
                promptLabel="Escolha uma senha forte"
                weakLabel="Fraca" 
                mediumLabel="Média" 
                strongLabel="Forte"
                required 
              />
            </span>
          </div>

          <Button type="submit" :loading="loading" class="w-full !bg-gradient-to-r !from-indigo-500 !to-indigo-600 !text-white !py-4 !rounded-2xl !font-bold !text-[12px] uppercase tracking-[0.2em] !shadow-lg !shadow-indigo-500/20 !border-none hover:scale-[1.02] transition-transform">
            <span>{{ loading ? 'Salvando...' : 'Confirmar Nova Senha' }}</span>
          </Button>
        </form>

        <div class="mt-8 text-center">
          <button @click="router.push('/login')" type="button" class="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-indigo-500 transition-colors bg-transparent border-none cursor-pointer">
            Cancelar e voltar ao Login
          </button>
        </div>
      </div>
    </div>

    <div class="hidden md:flex flex-col justify-between p-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white relative overflow-hidden group">
      <div class="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000 scale-125 group-hover:scale-110 transition-transform duration-1000">
        <svg width="100%" h="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.1"/></pattern></defs><rect width="100" h="100" fill="url(#g)" /></svg>
      </div>
      <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-sky-500/20 to-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

       <div class="z-10 mt-10">
         <div class="flex items-center gap-4 mb-8">
            <img src="/nps.png" alt="Logo NPS Intelligence" class="w-14 h-14 object-contain drop-shadow-[0_10px_15px_rgba(56,189,248,0.2)]" />
            <span class="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
              NPS <br><span class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400">Intelligence</span>
            </span>
         </div>
         <h2 class="text-5xl font-extrabold leading-[1.05] tracking-tighter max-w-md">Controle o seu <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400 font-black italic">acesso.</span></h2>
         <div class="w-20 h-1.5 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full mt-6 mb-8"></div>
         <p class="text-lg text-slate-300 leading-relaxed font-normal max-w-sm">Mantenha a sua conta protegida para garantir a integridade e confidencialidade dos dados dos seus clientes.</p>
       </div>
       <div class="absolute bottom-10 right-10 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] z-10">NPS Intelligence © 2026</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

import Password from 'primevue/password';
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
    
    toast.add({ 
      severity: 'success', 
      summary: 'Senha Atualizada', 
      detail: 'Acesso recuperado! Enviámos um e-mail de segurança a confirmar a alteração.', 
      life: 6000 
    });
    
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

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.p-input-icon-left {
  display: flex !important;
  align-items: center !important;
  position: relative !important;
  width: 100%;
}

.p-input-icon-left > i {
  position: absolute !important;
  left: 1.1rem !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  z-index: 30 !important;
  pointer-events: none;
  font-size: 1rem !important;
}

:deep(.custom-input),
:deep(.p-password input) {
  width: 100% !important;
  border-radius: 1.2rem !important;
  padding: 0.9rem 1rem 0.9rem 3.2rem !important;
  border: 1.5px solid #e2e8f0 !important;
  background-color: #f8fafc !important;
  color: #1e293b !important;
  font-weight: 500 !important;
  font-size: 0.95rem !important;
  transition: all 0.3s ease !important;
  outline: none !important;
}

:deep(.custom-input:focus),
:deep(.p-password input:focus) {
  border-color: #6366f1 !important; 
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
}

:deep(.p-password) { width: 100% !important; }
:deep(.p-password-reveal-icon) { right: 1.2rem !important; color: #94a3b8 !important; }

:global(.dark) :deep(.custom-input),
:global(.dark) :deep(.p-password input) {
  background-color: #1e293b !important;
  border-color: #334155 !important;
  color: #f8fafc !important;
}
:global(.dark) :deep(.custom-input:focus),
:global(.dark) :deep(.p-password input:focus) {
  background-color: #0f172a !important;
  border-color: #6366f1 !important;
}
</style>
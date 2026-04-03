<template>
  <div class="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-white dark:bg-slate-900 font-sans overflow-hidden">
    
    <div class="flex flex-col justify-center items-center px-6 py-12 md:px-20 bg-slate-50/50 dark:bg-slate-950/20 relative">
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-rose-500 md:hidden"></div>
      
      <div class="w-full max-w-sm animate-fadein">
        <div class="flex flex-col items-center mb-10 text-center">
          <div class="relative flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl border border-slate-700/50">
            <i class="pi pi-key text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-rose-400 text-3xl"></i>
          </div>
          <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-2">Recuperar Senha</h1>
          <p class="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400 mt-1">
            NPS Intelligence
          </p>
        </div>

        <transition name="fade-slide" mode="out-in">
          <div v-if="!enviado" key="form">
            <form @submit.prevent="recuperarSenha" class="space-y-6">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">E-mail Corporativo</label>
                <span class="p-input-icon-left w-full relative">
                  <i class="pi pi-envelope !text-slate-400 z-20" />
                  <InputText v-model="email" type="email" placeholder="nome@empresa.com" class="custom-input w-full" required />
                </span>
              </div>

              <Button type="submit" :loading="loading" class="w-full !bg-gradient-to-r !from-sky-500 !to-sky-600 !text-white !py-4 !rounded-2xl !font-bold !text-[12px] uppercase tracking-[0.2em] !shadow-lg !shadow-sky-500/20 !border-none hover:scale-[1.02] transition-transform">
                <span>{{ loading ? 'Enviando...' : 'Enviar Link de Recuperação' }}</span>
              </Button>
            </form>
          </div>

          <div v-else key="sucesso" class="text-center space-y-6">
            <div class="p-5 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-2xl shadow-inner">
              <i class="pi pi-check-circle text-green-500 text-5xl mb-4"></i>
              <p class="text-green-700 dark:text-green-400 font-extrabold text-lg">E-mail enviado com sucesso!</p>
              <p class="text-sm text-slate-500 mt-2 font-medium">Verifique a sua caixa de entrada e pasta de spam.</p>
            </div>
          </div>
        </transition>

        <div class="mt-8 text-center">
          <button @click="router.push('/login')" type="button" class="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-sky-500 transition-colors flex items-center justify-center gap-2 mx-auto bg-transparent border-none cursor-pointer">
            <i class="pi pi-arrow-left"></i> Voltar ao Login
          </button>
        </div>
      </div>
    </div>

    <div class="hidden md:flex flex-col justify-between p-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white relative overflow-hidden group">
      <div class="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000 scale-125 group-hover:scale-110 transition-transform duration-1000">
        <svg width="100%" h="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.1"/></pattern></defs><rect width="100" h="100" fill="url(#g)" /></svg>
      </div>
      <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-orange-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

       <div class="z-10 mt-10">
         <div class="flex items-center gap-4 mb-8">
            <img src="/nps.png" alt="Logo NPS Intelligence" class="w-14 h-14 object-contain drop-shadow-[0_10px_15px_rgba(249,115,22,0.2)]" />
            <span class="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
              NPS <br><span class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">Intelligence</span>
            </span>
         </div>
         <h2 class="text-5xl font-extrabold leading-[1.05] tracking-tighter max-w-md">A sua segurança em <br><span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 font-black italic">primeiro lugar.</span></h2>
         <div class="w-20 h-1.5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full mt-6 mb-8"></div>
         <p class="text-lg text-slate-300 leading-relaxed font-normal max-w-sm">Recupere o seu acesso de forma rápida e segura para continuar a transformar feedbacks em estratégias de crescimento.</p>
       </div>
       <div class="absolute bottom-10 right-10 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] z-10">NPS Intelligence © 2026</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const router = useRouter();
const toast = useToast();
const email = ref('');
const loading = ref(false);
const enviado = ref(false);

const recuperarSenha = async () => {
  if (!email.value) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Por favor, insira o seu e-mail.', life: 3000 });
    return;
  }

  loading.value = true;
  try {
    await api.post('/esqueci-senha', { email: email.value });
    enviado.value = true;
    toast.add({ severity: 'success', summary: 'E-mail enviado', detail: 'Verifique a sua caixa de entrada.', life: 5000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível processar o pedido. Verifique o e-mail inserido.', life: 5000 });
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.4s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

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

:deep(.custom-input) {
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

:deep(.custom-input:focus) {
  border-color: #f97316 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important;
}

:global(.dark) :deep(.custom-input) {
  background-color: #1e293b !important;
  border-color: #334155 !important;
  color: #f8fafc !important;
}
:global(.dark) :deep(.custom-input:focus) {
  background-color: #0f172a !important;
  border-color: #f97316 !important;
}
</style>
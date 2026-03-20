<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

import Button from 'primevue/button';
import Toast from 'primevue/toast';

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

<template>
  <div class="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
    <Toast />
    
    <div :class="['relative w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all duration-500', 
                 loading ? 'opacity-80 scale-[0.98]' : 'scale-100']">
      
      <div v-if="loading" class="absolute top-0 left-0 w-full h-1 bg-orange-500/20 overflow-hidden rounded-t-[2rem]">
        <div class="h-full bg-orange-500 animate-progress"></div>
      </div>

      <transition name="fade-slide" mode="out-in">
        <div v-if="!enviado" key="form">
          <div class="text-center mb-8">
            
            <div class="flex items-center justify-center gap-3 mb-8">
              <img src="/nps.png" alt="Ícone NPS" class="h-10 w-auto drop-shadow-sm" />
              <div class="flex flex-col justify-center text-left">
                <span class="text-3xl font-black tracking-tighter uppercase italic leading-none text-slate-900 dark:text-white">
                  NPS
                </span>
                <span class="text-[10px] font-black tracking-[0.2em] uppercase text-orange-500 mt-1">
                  INTELLIGENCE
                </span>
              </div>
            </div>
            <div class="w-16 h-16 bg-orange-50 dark:bg-orange-500/5 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 hover:rotate-0 transition-transform duration-300">
              <i class="pi pi-lock-open text-2xl"></i>
            </div>
            
            <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Esqueceu a senha?</h2>
            <p class="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Não se preocupe! Digite seu e-mail e enviaremos um link para criar uma nova.
            </p>
          </div>

          <form @submit.prevent="recuperarSenha" class="space-y-6">
            <div class="space-y-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                E-mail Corporativo
              </label>
              
              <div class="relative flex items-center group">
                <i class="pi pi-envelope absolute left-4 z-20 text-slate-400 group-focus-within:text-orange-500 transition-colors"></i>
                
                <input 
                  v-model="email" 
                  type="email" 
                  placeholder="nome@empresa.com" 
                  class="custom-email-input"
                />
              </div>
            </div>

            <Button 
              type="submit"
              :loading="loading" 
              class="w-full p-4 !bg-slate-900 dark:!bg-orange-500 hover:scale-[1.02] active:scale-[0.98] border-none !text-white !rounded-[1.5rem] font-bold shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <template #loadingIcon><i class="pi pi-spin pi-spinner mr-2"></i></template>
              <span>Enviar link de acesso</span>
            </Button>
          </form>
        </div>

        <div v-else key="success" class="text-center py-4">
          
          <div class="flex items-center justify-center gap-3 mb-8 opacity-40 grayscale">
            <img src="/nps.png" alt="Ícone NPS" class="h-8 w-auto" />
            <div class="flex flex-col justify-center text-left">
              <span class="text-xl font-black tracking-tighter uppercase italic leading-none text-slate-900 dark:text-white">
                NPS
              </span>
              <span class="text-[8px] font-black tracking-[0.2em] uppercase text-orange-500 mt-0.5">
                INTELLIGENCE
              </span>
            </div>
          </div>
          
          <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i class="pi pi-send text-3xl animate-bounce"></i>
          </div>
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">E-mail a caminho!</h2>
          <p class="text-slate-500 dark:text-slate-400 mb-8">
            Enviamos as instruções para <br><span class="font-bold text-slate-900 dark:text-slate-200">{{ email }}</span>
          </p>
          <Button label="Tentar outro e-mail" @click="enviado = false" class="p-button-text p-button-sm !text-slate-400 hover:!text-orange-500 transition-colors" />
        </div>
      </transition>

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

/* Animação da barra de progresso */
@keyframes progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-progress {
  animation: progress 1.5s infinite linear;
}

/* Transições suaves entre formulário e tela de sucesso */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s ease;
}
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* --- INPUT DE EMAIL CORRIGIDO (Anti-Saga Blue) --- */
.custom-email-input {
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

/* Modo Foco */
.custom-email-input:focus {
  border-color: #f97316 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important;
}

/* Modo Escuro Sincronizado */
:global(.dark) .custom-email-input {
  background-color: #1e293b !important;
  border-color: #334155 !important;
  color: #f8fafc !important;
}

:global(.dark) .custom-email-input:focus {
  background-color: #0f172a !important;
  border-color: #f97316 !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.2) !important;
}

:global(.dark) .custom-email-input::placeholder {
  color: #64748b !important;
}
</style>
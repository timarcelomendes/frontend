<template>
  <div class="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-white dark:bg-slate-900 font-sans overflow-hidden">
    <Toast />
    
    <div class="flex flex-col justify-center items-center px-6 py-12 md:px-20 bg-slate-50/50 dark:bg-slate-950/20 relative">
      <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-rose-500 md:hidden"></div>
      
      <div class="w-full max-w-sm animate-fadein">
        
        <div class="flex flex-col items-center mb-10 text-center">
          <div class="relative flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl border border-slate-700/50">
            <div class="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-indigo-500/10 opacity-70"></div>
            <i class="pi pi-sparkles text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-rose-400 text-3xl z-10"></i>
            <div class="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-800 dark:border-slate-900 animate-pulse z-20"></div>
          </div>
          
          <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter leading-none mb-2">
            {{ isLoginMode ? 'Acesse a plataforma' : 'Crie sua conta' }}
          </h1>
          <p class="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400 mt-1">
            NPS Intelligence
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
          
          <div v-if="!isLoginMode" class="flex flex-col gap-1.5 animate-fadein">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo</label>
            <span class="p-input-icon-left w-full relative">
              <i class="pi pi-user !text-slate-400 z-20" />
              <InputText v-model="registro.nome" type="text" placeholder="Seu nome" class="custom-input w-full" required />
            </span>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail Corporativo</label>
            <span class="p-input-icon-left w-full relative">
              <i class="pi pi-envelope !text-slate-400 z-20" />
              <InputText v-if="isLoginMode" v-model="credenciais.email" type="email" placeholder="nome@suaempresa.com" class="custom-input w-full" :class="{ 'p-invalid': temErro }" @input="temErro = false" required />
              <InputText v-else v-model="registro.email" type="email" placeholder="nome@suaempresa.com" class="custom-input w-full" required />
            </span>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center ml-1">
              <label class="text-[10px] font-black uppercase text-slate-500">Palavra-passe</label>
              <router-link v-if="isLoginMode" to="/forgot-password" class="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-orange-500 transition-colors">
                Esqueci a minha senha
              </router-link>
            </div>
            <span class="p-input-icon-left w-full relative">
              <i class="pi pi-lock !text-slate-400 z-20" />
              <Password v-if="isLoginMode" v-model="credenciais.password" :feedback="false" toggleMask placeholder="••••••••" inputClass="custom-input w-full" class="w-full" :class="{ 'p-invalid': temErro }" @input="temErro = false" required />
              <Password v-else v-model="registro.password" :feedback="true" toggleMask placeholder="••••••••" inputClass="custom-input w-full" class="w-full" required />
            </span>
          </div>

          <div v-if="isLoginMode" class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <Checkbox v-model="lembrarDeMim" :binary="true" inputId="rememberMe" />
              <label for="rememberMe" class="text-[11px] font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">Lembrar de mim</label>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-4">
            <Button type="submit" :loading="loading" class="w-full !bg-gradient-to-r !from-sky-500 !via-sky-600 !to-sky-500 !text-white !py-4 !rounded-2xl !font-bold !text-[12px] uppercase tracking-[0.25em] !shadow-lg !shadow-sky-500/20 !border-none hover:scale-[1.02] transition-transform duration-300">
              <span v-if="!loading">{{ isLoginMode ? 'Entrar Agora' : 'Solicitar Acesso' }}</span>
              <span v-else>A Autenticar...</span>
            </Button>
            
            <button type="button" @click="isLoginMode = !isLoginMode" class="text-[11px] font-bold text-slate-500 hover:text-sky-500 transition-colors bg-transparent border-none cursor-pointer">
              {{ isLoginMode ? 'Ainda não tem acesso? Criar conta.' : 'Já possui uma conta? Fazer login.' }}
            </button>
          </div>
        </form>

        <div class="mt-12 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 select-none">
          © 2026 NPS Intelligence.
        </div>
        
      </div>
    </div>

    <div class="hidden md:flex flex-col justify-between p-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white relative overflow-hidden group">
      
      <div class="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-1000 scale-125 group-hover:scale-110 transition-transform duration-1000">
        <svg width="100%" h="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.1"/></pattern></defs>
          <rect width="100" h="100" fill="url(#grid)" />
          <circle cx="20" cy="30" r="1" fill="currentColor"/><circle cx="50" cy="15" r="1" fill="currentColor"/><circle cx="80" cy="40" r="1" fill="currentColor"/><circle cx="35" cy="65" r="1" fill="currentColor"/><circle cx="70" cy="85" r="1" fill="currentColor"/>
          <line x1="20" y1="30" x2="50" y2="15" stroke="currentColor" stroke-width="0.1"/><line x1="50" y1="15" x2="80" y2="40" stroke="currentColor" stroke-width="0.1"/><line x1="80" y1="40" x2="70" y2="85" stroke="currentColor" stroke-width="0.1"/><line x1="20" y1="30" x2="35" y2="65" stroke="currentColor" stroke-width="0.1"/>
        </svg>
      </div>
      
      <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-orange-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>

      <div class="z-10 mt-10">
         <div class="flex items-center gap-4 mb-8">
            <img src="/nps.png" alt="Logo NPS Intelligence" class="w-14 h-14 object-contain drop-shadow-[0_10px_15px_rgba(249,115,22,0.2)]" />
            <span class="text-4xl font-black uppercase tracking-tighter italic text-white leading-none">
              NPS <br><span class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">Intelligence</span>
            </span>
         </div>
         
         <h2 class="text-5xl font-extrabold leading-[1.05] tracking-tighter max-w-md">
           Transforme feedbacks em <br>
           <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 font-black italic">inteligência ativa.</span>
         </h2>
         <div class="w-20 h-1.5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full mt-6 mb-8"></div>
         <p class="text-lg text-slate-300 leading-relaxed font-normal max-w-sm">Aceda à plataforma para processar, analisar e atuar proativamente sobre a experiência dos seus clientes em tempo real.</p>
      </div>

      <div class="grid grid-cols-3 gap-6 pt-8 border-t border-slate-700/50 z-10 animate-fadein delay-200">
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Monitoramento</span>
          <span class="text-2xl font-extrabold text-white tracking-tighter italic">Real-time</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-black uppercase text-rose-400 tracking-wider">Visão Cliente</span>
          <span class="text-2xl font-extrabold text-white tracking-tighter italic">360º</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[10px] font-black uppercase text-orange-400 tracking-wider">Tecnologia CS</span>
          <span class="text-2xl font-extrabold text-white tracking-tighter italic">GAUGE AI</span>
        </div>
      </div>

      <div class="absolute bottom-10 right-10 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] z-10">NPS Intelligence © 2026</div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'; 
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';

import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Toast from 'primevue/toast';

const router = useRouter();
const toast = useToast();

const isLoginMode = ref(true); 
const loading = ref(false);
const temErro = ref(false);

const credenciais = ref({ email: '', password: '' });
const registro = ref({ nome: '', email: '', password: '' });
const lembrarDeMim = ref(false);

onMounted(() => {
  const emailSalvo = localStorage.getItem('nps_remember_email');
  if (emailSalvo) {
    credenciais.value = { ...credenciais.value, email: emailSalvo };
    lembrarDeMim.value = true;
  }
});

const fazerLogin = async () => {
  if (!credenciais.value.email || !credenciais.value.password) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha o e-mail e a palavra-passe.', life: 3000 });
    return;
  }

  loading.value = true;
  temErro.value = false;
  
  try {
    const response = await api.post('/login', {
      email: credenciais.value.email,
      password: credenciais.value.password,
      remember: lembrarDeMim.value
    }); 

    const token = response.data.access_token;

    if (token) {
      const emailSalvo = credenciais.value.email;
      localStorage.clear(); 
      localStorage.setItem('token', token);
      localStorage.setItem('usuario_id', response.data.usuario_id);
      localStorage.setItem('usuario_nome', response.data.nome);
      localStorage.setItem('usuario_tipo', response.data.tipo);
      localStorage.setItem('usuario_cargo', response.data.cargo || 'Analista');

      if (lembrarDeMim.value) {
        localStorage.setItem('nps_remember_email', emailSalvo);
      }

      toast.add({ severity: 'success', summary: '🚀 Conexão Estabelecida', detail: `Bem-vindo, ${response.data.nome.split(' ')[0]}! Sincronizando dados...`, life: 2500 });
      
      setTimeout(() => { window.location.href = '/'; }, 700); 
    } else {
      throw new Error("O servidor não devolveu um token de acesso.");
    }

  } catch (error) {
    temErro.value = true;
    const msgErro = error.response?.data?.detail || 'Não foi possível conectar ao servidor.';
    const erroNormalizado = msgErro.toLowerCase();
    
    if (erroNormalizado.includes('inativa') || erroNormalizado.includes('aprovação')) {
      toast.add({ severity: 'warn', summary: 'Acesso Pendente', detail: msgErro, life: 6000 });
    } else {
      toast.add({ severity: 'error', summary: 'Erro de Autenticação', detail: msgErro, life: 4000 });
    }
  } finally {
    loading.value = false;
  }
};

const fazerRegistro = async () => {
  if (!registro.value.nome || !registro.value.email || !registro.value.password) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha todos os campos para solicitar o acesso.', life: 3000 });
    return;
  }

  loading.value = true;
  try {
    const response = await api.post('/register', registro.value); 
    toast.add({ severity: 'success', summary: 'Sucesso!', detail: response.data.mensagem, life: 5000 });
    registro.value = { nome: '', email: '', password: '' };
    isLoginMode.value = true; 
  } catch (error) {
    const msgErro = error.response?.data?.detail || 'Erro ao solicitar acesso. Tente novamente.';
    toast.add({ severity: 'error', summary: 'Erro no Registo', detail: msgErro, life: 5000 });
  } finally {
    loading.value = false;
  }
};

const handleSubmit = () => {
  if (isLoginMode.value) { fazerLogin(); } else { fazerRegistro(); }
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
  border-color: #f97316 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1) !important;
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
  border-color: #f97316 !important;
}

:deep(.p-invalid) .custom-input,
:deep(.p-invalid) input {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1) !important;
}
</style>
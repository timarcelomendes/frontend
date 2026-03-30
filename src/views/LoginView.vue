<template>
  <div class="grid grid-cols-1 md:grid-cols-2 min-h-screen bg-white dark:bg-slate-950 font-sans overflow-hidden">
    <Toast />
    
    <div class="hidden md:flex flex-col justify-between p-16 lg:p-24 bg-slate-900 text-white relative overflow-hidden group">
      
      <div class="absolute inset-0 opacity-[0.03] transition-opacity duration-1000 scale-125 group-hover:scale-110">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.1"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
      
      <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-orange-500/10 rounded-full blur-[120px] -mr-32 -mt-32"></div>

      <div class="z-10 mt-10">
         <div class="flex items-center gap-5 mb-12 animate-fadein">
            <img src="/nps.png" alt="Logo" class="w-16 h-16 object-contain drop-shadow-[0_10px_15px_rgba(249,115,22,0.3)] transition-transform duration-500 group-hover:scale-110" />
            <div class="h-10 w-px bg-slate-700"></div>
            <span class="text-4xl font-black uppercase tracking-tighter italic text-white leading-[0.8]">
              NPS <br><span class="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500">Intelligence</span>
            </span>
         </div>
         
         <h2 class="text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter max-w-md mb-8 animate-fadein">
           Transforme feedbacks em <br>
           <span class="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400 italic">inteligência ativa.</span>
         </h2>

         <div class="w-20 h-1.5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-full mb-10 animate-fadein"></div>
         
         <p class="text-lg text-slate-400 leading-relaxed font-normal max-w-sm animate-fadein">
           Processe, analise e atue proativamente sobre a experiência dos seus clientes em tempo real.
         </p>
      </div>

      <div class="grid grid-cols-3 gap-8 pt-10 border-t border-slate-800/60 z-10 animate-fadein">
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Monitoramento</span>
          <span class="text-2xl font-black text-white italic tracking-tighter">Real-time</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-black uppercase text-rose-400 tracking-[0.2em]">Visão Cliente</span>
          <span class="text-2xl font-black text-white italic tracking-tighter">360º</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-black uppercase text-orange-400 tracking-[0.2em]">Tecnologia</span>
          <span class="text-2xl font-black text-white italic tracking-tighter">GAUGE AI</span>
        </div>
      </div>

      <div class="absolute bottom-10 right-10 text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] z-10 italic">
        © 2026 NPS Intelligence
      </div>
    </div>

    <div class="flex flex-col justify-center items-center px-8 py-12 md:px-20 bg-slate-50/50 dark:bg-slate-950 relative">
      
      <div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-orange-500 to-rose-500 md:hidden"></div>
      
      <div class="w-full max-w-sm animate-fadein">
        
        <div class="flex flex-col items-center md:items-start mb-12 text-center md:text-left">
          <img src="/nps.png" class="w-16 h-16 mb-6 md:hidden drop-shadow-lg" />
          <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic leading-tight">
            {{ isLoginMode ? 'Bem-vindo de volta' : 'Solicitar Acesso' }}<span class="text-orange-500">.</span>
          </h1>
          <div class="h-1 w-10 bg-orange-500 mt-3 mb-2 rounded-full hidden md:block"></div>
          <p class="text-sm text-slate-400 font-medium">
            {{ isLoginMode ? 'Introduza os seus dados para aceder ao painel.' : 'Preencha os dados abaixo para criar a sua conta.' }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="flex flex-col gap-6">
          
          <div v-if="!isLoginMode" class="flex flex-col gap-2 animate-fadein">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
            <div class="relative flex items-center group">
              <i class="pi pi-user absolute left-4 text-slate-400 z-10 group-focus-within:text-orange-500 transition-colors" />
              <InputText v-model="registro.nome" type="text" placeholder="Seu nome" class="custom-input w-full" required />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail Corporativo</label>
            <div class="relative flex items-center group">
              <i class="pi pi-envelope absolute left-4 text-slate-400 z-10 group-focus-within:text-orange-500 transition-colors" />
              <InputText v-if="isLoginMode" v-model="credenciais.email" type="email" placeholder="nome@empresa.com" class="custom-input w-full" :class="{ 'p-invalid': temErro }" required />
              <InputText v-else v-model="registro.email" type="email" placeholder="nome@empresa.com" class="custom-input w-full" required />
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-center ml-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Palavra-passe</label>
              <router-link v-if="isLoginMode" to="/forgot-password" class="text-[10px] font-black text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest">
                Esqueceu a senha?
              </router-link>
            </div>
            <div class="relative flex items-center group">
              <i class="pi pi-lock absolute left-4 text-slate-400 z-20 group-focus-within:text-orange-500 transition-colors" />
              <Password v-if="isLoginMode" v-model="credenciais.password" :feedback="false" toggleMask placeholder="••••••••" inputClass="custom-input w-full !pl-12" class="w-full" :class="{ 'p-invalid': temErro }" required />
              <Password v-else v-model="registro.password" :feedback="true" toggleMask placeholder="••••••••" inputClass="custom-input w-full !pl-12" class="w-full" required />
            </div>
          </div>

          <div v-if="isLoginMode" class="flex items-center gap-3 px-1">
            <Checkbox v-model="lembrarDeMim" :binary="true" inputId="rememberMe" />
            <label for="rememberMe" class="text-[11px] font-bold text-slate-500 uppercase cursor-pointer select-none">Lembrar acesso</label>
          </div>

          <div class="mt-4 flex flex-col gap-6">
            <Button 
              type="submit" 
              :loading="loading" 
              class="w-full !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 !py-4.5 !rounded-2xl !font-black !text-[11px] uppercase tracking-[0.2em] !shadow-2xl !border-none hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <span v-if="!loading">{{ isLoginMode ? 'Entrar na Plataforma' : 'Solicitar Registro' }}</span>
              <span v-else>A processar...</span>
            </Button>
            
            <button type="button" @click="isLoginMode = !isLoginMode" class="text-[11px] font-black text-slate-400 hover:text-orange-500 uppercase tracking-[0.1em] bg-transparent border-none cursor-pointer transition-colors text-center">
              {{ isLoginMode ? 'Não tem acesso? Criar conta' : 'Já possui conta? Fazer login' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

:deep(.custom-input) { 
  @apply bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-4 pl-12 rounded-xl outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all font-bold text-sm text-slate-800 dark:text-white placeholder:text-slate-300; 
}

/* Ajuste específico para o ícone de olho do Password do PrimeVue */
:deep(.p-password-reveal-icon) {
  @apply text-slate-400 hover:text-orange-500 transition-colors;
}

:deep(.p-checkbox .p-checkbox-box) {
  @apply border-2 border-slate-200 dark:border-slate-800 rounded-md w-5 h-5 transition-all;
}

:deep(.p-checkbox.p-checkbox-checked .p-checkbox-box) {
  @apply bg-orange-500 border-orange-500;
}
</style>

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
            
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token); // Garantir o nome correto do token
      localStorage.setItem('usuario_id', response.data.usuario_id);
      localStorage.setItem('usuario_nome', response.data.nome);
      localStorage.setItem('usuario_tipo', response.data.tipo);
      localStorage.setItem('usuario_cargo', response.data.cargo || 'Analista');
      localStorage.setItem('usuario_permissoes', JSON.stringify(response.data.permissoes));

      // Lógica inteligente do "Lembrar Acesso"
      if (lembrarDeMim.value) {
        localStorage.setItem('nps_remember_email', emailSalvo);
      } else {
        localStorage.removeItem('nps_remember_email'); // Se ele desmarcar, nós esquecemos
      }

      toast.add({ severity: 'success', summary: '✅ Conectado', detail: `Bem-vindo, ${response.data.nome.split(' ')[0]}! Sincronizando...`, life: 2500 });
      
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
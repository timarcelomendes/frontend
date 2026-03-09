<script setup>
import { ref } from 'vue';
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

const fazerLogin = async () => {
  if (!credenciais.value.email || !credenciais.value.password) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha o e-mail e a palavra-passe.', life: 3000 });
    return;
  }

  loading.value = true;
  temErro.value = false;
  try {
    const response = await api.post('/login', credenciais.value); 
    const token = response.data.access_token;

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario_id', response.data.usuario_id);
      localStorage.setItem('usuario_nome', response.data.nome);
      localStorage.setItem('usuario_cargo', response.data.cargo || 'Analista');
      localStorage.setItem('usuario_tipo', response.data.tipo); 
      
      toast.add({ severity: 'success', summary: 'Conectado!', detail: `Bem-vindo, ${response.data.nome}!`, life: 3000 });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  } catch (error) {
    temErro.value = true;
    const msgErro = error.response?.data?.detail || 'Verifique o e-mail e a palavra-passe.';
    toast.add({ severity: 'error', summary: 'Acesso Negado', detail: msgErro, life: 5000 });
  } finally {
    loading.value = false;
  }
};

// 1. A função de registo (para não dar erro)
const fazerRegistro = async () => {
  console.log("A tentar registar:", registro.value);
  toast.add({ severity: 'info', summary: 'Em breve', detail: 'A criação de conta será implementada em breve.', life: 3000 });
};

// 2. O controlador do formulário
const handleSubmit = () => {
  if (isLoginMode.value) {
    fazerLogin();
  } else {
    fazerRegistro();
  }
};
</script>

<template>
  <div class="flex min-h-screen bg-white dark:bg-slate-950 font-sans">
    <Toast />
    
    <div class="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center">
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      <div class="relative z-10 p-12 text-left max-w-lg">
        <h1 class="text-5xl font-black text-white leading-tight">
          NPS<span class="text-orange-500">PRO</span><br/>
          <span class="text-slate-400 font-light">Intelligence</span>
        </h1>
        <p class="mt-6 text-lg text-slate-300">
          Transforme feedbacks em estratégias de crescimento com nossa análise inteligente de satisfação de clientes.
        </p>
        <div class="mt-12 flex gap-4">
          <div class="flex flex-col">
            <span class="text-white font-bold text-2xl">98%</span>
            <span class="text-slate-500 text-xs uppercase tracking-widest">Precisão de Dados</span>
          </div>
          <div class="w-px h-10 bg-slate-700"></div>
          <div class="flex flex-col">
            <span class="text-white font-bold text-2xl">Real-time</span>
            <span class="text-slate-500 text-xs uppercase tracking-widest">Monitoramento</span>
          </div>
        </div>
      </div>

      <div class="absolute bottom-10 left-12 z-10 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A Product By</span>
        <img src="/logo-gauge.png" alt="Gauge Logo" class="h-4 w-auto object-contain" />
      </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-slate-50 dark:bg-slate-950">
      <div class="w-full max-w-md space-y-8 animate-fadein">
        
        <div class="text-center lg:text-left">
          <div class="lg:hidden mb-8 inline-flex items-center justify-center">
             <h1 class="text-3xl font-black text-slate-900 dark:text-white">NPS<span class="text-orange-500">PRO</span></h1>
          </div>
          <h2 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {{ isLoginMode ? 'Acesse a plataforma' : 'Crie sua conta grátis' }}
          </h2>
          <p class="mt-2 text-slate-500 dark:text-slate-400">
            {{ isLoginMode ? 'Bem-vindo de volta! Digite seus dados abaixo.' : 'Preencha os dados para solicitar acesso.' }}
          </p>
        </div>

        <div class="mt-8 bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-800">
            <form class="space-y-5" @submit.prevent="handleSubmit">
            
            <div v-if="!isLoginMode" class="space-y-1 animate-fadein">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Nome Completo</label>
                <InputText v-model="registro.nome" class="w-full custom-input" placeholder="Ex: Marcelo Mendes" />
            </div>

            <div class="space-y-1">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">E-mail Corporativo</label>
                <InputText v-if="isLoginMode" v-model="credenciais.email" type="email" class="w-full custom-input" :class="{ 'p-invalid': temErro }" @input="temErro = false" placeholder="nome@empresa.com" />
                <InputText v-else v-model="registro.email" type="email" class="w-full custom-input" placeholder="nome@empresa.com" />
            </div>

            <div class="space-y-1">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Palavra-passe</label>
                <Password v-if="isLoginMode" v-model="credenciais.password" :toggleMask="true" :feedback="false" placeholder="••••••••" inputClass="w-full custom-input" :class="{ 'p-invalid': temErro }" @input="temErro = false" />
                <Password v-else v-model="registro.password" :toggleMask="true" :feedback="true" placeholder="••••••••" inputClass="w-full custom-input" />
            </div>

            <div v-if="isLoginMode" class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                <Checkbox v-model="lembrarDeMim" :binary="true" />
                <span class="text-sm text-slate-600 dark:text-slate-400">Lembrar de mim</span>
                </div>
                <router-link to="/forgot-password" class="text-sm font-bold text-orange-500 hover:text-orange-600">
                Esqueci a minha senha
                </router-link>
            </div>

            <Button type="submit" :loading="loading" :label="isLoginMode ? 'Entrar Agora' : 'Solicitar Acesso'" class="w-full p-4 bg-orange-500 hover:bg-orange-600 border-none text-white rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0" />
            </form>
          <div class="mt-8 text-center">
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ isLoginMode ? 'Ainda não tem acesso?' : 'Já possui uma conta?' }}
              <button @click="isLoginMode = !isLoginMode" type="button" class="ml-1 font-bold text-orange-600 hover:underline">
                {{ isLoginMode ? 'Criar conta' : 'Fazer login' }}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fadein {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Substitui o @apply por CSS normal que qualquer navegador e editor entende */
:deep(.custom-input) {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 1rem;
  border-radius: 1rem;
  outline: none;
  transition: all 0.2s ease-in-out;
  width: 100%;
}

:deep(.custom-input:focus) {
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

/* Modo Escuro (Dark Mode) */
.dark :deep(.custom-input) {
  background-color: #1e293b;
  border-color: #334155;
  color: white;
}
</style>
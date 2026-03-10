<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

// Componentes PrimeVue
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputSwitch from 'primevue/inputswitch';
import Skeleton from 'primevue/skeleton';

const toast = useToast();

// --- ESTADOS DE CONTROLO ---
const loading = ref(false);
const verificandoConexao = ref(false);
const carregandoDados = ref(false);
const carregandoUtilizadores = ref(false);

// --- ESTADO: CONFIGURAÇÕES DE EMAIL ---
const config = ref({
  tenant_id: '',
  client_id: '',
  client_secret: '',
  email_remetente: '',
  base_url_frontend: 'http://localhost:5173',
  refresh_token: null
});

// --- ESTADO: INTELIGÊNCIA ARTIFICIAL (MAGIC AI) ---
const loadingAIConfig = ref(false);
const savingAIConfig = ref(false);

const formConfigAI = ref({
  openai_api_key: '',
  openai_model: 'gpt-4o-mini',
  ai_temperature: '0.4'
});

const opcoesModeloIA = [
  { label: 'GPT-4o Mini (Rápido/Económico)', value: 'gpt-4o-mini' },
  { label: 'GPT-4 Turbo (Poderoso/Preciso)', value: 'gpt-4-turbo' },
  { label: 'GPT-4o (Otimizado/Multimodal)', value: 'gpt-4o' }
];

// --- ESTADO: UTILIZADORES ---
const utilizadores = ref([]);
const usuarioDialog = ref(false);
const editandoUser = ref(false);
const submetendoUser = ref(false);

const opcoesTipo = ['Admin', 'Manager', 'Viewer'];

// 🎲 MOTOR DE GERAÇÃO DE SENHA
const gerarSenhaAleatoria = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  usuario.value.password = pass;
  
  toast.add({ 
    severity: 'info', 
    summary: 'Senha Gerada', 
    detail: 'Uma nova senha foi gerada. Copie antes de salvar.', 
    life: 3000 
  });
};

// 📋 Função para Copiar
const copiarSenha = () => {
  if (!usuario.value.password) return;
  
  navigator.clipboard.writeText(usuario.value.password);
  toast.add({ 
    severity: 'success', 
    summary: 'Copiado', 
    detail: 'Senha copiada para a área de transferência.', 
    life: 2000 
  });
};

// --- ESTADOS DE SEGURANÇA ---
const loadingSenha = ref(false);
const formSenha = ref({ atual: '', nova: '', confirmacao: '' });

// 🔐 Alterar Senha
const alterarMinhaSenha = async () => {
  if (formSenha.value.nova !== formSenha.value.confirmacao) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'As senhas não coincidem.', life: 3000 });
    return;
  }
  loadingSenha.value = true;
  try {
    await api.post('/usuarios/alterar-senha', {
      senha_atual: formSenha.value.atual,
      nova_senha: formSenha.value.nova
    });
    toast.add({ severity: 'success', summary: 'Segurança Atualizada', detail: 'Sua senha foi alterada.', life: 3000 });
    formSenha.value = { atual: '', nova: '', confirmacao: '' };
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Falha', detail: error.response?.data?.detail || 'Erro ao mudar senha.' });
  } finally {
    loadingSenha.value = false;
  }
};

// ==========================================
// 📡 SESSOES ATIVAS
// ==========================================
const sessoesAtivas = ref([]);
const loadingSessoes = ref(false);

const carregarSessoesReais = async () => {
  loadingSessoes.value = true;
  try {
    const response = await api.get('/usuarios/sessoes?usuario_id=1');
    if (response.data) {
      sessoesAtivas.value = response.data.map((sessao, index) => ({
        ...sessao,
        atual: index === 0
      }));
    }
  } catch (error) {
    console.error("Erro ao ler sessões reais:", error);
  } finally {
    loadingSessoes.value = false;
  }
};

const encerrarSessao = async (id) => {
  try {
    await api.delete(`/usuarios/sessoes/${id}`);
    sessoesAtivas.value = sessoesAtivas.value.filter(s => s.id !== id);
    toast.add({ severity: 'info', summary: 'Sessão Encerrada', detail: 'Acesso revogado com sucesso.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível revogar a sessão.' });
  }
};

const encerrarTodasAsSessoes = async () => {
  if (!confirm('Isto irá desconectar a sua conta de todos os outros computadores e telemóveis. Confirmar?')) return;
  
  loadingSessoes.value = true;
  try {
    const sessoesAntigas = sessoesAtivas.value.filter(s => !s.atual);
    for (const sessao of sessoesAntigas) {
      await api.delete(`/usuarios/sessoes/${sessao.id}`);
    }
    sessoesAtivas.value = sessoesAtivas.value.filter(s => s.atual);
    toast.add({ severity: 'warn', summary: 'Segurança Máxima', detail: 'Todas as outras sessões foram encerradas.', life: 5000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao encerrar todas as sessões.' });
  } finally {
    loadingSessoes.value = false;
  }
};

// ==========================================
// 📡 CARREGAR CONFIGURAÇÕES GERAIS E EMAIL
// ==========================================
const carregarDadosConfig = async () => {
  carregandoDados.value = true;
  try {
    const resConfig = await api.get('/config/email');
    if (resConfig.data) {
      const dados = Array.isArray(resConfig.data) ? resConfig.data[0] : resConfig.data;
      if (dados) {
        config.value = { ...config.value, ...dados };
      }
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    const status = error.response?.status || "Conexão";
    toast.add({ severity: 'error', summary: `Erro ${status}`, detail: 'Não foi possível ler as configurações de email.', life: 5000 });
  } finally {
    carregandoDados.value = false;
  }
};

const salvarConfiguracoes = async () => {
  loading.value = true;
  try {
    await api.post('/config/email', config.value);
    toast.add({ severity: 'success', summary: 'Guardado', detail: 'Configurações salvas no banco.', life: 3000 });
    carregarDadosConfig();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar no banco.', life: 5000 });
  } finally {
    loading.value = false;
  }
};

// ==========================================
// 📡 CARREGAR CONFIGURAÇÕES DE IA
// ==========================================
const carregarConfiguracoesAI = async () => {
  loadingAIConfig.value = true;
  try {
    const response = await api.get('/configuracoes');
    if (response.data && response.data.status === 'success') {
      formConfigAI.value = { ...formConfigAI.value, ...response.data.data };
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Aviso', detail: 'Não foi possível carregar as chaves de IA (verifique se a tabela existe).', life: 3000 });
  } finally {
    loadingAIConfig.value = false;
  }
};

const salvarConfiguracoesAI = async () => {
  savingAIConfig.value = true;
  try {
    const payload = Object.keys(formConfigAI.value).map(key => ({
      chave: key,
      valor: String(formConfigAI.value[key] || '')
    }));

    await api.post('/configuracoes', payload);
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Integração de Inteligência Artificial guardada.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar configurações de IA.', life: 3000 });
  } finally {
    savingAIConfig.value = false;
  }
};

// ==========================================
// 🔐 MICROSOFT OAUTH2 (FRONTEND)
// ==========================================
const autorizarMicrosoft = () => {
  if (!config.value.tenant_id || !config.value.client_id) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Preencha o Tenant ID e o Client ID primeiro.', life: 4000 });
    return;
  }

  const baseLimpa = config.value.base_url_frontend.trim().replace(/\/+$/, '');
  const redirectUri = `${baseLimpa}/configuracoes`;
  const scope = encodeURIComponent("offline_access mail.send");
  
  const authUrl = `https://login.microsoftonline.com/${config.value.tenant_id}/oauth2/v2.0/authorize?client_id=${config.value.client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}`;
  
  window.location.href = authUrl;
};

const processarCallbackMicrosoft = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    verificandoConexao.value = true;
    try {
      await api.post('/config/email/autorizar', { code });
      toast.add({ severity: 'success', summary: 'API Conectada', detail: 'Autorização Microsoft concluída.', life: 5000 });
      window.history.replaceState({}, document.title, window.location.pathname);
      carregarDadosConfig(); 
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Erro OAuth', detail: 'Falha ao gerar token.', life: 5000 });
    } finally {
      verificandoConexao.value = false;
    }
  }
};

const enviandoTeste = ref(false);

const enviarTeste = async () => {
  enviandoTeste.value = true;
  try {
    const response = await api.post('/config/email/teste');
    toast.add({ severity: 'success', summary: 'E-mail Enviado', detail: 'Verifique a sua caixa de entrada.', life: 5000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Falha no Teste', detail: error.response?.data?.detail || 'Erro ao disparar e-mail.', life: 5000 });
  } finally {
    enviandoTeste.value = false;
  }
};

// ==========================================
// 💾 GESTÃO DE UTILIZADORES
// ==========================================

const usuario = ref({ 
  nome: '', 
  email: '', 
  cargo: '',
  tipo: 'Viewer', 
  ativo: true, 
  password: '' 
});

// 🚀 FUNÇÃO UNIFICADA: Carregar e Ordenar Utilizadores
const carregarUtilizadores = async () => {
  carregandoUtilizadores.value = true;
  try {
    const response = await api.get('/usuarios'); 
    
    // Pega os dados, converte em array (se não for), e ordena inativos primeiro
    let lista = Array.isArray(response.data) ? response.data : [response.data];
    
    const utilizadoresOrdenados = lista.sort((a, b) => {
      // Inativos (0/false) vão para cima, Ativos (1/true) vão para baixo
      return Number(a.ativo) - Number(b.ativo); 
    });

    utilizadores.value = utilizadoresOrdenados;

  } catch (error) {
    console.error("Erro ao carregar utilizadores", error);
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao listar utilizadores.', life: 5000 });
  } finally {
    carregandoUtilizadores.value = false;
  }
};

const salvarUtilizador = async () => {
  submetendoUser.value = true;
  try {
    if (editandoUser.value) {
      await api.put(`/usuarios/${usuario.value.usuario_id}`, usuario.value);
      toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Dados atualizados com sucesso.' });
    } else {
      await api.post('/usuarios', usuario.value);
      toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Utilizador criado.' });
    }
    usuarioDialog.value = false;
    carregarUtilizadores();
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao processar operação.' });
  } finally {
    submetendoUser.value = false;
  }
};

const alternarStatus = async (user_data) => {
  const novoStatus = !user_data.ativo; 
  
  try {
    await api.put(`/usuarios/${user_data.usuario_id}`, {
      ...user_data,
      ativo: novoStatus 
    });

    user_data.ativo = novoStatus; // Atualiza a tela na hora

    toast.add({ 
      severity: 'success', 
      summary: 'Acesso Atualizado', 
      detail: novoStatus ? 'Utilizador ativado com sucesso!' : 'Acesso bloqueado com sucesso.', 
      life: 3000 
    });

    // Reordena a lista na hora para mandar os novos pendentes pro topo
    utilizadores.value.sort((a, b) => Number(a.ativo) - Number(b.ativo));

  } catch (error) {
    console.error("Erro ao alterar status:", error);
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível alterar o status.', life: 3000 });
  }
};

const abrirNovoUser = () => {
  usuario.value = { 
    nome: '', 
    email: '', 
    cargo: '',
    tipo: 'Viewer', 
    ativo: true, 
    password: '' 
  };
  editandoUser.value = false;
  usuarioDialog.value = true;
};

const prepararEdicaoUser = (dados) => {
  usuario.value = { ...dados, password: '' };
  editandoUser.value = true;
  usuarioDialog.value = true;
};

const iniciais = (nome) => nome ? nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U';

// --- INICIALIZAÇÃO AO MONTAR O COMPONENTE ---
onMounted(() => {
  carregarDadosConfig();
  carregarConfiguracoesAI();
  carregarUtilizadores();
  carregarSessoesReais();
  processarCallbackMicrosoft();
});

</script>

<template>
  <div class="max-w-6xl mx-auto animate-fadein p-4">
    
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Configurações <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ambiente & Infraestrutura</p>
      </div>
      <div v-if="carregandoDados || loadingAIConfig" class="text-orange-500 text-[10px] font-black animate-pulse uppercase tracking-widest">
        <i class="pi pi-spin pi-spinner mr-2"></i>Sincronizando Banco...
      </div>
    </div>

    <TabView class="custom-tabview">
      
      <TabPanel header="Geral">
        <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 space-y-6 shadow-sm">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">URL Base do Frontend</label>
            <InputText v-model="config.base_url_frontend" class="custom-input !text-[12px]" placeholder="http://localhost:5173" />
            <div v-if="config.base_url_frontend" class="text-[10px] text-emerald-500 font-bold ml-1">
              <i class="pi pi-check"></i> Valor guardado: <span class="underline">{{ config.base_url_frontend }}</span>
            </div>
          </div>
          <Button label="Guardar Geral" icon="pi pi-save" @click="salvarConfiguracoes" :loading="loading" class="!bg-slate-900 dark:!bg-white dark:!text-slate-900 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-8 !py-3 shadow-xl hover:scale-105 transition-transform" />
        </div>
      </TabPanel>

      <TabPanel header="Email">
        <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <div class="flex justify-between items-center mb-10 pb-6 border-b border-slate-50 dark:border-slate-800">
            <div>
              <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white">Microsoft Graph API</h3>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Estado da Conexão em Tempo Real</p>
            </div>
            <Tag :value="config.refresh_token ? 'API CONECTADA' : 'AGUARDANDO AUTORIZAÇÃO'" 
                 :severity="config.refresh_token ? 'success' : 'warning'" 
                 class="!text-[9px] !px-4 !py-2 !rounded-xl !font-black shadow-sm tracking-widest" />
          </div>

          <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Tenant ID</label>
                <InputText v-model="config.tenant_id" class="custom-input" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Client ID</label>
                <InputText v-model="config.client_id" class="custom-input" />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Client Secret</label>
              <Password v-model="config.client_secret" toggleMask :feedback="false" inputClass="custom-input w-full" class="w-full" />
              <p v-if="config.client_secret" class="text-[9px] text-emerald-500 font-bold ml-1 uppercase tracking-widest">
                <i class="pi pi-lock"></i> Credencial encriptada no banco.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Remetente Autenticado</label>
              <InputText v-model="config.email_remetente" class="custom-input !text-[12px]" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-slate-50 dark:border-slate-800">
              <Button label="1. Guardar no Banco" icon="pi pi-database" @click="salvarConfiguracoes" :loading="loading" class="w-full !bg-slate-900 dark:!bg-white dark:!text-slate-900 !text-white !border-none !rounded-2xl !text-[10px] !font-black !uppercase !tracking-widest !py-4 shadow-xl hover:scale-[1.02] transition-transform" />
              <Button label="2. Autorizar Microsoft" icon="pi pi-microsoft" @click="autorizarMicrosoft" :loading="verificandoConexao" class="w-full !bg-transparent !border-2 !border-slate-200 dark:!border-slate-700 !text-slate-700 dark:!text-slate-300 !rounded-2xl !text-[10px] !font-black !uppercase !tracking-widest !py-4 hover:!bg-slate-50 dark:hover:!bg-slate-800 hover:scale-[1.02] transition-all" />
              
              <div class="sm:col-span-2">
                <Button 
                  label="Enviar E-mail de Teste" 
                  icon="pi pi-send" 
                  @click="enviarTeste" 
                  :loading="enviandoTeste"
                  class="w-full !bg-transparent !border-2 !border-orange-500/20 !text-orange-500 !rounded-2xl !text-[10px] !font-black !uppercase !tracking-widest !py-4 hover:!bg-orange-50 dark:hover:!bg-orange-500/10 hover:scale-[1.01] transition-all mt-2" 
                  />
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Inteligência Artificial">
        <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          
          <div class="flex justify-between items-start lg:items-center mb-8 pb-6 border-b border-slate-50 dark:border-slate-800 flex-col lg:flex-row gap-4">
            <div class="flex gap-4 items-center">
              <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                <i class="pi pi-sparkles text-indigo-500 text-xl"></i>
              </div>
              <div>
                <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white">Integração OpenAI</h3>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Motor Preditivo do Magic AI Dashboard</p>
              </div>
            </div>
            <Button label="Guardar Configurações" icon="pi pi-save" @click="salvarConfiguracoesAI" :loading="savingAIConfig" class="!bg-indigo-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 !py-3 shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform" />
          </div>

          <div class="space-y-6 max-w-3xl">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de API (Secret Key)</label>
              <Password v-model="formConfigAI.openai_api_key" :feedback="false" toggleMask placeholder="sk-..." inputClass="custom-input !text-[12px] w-full" class="w-full" />
              <small class="text-slate-400 italic font-medium ml-1">Nunca partilhe esta chave. Obtenha uma em <a href="https://platform.openai.com" target="_blank" class="text-orange-500 hover:underline">platform.openai.com</a></small>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motor de Processamento (Modelo)</label>
              <Dropdown v-model="formConfigAI.openai_model" :options="opcoesModeloIA" optionLabel="label" optionValue="value" class="custom-input !p-0 !text-[12px]" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temperatura de Criatividade (0.0 a 1.0)</label>
              <InputText v-model="formConfigAI.ai_temperature" placeholder="0.4" class="custom-input !text-[12px] md:w-1/3" />
              <small class="text-slate-400 italic font-medium ml-1">Valores mais baixos (0.2 - 0.4) geram respostas mais analíticas e precisas.</small>
            </div>
          </div>
          
        </div>
      </TabPanel>

        <TabPanel header="Utilizadores">
            <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
            <div class="flex justify-between items-center mb-6">
                <div>
                <h3 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Gestão de Utilizadores</h3>
                <p class="text-[9px] text-slate-300 font-bold italic mt-1">Utilizadores registados no sistema</p>
                </div>
                <div class="flex gap-3 items-center">
                <Button icon="pi pi-refresh" @click="carregarUtilizadores" :loading="carregandoUtilizadores" class="w-10 h-10 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !rounded-xl hover:!bg-slate-100 dark:hover:!bg-slate-700 transition-colors shadow-sm" />
                <Button label="Novo Utilizador" icon="pi pi-user-plus" @click="abrirNovoUser" class="!bg-orange-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 !py-3 shadow-xl shadow-orange-500/30 hover:scale-105 transition-transform" />
                </div>
            </div>

            <DataTable :value="utilizadores" class="p-datatable-sm custom-table" :rows="5" paginator rowHover>
                <Column field="nome" header="Utilizador">
                  <template #body="s">
                    <div class="flex items-center gap-3">
                      <span class="font-bold text-slate-800 dark:text-white">
                        {{ s.data.nome }}
                      </span>
                      
                      <Tag 
                        v-if="!s.data.ativo" 
                        value="Aguardando Aprovação" 
                        class="text-[10px] font-bold uppercase tracking-wider !bg-yellow-600 !text-white" 
                        rounded
                      />
                    </div>
                  </template>
                </Column>

                <Column field="cargo" header="Cargo">
                  <template #body="s">
                    <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                      {{ s.data.cargo || 'Analista' }}
                    </span>
                  </template>
                </Column>

                <Column header="Perfil">
                <template #body="s">
                    <Tag :value="s.data.tipo" 
                        :severity="s.data.tipo === 'Admin' ? 'danger' : 'info'" 
                        class="!text-[9px] !font-black !px-3 !py-1 uppercase tracking-widest !rounded-lg" />
                </template>
                </Column>

                <Column header="Estado">
                <template #body="s">
                    <div class="flex items-center gap-2">
                    <div :class="['w-2 h-2 rounded-full', s.data.ativo ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-300']"></div>
                    <span class="text-[10px] font-black uppercase tracking-widest" :class="s.data.ativo ? 'text-emerald-500' : 'text-slate-400'">
                        {{ s.data.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                    </div>
                </template>
                </Column>

                <Column alignFrozen="right" style="width: 100px">
                  <template #body="s">
                    <div class="flex gap-2 justify-end">
                      <Button 
                        icon="pi pi-pencil" 
                        @click="prepararEdicaoUser(s.data)" 
                        v-tooltip.top="'Editar Utilizador'"
                        class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-indigo-50 hover:!text-indigo-500 transition-colors" 
                      />
                      
                      <Button 
                        :icon="s.data.ativo ? 'pi pi-lock' : 'pi pi-unlock'" 
                        @click="alternarStatus(s.data)" 
                        v-tooltip.top="s.data.ativo ? 'Bloquear Acesso' : 'Desbloquear Acesso'"
                        :class="[
                          'w-8 h-8 !border-none !text-[10px] rounded-lg transition-colors',
                          s.data.ativo 
                            ? '!bg-rose-50 dark:!bg-rose-500/10 !text-rose-500 hover:!bg-rose-500 hover:!text-white' 
                            : '!bg-emerald-50 dark:!bg-emerald-500/10 !text-emerald-500 hover:!bg-emerald-500 hover:!text-white'
                        ]" 
                      />
                    </div>
                  </template>
                </Column>

                <template #empty>
                <div class="text-center p-8 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    Nenhum utilizador encontrado na base de dados.
                </div>
                </template>
            </DataTable>
            </div>
        </TabPanel>

        <TabPanel header="Segurança">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div class="lg:col-span-4 space-y-6">
            <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                <h3 class="text-[11px] font-black uppercase text-slate-800 dark:text-white tracking-widest mb-6 flex items-center gap-2">
                <i class="pi pi-key text-orange-500"></i> Alterar Senha
                </h3>

                <div class="space-y-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha Atual</label>
                    <Password v-model="formSenha.atual" toggleMask :feedback="false" inputClass="custom-input !text-[12px] w-full" class="w-full" />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nova Senha</label>
                    <Password v-model="formSenha.nova" toggleMask inputClass="custom-input !text-[12px] w-full" class="w-full" />
                </div>

                <div class="flex flex-col gap-1.5 pb-4">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Nova Senha</label>
                    <Password v-model="formSenha.confirmacao" toggleMask :feedback="false" inputClass="custom-input !text-[12px] w-full" class="w-full" />
                </div>

                <Button label="Atualizar Senha" @click="alterarMinhaSenha" :loading="loadingSenha"
                    class="w-full !bg-slate-900 dark:!bg-white dark:!text-slate-900 !text-white !border-none !rounded-2xl !text-[10px] !font-black !uppercase !tracking-widest !py-4 shadow-xl hover:scale-[1.02] transition-transform" />
                </div>
            </div>
            
            <div class="bg-slate-900 rounded-[2rem] p-8 text-white overflow-hidden relative shadow-xl">
                <i class="pi pi-shield absolute -right-4 -bottom-4 text-8xl opacity-10"></i>
                <h4 class="text-[12px] font-black uppercase tracking-widest mb-3 text-orange-400">Autenticação 2FA</h4>
                <p class="text-[11px] text-slate-400 mb-6 font-medium leading-relaxed">Adicione uma camada extra de proteção via Authenticator.</p>
                <Button label="Configurar MFA" class="!bg-white !text-slate-900 !text-[10px] !font-black !uppercase !tracking-widest !px-6 !py-3 !rounded-xl !border-none shadow-lg hover:scale-105 transition-transform" />
            </div>
            </div>

            <div class="lg:col-span-8">
            <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm h-full">
                
                <div class="flex justify-between items-center mb-8">
                <div>
                    <h3 class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">Controlo de Dispositivos</h3>
                    <p class="text-[9px] text-slate-400 font-bold italic mt-1">Sessões ativas no momento</p>
                </div>
                <Button 
                    v-if="sessoesAtivas.length > 1"
                    label="Encerrar Outras Sessões" 
                    icon="pi pi-bolt" 
                    @click="encerrarTodasAsSessoes"
                    :loading="loadingSessoes"
                    class="!bg-rose-50 dark:!bg-rose-500/10 !text-rose-600 dark:!text-rose-400 !border-none !text-[10px] !font-black !uppercase !tracking-widest !px-6 !py-3 !rounded-xl hover:!bg-rose-600 hover:!text-white transition-all shadow-sm hover:scale-105" 
                />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="sessao in sessoesAtivas" :key="sessao.id" 
                    class="p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex flex-col gap-4 relative transition-all"
                    :class="sessao.atual ? 'bg-orange-50/30 border-orange-100 shadow-inner' : 'bg-white dark:bg-slate-900 shadow-sm'">
                    
                    <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                        :class="sessao.atual ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'">
                        <i :class="[sessao.dispositivo.includes('iPhone') ? 'pi pi-mobile' : 'pi pi-desktop']"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                        <h4 class="text-[11px] font-bold text-slate-800 dark:text-white">{{ sessao.dispositivo }}</h4>
                        <Tag v-if="sessao.atual" value="Este Dispositivo" severity="warning" class="!text-[8px] !px-2 !font-black !uppercase !tracking-widest" />
                        </div>
                        <p class="text-[9px] text-slate-400 font-medium tracking-tight">{{ sessao.local }} • {{ sessao.ip }}</p>
                    </div>
                    </div>

                    <div class="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">{{ sessao.data }}</span>
                    <Button v-if="!sessao.atual" 
                            icon="pi pi-sign-out" 
                            label="Revogar"
                            @click="encerrarSessao(sessao.id)"
                            class="!text-[9px] !font-black !p-0 !text-rose-400 !bg-transparent !border-none hover:!text-rose-600 uppercase tracking-widest" />
                    </div>
                </div>
                </div>

                <div class="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p class="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">
                    <i class="pi pi-info-circle mr-1"></i> Se encontrar um dispositivo que não reconhece, altere a senha imediatamente.
                </p>
                </div>
            </div>
            </div>
        </div>
        </TabPanel>

    </TabView>

    <Dialog v-model:visible="usuarioDialog" :header="editandoUser ? 'Editar Utilizador' : 'Novo Utilizador'" :modal="true" class="custom-dialog w-full max-w-lg" @hide="usuarioDialog = false">
        <div class="p-8 space-y-5">
            <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                <InputText v-model="usuario.nome" class="custom-input" placeholder="Ex: Marcelo Mendes" />
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Corporativo</label>
                <InputText v-model="usuario.email" class="custom-input" placeholder="nome@empresa.com" />
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Perfil de Acesso</label>
                    <Dropdown v-model="usuario.tipo" :options="['Admin', 'Editor', 'Viewer']" class="custom-dropdown" />
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
                    <div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 h-[42px] px-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <InputSwitch v-model="usuario.ativo" />
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            {{ usuario.ativo ? 'Ativo' : 'Inativo' }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Cargo / Função na Empresa</label>
                <InputText v-model="usuario.cargo" class="custom-input w-full" placeholder="Ex: Diretor de Operações" />
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    {{ editandoUser ? 'Alterar Palavra-passe (Deixe vazio para manter)' : 'Palavra-passe Inicial' }}
                </label>
                <div class="flex gap-2">
                    <Password 
                        v-model="usuario.password" 
                        toggleMask 
                        :feedback="false" 
                        class="flex-1" 
                        inputClass="custom-input w-full" 
                        placeholder="Nova senha ou deixe vazio"
                    />
                    <Button 
                        icon="pi pi-refresh" 
                        @click="gerarSenhaAleatoria" 
                        class="!bg-slate-800 !border-none !rounded-xl !w-[48px] !h-[42px] flex-shrink-0" 
                    />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end px-8 pb-8">
                <Button label="Cancelar" icon="pi pi-times" class="p-button-text !text-slate-500 !font-bold" @click="usuarioDialog = false" />
                <Button :label="editandoUser ? 'Atualizar' : 'Criar Utilizador'" icon="pi pi-check" :loading="submetendoUser" class="!bg-orange-600 !border-none !rounded-xl !px-6 !font-black !uppercase !text-[11px] tracking-widest" @click="salvarUtilizador" />
            </div>
        </template>
    </Dialog>

  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

:deep(.p-tabview-nav) { @apply bg-transparent border-none flex flex-wrap gap-1 mb-6; }
:deep(.p-tabview-nav-link) { @apply !bg-white dark:!bg-slate-800 !text-slate-400 font-black text-[9px] uppercase tracking-[0.2em] px-6 py-4 rounded-xl border-none transition-all; }
:deep(.p-tabview-selected .p-tabview-nav-link) { @apply !bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 shadow-xl; }
:deep(.custom-input) { @apply bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium; }

/* Customização dos Modais (Dialog) */
:deep(.custom-dialog .p-dialog-header) {
  @apply bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-6;
}
:deep(.custom-dialog .p-dialog-title) {
  @apply text-lg font-black italic tracking-tight text-slate-800 dark:text-white;
}

/* ==========================================
   Customização da Tabela - Forçar Transparência 
   ========================================== */
:deep(.custom-table),
:deep(.custom-table .p-datatable-wrapper),
:deep(.custom-table table) {
  @apply !bg-transparent;
}

:deep(.custom-table .p-datatable-thead > tr > th) {
  @apply !bg-transparent border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 py-4;
}

:deep(.custom-table .p-datatable-tbody > tr) {
  @apply !bg-transparent text-slate-700 dark:text-slate-300 transition-colors duration-200;
}

:deep(.custom-table .p-datatable-tbody > tr > td) {
  @apply !bg-transparent border-b border-slate-50 dark:border-slate-800/70 py-3;
}

/* Efeito de Hover nas linhas */
:deep(.custom-table.p-datatable-hoverable-rows .p-datatable-tbody > tr:not(.p-highlight):hover) {
  @apply !bg-slate-50/50 dark:!bg-slate-800/40;
}

/* Quando não há resultados */
:deep(.custom-table .p-datatable-emptymessage td) {
  @apply !bg-transparent text-center text-slate-400 py-8 text-sm font-medium;
}
</style>
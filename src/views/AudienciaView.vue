<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode } from 'primevue/api';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';

const planoDialog = ref(false);
const carregandoPlano = ref(false);
const planoTexto = ref('');
const empresaSelecionada = ref('');

// 1. Estados de Dados
const toast = useToast();
const clientes = ref([]); 
const loading = ref(true);
const enviandoEmail = ref(false);
const idsEnviando = ref([]); 

// ==========================================
// 🔍 FILTROS AVANÇADOS
// ==========================================
const pesquisa = ref('');
const filtrosTabela = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const atualizarFiltro = () => {
  filtrosTabela.value.global.value = pesquisa.value;
};

// Estados dos novos filtros
const filtroStatus = ref(null);
const opcoesStatus = [
  { label: 'Todos', value: null },
  { label: 'Respondido', value: 'Respondido' },
  { label: 'Enviado', value: 'Enviado' },
  { label: 'Pendente', value: 'Pendente' }
];

const filtroTipoData = ref('proximo_envio');
const opcoesTipoData = [
  { label: 'Próximo Envio', value: 'proximo_envio' },
  { label: 'Último Envio', value: 'ultimo_envio' }
];

const filtroDataInicio = ref(null);
const filtroDataFim = ref(null);

const limparFiltros = () => {
  pesquisa.value = '';
  filtrosTabela.value.global.value = null;
  filtroStatus.value = null;
  filtroDataInicio.value = null;
  filtroDataFim.value = null;
  filtroTipoData.value = 'proximo_envio';
};

// ⚡ Lógica de filtragem reativa
const clientesFiltrados = computed(() => {
  return clientes.value.filter(c => {
    // 1. Filtro de Status
    let matchesStatus = true;
    if (filtroStatus.value) {
      const st = (c.status_envio || 'Pendente').trim().toLowerCase();
      matchesStatus = st === filtroStatus.value.toLowerCase();
    }

    // 2. Filtro de Data (Ciclo de Envio)
    let matchesDate = true;
    if (filtroDataInicio.value || filtroDataFim.value) {
      const dataAlvo = c[filtroTipoData.value];
      
      if (!dataAlvo || dataAlvo === 'None' || dataAlvo === 'null') {
        matchesDate = false; // Se quer filtrar por data e não tem data, exclui
      } else {
        // Extrai apenas o "YYYY-MM-DD" para comparar strings de forma segura
        const dataLimpa = dataAlvo.slice(0, 10);
        
        if (filtroDataInicio.value && dataLimpa < filtroDataInicio.value) {
          matchesDate = false;
        }
        if (filtroDataFim.value && dataLimpa > filtroDataFim.value) {
          matchesDate = false;
        }
      }
    }

    return matchesStatus && matchesDate;
  });
});

const clientesSelecionados = ref([]);

// 3. Controlo do Modal e Formulário
const clienteDialog = ref(false);
const submetendo = ref(false);
const editando = ref(false);

const cliente = ref({ 
  nome: '', 
  email: '', 
  empresa: '', 
  perfil_decisor: 'Influenciador' 
});

const opcoesPerfil = ['Decisor', 'Influenciador']; 

// ==========================================
// 📊 MÉTRICAS COMPUTADAS (Agora baseadas nos filtros)
// ==========================================
const totalClientes = computed(() => clientesFiltrados.value.length);

const totalDecisores = computed(() => {
  return clientesFiltrados.value.filter(c => {
    const p = (c.perfil_decisor || '').trim().toLowerCase();
    return p === 'decisor';
  }).length;
});

const totalInfluenciadores = computed(() => {
  return clientesFiltrados.value.filter(c => {
    const p = (c.perfil_decisor || '').trim().toLowerCase();
    return p === 'influenciador';
  }).length;
});

// ==========================================
// 📡 COMUNICAÇÃO COM A API (CRUD)
// ==========================================
const carregarClientes = async () => {
  loading.value = true;
  try {
    const response = await api.get('/clientes');
    clientes.value = response.data;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar base.', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const abrirNovo = () => {
  cliente.value = { nome: '', email: '', empresa: '', perfil_decisor: 'Influenciador' };
  editando.value = false;
  clienteDialog.value = true;
};

const editarCliente = (dados) => {
  cliente.value = { ...dados };
  editando.value = true;
  clienteDialog.value = true;
};

const salvarCliente = async () => {
  if (!cliente.value.nome || !cliente.value.email) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nome e e-mail são obrigatórios.', life: 3000 });
    return;
  }

  submetendo.value = true;
  try {
    const id = cliente.value.cliente_id || cliente.value.id;
    if (editando.value) {
      await api.put(`/clientes/${id}`, cliente.value);
      toast.add({ severity: 'success', summary: 'Atualizado', detail: 'Dados gravados.', life: 3000 });
    } else {
      await api.post('/clientes', cliente.value);
      toast.add({ severity: 'success', summary: 'Criado', detail: 'Cliente adicionado.', life: 3000 });
    }
    clienteDialog.value = false;
    carregarClientes();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 3000 });
  } finally {
    submetendo.value = false;
  }
};

const excluirCliente = async (id) => {
  if (confirm('Tem certeza que deseja remover este cliente?')) {
    try {
      await api.delete(`/clientes/${id}`);
      toast.add({ severity: 'info', summary: 'Removido', detail: 'Cliente excluído.', life: 3000 });
      carregarClientes();
    } catch (error) {
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir.', life: 3000 });
    }
  }
};

// ==========================================
// 🚀 DISPAROS (n8n)
// ==========================================
const dispararIndividual = async (cliente_id) => {
  idsEnviando.value.push(cliente_id); 
  try {
    const response = await api.post(`/clientes/${cliente_id}/forcar-envio`);
    toast.add({ 
      severity: 'success', 
      summary: 'Gatilho Acionado', 
      detail: response.data.message || 'Sucesso.', 
      life: 4000 
    });
  } catch (error) {
    const msgErro = error.response?.data?.detail || 'Erro ao comunicar com n8n.';
    toast.add({ severity: 'error', summary: 'Erro', detail: msgErro, life: 5000 });
  } finally {
    idsEnviando.value = idsEnviando.value.filter(id => id !== cliente_id);
  }
};

const dispararLote = async () => {
  if (clientesSelecionados.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione clientes primeiro.', life: 4000 });
    return;
  }

  if (!confirm(`Disparar para ${clientesSelecionados.value.length} clientes?`)) return;
  
  enviandoEmail.value = true;
  try {
    const idsParaEnvio = clientesSelecionados.value.map(c => c.cliente_id);
    const response = await api.post('/clientes/forcar-envio-lote', { cliente_ids: idsParaEnvio });
    toast.add({ severity: 'info', summary: 'Lote Iniciado', detail: response.data.message, life: 6000 });
    clientesSelecionados.value = [];
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha no lote.', life: 5000 });
  } finally {
    enviandoEmail.value = false;
  }
};

// ==========================================
// 📅 FORMATAÇÃO E UTILITÁRIOS
// ==========================================
const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'None' || dataStr === 'null') return 'Pendente';
  try {
    return new Intl.DateTimeFormat('pt-PT', { 
      day: '2-digit', month: 'short', year: 'numeric' 
    }).format(new Date(dataStr));
  } catch (e) {
    return 'Pendente';
  }
};

const obterCorStatus = (status) => {
  if (!status) return 'warning'; 
  const st = status.toLowerCase();
  if (st === 'respondido') return 'success';
  if (st === 'enviado') return 'info';
  return 'warning';
};

const gerarIniciais = (nome) => {
  if (!nome) return 'U';
  const partes = nome.trim().split(' ');
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : partes[0][0].toUpperCase();
};

const gerarPlano = async (empresa) => {
    empresaSelecionada.value = empresa;
    planoDialog.value = true;
    
    const chaveCache = `nps_ai_plano_${empresa}`;
    const planoNoCache = sessionStorage.getItem(chaveCache);

    if (planoNoCache) {
        planoTexto.value = planoNoCache;
        carregandoPlano.value = false;
        return; 
    }

    planoTexto.value = '';
    carregandoPlano.value = true;

    try {
        const res = await api.get(`/audiencia/plano-acao?empresa=${encodeURIComponent(empresa)}`);
        const resultado = res.data.plano;
        sessionStorage.setItem(chaveCache, resultado);
        planoTexto.value = resultado;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erro na Consultoria', detail: 'Não foi possível gerar o plano agora.', life: 3000 });
        planoDialog.value = false;
    } finally {
        carregandoPlano.value = false;
    }
};

const recarregarPlano = (empresa) => {
    sessionStorage.removeItem(`nps_ai_plano_${empresa}`);
    gerarPlano(empresa);
    toast.add({ severity: 'info', summary: 'IA Atualizada', detail: 'Gerando uma nova análise baseada nos dados mais recentes.', life: 2000 });
};

onMounted(carregarClientes);
</script>

<template>
  <div class="max-w-[1400px] mx-auto animate-fadein p-4">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Audiência <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Gira a base de contactos e dispare pesquisas.</p>
      </div>
      
      <div class="flex flex-wrap gap-3">
        <Button 
          :label="clientesSelecionados.length > 0 ? `Disparar para ${clientesSelecionados.length}` : 'Disparo em Lote'" 
          icon="pi pi-send" 
          @click="dispararLote" 
          :loading="enviandoEmail" 
          class="bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-xl hover:-translate-y-0.5 transition-transform" 
        />
        <Button label="Novo Cliente" icon="pi pi-plus" @click="abrirNovo" class="bg-orange-500 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Filtrado</span>
          <div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalClientes }}</div>
        </div>
        <div class="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xl"><i class="pi pi-users"></i></div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500">Decisores</span>
          <div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalDecisores }}</div>
        </div>
        <div class="w-11 h-11 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 text-xl"><i class="pi pi-star-fill"></i></div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Influenciadores</span>
          <div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalInfluenciadores }}</div>
        </div>
        <div class="w-11 h-11 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 text-xl"><i class="pi pi-briefcase"></i></div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
        
        <div class="lg:col-span-3">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Pesquisar</label>
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search text-slate-400 text-xs" />
            <InputText v-model="pesquisa" @input="atualizarFiltro" placeholder="Nome, email ou empresa..." class="w-full custom-input !py-2.5 !text-xs" />
          </span>
        </div>

        <div class="lg:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Status</label>
          <Dropdown v-model="filtroStatus" :options="opcoesStatus" optionLabel="label" optionValue="value" placeholder="Todos" class="w-full custom-dropdown !h-[42px]" />
        </div>

        <div class="lg:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Referência</label>
          <Dropdown v-model="filtroTipoData" :options="opcoesTipoData" optionLabel="label" optionValue="value" class="w-full custom-dropdown !h-[42px]" />
        </div>

        <div class="lg:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">A partir de</label>
          <input type="date" v-model="filtroDataInicio" class="w-full custom-input !py-2.5 !px-3 !text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-300" />
        </div>

        <div class="lg:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Até</label>
          <input type="date" v-model="filtroDataFim" class="w-full custom-input !py-2.5 !px-3 !text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-700 dark:text-slate-300" />
        </div>

        <div class="lg:col-span-1 flex justify-end lg:justify-start">
          <Button icon="pi pi-filter-slash" @click="limparFiltros" v-tooltip.top="'Limpar Filtros'" class="w-full lg:w-[42px] h-[42px] shrink-0 !bg-rose-50 dark:!bg-rose-500/10 !text-rose-500 !border-none hover:!bg-rose-100 transition-colors rounded-xl" />
        </div>

      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 pt-2">
      <DataTable 
        :value="clientesFiltrados" 
        v-model:selection="clientesSelecionados"
        :paginator="true" 
        :rows="10" 
        :loading="loading" 
        dataKey="cliente_id" 
        class="p-datatable-sm p-datatable-custom" 
        :globalFilterFields="['nome', 'email', 'empresa']" 
        v-model:filters="filtrosTabela"
        rowHover
      >
        <template #empty>
          <div class="text-center py-12 text-[12px] text-slate-400 italic">Nenhum cliente atende aos filtros atuais.</div>
        </template>

        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

        <Column field="nome" header="Cliente" sortable style="min-width: 220px">
          <template #body="slotProps">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-500 dark:text-slate-300 font-black flex items-center justify-center shrink-0 border border-orange-100 dark:border-slate-700 text-[10px]">
                {{ gerarIniciais(slotProps.data.nome) }}
              </div>
              <div class="flex flex-col leading-tight">
                <span class="text-[13px] font-bold text-slate-800 dark:text-white">{{ slotProps.data.nome }}</span>
                <span class="text-[10px] text-slate-400 font-medium">{{ slotProps.data.email }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="empresa" header="Empresa & Perfil" sortable style="min-width: 180px">
          <template #body="slotProps">
            <div class="flex flex-col items-start gap-1">
              <span class="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                {{ slotProps.data.empresa || 'Sem Empresa' }}
              </span>
              <Tag 
                :value="slotProps.data.perfil_decisor || 'Operacional'" 
                :severity="slotProps.data.perfil_decisor === 'Decisor' ? 'warning' : 'info'" 
                class="rounded-md text-[8px] px-1.5 py-0.5 uppercase tracking-wider font-black shadow-sm" 
              />
            </div>
          </template>
        </Column>

        <Column header="Estratégia" class="w-[180px]">
          <template #body="slotProps">
            <Button 
              label="Ação" 
              icon="pi pi-sparkles" 
              @click="gerarPlano(slotProps.data.empresa)" 
              :loading="carregandoPlano && empresaSelecionada === slotProps.data.empresa"
              class="p-button-text p-button-sm !text-[10px] !font-black !uppercase !tracking-widest !text-orange-600 !border !border-orange-500/20 !rounded-xl !py-2 !px-3 hover:!bg-orange-500/5 hover:!border-orange-500/40 transition-all duration-300 group"
            />
          </template>
        </Column>

        <Column field="status_envio" header="Status" sortable style="min-width: 140px">
        <template #body="slotProps">
            <div class="flex items-center gap-2">
            <i v-if="(slotProps.data.status_envio || '').toLowerCase() === 'respondido'" class="pi pi-check-circle text-emerald-500 text-[12px]"></i>
            <i v-else-if="(slotProps.data.status_envio || '').toLowerCase() === 'enviado'" class="pi pi-send text-blue-500 text-[11px] transform -rotate-12 mt-0.5"></i>
            <i v-else class="pi pi-clock text-orange-400 text-[12px]"></i>
            
            <Tag 
                :value="slotProps.data.status_envio || 'Pendente'" 
                :severity="obterCorStatus(slotProps.data.status_envio)" 
                class="rounded-md text-[8px] px-2 py-0.5 uppercase tracking-widest font-black shadow-sm" 
            />
            </div>
        </template>
        </Column>

        <Column header="Ciclo de Envio" style="min-width: 200px">
          <template #body="slotProps">
            <div class="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-slate-400 font-bold uppercase">Último:</span>
                <span class="text-slate-600 dark:text-slate-300 font-bold">{{ formatarData(slotProps.data.ultimo_envio) }}</span>
              </div>
              <div class="flex items-center justify-between text-[10px]">
                <span class="text-orange-500 font-bold uppercase">Próximo:</span>
                <span class="text-orange-600 font-black">{{ formatarData(slotProps.data.proximo_envio) }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column header="Ações" alignFrozen="right" style="width: 130px">
          <template #body="slotProps">
            <div class="flex gap-1.5 justify-end">
              <Button icon="pi pi-send" v-tooltip.top="'Disparar n8n'" @click="dispararIndividual(slotProps.data.cliente_id)" :loading="idsEnviando.includes(slotProps.data.cliente_id)" :disabled="enviandoEmail" class="w-7 h-7 !bg-orange-50 !text-orange-500 !border-none hover:!bg-orange-100 rounded-lg transition-colors !text-xs" />
              <Button icon="pi pi-pencil" v-tooltip.top="'Editar'" @click="editarCliente(slotProps.data)" class="w-7 h-7 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none hover:!text-slate-700 rounded-lg transition-colors !text-xs" />
              <Button icon="pi pi-trash" v-tooltip.top="'Excluir'" @click="excluirCliente(slotProps.data.cliente_id)" class="w-7 h-7 !bg-rose-50 dark:!bg-rose-500/10 !text-rose-400 !border-none hover:!bg-rose-100 rounded-lg transition-colors !text-xs" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="clienteDialog" :style="{width: '450px'}" :header="editando ? 'Editar Registo' : 'Novo Cliente'" :modal="true" class="rounded-[2rem] overflow-hidden p-fluid shadow-2xl">
      <div class="p-6 space-y-5">
        <div class="flex flex-col gap-1.5">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
          <InputText v-model="cliente.nome" class="custom-input !text-xs" placeholder="Ex: Ana Silva" autofocus />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Corporativo</label>
          <InputText v-model="cliente.email" type="email" class="custom-input !text-xs" placeholder="ana@empresa.com" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Empresa</label>
            <InputText v-model="cliente.empresa" class="custom-input !text-xs" placeholder="Empresa" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Perfil</label>
            <Dropdown v-model="cliente.perfil_decisor" :options="opcoesPerfil" class="custom-dropdown !text-xs" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="p-4 flex gap-3 w-full border-t border-slate-50 dark:border-slate-800">
          <Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="clienteDialog = false" />
          <Button :label="editando ? 'Guardar' : 'Adicionar'" :loading="submetendo" class="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl font-bold text-[11px] text-white" @click="salvarCliente" />
        </div>
      </template>
    </Dialog>

    <Dialog v-model:visible="planoDialog" :modal="true" :draggable="false" class="custom-dialog w-full max-w-xl">
      <template #header>
          <div class="flex items-center justify-between w-full pr-8">
              <div class="flex items-center gap-3">
                  <i class="pi pi-sparkles text-orange-500"></i>
                  <span class="text-sm font-black uppercase tracking-widest text-slate-400">Plano de Ação Inteligente</span>
              </div>
              <Button v-if="!carregandoPlano" icon="pi pi-refresh" @click="recarregarPlano(empresaSelecionada)" class="p-button-text p-button-secondary !p-2 !rounded-full hover:!bg-slate-100 dark:hover:!bg-slate-800 transition-all" v-tooltip.left="'Gerar nova análise (ignorar cache)'" />
          </div>
      </template>
      <div class="p-8 pt-2">
          <div class="mb-6"><h2 class="text-2xl font-black italic text-slate-800 dark:text-white leading-tight">{{ empresaSelecionada }}</h2></div>
          <div v-if="carregandoPlano" class="flex flex-col items-center justify-center py-12 gap-4">
              <i class="pi pi-spin pi-spinner text-3xl text-orange-500"></i>
              <p class="text-[10px] font-black uppercase tracking-tighter text-slate-400">Consultando Gauge AI...</p>
          </div>
          <div v-else class="relative pl-6 border-l-2 border-orange-500/30 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
              {{ planoTexto }}
          </div>
      </div>
    </Dialog>

  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

:deep(.custom-input), :deep(.custom-dropdown) {
  @apply bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium;
}

/* Modificação para Dropdowns menores na barra de filtros */
:deep(.custom-dropdown.w-full) {
  @apply flex items-center px-1;
}

:deep(.p-dropdown-label) { @apply py-0 text-xs; }

/* AJUSTE NA TABELA: Trocamos bg-transparent por cores sólidas no Dark Mode */
:deep(.p-datatable .p-datatable-thead > tr > th) {
  @apply bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  /* Forçamos o fundo escuro aqui para evitar que o tema Saga pinte de branco */
  @apply bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) { @apply py-4 px-4; }

:deep(.p-checkbox .p-checkbox-box) { @apply border-slate-300 dark:border-slate-600 rounded-md transition-colors; }
:deep(.p-checkbox.p-highlight .p-checkbox-box) { @apply border-orange-500 bg-orange-500; }
</style>
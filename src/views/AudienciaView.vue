<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
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

const toast = useToast();

// ==========================================
// 1. ESTADOS PRINCIPAIS
// ==========================================
const clientes = ref([]); 
const empresas = ref([]); 
const perfis = ref([{ nome: 'Decisor' }, { nome: 'Influenciador' }, { nome: 'Usuário Final' }, { nome: 'Técnico' }]);   
const cargos = ref([]);   
const loading = ref(true);

const gestores = ref([{ label: 'Todos', value: null }]);
const filtroGestor = ref(null);

const enviandoEmail = ref(false);
const idsEnviando = ref([]); 
const clientesSelecionados = ref([]);

// Inteligência Artificial
const planoDialog = ref(false);
const carregandoPlano = ref(false);
const planoTexto = ref('');
const empresaSelecionada = ref('');

// ==========================================
// 🔍 2. FILTROS E PESQUISA
// ==========================================
const pesquisa = ref('');
const filtrosTabela = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
});

const atualizarFiltro = () => {
  filtrosTabela.value.global.value = pesquisa.value;
};

const filtroStatus = ref(null);
const opcoesStatus = [
  { label: 'Todos', value: null },
  { label: 'Respondido', value: 'Respondido' },
  { label: 'Enviado', value: 'Enviado' },
  { label: 'Pendente', value: 'Pendente' },
  { label: 'Erro', value: 'Erro' }
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
  filtroGestor.value = null;
  filtroDataInicio.value = null;
  filtroDataFim.value = null;
  filtroTipoData.value = 'proximo_envio';
};

const clientesFiltrados = computed(() => {
  return clientes.value.filter(c => {
    let matchesStatus = true;
    if (filtroStatus.value) {
      const st = (c.status_envio || 'Pendente').trim().toLowerCase();
      matchesStatus = st === filtroStatus.value.toLowerCase();
    }

    let matchesGestor = true;
    if (filtroGestor.value) {
      matchesGestor = c.gestor === filtroGestor.value;
    }

    let matchesDate = true;
    if (filtroDataInicio.value || filtroDataFim.value) {
      const dataAlvo = c[filtroTipoData.value];
      if (!dataAlvo || dataAlvo === 'None' || dataAlvo === 'null') {
        matchesDate = false;
      } else {
        const dataLimpa = dataAlvo.slice(0, 10);
        if (filtroDataInicio.value && dataLimpa < filtroDataInicio.value) matchesDate = false;
        if (filtroDataFim.value && dataLimpa > filtroDataFim.value) matchesDate = false;
      }
    }
    
    return matchesStatus && matchesDate && matchesGestor; 
  });
});

const totalClientes = computed(() => clientesFiltrados.value.length);
const totalDecisores = computed(() => clientesFiltrados.value.filter(c => (c.perfil_decisor || '').trim().toLowerCase() === 'decisor').length);
const totalInfluenciadores = computed(() => clientesFiltrados.value.filter(c => (c.perfil_decisor || '').trim().toLowerCase() === 'influenciador').length);

// ==========================================
// 📝 3. CRUD E MODAL DE CLIENTES
// ==========================================
const clienteDialog = ref(false);
const submetendo = ref(false);
const editando = ref(false);

const cliente = ref({ 
  cliente_id: null,
  nome: '', 
  email: '', 
  telefone: '',
  empresa: null, 
  perfil_decisor: null,
  cargo: null
});

// ==========================================
// 📡 4. CARREGAMENTO E SMART POLLING ULTRA-FORÇADO
// ==========================================
let pollingInterval = null;

const carregarClientes = async () => {
  loading.value = true;
  await sincronizarStatusRealTime();
  
  try { const resEmp = await api.get('/cadastros/empresas'); if(resEmp.data) empresas.value = resEmp.data; } catch (e) {}
  try { const resPerf = await api.get('/cadastros/perfis'); if(resPerf.data) perfis.value = resPerf.data; } catch (e) {}
  try { const resCargos = await api.get('/cadastros/cargos'); if(resCargos.data) cargos.value = resCargos.data; } catch (e) {}
  
  try { 
    const resGest = await api.get('/cadastros/gestores'); 
    if(resGest.data) {
      gestores.value = [{ label: 'Todos', value: null }, ...resGest.data.map(g => ({ label: g.nome, value: g.nome }))];
    }
  } catch (e) {}
  
  loading.value = false;
};

// Polling Inteligente que OBRIGA a reatividade do Vue
const sincronizarStatusRealTime = async () => {
  try {
    const response = await api.get('/clientes', {
      params: { _t: new Date().getTime() }, // Método oficial do Axios para quebrar cache
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' }
    });
    
    // DEBUG: Mostra no F12 o que o banco está REALMENTE a devolver
    // Se no F12 aparecer "Respondido" e você souber que é "Enviado", o cache está no Backend Python!
    if (response.data && response.data.length > 0) {
      console.log("🔄 Real-Time Atualizado. Exemplo Cliente 1 Status:", response.data[0].status_envio);
    }

    const idsSelecionados = clientesSelecionados.value.map(c => c.cliente_id);

    // O operador spread [...] obriga o Vue a descartar o array antigo e renderizar o novo
    clientes.value = [...response.data];

    if (idsSelecionados.length > 0) {
      clientesSelecionados.value = clientes.value.filter(c => idsSelecionados.includes(c.cliente_id));
    }
  } catch (error) {
    console.error("Falha ao sincronizar real-time:", error);
  }
};

onMounted(() => {
  carregarClientes();
  pollingInterval = setInterval(sincronizarStatusRealTime, 3000); 
});

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval);
});

// FUNÇÕES DE CRUD
const abrirNovo = () => { cliente.value = { cliente_id: null, nome: '', email: '', telefone: '', empresa: null, perfil_decisor: null, cargo: null }; editando.value = false; clienteDialog.value = true; };
const editarCliente = (dados) => { cliente.value = { ...dados }; editando.value = true; clienteDialog.value = true; };

const salvarCliente = async () => {
  if (!cliente.value.nome || !cliente.value.email || !cliente.value.cargo) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nome, E-mail e Cargo são obrigatórios.', life: 3000 });
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
    await sincronizarStatusRealTime();
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar.', life: 3000 }); } 
  finally { submetendo.value = false; }
};

// ==========================================
// 🚀 5. DISPAROS E FORMATAÇÃO
// ==========================================
const dispararIndividual = async (row_data) => {
  const id = row_data.cliente_id || row_data.id;
  idsEnviando.value.push(id); 
  try {
    const response = await api.post(`/clientes/${id}/forcar-envio`);
    toast.add({ severity: 'success', summary: 'Gatilho Acionado', detail: response.data.message || 'Envio concluído', life: 4000 });
    setTimeout(sincronizarStatusRealTime, 1000); 
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao disparar n8n.', life: 5000 }); } 
  finally { idsEnviando.value = idsEnviando.value.filter(i => i !== id); }
};

const dispararLote = async () => {
  if (clientesSelecionados.value.length === 0) return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione clientes primeiro.', life: 4000 });
  if (!confirm(`Disparar para ${clientesSelecionados.value.length} clientes?`)) return;
  
  enviandoEmail.value = true;
  try {
    const idsParaEnvio = clientesSelecionados.value.map(c => c.cliente_id || c.id);
    const response = await api.post('/clientes/forcar-envio-lote', { cliente_ids: idsParaEnvio });
    toast.add({ severity: 'info', summary: 'Lote Iniciado', detail: response.data.message || 'Disparos na fila.', life: 6000 });
    clientesSelecionados.value = [];
    setTimeout(sincronizarStatusRealTime, 1500);
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha no lote.', life: 5000 }); } 
  finally { enviandoEmail.value = false; }
};

// 🌟 SOLUÇÃO DA DATA (Ignora o Fuso Horário)
const formatarData = (dataStr) => {
  if (!dataStr || dataStr === 'None' || dataStr === 'null') return 'Pendente';
  try {
    const dataLimpa = dataStr.slice(0, 10);
    const partes = dataLimpa.split('-'); 
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataLimpa;
  } catch (e) { return 'Pendente'; }
};

const obterCorStatus = (status) => {
  if (!status) return 'warning'; 
  const st = status.toLowerCase();
  if (st === 'respondido') return 'success';
  if (st === 'enviado') return 'info';
  if (st === 'erro') return 'danger';
  return 'warning';
};

const gerarIniciais = (nome) => {
  if (!nome) return 'U';
  const partes = nome.trim().split(' ');
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : partes[0][0].toUpperCase();
};

const gerarPlano = async (empresa) => {
    if (!empresa || empresa === 'Sem Empresa') return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O cliente precisa de empresa.', life: 3000 });
    empresaSelecionada.value = empresa; planoDialog.value = true;
    const chaveCache = `nps_ai_plano_${empresa}`;
    if (sessionStorage.getItem(chaveCache)) { planoTexto.value = sessionStorage.getItem(chaveCache); return; }
    carregandoPlano.value = true;
    try {
        const res = await api.get(`/audiencia/plano-acao?empresa=${encodeURIComponent(empresa)}`);
        sessionStorage.setItem(chaveCache, res.data.plano); planoTexto.value = res.data.plano;
    } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha no Gauge AI', life: 3000 }); planoDialog.value = false; } 
    finally { carregandoPlano.value = false; }
};

const recarregarPlano = (empresa) => { sessionStorage.removeItem(`nps_ai_plano_${empresa}`); gerarPlano(empresa); };
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
        <Button :label="clientesSelecionados.length > 0 ? `Disparar para ${clientesSelecionados.length}` : 'Disparo em Lote'" icon="pi pi-send" @click="dispararLote" :loading="enviandoEmail" class="bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-xl hover:-translate-y-0.5 transition-transform" />
        <Button label="Nova Pessoa" icon="pi pi-plus" @click="abrirNovo" class="bg-orange-500 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Filtrado</span><div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalClientes }}</div></div>
        <div class="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 text-xl"><i class="pi pi-users"></i></div>
      </div>
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-500">Decisores</span><div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalDecisores }}</div></div>
        <div class="w-11 h-11 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 text-xl"><i class="pi pi-star-fill"></i></div>
      </div>
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Influenciadores</span><div class="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mt-1">{{ totalInfluenciadores }}</div></div>
        <div class="w-11 h-11 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 text-xl"><i class="pi pi-briefcase"></i></div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 items-end">
        <div class="xl:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Pesquisar</label>
          <span class="p-input-icon-left w-full"><i class="pi pi-search text-slate-400 text-xs" /><InputText v-model="pesquisa" @input="atualizarFiltro" placeholder="Nome, email..." class="w-full custom-input !py-2.5 !text-xs" /></span>
        </div>
        <div class="xl:col-span-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-sky-500 mb-1.5 block ml-1"><i class="pi pi-briefcase text-[8px]"></i> Gestor</label>
          <Dropdown v-model="filtroGestor" :options="gestores" optionLabel="label" optionValue="value" placeholder="Todos" class="w-full custom-dropdown !h-[42px] border-sky-100 bg-sky-50/50 dark:border-sky-500/20 dark:bg-sky-500/5" />
        </div>
        <div class="xl:col-span-2"><label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Status</label><Dropdown v-model="filtroStatus" :options="opcoesStatus" optionLabel="label" optionValue="value" placeholder="Todos" class="w-full custom-dropdown !h-[42px]" /></div>
        <div class="xl:col-span-2"><label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Referência</label><Dropdown v-model="filtroTipoData" :options="opcoesTipoData" optionLabel="label" optionValue="value" class="w-full custom-dropdown !h-[42px]" /></div>
        <div class="xl:col-span-1"><label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">A partir</label><input type="date" v-model="filtroDataInicio" class="w-full custom-input !py-2.5 !px-2 !text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none" /></div>
        <div class="xl:col-span-1"><label class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block ml-1">Até</label><input type="date" v-model="filtroDataFim" class="w-full custom-input !py-2.5 !px-2 !text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-xl outline-none" /></div>
        <div class="xl:col-span-2 flex justify-end xl:justify-start"><Button icon="pi pi-filter-slash" label="Limpar" @click="limparFiltros" class="w-full h-[42px] shrink-0 !bg-rose-50 dark:!bg-rose-500/10 !text-rose-500 !border-none hover:!bg-rose-100 transition-colors rounded-xl text-xs font-bold uppercase tracking-widest" /></div>
      </div>

    <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6 pt-2">
      <DataTable :value="clientesFiltrados" v-model:selection="clientesSelecionados" :paginator="true" :rows="10" :loading="loading" dataKey="cliente_id" class="p-datatable-sm p-datatable-custom" :globalFilterFields="['nome', 'email', 'empresa']" v-model:filters="filtrosTabela" rowHover>
        <template #empty><div class="text-center py-12 text-[12px] text-slate-400 italic">Nenhum cliente atende aos filtros.</div></template>
        
        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        
        <Column field="nome" header="Pessoa" sortable style="min-width: 220px">
          <template #body="slotProps">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-500 dark:text-slate-300 font-black flex items-center justify-center shrink-0 border border-orange-100 dark:border-slate-700 text-[10px]">{{ gerarIniciais(slotProps.data.nome) }}</div>
              <div class="flex flex-col leading-tight"><span class="text-[13px] font-bold text-slate-800 dark:text-white">{{ slotProps.data.nome }}</span><span class="text-[10px] text-slate-400 font-medium">{{ slotProps.data.email }}</span></div>
            </div>
          </template>
        </Column>

        <Column field="empresa" header="Conta & Função" sortable style="min-width: 180px">
          <template #body="slotProps">
            <div class="flex flex-col items-start gap-1">
              <span class="text-[12px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{{ slotProps.data.empresa || 'Sem Empresa' }}</span>
              <div class="flex items-center gap-1">
                <Tag :value="slotProps.data.perfil_decisor || 'Operacional'" :severity="slotProps.data.perfil_decisor === 'Decisor' ? 'warning' : 'info'" class="rounded-md text-[8px] px-1.5 py-0.5 uppercase tracking-wider font-black shadow-sm" />
                <span class="text-[9px] text-slate-400 font-bold ml-1 truncate max-w-[100px]">{{ slotProps.data.cargo || '' }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="gestor" header="Gestor da Conta" sortable style="min-width: 140px">
          <template #body="slotProps">
              <span v-if="slotProps.data.gestor" class="text-[9px] font-black text-sky-500 uppercase tracking-widest bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-md border border-sky-100 dark:border-sky-500/20 whitespace-nowrap">
                <i class="pi pi-briefcase mr-1"></i>{{ slotProps.data.gestor }}
              </span>
              <span v-else class="text-[9px] text-slate-400 italic">Sem Gestor</span>
          </template>
        </Column>

        <Column header="Estratégia" class="w-[180px]">
          <template #body="slotProps">
            <Button label="Ação" icon="pi pi-sparkles" @click="gerarPlano(slotProps.data.empresa)" :loading="carregandoPlano && empresaSelecionada === slotProps.data.empresa" class="p-button-text p-button-sm !text-[10px] !font-black !uppercase !tracking-widest !text-orange-600 !border !border-orange-500/20 !rounded-xl !py-2 !px-3 hover:!bg-orange-500/5 hover:!border-orange-500/40 transition-all duration-300 group"/>
          </template>
        </Column>

        <Column field="status_envio" header="Status" sortable style="min-width: 140px">
        <template #body="slotProps">
            <div class="flex items-center gap-2">
              <i v-if="(slotProps.data.status_envio || '').toLowerCase() === 'respondido'" class="pi pi-check-circle text-emerald-500 text-[12px]"></i>
              <i v-else-if="(slotProps.data.status_envio || '').toLowerCase() === 'enviado'" class="pi pi-send text-blue-500 text-[11px] transform -rotate-12 mt-0.5"></i>
              <i v-else-if="(slotProps.data.status_envio || '').toLowerCase() === 'erro'" class="pi pi-times-circle text-rose-500 text-[12px]"></i>
              <i v-else class="pi pi-clock text-orange-400 text-[12px]"></i>
              <Tag :value="slotProps.data.status_envio || 'Pendente'" :severity="obterCorStatus(slotProps.data.status_envio)" class="rounded-md text-[8px] px-2 py-0.5 uppercase tracking-widest font-black shadow-sm transition-all" />
            </div>
        </template>
        </Column>

        <Column header="Ciclo de Envio" style="min-width: 200px">
          <template #body="slotProps">
            <div class="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between text-[10px]"><span class="text-slate-400 font-bold uppercase">Último:</span><span class="text-slate-600 dark:text-slate-300 font-bold">{{ formatarData(slotProps.data.ultimo_envio) }}</span></div>
              <div class="flex items-center justify-between text-[10px]"><span class="text-orange-500 font-bold uppercase">Próximo:</span><span class="text-orange-600 font-black">{{ formatarData(slotProps.data.proximo_envio) }}</span></div>
            </div>
          </template>
        </Column>

        <Column header="Ações" alignFrozen="right" style="width: 130px">
          <template #body="slotProps">
            <div class="flex gap-1.5 justify-end">
              <Button icon="pi pi-send" v-tooltip.top="'Disparar n8n'" @click="dispararIndividual(slotProps.data)" :loading="idsEnviando.includes(slotProps.data.cliente_id || slotProps.data.id)" :disabled="enviandoEmail" class="w-7 h-7 !bg-orange-50 !text-orange-500 !border-none hover:!bg-orange-100 rounded-lg transition-colors !text-xs" />
              <Button icon="pi pi-pencil" v-tooltip.top="'Editar'" @click="editarCliente(slotProps.data)" class="w-7 h-7 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none hover:!text-slate-700 rounded-lg transition-colors !text-xs" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="clienteDialog" :style="{width: '450px'}" :header="editando ? 'Editar Registo' : 'Nova Pessoa'" :modal="true" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
      <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo *</label>
          <InputText v-model="cliente.nome" class="custom-input w-full" placeholder="Ex: João Silva" />
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail Corporativo *</label>
          <InputText v-model="cliente.email" type="email" class="custom-input w-full" placeholder="joao@empresa.com" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Telefone</label>
          <InputText v-model="cliente.telefone" class="custom-input w-full" placeholder="+351 900 000 000" />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Conta (Empresa)</label>
          <Dropdown v-model="cliente.empresa" :options="empresas" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Perfil</label>
          <Dropdown v-model="cliente.perfil_decisor" :options="perfis" optionLabel="nome" optionValue="nome" editable placeholder="Selecione ou digite" class="custom-dropdown w-full" />
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Cargo *</label>
          <Dropdown v-model="cliente.cargo" :options="cargos" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
        </div>
      </div>
      <template #footer>
        <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full">
          <Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="clienteDialog = false" />
          <Button :label="editando ? 'Guardar' : 'Adicionar'" :loading="submetendo" class="flex-1 !bg-indigo-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg hover:scale-[1.02] transition-transform border-none py-3" @click="salvarCliente" />
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
          <Button v-if="!carregandoPlano" icon="pi pi-refresh" @click="recarregarPlano(empresaSelecionada)" class="p-button-text p-button-secondary !p-2 !rounded-full hover:!bg-slate-100 dark:hover:!bg-slate-800 transition-all" />
        </div>
      </template>
      <div class="p-8 pt-2">
          <div class="mb-6"><h2 class="text-2xl font-black italic text-slate-800 dark:text-white leading-tight">{{ empresaSelecionada }}</h2></div>
          <div v-if="carregandoPlano" class="flex flex-col items-center justify-center py-12 gap-4"><i class="pi pi-spin pi-spinner text-3xl text-orange-500"></i><p class="text-[10px] font-black uppercase tracking-tighter text-slate-400">Consultando Gauge AI...</p></div>
          <div v-else class="relative pl-6 border-l-2 border-orange-500/30 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{{ planoTexto }}</div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

/* 🌟 CORREÇÃO DOS DROPDOWNS (SELECTORS) */

/* 1. Garante que o texto e a seta fiquem escuros no Light Mode e claros no Dark Mode */
:deep(.p-dropdown.custom-dropdown) {
    @apply bg-slate-100/50 dark:bg-slate-800 border-none rounded-lg transition-all !important;
}

/* 2. ESTA É A CHAVE: Altera a cor da seta (ícone) do seletor */
:deep(.p-dropdown.custom-dropdown .p-dropdown-trigger) {
    @apply text-slate-600 dark:text-slate-400 !important;
    width: 2.5rem !important;
}

/* 3. Garante que o label (texto selecionado) também acompanhe a cor */
:deep(.p-dropdown.custom-dropdown .p-dropdown-label) {
    @apply text-slate-700 dark:text-slate-200 font-semibold text-xs !important;
    padding: 0.5rem 0.75rem !important;
}

/* 4. Remove o contorno azul/laranja ao clicar */
:deep(.p-dropdown:not(.p-disabled).p-focus) {
    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2) !important; /* Um leve glow laranja */
    border-color: transparent !important;
}

/* 5. Ajuste do Painel que abre (Lista de Opções) */
:deep(.p-dropdown-panel) {
    @apply dark:bg-slate-800 dark:border-slate-700 shadow-xl !important;
}

:deep(.p-dropdown-panel .p-dropdown-item) {
    @apply text-xs font-medium text-slate-600 dark:text-slate-300 !important;
}

:deep(.p-dropdown-panel .p-dropdown-item.p-highlight) {
    @apply bg-orange-500/10 text-orange-600 dark:text-orange-400 !important;
}

/* 🌟 Tabela PrimeVue */
:deep(.p-datatable .p-datatable-thead > tr > th) { @apply bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4; }
:deep(.p-datatable .p-datatable-tbody > tr) { @apply bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300; }
:deep(.p-datatable .p-datatable-tbody > tr > td) { @apply py-4 px-4; }
:deep(.p-checkbox .p-checkbox-box) { @apply border-slate-300 dark:border-slate-600 rounded-md transition-colors; }
:deep(.p-checkbox.p-highlight .p-checkbox-box) { @apply border-orange-500 bg-orange-500; }

/* 🌟 Modais (Dialog) */
:deep(.custom-dialog .p-dialog-header) { @apply bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-6; }
:deep(.custom-dialog .p-dialog-content) { @apply dark:bg-slate-900; }
:deep(.custom-dialog .p-dialog-title) { @apply text-lg font-black italic tracking-tight text-slate-800 dark:text-white; }
</style>
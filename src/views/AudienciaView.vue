<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';
import { FilterMatchMode } from 'primevue/api';
import { temPermissao } from '../utils/permissoes';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Tag from 'primevue/tag';
import Calendar from 'primevue/calendar';

const toast = useToast();

// ==========================================
// 1. ESTADOS PRINCIPAIS
// ==========================================
const clientes = ref([]); 
const empresas = ref([]); 
const perfis = ref([{ nome: 'Decisor' }, { nome: 'Influenciador' }, { nome: 'Usuário Final' }, { nome: 'Técnico' }]);   
const cargos = ref([]);
const segmentos = ref([]);   
const loading = ref(true);

const gestores = ref([{ label: 'Todos', value: null }]);
const companhias = ref([{ label: 'Todas', value: null }]); 
const filtroGestor = ref(null);
const filtroCompanhia = ref(null); 
const mostrarApenasAmanha = ref(false);

const enviandoEmail = ref(false);
const idsEnviando = ref([]); 
const clientesSelecionados = ref([]);

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
  filtroCompanhia.value = null; 
  filtroDataInicio.value = null;
  filtroDataFim.value = null;
  filtroTipoData.value = 'proximo_envio';
};

const clientesFiltrados = computed(() => {
  return clientes.value.filter(c => {
    
    // 1. Filtro de Status
    let matchesStatus = true;
    if (typeof filtroStatus !== 'undefined' && filtroStatus.value) {
      const st = (c.status_envio || 'Pendente').trim().toLowerCase();
      matchesStatus = st === filtroStatus.value.toLowerCase();
    }

    // 2. Filtro de Gestor
    let matchesGestor = true;
    if (typeof filtroGestor !== 'undefined' && filtroGestor.value && filtroGestor.value !== 'Todos') {
      matchesGestor = c.gestor === filtroGestor.value;
    }

    // 3. Filtro de Companhia
    let matchesCompanhia = true;
    if (typeof filtroCompanhia !== 'undefined' && filtroCompanhia.value && filtroCompanhia.value !== 'Todas') {
      const empresaObj = empresas.value.find(e => e.nome === c.empresa);
      const companhiaDoCliente = empresaObj ? empresaObj.companhia : null;
      matchesCompanhia = companhiaDoCliente === filtroCompanhia.value;
    }

    // 4. Filtro de Datas (Calendário)
    let matchesDate = true;
    if (typeof filtroDataInicio !== 'undefined' && (filtroDataInicio.value || filtroDataFim.value)) {
      const dataAlvoStr = c[filtroTipoData.value];
      
      if (!dataAlvoStr || dataAlvoStr === 'None' || dataAlvoStr === 'null') {
        matchesDate = false;
      } else {
        const dataCliente = new Date(dataAlvoStr.slice(0, 10) + 'T00:00:00');
        
        if (filtroDataInicio.value) {
          const dtInicio = new Date(filtroDataInicio.value);
          dtInicio.setHours(0, 0, 0, 0);
          if (dataCliente < dtInicio) matchesDate = false;
        }
        
        if (filtroDataFim.value) {
          const dtFim = new Date(filtroDataFim.value);
          dtFim.setHours(23, 59, 59, 999);
          if (dataCliente > dtFim) matchesDate = false;
        }
      }
    }

    // 5. NOVA LÓGICA: Filtro de Lembrete Amanhã (Independente)
    let matchesAmanha = true;
    if (typeof mostrarApenasAmanha !== 'undefined' && mostrarApenasAmanha.value) {
      if ((c.status_envio || '').toLowerCase() === 'enviado' && c.ultimo_envio) {
        const statusLemb = calcularStatusLembrete(c.ultimo_envio);
        // Só mantém se o cálculo retornar exatamente "Amanhã"
        matchesAmanha = statusLemb && statusLemb.texto.includes('Amanhã');
      } else {
        matchesAmanha = false; // Se não foi enviado, não tem lembrete para amanhã
      }
    }
    
    // Retorna o cliente apenas se ele passar em todos os filtros ativos
    return matchesStatus && matchesDate && matchesGestor && matchesCompanhia && matchesAmanha;
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
  cargo: null,
  gestor: null,
  segmento: null
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
  try { const resSeg = await api.get('/cadastros/segmentos'); if(resSeg.data) segmentos.value = resSeg.data; } catch (e) {}
  
  try { 
    const resGest = await api.get('/cadastros/gestores'); 
    if(resGest.data) {
      gestores.value = [{ label: 'Todos', value: null }, ...resGest.data.map(g => ({ label: g.nome, value: g.nome }))];
    }
  } catch (e) {}

  try { 
    const resComp = await api.get('/cadastros/companhias'); 
    if(resComp.data) {
      companhias.value = [{ label: 'Todas', value: null }, ...resComp.data.map(c => ({ label: c.nome, value: c.nome }))];
    }
  } catch (e) {}
  
  loading.value = false;
};

onMounted(() => {
  carregarClientes();
  pollingInterval = setInterval(sincronizarStatusRealTime, 3000); 
});

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval);
});

// FUNÇÕES DE CRUD
const abrirNovo = () => { 
    cliente.value = { cliente_id: null, nome: '', email: '', telefone: '', empresa: null, perfil_decisor: null, cargo: null, gestor: null, segmento: null }; 
    editando.value = false; 
    clienteDialog.value = true; 
};
const editarCliente = (dados) => { 
    cliente.value = { ...dados }; 
    editando.value = true; 
    clienteDialog.value = true; 
};

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
// 🚀 5. DISPAROS E FORMATAÇÃO (NPS API)
// ==========================================
const dispararIndividual = async (row_data) => {
  const id = row_data.cliente_id;
  if (!id) return;

  idsEnviando.value.push(id); 
  
  try {
    const response = await api.post(`/clientes/${id}/forcar-envio`);
    
    toast.add({ 
      severity: 'success', 
      summary: 'Tudo pronto! 🚀', 
      detail: `O convite para ${row_data.nome} já foi enviado para a fila de processamento.`, 
      life: 5000 
    });

    setTimeout(sincronizarStatusRealTime, 2000); 
    
  } catch (error) { 
    toast.add({ 
      severity: 'error', 
      summary: 'Ops! Algo aconteceu', 
      detail: 'Não conseguimos acionar o disparo nativo agora.', 
      life: 5000 
    }); 
  } finally { 
    idsEnviando.value = idsEnviando.value.filter(i => i !== id); 
  }
};

const dispararLote = async () => {
  if (clientesSelecionados.value.length === 0) {
    return toast.add({ severity: 'warn', summary: 'Ninguém selecionado', detail: 'Selecione pelo menos uma pessoa para disparar o lote.', life: 3000 });
  }
  
  const total = clientesSelecionados.value.length;
  enviandoEmail.value = true;
  
  try {
    const idsParaEnvio = clientesSelecionados.value.map(c => c.cliente_id);
    await api.post('/clientes/forcar-envio-lote', { cliente_ids: idsParaEnvio });
    
    toast.add({ 
      severity: 'info', 
      summary: 'Trabalho em curso! 🛠️', 
      detail: `Estamos a processar o envio para ${total} contatos. Pode continuar a navegar, o sistema cuidará do resto.`, 
      life: 8000 
    });
    
    clientesSelecionados.value = [];
    setTimeout(sincronizarStatusRealTime, 3000);
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro no Lote', detail: 'Houve um problema ao processar o lote de envios.', life: 5000 });
  } finally {
    enviandoEmail.value = false;
  }
};

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

// ==========================================
// ⚡ AÇÕES PENDENTES (Sincronizado com Kanban)
// ==========================================
const acoesAtivas = ref([]);

const verificarAcoes = (empresa) => {
  if (!empresa) return false;
  // Verifica se a empresa do cliente tem alguma ação pendente ou em andamento no Kanban
  return acoesAtivas.value.some(a => a.empresa_nome === empresa);
};

// Polling Inteligente que OBRIGA a reatividade do Vue e lê o Kanban
const sincronizarStatusRealTime = async () => {
  try {
    const [response, resAcoes] = await Promise.all([
      api.get('/clientes', { params: { _t: new Date().getTime() }, headers: { 'Cache-Control': 'no-cache' } }),
      api.get('/acoes') // 👈 Vai buscar o Kanban em tempo real
    ]);
    
    const idsSelecionados = clientesSelecionados.value.map(c => c.cliente_id);
    clientes.value = [...response.data];

    if (idsSelecionados.length > 0) {
      clientesSelecionados.value = clientes.value.filter(c => idsSelecionados.includes(c.cliente_id));
    }
    
    // Filtra apenas as ações que não estão concluídas
    if (resAcoes.data) {
      acoesAtivas.value = resAcoes.data.filter(a => a.status !== 'Concluído');
    }
  } catch (error) {
    console.error("Falha ao sincronizar real-time:", error);
  }
};

// ==========================================
// ⏱️ MOTOR DE CÁLCULO DE FOLLOW-UP
// ==========================================
const regrasNPS = ref({ lembrete_dias: 3, recorrencia_dias: 90 });

// 1. Vai buscar a regra dos dias ao banco de dados
const carregarRegrasNPS = async () => {
  try {
    const res = await api.get('/config/regras');
    if (res.data) {
      if (res.data.lembrete_dias) regrasNPS.value.lembrete_dias = parseInt(res.data.lembrete_dias);
      // 👇 2. Ler do backend a recorrência
      if (res.data.recorrencia_dias) regrasNPS.value.recorrencia_dias = parseInt(res.data.recorrencia_dias); 
    }
  } catch (error) {
    console.error("Erro ao ler regras de lembrete:", error);
  }
};

// 2. Calcula visualmente quantos dias faltam
const calcularStatusLembrete = (data_disparo) => {
  if (!data_disparo) return null;

  const dataEnvio = new Date(data_disparo);
  const hoje = new Date();
  
  // Calcula a diferença em dias (ignorando as horas para ser exato)
  dataEnvio.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  
  const diasPassados = Math.floor((hoje - dataEnvio) / (1000 * 60 * 60 * 24));
  const diasRestantes = regrasNPS.value.lembrete_dias - diasPassados;

  if (diasRestantes > 1) {
    return { texto: `Lembrete em ${diasRestantes} dias`, cor: 'text-slate-400', icone: 'pi-clock' };
  } else if (diasRestantes === 1) {
    return { texto: 'Lembrete Amanhã', cor: 'text-indigo-400', icone: 'pi-history' };
  } else if (diasRestantes === 0) {
    return { texto: 'Lembrete Hoje', cor: 'text-orange-500', icone: 'pi-send' };
  } else {
    return { texto: 'Na fila de disparo', cor: 'text-rose-500', icone: 'pi-exclamation-circle' }; // Já devia ter ido, o CRON vai apanhá-lo na próxima ronda
  }
};

onMounted(() => {
  carregarClientes();
  carregarRegrasNPS();
  pollingInterval = setInterval(sincronizarStatusRealTime, 3000); 
});

</script>

<template>
  <div class="max-w-[1400px] mx-auto animate-fadein p-4">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Audiência <span class="text-orange-500">.</span>
        </h1>
        <div class="flex items-center gap-3 mt-2">
          <p class="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Olhe a base de contatos e dispare pesquisas.</p>
          <Tag :value="'Ciclo: ' + regrasNPS.recorrencia_dias + ' dias'" icon="pi pi-sync" class="!bg-orange-50 dark:!bg-orange-500/10 !text-orange-600 dark:!text-orange-400 !text-[9px] !font-black uppercase tracking-widest border border-orange-200 dark:border-orange-500/20 !px-2" v-tooltip.top="'Tempo de carência configurado entre disparos para o mesmo cliente'" />
        </div>
      </div>
      
      <div class="flex flex-wrap gap-3">
        <Button v-if="temPermissao('audiencia:disparar')" :label="clientesSelecionados.length > 0 ? `Disparar para ${clientesSelecionados.length}` : 'Disparo em Lote'" icon="pi pi-send" @click="dispararLote" :loading="enviandoEmail" class="bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-xl hover:-translate-y-0.5 transition-transform" />
        <Button v-if="temPermissao('clientes:criar')" label="Nova Pessoa" icon="pi pi-plus" @click="abrirNovo" class="bg-orange-500 border-none rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5 transition-transform" />
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

    <div class="bg-white dark:bg-slate-900 p-3 pl-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-nowrap items-center w-full overflow-x-auto hide-scrollbar no-print relative mb-6 gap-4">
      
      <div class="absolute left-0 top-0 w-1.5 h-full bg-sky-500 rounded-l-[1.5rem]"></div>
      
      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-search text-[8px]"></i> Pesquisa</span>
        <InputText v-model="pesquisa" @input="atualizarFiltro" placeholder="Nome, email..." class="custom-input-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[130px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-sitemap text-[8px]"></i> Companhia</span>
        <Dropdown v-model="filtroCompanhia" :options="companhias" optionLabel="label" optionValue="value" placeholder="Todas" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="flex flex-col gap-1 shrink-0 w-[130px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-users text-[8px]"></i> Gestor</span>
        <Dropdown v-model="filtroGestor" :options="gestores" optionLabel="label" optionValue="value" placeholder="Todos" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="flex flex-col gap-1 shrink-0 w-[130px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-tag text-[8px]"></i> Status</span>
        <Dropdown v-model="filtroStatus" :options="opcoesStatus" optionLabel="label" optionValue="value" placeholder="Todos" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="flex flex-col gap-1 shrink-0 w-[140px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-clock text-[8px]"></i> Referência</span>
        <Dropdown v-model="filtroTipoData" :options="opcoesTipoData" optionLabel="label" optionValue="value" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[110px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-calendar text-[8px]"></i> A partir</span>
        <Calendar v-model="filtroDataInicio" dateFormat="dd/mm/yy" placeholder="Início" class="w-full custom-calendar-minimal" inputClass="custom-input-minimal !w-full" />
      </div>

      <div class="flex flex-col gap-1 shrink-0 w-[110px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-calendar text-[8px]"></i> Até</span>
        <Calendar v-model="filtroDataFim" dateFormat="dd/mm/yy" placeholder="Fim" class="w-full custom-calendar-minimal" inputClass="custom-input-minimal !w-full" />
      </div>

            <div class="shrink-0">
        <Button 
          @click="mostrarApenasAmanha = !mostrarApenasAmanha"
          :class="[
            'transition-all duration-300 !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-4 !h-[42px] whitespace-nowrap',
            mostrarApenasAmanha 
              ? '!bg-sky-500 !text-white !border-sky-500 shadow-lg shadow-sky-500/20' 
              : '!bg-white dark:!bg-slate-900 !text-slate-400 !border-slate-100 dark:!border-slate-800 hover:!border-sky-500 hover:!text-sky-500'
          ]"
          outlined
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-plus" :class="mostrarApenasAmanha ? 'animate-bounce' : ''"></i>
            <span>Amanhã</span>
            <span v-if="mostrarApenasAmanha" class="bg-white/20 px-1.5 rounded-md ml-1">{{ clientesFiltrados.length }}</span>
          </div>
        </Button>
      </div>

      <div class="shrink-0 ml-auto pr-2">
        <Button 
          @click="limparFiltros" 
          icon="pi pi-filter-slash" 
          class="!bg-slate-50 dark:!bg-slate-800 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !text-slate-400 hover:!text-rose-500 !border-none transition-all w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer" 
          v-tooltip.top="'Limpar todos os filtros'" 
        />
      </div>

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

        <Column header="Ação" class="!py-0 text-center" style="width: 80px">
          <template #body="slotProps">
            <div class="flex justify-center items-center h-full">
              <div v-if="slotProps.data.tem_acao_pendente" 
                  class="relative flex items-center justify-center"
                  v-tooltip.top="'Este cliente possui ações pendentes no Kanban.'">
                <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-amber-400 opacity-30"></span>
                <i class="pi pi-bolt text-amber-500 text-lg z-10"></i>
              </div>
              
              <i v-else class="pi pi-check-circle text-emerald-500/10 text-xs"></i>
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

        <Column field="status_envio" header="Estado" sortable>
                <template #body="{ data }">
                  <div class="flex flex-col items-start gap-1">
                    
                    <Tag v-if="data.status_envio === 'Respondido'" value="Respondido" severity="success" class="!text-[10px] !font-black uppercase tracking-widest !px-3 shadow-sm" />
                    
                    <Tag v-else-if="data.status_envio === 'Pendente'" value="Na Fila" class="!bg-slate-100 dark:!bg-slate-800 !text-slate-500 !text-[10px] !font-black uppercase tracking-widest !px-3" />
                    
                    <Tag v-else-if="data.status_envio === 'Enviado'" value="Enviado" severity="info" class="!text-[10px] !font-black uppercase tracking-widest !px-3 shadow-sm" />
                    
                    <Tag v-else-if="data.status_envio === 'Erro'" value="Falha" severity="danger" v-tooltip.top="data.erro_msg || 'Erro desconhecido'" class="!text-[10px] !font-black uppercase tracking-widest !px-3 shadow-sm cursor-help" />
                    
                    <Tag v-else value="Não Iniciado" class="!bg-slate-50 dark:!bg-slate-800/30 !text-slate-400 !text-[10px] !font-black uppercase tracking-widest !px-3 border border-slate-200 dark:border-slate-700/50" />

                    <div v-if="data.status_envio === 'Enviado'" class="flex items-center gap-1.5 ml-1" v-tooltip.top="`Enviado em: ${data.data_envio_inicial ? new Date(data.data_envio_inicial).toLocaleDateString() : '---'}`">
                      
                      <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                        {{ (data.lembretes_enviados || 0) === 0 ? 'Aguardando' : `${data.lembretes_enviados}º Lembrete` }}
                      </span>
                      
                      <div class="flex gap-0.5">
                        <div :class="['w-1.5 h-1.5 rounded-full transition-colors', (data.lembretes_enviados || 0) >= 1 ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700']"></div>
                        <div :class="['w-1.5 h-1.5 rounded-full transition-colors', (data.lembretes_enviados || 0) >= 2 ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700']"></div>
                        <div :class="['w-1.5 h-1.5 rounded-full transition-colors', (data.lembretes_enviados || 0) >= 3 ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-700']"></div>
                      </div>
                      
                    </div>

                    <div v-if="data.status_envio === 'Respondido'" class="flex items-center ml-1">
                       <span class="text-[8px] font-black text-emerald-500/70 dark:text-emerald-400/50 uppercase tracking-widest">
                        Ciclo Fechado
                      </span>
                    </div>

                  </div>
                </template>
              </Column>

        <Column style="min-width: 200px">
          <template #header>
            <div class="flex flex-col">
              <span>Ciclo de Envio</span>
              <span class="text-[8px] text-orange-500 uppercase tracking-widest mt-0.5">A cada {{ regrasNPS.recorrencia_dias }} dias</span>
            </div>
          </template>
          
          <template #body="slotProps">
            <div class="flex flex-col gap-1.5 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div class="flex items-center justify-between text-[10px]"><span class="text-slate-400 font-bold uppercase">Último:</span><span class="text-slate-600 dark:text-slate-300 font-bold">{{ formatarData(slotProps.data.ultimo_envio) }}</span></div>
              <div class="flex items-center justify-between text-[10px]"><span class="text-orange-500 font-bold uppercase">Próximo:</span><span class="text-orange-600 font-black">{{ formatarData(slotProps.data.proximo_envio) }}</span></div>
            </div>
          </template>
        </Column>

        <Column header="Ações" alignFrozen="right" style="width: 130px">
          <template #body="slotProps">
            <div class="flex gap-1.5 justify-end items-center"> 
              <Button 
                v-if="temPermissao('audiencia:disparar')"
                :icon="idsEnviando.includes(slotProps.data.cliente_id) ? 'pi pi-spin pi-spinner' : 'pi pi-send'" 
                v-tooltip.top="idsEnviando.includes(slotProps.data.cliente_id) ? 'A processar...' : 'Forçar Disparo'" 
                @click="dispararIndividual(slotProps.data)" 
                :disabled="enviandoEmail || idsEnviando.includes(slotProps.data.cliente_id)" 
                class="w-7 h-7 !bg-orange-50 !text-orange-500 !border-none hover:!bg-orange-100 rounded-lg transition-colors !text-xs p-0 flex items-center justify-center" 
              />

              <Button 
                v-if="temPermissao('clientes:editar')"
                icon="pi pi-pencil" 
                v-tooltip.top="'Editar'" 
                @click="editarCliente(slotProps.data)" 
                class="w-7 h-7 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none hover:!text-slate-700 rounded-lg transition-colors !text-xs p-0 flex items-center justify-center" 
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="clienteDialog" :style="{width: '550px'}" :header="editando ? 'Editar Registo' : 'Nova Pessoa'" :modal="true" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
      <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo *</label>
          <InputText v-model="cliente.nome" class="custom-input w-full" placeholder="Ex: João Silva" />
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail Corporativo *</label>
          <InputText v-model="cliente.email" type="email" class="custom-input w-full" placeholder="joao@empresa.com" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Telefone</label>
            <InputText v-model="cliente.telefone" class="custom-input w-full" placeholder="+351 900 000 000" />
            </div>

            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Conta (Empresa)</label>
            <Dropdown v-model="cliente.empresa" :options="empresas" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Perfil</label>
            <Dropdown v-model="cliente.perfil_decisor" :options="perfis" optionLabel="nome" optionValue="nome" editable placeholder="Selecione ou digite" class="custom-dropdown w-full" />
            </div>
            
            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Cargo *</label>
            <Dropdown v-model="cliente.cargo" :options="cargos" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Gestor da Conta</label>
            <Dropdown v-model="cliente.gestor" :options="gestores.filter(g => g.value !== null)" optionLabel="label" optionValue="value" editable filter placeholder="Atribuir Gestor" class="custom-dropdown w-full" />
            </div>
            
            <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Segmento</label>
            <Dropdown v-model="cliente.segmento" :options="segmentos" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
            </div>
        </div>

      </div>
      <template #footer>
        <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full">
          <Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="clienteDialog = false" />
          <Button v-if="temPermissao('clientes:criar') || temPermissao('clientes:editar')" :label="editando ? 'Guardar' : 'Adicionar'" :loading="submetendo" class="flex-1 !bg-indigo-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg hover:scale-[1.02] transition-transform border-none py-3" @click="salvarCliente" />
        </div>
      </template>
    </Dialog>
    
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

/* ==========================================
   🌟 FILTROS ESTILO DASHBOARD
   ========================================== */

:deep(.custom-input-minimal),
:deep(.custom-dropdown-minimal),
:deep(.custom-calendar-minimal .p-inputtext) {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    color: inherit !important;
    @apply text-[10px] font-black uppercase text-slate-800 dark:text-white w-full outline-none ring-0;
}

:deep(.custom-input-minimal::placeholder),
:deep(.custom-calendar-minimal .p-inputtext::placeholder) {
    @apply text-slate-300 dark:text-slate-600 font-black !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-inputtext:enabled:hover),
:deep(.p-dropdown:not(.p-disabled):focus),
:deep(.p-dropdown:not(.p-disabled):hover) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

:deep(.custom-dropdown-minimal .p-dropdown-label) {
    @apply p-0 font-black flex items-center text-[10px] uppercase text-slate-800 dark:text-white !important;
}
:deep(.custom-dropdown-minimal .p-dropdown-trigger) {
    @apply w-4 text-slate-400 !important;
}

:deep(.p-dropdown-panel), :deep(.p-datepicker) {
    @apply dark:bg-slate-800 dark:border-slate-700 shadow-xl !important;
}
:deep(.p-dropdown-panel .p-dropdown-item) {
    @apply text-xs font-medium text-slate-600 dark:text-slate-300 !important;
}
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight) {
    @apply bg-sky-500/10 text-sky-600 dark:text-sky-400 !important;

/* Esconde a barra de scroll horizontal mas mantém a funcionalidade */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
}

/* ==========================================
   🌟 TABELA E MODAIS
   ========================================== */

:deep(.p-datatable .p-datatable-thead > tr > th) { @apply bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4; }
:deep(.p-datatable .p-datatable-tbody > tr) { @apply bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300; }
:deep(.p-datatable .p-datatable-tbody > tr > td) { @apply py-4 px-4; }

:deep(.p-checkbox .p-checkbox-box) { @apply border-slate-300 dark:border-slate-600 rounded-md transition-colors; }
:deep(.p-checkbox.p-highlight .p-checkbox-box) { @apply border-sky-500 bg-sky-500 !important; }

:deep(.custom-dialog .p-dialog-header) { @apply bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-6; }
:deep(.custom-dialog .p-dialog-content) { @apply dark:bg-slate-900; }
:deep(.custom-dialog .p-dialog-title) { @apply text-lg font-black italic tracking-tight text-slate-800 dark:text-white; }
</style>
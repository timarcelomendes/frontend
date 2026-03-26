<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';

import Menu from 'primevue/menu';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Avatar from 'primevue/avatar';
import Calendar from 'primevue/calendar';

const toast = useToast();

const acoes = ref([]);
const loading = ref(true);
const regrasSLA = ref({ sla_detrator_dias: 2, sla_neutro_dias: 5, sla_promotor_dias: 7 });

const route = useRoute();
const router = useRouter();

// ==========================================
// 📂 LISTAS DE DOMÍNIO (APOIO)
// ==========================================
const gestoresLista = ref([]);
const empresasDetalhes = ref([]);
const empresasLista = ref([]);
const companhiasLista = ref([]);

// ==========================================
// 🔎 FILTROS INTELIGENTES (LÓGICA E ORDEM)
// ==========================================
const filtroCompanhia = ref(null);
const filtroGestor = ref(null);
const filtroEmpresa = ref(null);
const filtroNota = ref(null);
const filtroData = ref(null);

const opcoesNota = ref([
  { label: 'Todas as Notas', value: null },
  { label: 'Promotores (9-10)', value: 'promotor' },
  { label: 'Neutros (7-8)', value: 'neutro' },
  { label: 'Detratores (0-6)', value: 'detrator' },
  { label: 'Ações Manuais', value: 'manual' }
]);

const limparFiltros = () => {
  filtroCompanhia.value = null;
  filtroGestor.value = null;
  filtroEmpresa.value = null;
  filtroNota.value = null;
  filtroData.value = null;
};

// Mágica para descobrir a companhia a partir da empresa (caso a API das ações não envie diretamente)
const getCompanhiaDaAcao = (acao) => {
  if (acao.companhia) return acao.companhia;
  const emp = empresasDetalhes.value.find(e => (e.empresa || e.nome) === acao.empresa_nome);
  return emp ? emp.companhia : null;
};

// Filtra a lista principal antes de a enviar para as colunas do Kanban
const acoesFiltradas = computed(() => {
  return acoes.value.filter(acao => {
    // 1. Filtro Companhia
    if (filtroCompanhia.value && getCompanhiaDaAcao(acao) !== filtroCompanhia.value) return false;
    
    // 2. Filtro Gestor
    if (filtroGestor.value && acao.gestor_id !== filtroGestor.value) return false;
    
    // 3. Filtro Empresa
    if (filtroEmpresa.value && acao.empresa_nome !== filtroEmpresa.value) return false;
    
    // 4. Filtro Nota (Contexto)
    if (filtroNota.value) {
      if (filtroNota.value === 'manual' && acao.resposta_nota !== null) return false;
      if (filtroNota.value === 'promotor' && (acao.resposta_nota === null || acao.resposta_nota < 9)) return false;
      if (filtroNota.value === 'neutro' && (acao.resposta_nota === null || acao.resposta_nota < 7 || acao.resposta_nota > 8)) return false;
      if (filtroNota.value === 'detrator' && (acao.resposta_nota === null || acao.resposta_nota > 6)) return false;
    }

    // 5. Filtro Data
    if (filtroData.value && filtroData.value[0] && filtroData.value[1]) {
      const dataAcao = new Date(acao.created_at || new Date());
      dataAcao.setHours(0,0,0,0);
      const start = new Date(filtroData.value[0]);
      start.setHours(0,0,0,0);
      const end = new Date(filtroData.value[1]);
      end.setHours(23,59,59,999);
      if (dataAcao < start || dataAcao > end) return false;
    }

    return true;
  });
});

// ==========================================
// 📊 ESTATÍSTICAS E SEPARAÇÃO DE COLUNAS
// ==========================================
const acoesPendentes = computed(() => acoesFiltradas.value.filter(a => a.status === 'Pendente'));
const acoesAndamento = computed(() => acoesFiltradas.value.filter(a => a.status === 'Em Andamento'));
const acoesConcluidas = computed(() => acoesFiltradas.value.filter(a => a.status === 'Concluído'));

const estatisticas = computed(() => ({
  pendentes: acoesPendentes.value.length,
  emAndamento: acoesAndamento.value.length,
  concluidas: acoesConcluidas.value.length
}));

// ==========================================
// 💾 CARREGAMENTO DE DADOS (API)
// ==========================================
const carregarAcoes = async () => {
  try {
    loading.value = true;
    const response = await api.get('/acoes');
    acoes.value = response.data;

    if (route.query.abrir) {
      const acaoAlvo = acoes.value.find(a => String(a.id) === String(route.query.abrir));
      
      if (acaoAlvo) {
        abrirEdicao(acaoAlvo);
        
        router.replace({ path: route.path });
      }
    }

  } catch (error) {
    console.error("Erro ao carregar ações:", error);
  } finally {
    loading.value = false;
  }
};

const carregarCompanhias = async () => {
  try {
    const res = await api.get('/dashboard/companhias'); 
    if (res.data && Array.isArray(res.data)) {
      // Remove o item genérico da API
      const nomes = res.data.filter(c => c && c !== "Todas as Companhias");
      companhiasLista.value = [...new Set(nomes)].sort();
    }
  } catch (error) {
    // Tratado no fallback
  }
};

const carregarEmpresas = async () => {
  try {
    const res = await api.get('/cadastros/empresas'); 
    if (res.data) {
      empresasDetalhes.value = res.data;
      const nomes = res.data.map(e => e.empresa || e.nome || e).filter(Boolean);
      empresasLista.value = [...new Set(nomes)].sort();
    }
  } catch (error) {
    // Tratado no fallback
  }
};

// Fallback: Se alguma rota falhar, o sistema preenche as listas baseando-se no que já existe no Kanban
const extrairListasFallback = () => {
  if (companhiasLista.value.length === 0 && acoes.value.length > 0) {
    const nomesC = acoes.value.map(a => getCompanhiaDaAcao(a)).filter(Boolean);
    companhiasLista.value = [...new Set(nomesC)].sort();
  }
  if (empresasLista.value.length === 0 && acoes.value.length > 0) {
    const nomesE = acoes.value.map(a => a.empresa_nome).filter(Boolean);
    empresasLista.value = [...new Set(nomesE)].sort();
  }
};

const carregarRegrasSLA = async () => {
  try {
    const res = await api.get('/config/regras');
    if (res.data) regrasSLA.value = res.data;
  } catch (error) {}
};

const carregarGestores = async () => {
  try {
    const res = await api.get('/cadastros/gestores');
    gestoresLista.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("Erro ao carregar gestores:", error);
  }
};

// ==========================================
// 🖱️ DRAG & DROP
// ==========================================
const onDragStart = (event, id) => {
  event.dataTransfer.dropEffect = 'move';
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('acaoId', id.toString());
};

const onDrop = async (event, novoStatus) => {
  const idStr = event.dataTransfer.getData('acaoId');
  if (!idStr) return;
  const id = parseInt(idStr);
  const acao = acoes.value.find(a => a.id === id);
  if (acao && acao.status !== novoStatus) {
    const statusAntigo = acao.status;
    acao.status = novoStatus;
    try {
      await api.put(`/acoes/${id}`, { status: novoStatus });
    } catch (error) {
      acao.status = statusAntigo;
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao mover tarefa.' });
    }
  }
};

// ==========================================
// 📝 DIALOG (CRIAR/EDITAR) E AUTO-ATRIBUIÇÃO
// ==========================================
const dialogAcao = ref(false);
const salvando = ref(false);
const acaoAtual = ref({});

const abrirNovo = () => {
  acaoAtual.value = { id: null, titulo: '', descricao: '', empresa_nome: '', companhia: '', gestor_id: null, prioridade: 'Média', status: 'Pendente' };
  dialogAcao.value = true;
};

const abrirEdicao = (acao) => {
  acaoAtual.value = { ...acao };
  dialogAcao.value = true;
};

// Ouve a mudança no modal para tentar preencher o gestor e a companhia automaticamente
const aoMudarEmpresa = () => {
  if (!acaoAtual.value.empresa_nome) return;
  const emp = empresasDetalhes.value.find(e => (e.empresa || e.nome) === acaoAtual.value.empresa_nome);
  
  if (emp) {
    if (emp.gestor_id) acaoAtual.value.gestor_id = emp.gestor_id;
    if (emp.companhia) acaoAtual.value.companhia = emp.companhia;
  }
};

const salvarAcao = async () => {
  if (!acaoAtual.value.titulo) return toast.add({ severity: 'warn', summary: 'Obrigatório', detail: 'O título é obrigatório.' });
  if (!acaoAtual.value.empresa_nome) return toast.add({ severity: 'warn', summary: 'Obrigatório', detail: 'A empresa é obrigatória.' });

  salvando.value = true;
  try {
    if (acaoAtual.value.id) await api.put(`/acoes/${acaoAtual.value.id}`, acaoAtual.value);
    else await api.post('/acoes', acaoAtual.value);
    
    dialogAcao.value = false;
    carregarAcoes();
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Ação guardada com sucesso.' });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar a ação.' });
  } finally {
    salvando.value = false;
  }
};

const excluirAcao = async (id) => {
  if (!confirm('Excluir esta ação permanentemente?')) return;
  try {
    await api.delete(`/acoes/${id}`);
    acoes.value = acoes.value.filter(a => a.id !== id);
    toast.add({ severity: 'success', summary: 'Excluída', detail: 'Ação removida do quadro.' });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir.' });
  }
};

// ==========================================
// ⚙️ MENU & HELPERS DE UI (DOT UI)
// ==========================================
const menuOpcoes = ref();
const acaoSelecionada = ref(null);
const toggleMenu = (event, acao) => {
  acaoSelecionada.value = acao;
  menuOpcoes.value.toggle(event);
};

const menuItens = ref([
  { label: 'Editar Ação', icon: 'pi pi-pencil', command: () => abrirEdicao(acaoSelecionada.value) },
  { separator: true },
  { label: 'Excluir', icon: 'pi pi-trash', command: () => excluirAcao(acaoSelecionada.value.id) }
]);

const getGestor = (id) => gestoresLista.value.find(g => g.id === id);

const getNpsDot = (nota) => {
  if (nota === null || nota === undefined) return 'text-slate-300 dark:text-slate-600';
  if (nota <= 6) return 'text-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
  if (nota <= 8) return 'text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
  return 'text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
};

const formatarId = (id) => id ? `#${String(id).padStart(3, '0')}` : '#---';

const getPrioDot = (prio) => {
  if (prio === 'Alta') return 'text-rose-500';
  if (prio === 'Média') return 'text-yellow-500';
  return 'text-sky-500';
};

const obterSLA = (acao) => {
  if (acao.status === 'Concluído') return null;
  const nota = acao.resposta_nota;
  let diasSLA = regrasSLA.value.sla_promotor_dias;
  if (nota !== null && nota <= 6) diasSLA = regrasSLA.value.sla_detrator_dias;
  else if (nota !== null && nota <= 8) diasSLA = regrasSLA.value.sla_neutro_dias;

  const dataAlvo = new Date(acao.created_at || new Date());
  dataAlvo.setDate(dataAlvo.getDate() + diasSLA);
  const hoje = new Date();
  hoje.setHours(0,0,0,0); dataAlvo.setHours(0,0,0,0);
  
  const diff = Math.ceil((dataAlvo - hoje) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { texto: `Atrasado ${Math.abs(diff)}d`, cor: 'text-rose-600 font-bold bg-rose-50 dark:bg-rose-500/10' };
  if (diff === 0) return { texto: 'Vence Hoje', cor: 'text-orange-600 font-bold bg-orange-50 dark:bg-orange-500/10' };
  return { texto: `${diff} dias`, cor: 'text-slate-500 bg-slate-50 dark:bg-slate-800' };
};

const gerarIniciais = (nome) => nome ? nome.split(' ').map((n, i, a) => i === 0 || i === a.length - 1 ? n[0] : '').join('').toUpperCase() : 'G';

onMounted(() => { 
  carregarRegrasSLA(); 
  carregarAcoes(); 
  carregarGestores(); 
  carregarEmpresas();
  carregarCompanhias();
});
</script>

<template>
  <div class="max-w-[1600px] mx-auto animate-fadein p-4 lg:p-8">
    
    <div class="flex justify-between items-end mb-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Planos de Ação <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-500 font-medium mt-1">Gestão de Close The Loop e Pendências.</p>
      </div>
      <div class="flex gap-3">
        <Button icon="pi pi-refresh" @click="carregarAcoes" :loading="loading" class="w-10 h-10 !bg-slate-50 dark:!bg-slate-800 !text-slate-600 !border-none !rounded-lg hover:!bg-slate-100 transition-colors" v-tooltip.top="'Atualizar Kanban'" />
        <Button label="Nova Ação" icon="pi pi-plus" @click="abrirNovo" class="!bg-slate-900 dark:!bg-white !text-white dark:!text-slate-900 !border-none !rounded-lg !text-[11px] !font-black !uppercase !tracking-widest !px-5 shadow-md hover:-translate-y-0.5 transition-transform" />
      </div>
    </div>

    <div class="flex flex-wrap lg:flex-nowrap gap-4 mb-8 p-4 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm items-end">
      
      <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Companhia</label>
        <Dropdown v-model="filtroCompanhia" :options="companhiasLista" placeholder="Todas as companhias" showClear filter class="custom-input !h-[46px] flex items-center" />
      </div>

      <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Responsável</label>
        <Dropdown v-model="filtroGestor" :options="gestoresLista" optionLabel="nome" optionValue="id" filter placeholder="Todos os gestores" showClear class="custom-input !h-[46px] flex items-center">
          <template #value="slotProps">
            <div v-if="slotProps.value" class="flex items-center gap-2">
              <Avatar :label="gerarIniciais(getGestor(slotProps.value)?.nome)" shape="circle" class="!w-5 !h-5 !text-[8px] !font-black !bg-slate-200 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" />
              <span class="text-xs font-bold">{{ getGestor(slotProps.value)?.nome }}</span>
            </div>
            <span v-else class="text-slate-400">Todos os gestores</span>
          </template>
          <template #item="slotProps">
            <div class="flex items-center gap-3">
              <Avatar :label="gerarIniciais(slotProps.option.nome)" shape="circle" class="!w-8 !h-8 !text-[10px] !font-black !bg-slate-100 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" />
              <div class="flex flex-col">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ slotProps.option.nome }}</span>
                <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{{ slotProps.option.papel || 'Gestor' }}</span>
              </div>
            </div>
          </template>
        </Dropdown>
      </div>
      
      <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Empresa</label>
        <Dropdown v-model="filtroEmpresa" :options="empresasLista" placeholder="Todas as empresas" showClear filter class="custom-input !h-[46px] flex items-center" />
      </div>

      <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Contexto (NPS)</label>
        <Dropdown v-model="filtroNota" :options="opcoesNota" optionLabel="label" optionValue="value" placeholder="Todas as notas" showClear class="custom-input !h-[46px] flex items-center" />
      </div>

      <div class="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Data de Criação</label>
        <Calendar v-model="filtroData" selectionMode="range" :manualInput="false" placeholder="Período" showIcon showClear class="custom-calendar w-full !h-[46px] flex items-center" />
      </div>

      <Button icon="pi pi-filter-slash" @click="limparFiltros" class="!bg-slate-50 dark:!bg-slate-800 !text-slate-400 hover:!text-orange-500 !border-none !rounded-xl h-[46px] w-[46px] shrink-0 transition-colors" v-tooltip.top="'Limpar Filtros'" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      
      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800" @dragover.prevent @drop="onDrop($event, 'Pendente')">
        <div class="flex justify-between items-center px-2 pt-1 pb-2 border-b border-slate-200/50 dark:border-slate-800">
          <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">Pendente <span class="text-slate-400 ml-1">{{ estatisticas.pendentes }}</span></h3>
          <i class="pi pi-inbox text-slate-400 text-xs"></i>
        </div>
        
        <div class="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div v-for="acao in acoesPendentes" :key="acao.id" draggable="true" @dragstart="onDragStart($event, acao.id)" 
               class="bg-white dark:bg-slate-800 p-4 rounded-[1.25rem] shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all group">
            
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2 mt-1">
                <i class="pi pi-circle-fill text-[8px] rounded-full shrink-0" :class="getNpsDot(acao.resposta_nota)" v-tooltip.top="acao.resposta_nota ? `Nota NPS: ${acao.resposta_nota}` : 'Origem Manual'"></i>
                <div class="flex flex-col leading-tight overflow-hidden">
                  <span v-if="getCompanhiaDaAcao(acao)" class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate max-w-[140px]">{{ getCompanhiaDaAcao(acao) }}</span>
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[140px]">{{ acao.empresa_nome }}</span>
                </div>
              </div>
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-2">
                <span class="text-orange-500 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            <p v-if="acao.descricao || acao.resposta_comentario" class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line leading-relaxed border-l-2 border-orange-500/50 pl-2">
                {{ acao.descricao || acao.resposta_comentario }}
            </p>
            
            <div class="flex items-center gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 mt-auto">
              <Avatar :label="gerarIniciais(getGestor(acao.gestor_id)?.nome)" shape="circle" class="!w-6 !h-6 !text-[9px] !font-black !bg-slate-100 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" v-tooltip.top="getGestor(acao.gestor_id)?.nome || 'Sem gestor atribuído'" />
              
              <div v-if="obterSLA(acao)" class="px-2 py-1 rounded-md text-[9px] uppercase tracking-widest" :class="obterSLA(acao).cor">
                {{ obterSLA(acao).texto }}
              </div>

              <div class="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-slate-500" v-tooltip.top="'Prioridade'">
                <i class="pi pi-circle-fill text-[8px]" :class="getPrioDot(acao.prioridade)"></i> {{ acao.prioridade }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800" @dragover.prevent @drop="onDrop($event, 'Em Andamento')">
        <div class="flex justify-between items-center px-2 pt-1 pb-2 border-b border-slate-200/50 dark:border-slate-800">
          <h3 class="text-[11px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-500">Em Andamento <span class="text-slate-400 ml-1">{{ estatisticas.emAndamento }}</span></h3>
          <i class="pi pi-spinner text-sky-500 text-xs animate-spin-slow"></i>
        </div>
        
        <div class="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div v-for="acao in acoesAndamento" :key="acao.id" draggable="true" @dragstart="onDragStart($event, acao.id)" 
               class="bg-white dark:bg-slate-800 p-4 rounded-[1.25rem] shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all group">
            
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2 mt-1">
                <i class="pi pi-circle-fill text-[8px] rounded-full shrink-0" :class="getNpsDot(acao.resposta_nota)" v-tooltip.top="acao.resposta_nota ? `Nota NPS: ${acao.resposta_nota}` : 'Origem Manual'"></i>
                <div class="flex flex-col leading-tight overflow-hidden">
                  <span v-if="getCompanhiaDaAcao(acao)" class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate max-w-[140px]">{{ getCompanhiaDaAcao(acao) }}</span>
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[140px]">{{ acao.empresa_nome }}</span>
                </div>
              </div>
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-sky-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-2">
                <span class="text-orange-500 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            <p v-if="acao.descricao || acao.resposta_comentario" class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line leading-relaxed border-l-2 border-orange-500/50 pl-2">
                {{ acao.descricao || acao.resposta_comentario }}
            </p>
            
            <div class="flex items-center gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 mt-auto">
              <Avatar :label="gerarIniciais(getGestor(acao.gestor_id)?.nome)" shape="circle" class="!w-6 !h-6 !text-[9px] !font-black !bg-slate-100 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" v-tooltip.top="getGestor(acao.gestor_id)?.nome || 'Sem gestor atribuído'" />
              
              <div v-if="obterSLA(acao)" class="px-2 py-1 rounded-md text-[9px] uppercase tracking-widest" :class="obterSLA(acao).cor">
                {{ obterSLA(acao).texto }}
              </div>

              <div class="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-slate-500" v-tooltip.top="'Prioridade'">
                <i class="pi pi-circle-fill text-[8px]" :class="getPrioDot(acao.prioridade)"></i> {{ acao.prioridade }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800 opacity-70 hover:opacity-100 transition-opacity" @dragover.prevent @drop="onDrop($event, 'Concluído')">
        <div class="flex justify-between items-center px-2 pt-1 pb-2 border-b border-slate-200/50 dark:border-slate-800">
          <h3 class="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Concluído <span class="text-slate-400 ml-1">{{ estatisticas.concluidas }}</span></h3>
          <i class="pi pi-check-circle text-emerald-500 text-xs"></i>
        </div>
        
        <div class="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div v-for="acao in acoesConcluidas" :key="acao.id" draggable="true" @dragstart="onDragStart($event, acao.id)" 
               class="bg-white/60 dark:bg-slate-800/40 p-4 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-700 cursor-grab hover:shadow-sm transition-all group">
            
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2 mt-1 opacity-70">
                <i class="pi pi-circle-fill text-[8px] rounded-full shrink-0" :class="getNpsDot(acao.resposta_nota)"></i>
                <div class="flex flex-col leading-tight overflow-hidden">
                  <span v-if="getCompanhiaDaAcao(acao)" class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate max-w-[140px]">{{ getCompanhiaDaAcao(acao) }}</span>
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[140px]">{{ acao.empresa_nome }}</span>
                </div>
              </div>
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600 leading-snug mb-2">
                <span class="text-orange-500/60 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            
            <div class="flex items-center gap-3 pt-3 mt-auto">
              <Avatar :label="gerarIniciais(getGestor(acao.gestor_id)?.nome)" shape="circle" class="!w-6 !h-6 !text-[9px] !font-black !bg-slate-100 dark:!bg-slate-800 !text-slate-400" v-tooltip.top="getGestor(acao.gestor_id)?.nome || 'Sem gestor atribuído'" />
              <div class="ml-auto flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                <i class="pi pi-check"></i> Fechado
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <Menu ref="menuOpcoes" :model="menuItens" :popup="true" class="!rounded-xl !border-slate-200 dark:!border-slate-700 text-xs w-40" />

    <Dialog v-model:visible="dialogAcao" :modal="true" :style="{width: '520px'}" :closable="false" class="custom-dialog-no-header">
      <div class="bg-slate-900 p-6 flex justify-between items-center rounded-t-3xl">
        <h2 class="text-lg font-black italic tracking-tight text-white">{{ acaoAtual.id ? 'Editar Ação' : 'Nova Ação' }}</h2>
        <button @click="dialogAcao = false" class="text-slate-400 hover:text-white p-2"><i class="pi pi-times"></i></button>
      </div>
      
      <div class="p-6 space-y-5 bg-white dark:bg-slate-900 rounded-b-3xl">
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título da Ação *</label>
          <InputText v-model="acaoAtual.titulo" class="custom-input w-full font-bold" placeholder="Ex: Analisar feedback negativo do cliente" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Empresa *</label>
            <Dropdown v-model="acaoAtual.empresa_nome" :options="empresasLista" editable filter placeholder="Selecionar/Digitar" class="custom-input !p-0" @change="aoMudarEmpresa" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Companhia</label>
            <Dropdown v-model="acaoAtual.companhia" :options="companhiasLista" editable filter placeholder="Opcional" class="custom-input !p-0" />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Responsável</label>
            <Dropdown v-model="acaoAtual.gestor_id" :options="gestoresLista" optionLabel="nome" optionValue="id" filter placeholder="Atribuir gestor" class="custom-input !p-0">
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex items-center gap-2 px-3 py-2.5">
                  <Avatar :label="gerarIniciais(getGestor(slotProps.value)?.nome)" shape="circle" class="!w-6 !h-6 !text-[9px] !font-black !bg-slate-200 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" />
                  <span class="text-sm font-bold">{{ getGestor(slotProps.value)?.nome }}</span>
                </div>
                <span v-else class="p-3.5 text-sm text-slate-400">Selecionar...</span>
              </template>
              <template #item="slotProps">
                <div class="flex items-center gap-3">
                  <Avatar :label="gerarIniciais(slotProps.option.nome)" shape="circle" class="!w-8 !h-8 !text-[10px] !font-black !bg-slate-100 dark:!bg-slate-700 !text-slate-600 dark:!text-slate-300" />
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ slotProps.option.nome }}</span>
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{{ slotProps.option.papel || 'Gestor' }}</span>
                  </div>
                </div>
              </template>
            </Dropdown>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridade</label>
              <Dropdown v-model="acaoAtual.prioridade" :options="['Alta', 'Média', 'Baixa']" class="custom-input !p-0" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
              <Dropdown v-model="acaoAtual.status" :options="['Pendente', 'Em Andamento', 'Concluído']" class="custom-input !p-0" />
            </div>
          </div>
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Plano de Ação (Notas / Detalhes)</label>
          <Textarea v-model="acaoAtual.descricao" rows="4" class="custom-input w-full resize-none" placeholder="Descreva os passos que precisam ser tomados..." />
        </div>
        
        <div class="pt-2 flex gap-3 w-full">
          <Button label="Cancelar" text class="flex-1 text-slate-500 font-bold" @click="dialogAcao = false" />
          <Button label="Guardar Ação" :loading="salvando" class="flex-1 bg-slate-900 text-white font-bold border-none rounded-xl hover:-translate-y-0.5 transition-transform" @click="salvarAcao" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.animate-spin-slow { animation: spin 3s linear infinite; }

:deep(.custom-input), :deep(.custom-calendar .p-inputtext) {
  @apply bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-slate-700 dark:text-slate-200 border w-full;
}

:deep(.custom-calendar .p-button) {
  @apply bg-transparent text-slate-400 border-none hover:text-orange-500 transition-colors right-1 relative;
}

:deep(.custom-dialog-no-header .p-dialog-header) { display: none !important; }
:deep(.custom-dialog-no-header .p-dialog-content) { padding: 0 !important; @apply rounded-3xl bg-transparent; }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 dark:bg-slate-700 rounded-full; }

:deep(.p-dropdown .p-dropdown-label), :deep(.p-dropdown .p-inputtext) { @apply p-3.5 text-sm outline-none bg-transparent shadow-none border-none; }
:deep(.p-dropdown) { @apply overflow-hidden; }
:deep(.p-menu) { @apply p-1 !important; }
:deep(.p-menuitem-link) { @apply px-3 py-2 text-sm !important; }
</style>
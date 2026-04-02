<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';
import { useRoute, useRouter } from 'vue-router';
import { temPermissao } from '../utils/permissoes';

import Menu from 'primevue/menu';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import MultiSelect from 'primevue/multiselect';

const toast = useToast();

const acoes = ref([]);
const loading = ref(true);
const regrasSLA = ref({ 
  sla_detrator_dias: 2, 
  sla_neutro_dias: 5, 
  sla_promotor_dias: 7 
});
const route = useRoute();
const router = useRouter();

// ==========================================
// 📂 LISTAS DE DOMÍNIO (APOIO)
// ==========================================
const gestoresLista = ref([]);
const empresasDetalhes = ref([]);
const empresasLista = ref([]);
const companhiasLista = ref([]);

const opcoesContexto = ref([
  { label: 'Promotores (9-10)', value: 'promotor' },
  { label: 'Neutros (7-8)', value: 'neutro' },
  { label: 'Detratores (0-6)', value: 'detrator' },
  { label: 'Ações Manuais', value: 'manual' }
]);

// ==========================================
// 🔎 FILTROS INTELIGENTES (MULTISELECT)
// ==========================================
const filtroCompanhia = ref([]);
const filtroResponsavel = ref([]);
const filtroEmpresa = ref([]);
const filtroContexto = ref([]);
const filtroData = ref(null);

const limparFiltros = () => {
  filtroCompanhia.value = [];
  filtroResponsavel.value = [];
  filtroEmpresa.value = [];
  filtroContexto.value = [];
  filtroData.value = null;
};

const getCompanhiaDaAcao = (acao) => {
  if (acao.companhia) return acao.companhia;
  const emp = empresasDetalhes.value.find(e => (e.empresa || e.nome) === acao.empresa_nome);
  return emp ? emp.companhia : null;
};

const acoesFiltradas = computed(() => {
  return acoes.value.filter(acao => {
    
    if (filtroCompanhia.value.length > 0) {
      const companhiaAtual = getCompanhiaDaAcao(acao);
      if (!filtroCompanhia.value.includes(companhiaAtual)) return false;
    }
    
    if (filtroResponsavel.value.length > 0) {
      if (!filtroResponsavel.value.includes(acao.gestor_id)) return false;
    }
    
    if (filtroEmpresa.value.length > 0) {
      if (!filtroEmpresa.value.includes(acao.empresa_nome)) return false;
    }
    
    if (filtroContexto.value.length > 0) {
      const isManual = acao.resposta_nota === null;
      const isPromotor = acao.resposta_nota >= 9;
      const isNeutro = acao.resposta_nota >= 7 && acao.resposta_nota <= 8;
      const isDetrator = acao.resposta_nota !== null && acao.resposta_nota <= 6;

      let passouContexto = false;
      if (filtroContexto.value.includes('manual') && isManual) passouContexto = true;
      if (filtroContexto.value.includes('promotor') && isPromotor) passouContexto = true;
      if (filtroContexto.value.includes('neutro') && isNeutro) passouContexto = true;
      if (filtroContexto.value.includes('detrator') && isDetrator) passouContexto = true;

      if (!passouContexto) return false;
    }

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
      const nomes = res.data.filter(c => c && c !== "Todas as Companhias");
      companhiasLista.value = [...new Set(nomes)].sort();
    }
  } catch (error) {}
};

const carregarEmpresas = async () => {
  try {
    const res = await api.get('/cadastros/empresas'); 
    if (res.data) {
      empresasDetalhes.value = res.data;
      const nomes = res.data.map(e => e.empresa || e.nome || e).filter(Boolean);
      empresasLista.value = [...new Set(nomes)].sort();
    }
  } catch (error) {}
};

const carregarRegrasSLA = async () => {
  try {
    const res = await api.get('/config/regras');
    if (res.data) {
      if (res.data.sla_detrator_dias) regrasSLA.value.sla_detrator_dias = parseInt(res.data.sla_detrator_dias);
      if (res.data.sla_neutro_dias)   regrasSLA.value.sla_neutro_dias = parseInt(res.data.sla_neutro_dias);
      if (res.data.sla_promotor_dias) regrasSLA.value.sla_promotor_dias = parseInt(res.data.sla_promotor_dias);
    }
  } catch (error) {
    console.error("Erro ao carregar regras de SLA:", error);
  }
};

const carregarGestores = async () => {
  try {
    const res = await api.get('/cadastros/gestores');
    gestoresLista.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {}
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
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao mover tarefa.', life: 4000 });
    }
  }
};

// ==========================================
// 📝 DIALOG (CRIAR/EDITAR) E AUTO-ATRIBUIÇÃO
// ==========================================
const dialogAcao = ref(false);
const salvando = ref(false);
const acaoAtual = ref({});

const abrirNovaAcao = () => {
  acaoAtual.value = { 
    id: null, 
    titulo: '', 
    descricao: '', 
    empresa_nome: '', 
    empresa_id: null, 
    companhia: '', 
    gestor_id: null, 
    prioridade: 'Média', 
    status: 'Pendente',
    contexto: 'promotor'
  };
  dialogAcao.value = true;
};

const abrirEdicao = (acao) => {
  acaoAtual.value = { 
    ...acao,
    gestor_id: acao.gestor_id ? Number(acao.gestor_id) : null,
    empresa_id: acao.empresa_id ? Number(acao.empresa_id) : null
  };
  dialogAcao.value = true;
};

const aoMudarEmpresa = () => {
  if (!acaoAtual.value.empresa_nome) return;
  const emp = empresasDetalhes.value.find(e => (e.empresa || e.nome) === acaoAtual.value.empresa_nome);
  
  if (emp) {
    acaoAtual.value.empresa_id = emp.id;
    if (emp.gestor_id) acaoAtual.value.gestor_id = Number(emp.gestor_id);
    if (emp.companhia) acaoAtual.value.companhia = emp.companhia;
  }
};

const salvarAcao = async () => {
  if (!acaoAtual.value.titulo) return toast.add({ severity: 'warn', summary: 'Obrigatório', detail: 'O título é obrigatório.', life: 4000 });
  if (!acaoAtual.value.empresa_nome) return toast.add({ severity: 'warn', summary: 'Obrigatório', detail: 'A empresa é obrigatória.', life: 4000 });

  salvando.value = true;
  try {
    const emp = empresasDetalhes.value.find(e => (e.empresa || e.nome) === acaoAtual.value.empresa_nome);
    
    // 👇 CÁLCULO DINÂMICO DO PRAZO (SLA) BASEADO NAS REGRAS DO BANCO
    let dataPrazo = null;
    if (!acaoAtual.value.id) {
       const hoje = new Date();
       let dias = regrasSLA.value.sla_promotor_dias; // Default
       
       if (acaoAtual.value.contexto === 'detrator') dias = regrasSLA.value.sla_detrator_dias;
       else if (acaoAtual.value.contexto === 'neutro') dias = regrasSLA.value.sla_neutro_dias;
       
       hoje.setDate(hoje.getDate() + dias);
       dataPrazo = hoje.toISOString();
    }

    const payload = {
      titulo: acaoAtual.value.titulo,
      descricao: acaoAtual.value.descricao,
      empresa_id: emp ? emp.id : acaoAtual.value.empresa_id,
      gestor_id: acaoAtual.value.gestor_id,
      companhia: acaoAtual.value.companhia,
      prioridade: acaoAtual.value.prioridade,
      status: acaoAtual.value.status,
      prazo_limite: dataPrazo || acaoAtual.value.prazo_limite, // 👈 Garante que o SLA é enviado ao banco
      resposta_id: acaoAtual.value.resposta_id || null
    };

    if (acaoAtual.value.id) {
      await api.put(`/acoes/${acaoAtual.value.id}`, payload); 
    } else {
      await api.post('/acoes', payload);
    }
    
    dialogAcao.value = false;
    await carregarAcoes(); 
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Ação guardada com sucesso.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar a ação.', life: 5000 });
  } finally {
    salvando.value = false;
  }
};

const excluirAcao = async (id) => {
  if (!confirm('Excluir esta ação permanentemente?')) return;
  try {
    await api.delete(`/acoes/${id}`);
    acoes.value = acoes.value.filter(a => a.id !== id);
    toast.add({ severity: 'success', summary: 'Excluída', detail: 'Ação removida do quadro.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir.', life: 5000 });
  }
};

// ==========================================
// ⚙️ MENU & HELPERS DE UI
// ==========================================
const menuOpcoes = ref();
const acaoSelecionada = ref(null);

const toggleMenu = (event, acao) => {
  acaoSelecionada.value = acao;
  menuOpcoes.value.toggle(event);
};

const menuItens = computed(() => {
  const itens = [];
  if (temPermissao('acoes:editar')) {
    itens.push({ label: 'Editar Ação', icon: 'pi pi-pencil', command: () => abrirEdicao(acaoSelecionada.value) });
  }
  if (temPermissao('acoes:editar') && temPermissao('acoes:excluir')) {
    itens.push({ separator: true });
  }
  if (temPermissao('acoes:excluir')) {
    itens.push({ label: 'Excluir', icon: 'pi pi-trash', command: () => excluirAcao(acaoSelecionada.value.id) });
  }
  return itens;
});

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

const gerarIniciais = (nome) => nome ? nome.split(' ').map((n, i, a) => i === 0 || i === a.length - 1 ? n[0] : '').join('').toUpperCase() : 'U';

onMounted(async () => {
  await Promise.all([
    carregarRegrasSLA(),
    carregarAcoes(),
    carregarGestores(),
    carregarEmpresas(),
    carregarCompanhias()
  ]);

  if (route.query.empresa && empresasLista.value.includes(route.query.empresa)) {
    filtroEmpresa.value = [route.query.empresa];
    toast.add({ severity: 'info', summary: 'Filtro Aplicado', detail: `A exibir ações para: ${route.query.empresa}`, life: 4000 });
  }
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
        <Button v-if="temPermissao('acoes:criar')" label="Nova Ação" icon="pi pi-plus" @click="abrirNovaAcao" class="!bg-orange-500 hover:!bg-orange-600 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 !py-3 shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform shrink-0" />
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-3 pl-4 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-nowrap items-center w-full overflow-x-auto hide-scrollbar relative mb-8 gap-4">
      
      <div class="absolute left-0 top-0 w-1.5 h-full bg-sky-500 rounded-l-[1.5rem]"></div>
      
      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-sitemap text-[8px]"></i> Companhia</span>
        <MultiSelect v-model="filtroCompanhia" :options="companhiasLista" placeholder="Todas as companhias" display="chip" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-user text-[8px]"></i> Responsável</span>
        <MultiSelect v-model="filtroResponsavel" :options="gestoresLista" optionLabel="nome" optionValue="id" placeholder="Todos os gestores" display="chip" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-building text-[8px]"></i> Empresa</span>
        <MultiSelect v-model="filtroEmpresa" :options="empresasLista" placeholder="Todas as empresas" display="chip" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-star text-[8px]"></i> Contexto</span>
        <MultiSelect v-model="filtroContexto" :options="opcoesContexto" optionLabel="label" optionValue="value" placeholder="Todas as notas" display="chip" class="custom-dropdown-minimal w-full" />
      </div>

      <div class="w-px h-8 bg-slate-100 dark:bg-slate-800 shrink-0"></div>

      <div class="flex flex-col gap-1 shrink-0 w-[180px]">
        <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-calendar text-[8px]"></i> Data de Criação</span>
        <Calendar v-model="filtroData" selectionMode="range" :manualInput="false" placeholder="Todos os períodos" class="custom-calendar-minimal w-full" />
      </div>

      <div class="shrink-0 ml-auto pr-2">
        <Button @click="limparFiltros" icon="pi pi-filter-slash" class="!bg-slate-50 dark:!bg-slate-800 hover:!bg-rose-50 dark:hover:!bg-rose-500/10 !text-slate-400 hover:!text-rose-500 !border-none transition-all w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer" v-tooltip.top="'Limpar Filtros'" />
      </div>

    </div>  

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      
      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800" @dragover="temPermissao('acoes:mover') ? $event.preventDefault() : null" @drop="temPermissao('acoes:mover') ? onDrop($event, 'Pendente') : null">
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
              <button v-if="temPermissao('acoes:editar') || temPermissao('acoes:excluir')" @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-2">
                <span class="text-orange-500 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            <p v-if="acao.descricao || acao.resposta_comentario" class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line leading-relaxed border-l-2 border-orange-500/50 pl-2">
                {{ acao.descricao || acao.resposta_comentario }}
            </p>
            
            <div class="flex items-center gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 mt-auto">
              
              <div class="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-sm" v-tooltip.top="getGestor(acao.gestor_id)?.nome || acao.gestor_nome || 'Sem gestor'">
                <img v-if="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" :src="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" class="w-full h-full object-cover" @error="(e) => e.target.style.display = 'none'" />
                <span v-else class="text-[9px] font-black text-slate-500 dark:text-slate-300">{{ gerarIniciais(getGestor(acao.gestor_id)?.nome || acao.gestor_nome) }}</span>
              </div>
              
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

      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800" @dragover="temPermissao('acoes:mover') ? $event.preventDefault() : null" @drop="temPermissao('acoes:mover') ? onDrop($event, 'Em Andamento') : null">
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
              <button v-if="temPermissao('acoes:editar') || temPermissao('acoes:excluir')" @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-sky-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-2">
                <span class="text-orange-500 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            <p v-if="acao.descricao || acao.resposta_comentario" class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-4 whitespace-pre-line leading-relaxed border-l-2 border-orange-500/50 pl-2">
                {{ acao.descricao || acao.resposta_comentario }}
            </p>
            
            <div class="flex items-center gap-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 mt-auto">
              
              <div class="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-sm" v-tooltip.top="getGestor(acao.gestor_id)?.nome || acao.gestor_nome || 'Sem gestor'">
                <img v-if="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" :src="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" class="w-full h-full object-cover" @error="(e) => e.target.style.display = 'none'" />
                <span v-else class="text-[9px] font-black text-slate-500 dark:text-slate-300">{{ gerarIniciais(getGestor(acao.gestor_id)?.nome || acao.gestor_nome) }}</span>
              </div>
              
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

      <div class="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-4 min-h-[60vh] border border-slate-100/80 dark:border-slate-800 opacity-70 hover:opacity-100 transition-opacity" @dragover="temPermissao('acoes:mover') ? $event.preventDefault() : null" @drop="temPermissao('acoes:mover') ? onDrop($event, 'Concluído') : null">
        <div class="flex justify-between items-center px-2 pt-1 pb-2 border-b border-slate-200/50 dark:border-slate-800">
          <h3 class="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Concluído <span class="text-slate-400 ml-1">{{ estatisticas.concluidas }}</span></h3>
          <i class="pi pi-check-circle text-emerald-500 text-xs"></i>
        </div>
        
        <div class="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div v-for="acao in acoesConcluidas" :key="acao.id" :draggable="temPermissao('acoes:mover')" @dragstart="temPermissao('acoes:mover') ? onDragStart($event, acao.id) : null" 
               class="bg-white/60 dark:bg-slate-800/40 p-4 rounded-[1.25rem] border border-slate-200/50 dark:border-slate-700 cursor-grab hover:shadow-sm transition-all group">
            
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2 mt-1 opacity-70">
                <i class="pi pi-circle-fill text-[8px] rounded-full shrink-0" :class="getNpsDot(acao.resposta_nota)"></i>
                <div class="flex flex-col leading-tight overflow-hidden">
                  <span v-if="getCompanhiaDaAcao(acao)" class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate max-w-[140px]">{{ getCompanhiaDaAcao(acao) }}</span>
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[140px]">{{ acao.empresa_nome }}</span>
                </div>
              </div>
              <button v-if="temPermissao('acoes:editar') || temPermissao('acoes:excluir')" @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"><i class="pi pi-ellipsis-h text-sm"></i></button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600 leading-snug mb-2">
                <span class="text-orange-500/60 mr-1 font-black">{{ formatarId(acao.id) }}</span> 
                {{ acao.titulo }}
            </h4>
            
            <div class="flex items-center gap-3 pt-3 mt-auto">
              
              <div class="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-sm" v-tooltip.top="getGestor(acao.gestor_id)?.nome || acao.gestor_nome || 'Sem gestor'">
                <img v-if="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" :src="getGestor(acao.gestor_id)?.avatar || acao.gestor_avatar" class="w-full h-full object-cover opacity-60" @error="(e) => e.target.style.display = 'none'" />
                <span v-else class="text-[9px] font-black text-slate-400 dark:text-slate-500">{{ gerarIniciais(getGestor(acao.gestor_id)?.nome || acao.gestor_nome) }}</span>
              </div>

              <div class="ml-auto flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                <i class="pi pi-check"></i> Fechado
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <Menu ref="menuOpcoes" :model="menuItens" :popup="true" class="!rounded-xl !border-slate-200 dark:!border-slate-700 text-xs w-40" />

    <Dialog 
      v-model:visible="dialogAcao" 
      :modal="true" 
      :style="{width: '550px'}" 
      :closable="false" 
      class="custom-dialog-no-header"
    >
      <div class="bg-slate-900 p-6 flex justify-between items-center rounded-t-[2rem]">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
            <i :class="acaoAtual.id ? 'pi pi-pencil' : 'pi pi-plus-circle'" class="text-lg"></i>
          </div>
          <div>
            <h2 class="text-lg font-black italic tracking-tight text-white leading-none">
              {{ acaoAtual.id ? 'Editar Plano' : 'Novo Plano de Ação' }}
            </h2>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestão de Close-the-Loop</p>
          </div>
        </div>
        <button @click="dialogAcao = false" class="text-slate-500 hover:text-white p-2 transition-all hover:bg-white/10 rounded-full">
          <i class="pi pi-times"></i>
        </button>
      </div>
      
      <div class="p-8 space-y-6 bg-white dark:bg-slate-900 rounded-b-[2rem] border-x border-b border-slate-100 dark:border-slate-800">
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Título do Plano de Ação *</label>
          <InputText v-model="acaoAtual.titulo" class="custom-input w-full font-bold" placeholder="Ex: Resolver pendência técnica no checkout" />
        </div>
        
        <div class="grid grid-cols-2 gap-5">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Conta (Empresa) *</label>
            <Dropdown v-model="acaoAtual.empresa_nome" :options="empresasLista" editable filter placeholder="Selecionar..." class="custom-input !p-0" @change="aoMudarEmpresa" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Grupo (Companhia)</label>
            <Dropdown v-model="acaoAtual.companhia" :options="companhiasLista" editable filter placeholder="Opcional" class="custom-input !p-0" />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-5">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Gestor Responsável</label>
            <Dropdown v-model="acaoAtual.gestor_id" :options="gestoresLista" optionLabel="nome" optionValue="id" filter placeholder="Atribuir..." class="custom-input !p-0">
              <template #value="slotProps">
                <div v-if="slotProps.value" class="flex items-center gap-2 px-3 py-2.5">
                  <div class="w-6 h-6 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 shadow-sm">
                    <img v-if="getGestor(slotProps.value)?.avatar" :src="getGestor(slotProps.value)?.avatar" class="w-full h-full object-cover" />
                    <span v-else class="text-[9px] font-black text-slate-600">{{ gerarIniciais(getGestor(slotProps.value)?.nome) }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ getGestor(slotProps.value)?.nome }}</span>
                </div>
                <span v-else class="p-3.5 text-sm text-slate-400 italic">Selecionar gestor</span>
              </template>
            </Dropdown>
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-orange-500 ml-1 flex items-center gap-1.5">
               <i class="pi pi-stopwatch"></i> Tipo de SLA (Ciclo)
            </label>
            <Dropdown v-model="acaoAtual.contexto" :options="opcoesContexto" optionLabel="label" optionValue="value" class="custom-input !p-0" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridade Crítica</label>
            <Dropdown v-model="acaoAtual.prioridade" :options="['Alta', 'Média', 'Baixa']" class="custom-input !p-0" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fase do Workflow</label>
            <Dropdown v-model="acaoAtual.status" :options="['Pendente', 'Em Andamento', 'Concluído']" class="custom-input !p-0" />
          </div>
        </div>
        
        <div class="flex flex-col gap-1.5">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Detalhamento e Notas Internas</label>
          <Textarea v-model="acaoAtual.descricao" rows="3" class="custom-input w-full resize-none" placeholder="Descreva os próximos passos ou observações..." />
        </div>
        
        <div class="pt-6 flex gap-4 w-full border-t border-slate-50 dark:border-slate-800">
          <Button 
            label="Descartar Alterações" 
            text 
            class="flex-1 !text-slate-400 !font-black !uppercase !text-[10px] !tracking-[0.15em]" 
            @click="dialogAcao = false" 
          />
          <Button 
            v-if="temPermissao('acoes:editar') || temPermissao('acoes:criar')" 
            :label="acaoAtual.id ? 'Atualizar Registro' : 'Lançar Nova Ação'" 
            icon="pi pi-check" 
            :loading="salvando" 
            class="flex-1 !bg-orange-500 hover:!bg-orange-600 !text-white !border-none !rounded-xl !px-6 !py-4 !font-black !uppercase !text-[10px] !tracking-[0.15em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-100 transition-all" 
            @click="salvarAcao" 
          />
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

/* ==========================================
   🌟 FILTROS PADRONIZADOS
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
:deep(.custom-calendar-minimal .p-inputtext::placeholder),
:deep(.custom-dropdown-minimal .p-dropdown-label.p-placeholder),
:deep(.custom-dropdown-minimal .p-multiselect-label.p-placeholder) {
    @apply text-slate-300 dark:text-slate-600 font-black !important;
}

:deep(.p-inputtext:enabled:focus),
:deep(.p-inputtext:enabled:hover),
:deep(.p-dropdown:not(.p-disabled):focus),
:deep(.p-dropdown:not(.p-disabled):hover),
:deep(.p-multiselect:not(.p-disabled):focus),
:deep(.p-multiselect:not(.p-disabled):hover) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

:deep(.custom-dropdown-minimal .p-dropdown-label),
:deep(.custom-dropdown-minimal .p-multiselect-label) {
    @apply p-0 font-black flex items-center text-[10px] uppercase text-slate-800 dark:text-white !important;
}

:deep(.custom-dropdown-minimal .p-dropdown-trigger),
:deep(.custom-dropdown-minimal .p-multiselect-trigger) {
    @apply w-4 text-slate-400 !important;
}

/* O FUNDO AZUL (SKY) DOS MENUS DROP NO MODO ESCURO */
:deep(.p-dropdown-panel), :deep(.p-datepicker), :deep(.p-multiselect-panel) {
    @apply dark:bg-slate-800 dark:border-slate-700 shadow-xl !important;
}
:deep(.p-dropdown-panel .p-dropdown-item), :deep(.p-multiselect-panel .p-multiselect-item) {
    @apply text-xs font-medium text-slate-600 dark:text-slate-300 !important;
}
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight), :deep(.p-multiselect-panel .p-multiselect-item.p-highlight) {
    @apply bg-sky-500/10 text-sky-600 dark:text-sky-400 !important;
}

/* O fundo azul das "Chips" nos filtros do Kanban de Ações */
:deep(.custom-dropdown-minimal .p-multiselect-token) {
    @apply bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest mr-1 mb-0;
}

/* Ajuste sutil para o MultiSelect (Padding interno dos chips) */
:deep(.custom-dropdown-minimal .p-multiselect-label) {
  @apply py-0 px-0 flex flex-wrap gap-1.5 !important;
}

/* Scroll invisível na barra horizontal */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* ==========================================
   📌 MODAIS, SCROLL E OUTROS COMPONENTES
   ========================================== */
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
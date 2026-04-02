<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

// Componentes PrimeVue
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Timeline from 'primevue/timeline';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Calendar from 'primevue/calendar'; // 👈 Adicionado

const toast = useToast();

// ==========================================
// 🎛️ ESTADOS GERAIS E FILTRO DE DATA
// ==========================================
const abaAtiva = ref(0);
const loadingDados = ref(true);
const loadingIA = ref(false);

const datasFiltro = ref(null);

const filtros = ref({
  segmento: 'Todos',
  arr: 'Todos',
  safra: 'Todos',
  data_inicio: null, // YYYY-MM-DD
  data_fim: null    // YYYY-MM-DD
});

// Opções dos Selects
const opcoesSegmento = ref(['Todos']);
const opcoesARR = ref(['Todos', '> € 100k', '€ 50k - € 100k', '< € 50k']);
const opcoesSafra = ref(['Todos', '0-3 Meses (Onboarding)', '3-12 Meses', '+1 Ano']);

// Helper para formatar data do PrimeVue para o SQL (YYYY-MM-DD)
const formatarParaAPI = (data) => {
  if (!data) return null;
  const d = new Date(data);
  return d.toISOString().split('T')[0];
};

// ==========================================
// 📊 ABA 1: ESTRATÉGICO (GRÁFICOS)
// ==========================================
const dataScatter = ref(null);
const optionsScatter = ref(null);
const dataStackedBar = ref(null);
const optionsStackedBar = ref(null);

const fetchGraficos = async () => {
  loadingDados.value = true;
  try {
    const config = { params: filtros.value };
    const [resScatter, resSafra] = await Promise.all([
      api.get('/reports/bi-scatter', config),
      api.get('/reports/bi-safra', config)
    ]);

    dataScatter.value = {
      datasets: [
        { label: 'Tópicos Críticos', data: resScatter.data.filter(d => d.y <= 6), backgroundColor: 'rgba(244, 63, 94, 0.8)' },
        { label: 'Melhoria', data: resScatter.data.filter(d => d.y > 6), backgroundColor: 'rgba(245, 158, 11, 0.8)' }
      ]
    };
    optionsScatter.value = { responsive: true, maintainAspectRatio: false };

    dataStackedBar.value = {
      labels: resSafra.data.labels,
      datasets: [
        { label: 'Promotores', backgroundColor: '#10b981', data: resSafra.data.promotores },
        { label: 'Neutros', backgroundColor: '#f59e0b', data: resSafra.data.neutros },
        { label: 'Detratores', backgroundColor: '#f43f5e', data: resSafra.data.detratores }
      ]
    };
    optionsStackedBar.value = { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } };
  } catch (error) {
    console.error("Erro ao carregar gráficos:", error);
  } finally {
    loadingDados.value = false;
  }
};

// ==========================================
// ⚙️ ABA 2: OPERACIONAL (KPIs & INATIVOS)
// ==========================================
const dadosOperacionais = ref({ taxa_resposta: 0, sla_medio_dias: 0 });
const clientesInativos = ref([]);
const limiteRecorrencia = ref(90);
const loadingInativos = ref(false);

const carregarOperacional = async () => {
  try {
    const res = await api.get('/reports/operacional', { params: filtros.value });
    dadosOperacionais.value = res.data;
  } catch (e) {
    console.error("Erro operacional:", e);
  }
};

const carregarInativos = async () => {
  loadingInativos.value = true;
  try {
    const res = await api.get('/reports/operacional/inativos', { params: filtros.value });
    clientesInativos.value = res.data.lista;
    limiteRecorrencia.value = res.data.recorrencia_dias;
  } finally {
    loadingInativos.value = false;
  }
};

const formatarData = (dataStr) => {
  if (!dataStr) return '---';
  return new Date(dataStr).toLocaleDateString('pt-PT');
};

// ==========================================
// 📜 ABA 3: JORNADA (TIMELINE)
// ==========================================
const empresaSelecionadaJornada = ref(null);
const historicoJornada = ref([]);
const loadingJornada = ref(false);
const listaEmpresas = ref([]);

const npsEmpresaJornada = ref(null);
const totalRespostasJornada = ref(0);

const buscarJornada = async () => {
  if (!empresaSelecionadaJornada.value) return;
  loadingJornada.value = true;
  
  try {
    const params = { 
      empresa: empresaSelecionadaJornada.value,
      data_inicio: filtros.value.data_inicio,
      data_fim: filtros.value.data_fim
    };
    const res = await api.get('/reports/jornada', { params });
    
    // 💡 Verificamos os dois formatos (Python snake_case vs JS camelCase)
    historicoJornada.value = res.data.historico || [];
    npsEmpresaJornada.value = res.data.nps_atual ?? res.data.npsAtual;
    
    // Aqui garantimos que lemos 'total_respostas' que vem do seu Python
    totalRespostasJornada.value = res.data.total_respostas ?? res.data.totalRespostas ?? 0;

    if (historicoJornada.value.length === 0) {
        toast.add({ severity: 'info', summary: 'Aviso', detail: 'Nenhum dado encontrado para este período.' });
    }
  } catch (e) {
    console.error("Erro ao carregar jornada:", e);
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha na comunicação com o servidor.' });
  } finally {
    loadingJornada.value = false;
  }
};

const getCorNota = (nota) => {
  if (nota >= 9) return 'success';
  if (nota >= 7) return 'warning';
  return 'danger';
};

// ==========================================
// 👔 ABA 4: GESTORES
// ==========================================
const gestorSelecionado = ref(null);
const listaGestores = ref([]);
const dadosGestor = ref(null);
const loadingGestor = ref(false);
const chartGestor = ref(null);

const optionsChartGestor = ref({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { min: 0, max: 10 }, x: { grid: { display: false } } }
});

const carregarPerformanceGestor = async () => {
  if (!gestorSelecionado.value) return;
  loadingGestor.value = true;
  try {
    const res = await api.get('/reports/gestor', { params: { 
      gestor_id: gestorSelecionado.value,
      data_inicio: filtros.value.data_inicio,
      data_fim: filtros.value.data_fim
    }});
    dadosGestor.value = res.data;
    chartGestor.value = {
      labels: res.data.ranking_empresas.map(e => e.nome),
      datasets: [{ label: 'Média', backgroundColor: '#6366f1', borderRadius: 8, data: res.data.ranking_empresas.map(e => e.media_nota) }]
    };
  } finally { loadingGestor.value = false; }
};

const carregarListaGestores = async () => {
  const res = await api.get('/reports/lista-gestores');
  listaGestores.value = res.data;
};

// ==========================================
// 📅 WATCHERS (A MÁGICA DA SINCRONIZAÇÃO)
// ==========================================

// 1. Quando o usuário seleciona o período no Calendário
watch(datasFiltro, (val) => {
  if (val && val[0] && val[1]) {
    filtros.value.data_inicio = formatarParaAPI(val[0]);
    filtros.value.data_fim = formatarParaAPI(val[1]);
  } else {
    filtros.value.data_inicio = null;
    filtros.value.data_fim = null;
  }
});

// 2. Quando QUALQUER filtro muda (Data, Segmento, ARR, Safra)
watch(filtros, () => {
  fetchGraficos();
  carregarOperacional();
  carregarInativos();
  if (empresaSelecionadaJornada.value) buscarJornada();
  if (gestorSelecionado.value) carregarPerformanceGestor();
}, { deep: true });

const labelPeriodo = computed(() => {
  if (!datasFiltro.value || !datasFiltro.value[0] || !datasFiltro.value[1]) {
    return "Todo o Histórico";
  }
  const inicio = datasFiltro.value[0].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  const fim = datasFiltro.value[1].toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return `${inicio} até ${fim}`;
});

// ==========================================
// 🏁 INICIALIZAÇÃO
// ==========================================
onMounted(() => {
  fetchGraficos();
  carregarOperacional();
  carregarListaGestores();
  carregarInativos();

  api.get('/cadastros/empresas').then(res => listaEmpresas.value = res.data.map(e => e.nome));
  api.get('/cadastros/segmentos').then(res => opcoesSegmento.value = ['Todos', ...res.data.map(s => s.nome)]);
});

</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-6">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 class="text-4xl lg:text-5xl font-black tracking-tighter italic text-slate-900 dark:text-white">
            NPS <span class="text-indigo-500">Intelligence</span>
          </h1>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Relatórios Executivos e Visão de Jornada</p>
          
          <div v-if="datasFiltro" class="flex items-center gap-2 mt-4 animate-fadein">
            <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Exibindo:</span>
            <Tag :value="labelPeriodo" severity="info" class="!bg-indigo-500/10 !text-indigo-500 !text-[10px] !font-black !px-3 !rounded-full border border-indigo-500/20" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-sm transition-all hover:border-indigo-500/50">
            
            <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <i class="pi pi-calendar text-indigo-500 text-xs"></i>
              <span class="text-[9px] font-black uppercase tracking-widest text-slate-500">Período</span>
            </div>

            <Calendar 
              v-model="datasFiltro" 
              selectionMode="range" 
              :manualInput="false" 
              placeholder="Selecione o intervalo..." 
              dateFormat="dd/mm/yy" 
              class="custom-calendar-premium" 
              :showIcon="false"
              hideOnRangeSelection
            />

            <button 
              v-if="datasFiltro" 
              @click="datasFiltro = null"
              class="ml-2 mr-2 w-7 h-7 flex items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
            >
              <i class="pi pi-times text-[10px]"></i>
            </button>
          </div>
        </div>
      </div>

      <TabView v-model:activeIndex="abaAtiva" class="custom-tabview-premium">
        
        <TabPanel>
          <template #header><i class="pi pi-chart-bar mr-2"></i> Estratégico</template>
          
          <div class="space-y-8 mt-6">
            <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="flex flex-col gap-1.5 px-3">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Segmento</span>
                <Dropdown v-model="filtros.segmento" :options="opcoesSegmento" class="custom-dropdown-minimal" />
              </div>
              <div class="flex flex-col gap-1.5 px-3 border-l border-slate-100 dark:border-slate-800">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tamanho / ARR</span>
                <Dropdown v-model="filtros.arr" :options="opcoesARR" class="custom-dropdown-minimal" />
              </div>
              <div class="flex flex-col gap-1.5 px-3 border-l border-slate-100 dark:border-slate-800">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Safra</span>
                <Dropdown v-model="filtros.safra" :options="opcoesSafra" class="custom-dropdown-minimal" />
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[400px]">
                <h3 class="text-xs font-black uppercase tracking-widest mb-4">Matriz de Priorização</h3>
                <Chart type="scatter" :data="dataScatter" :options="optionsScatter" class="h-[300px]" />
              </div>
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[400px]">
                <h3 class="text-xs font-black uppercase tracking-widest mb-4">Análise de Safra</h3>
                <Chart type="bar" :data="dataStackedBar" :options="optionsStackedBar" class="h-[300px]" />
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          <template #header><i class="pi pi-cog mr-2"></i> Operacional</template>
          
          <div class="space-y-8 mt-6"> 
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Taxa de Resposta no Período</span>
                 <div class="text-6xl font-black text-indigo-500">{{ dadosOperacionais.taxa_resposta }}%</div>
                 <p class="text-xs text-slate-500 mt-4 max-w-xs leading-relaxed">Percentagem de clientes ativos que responderam no período selecionado.</p>
              </div>
              
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">SLA Médio de Fechamento</span>
                 <div class="text-6xl font-black text-emerald-500">{{ dadosOperacionais.sla_medio_dias }} <span class="text-2xl">dias</span></div>
                 <p class="text-xs text-slate-500 mt-4 max-w-xs leading-relaxed">Tempo médio de encerramento de ações corretivas no período.</p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 class="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-rose-500"></i> Risco de Omissão (Churn de Feedback)
                  </h3>
                  <p class="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    Clientes ativos sem qualquer interação recente.
                  </p>
                </div>
                <Tag severity="danger" :value="clientesInativos.length + ' Clientes Críticos'" class="!text-[10px] !font-black uppercase tracking-widest !px-4" />
              </div>

              <DataTable :value="clientesInativos" :loading="loadingInativos" :paginator="true" :rows="10" class="p-datatable-sm custom-table" responsiveLayout="scroll">
                <template #empty>
                   <div class="text-center py-12 text-emerald-500 text-[11px] uppercase tracking-widest font-black">
                     <i class="pi pi-check-circle text-3xl mb-3 block opacity-50"></i>
                     Base saudável no período selecionado.
                   </div>
                </template>
                <Column field="empresa" header="Empresa" sortable>
                  <template #body="sp">
                    <span class="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{{ sp.data.empresa }}</span>
                  </template>
                </Column>
                <Column field="cliente_nome" header="Cliente" sortable>
                  <template #body="sp">
                    <div class="flex flex-col">
                      <span class="font-bold text-xs text-slate-800 dark:text-white">{{ sp.data.cliente_nome }}</span>
                      <span class="text-[10px] font-medium text-slate-400">{{ sp.data.cliente_email }}</span>
                    </div>
                  </template>
                </Column>
                <Column field="data_envio" header="Último Disparo" sortable>
                  <template #body="sp">
                    <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">{{ formatarData(sp.data.data_envio) }}</span>
                  </template>
                </Column>
                <Column field="dias_sem_resposta" header="Atraso (Dias)" sortable>
                  <template #body="sp">
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                      <span class="text-rose-500 font-black text-sm">{{ sp.data.dias_sem_resposta }} dias</span>
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          <template #header><i class="pi pi-history mr-2"></i> Jornada</template>
          
          <div class="space-y-6 mt-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div class="flex-1 space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Auditoria por Empresa</label>
                <Dropdown v-model="empresaSelecionadaJornada" :options="listaEmpresas" filter placeholder="Selecione uma conta..." class="w-full custom-dropdown-premium" />
              </div>
              <Button label="Filtrar Jornada" icon="pi pi-search" @click="buscarJornada" :loading="loadingJornada" class="!bg-slate-900 dark:!bg-white dark:!text-slate-900 !rounded-xl !px-8 !py-3 !font-black !text-xs !uppercase" />
            </div>

            <div v-if="npsEmpresaJornada !== null && historicoJornada.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fadein">
              
              <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
                <div :class="['w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg', 
                              npsEmpresaJornada >= 70 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                              npsEmpresaJornada >= 0 ? 'bg-orange-500 text-white shadow-orange-500/20' : 'bg-rose-500 text-white shadow-rose-500/20']">
                  {{ npsEmpresaJornada }}
                </div>
                <div>
                  <h4 class="text-[9px] font-black uppercase tracking-widest text-slate-400">NPS da Conta</h4>
                  <p class="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase truncate max-w-[150px]">
                    {{ empresaSelecionadaJornada }}
                  </p>
                </div>
              </div>

              <div class="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
                <div class="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <i class="pi pi-comments text-2xl"></i>
                </div>
                <div>
                  <h4 class="text-[9px] font-black uppercase tracking-widest text-slate-400">Volume de Voz</h4>
                  <p class="text-lg font-black text-slate-800 dark:text-white">{{ totalRespostasJornada }} Respostas</p>
                </div>
              </div>

            </div>

            <div v-if="historicoJornada.length > 0" class="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <Timeline :value="historicoJornada" align="alternate" class="custom-timeline">
                <template #content="slotProps">
                  <div class="mb-12 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 relative shadow-sm hover:scale-[1.02] transition-transform">
                    <div class="flex justify-between items-start mb-4">
                      <div class="flex items-center gap-3">
                        <Tag :value="slotProps.item.nota" :severity="getCorNota(slotProps.item.nota)" class="!text-xl !font-black !px-4 !py-2 !rounded-xl" />
                        <div class="text-left">
                          <h4 class="text-sm font-black text-slate-800 dark:text-white">{{ slotProps.item.cliente_nome }}</h4>
                          <p class="text-[10px] font-bold text-slate-400 uppercase">{{ slotProps.item.cargo }}</p>
                        </div>
                      </div>
                      <span class="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">{{ slotProps.item.data_formatada }}</span>
                    </div>
                    <p class="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed text-left">
                      "{{ slotProps.item.motivo || 'O cliente não deixou comentários adicionais.' }}"
                    </p>
                    <div class="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-2">
                      <Tag :value="slotProps.item.canal" severity="secondary" class="!text-[8px] !font-black uppercase !px-2" />
                    </div>
                  </div>
                </template>
              </Timeline>
            </div>
            <div v-else-if="!loadingJornada" class="py-20 text-center text-slate-400 italic">
               <i class="pi pi-search text-4xl mb-4 opacity-20"></i>
               <p>Selecione uma empresa e aplique o filtro de data para ver a jornada.</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          <template #header><i class="pi pi-user mr-2"></i> Gestores</template>
          
          <div class="space-y-6 mt-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div class="flex-1 space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Performance do Gestor</label>
                <Dropdown 
                  v-model="gestorSelecionado" 
                  :options="listaGestores" 
                  optionLabel="nome" 
                  optionValue="id" 
                  filter 
                  placeholder="Selecione um Gestor" 
                  class="w-full custom-dropdown-premium" 
                  @change="carregarPerformanceGestor" 
                />
              </div>
            </div>

            <div v-if="loadingGestor" class="py-20 text-center">
              <i class="pi pi-spin pi-spinner text-4xl text-indigo-500 mb-4"></i>
              <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Cruzando dados da carteira no período...</p>
            </div>

            <div v-else-if="dadosGestor" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadein">
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">NPS do Gestor no Período</span>
                 <div class="text-7xl font-black" :class="dadosGestor.nps >= 70 ? 'text-emerald-500' : 'text-orange-500'">
                   {{ dadosGestor.nps }}
                 </div>
                 <Tag :value="dadosGestor.total_respostas + ' respostas filtradas'" severity="secondary" class="mt-4" />
              </div>

              <div class="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 class="text-xs font-black uppercase tracking-widest mb-6">Média por Empresa na Carteira</h3>
                <Chart v-if="chartGestor" type="bar" :data="chartGestor" :options="optionsChartGestor" class="h-[250px]" />
              </div>

              <div class="lg:col-span-3 grid grid-cols-3 gap-4">
                <div class="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                  <div class="text-2xl font-black text-emerald-600">{{ dadosGestor.distribuicao.promotores }}</div>
                  <div class="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Promotores</div>
                </div>
                <div class="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-800/50 text-center">
                  <div class="text-2xl font-black text-amber-600">{{ dadosGestor.distribuicao.neutros }}</div>
                  <div class="text-[9px] font-black uppercase text-amber-500 tracking-widest">Neutros</div>
                </div>
                <div class="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-800/50 text-center">
                  <div class="text-2xl font-black text-rose-600">{{ dadosGestor.distribuicao.detratores }}</div>
                  <div class="text-[9px] font-black uppercase text-rose-500 tracking-widest">Detratores</div>
                </div>
              </div>
            </div>

            <div v-else class="py-20 text-center text-slate-400 italic">
               <p>Selecione um gestor e o período desejado no topo.</p>
            </div>
          </div>
        </TabPanel>

      </TabView>
    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

:deep(.custom-tabview-premium .p-tabview-nav) {
  @apply bg-transparent border-none gap-2 mb-6 !important;
}

:deep(.custom-tabview-premium .p-tabview-nav-link) {
  @apply bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 !rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 transition-all !important;
}

:deep(.custom-tabview-premium .p-highlight .p-tabview-nav-link) {
  @apply !bg-indigo-500 !text-white !border-indigo-500 shadow-lg shadow-indigo-500/20 !important;
}

:deep(.custom-dropdown-minimal) {
  @apply !bg-transparent !border-none !shadow-none !p-0 !text-[11px] font-black uppercase text-slate-800 dark:text-white !important;
}

:deep(.custom-dropdown-premium) {
  @apply !bg-slate-50 dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !rounded-xl !py-2 !important;
}
/* Garante que o conteúdo da timeline use o espaço disponível */
:deep(.custom-timeline.p-timeline-alternate .p-timeline-event:nth-child(even) .p-timeline-event-content) {
  text-align: left;
  padding-left: 2rem;
}

:deep(.custom-timeline.p-timeline-alternate .p-timeline-event:nth-child(odd) .p-timeline-event-content) {
  text-align: right;
  padding-right: 2rem;
}

/* Remove a linha/conector caso queira um visual mais limpo, ou estilize-o */
:deep(.p-timeline-event-connector) {
  @apply bg-slate-200 dark:bg-slate-700;
}

/* Ajuste das "bolinhas" originais do PrimeVue para combinar com o seu tema */
:deep(.p-timeline-event-marker) {
  @apply border-2 border-indigo-500 bg-white dark:bg-slate-900 !important;
}

/* Ajuste para dispositivos móveis: volta para alinhamento à esquerda se o ecrã for pequeno */
@media screen and (max-width: 768px) {
  :deep(.p-timeline-alternate) {
    flex-direction: column;
  }
  :deep(.p-timeline-alternate .p-timeline-event) {
    flex-direction: row !important;
  }
  :deep(.p-timeline-alternate .p-timeline-event-opposite) {
    display: none;
  }
}

/* Customização do Calendário para parecer texto puro dentro da pílula */
:deep(.custom-calendar-premium) {
  @apply border-none shadow-none !important;
}

:deep(.custom-calendar-premium .p-inputtext) {
  @apply border-none bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 w-48 py-1 px-3 shadow-none focus:ring-0 !important;
}

/* Estilo do painel flutuante do calendário */
:deep(.p-datepicker) {
  @apply border-none shadow-2xl rounded-2xl bg-white dark:bg-slate-900 !important;
}

:deep(.p-datepicker table td > span.p-highlight) {
  @apply bg-indigo-500 text-white !important;
}
</style>
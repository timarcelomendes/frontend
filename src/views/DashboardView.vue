<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

// 🟢 IMPORTAÇÃO COMPLETA DE COMPONENTES
import Chart from 'primevue/chart';
import Tag from 'primevue/tag';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';
import Calendar from 'primevue/calendar';

const toast = useToast();
const loading = ref(true);
const nomeUsuario = ref('');

const datasFiltro = ref(null);

// --- ESTADOS DE DADOS ---
const kpis = ref({
  score: 0, 
  total_respostas: 0, 
  promotores: 0,
  neutros: 0, 
  detratores: 0, 
  nps_decisor: 0, 
  taxa_jira: 0,
  total_decisores: 0, 
  delta_score: "+2.1", 
  delta_total: "+5%",
  total_decisores: 0, 
  revenue_at_risk: 0,
});

const feedbacks = ref([]);
const ranking = ref([]);
const nuvemPalavras = ref([]);
const taxaResposta = ref(0);

// --- INTELIGÊNCIA PREDITIVA ---
const smartInsights = ref({
  valor_em_risco: "R$ 0",
  nivel_alerta: "Baixo"
});

const topRisco = computed(() => {
  if (!ranking.value || ranking.value.length === 0) return null;
  return [...ranking.value].sort((a, b) => a.nps - b.nps)[0];
});


const porcentagemConversao = ref(0);

const simulador = computed(() => {
  if (!kpis.value.total_respostas) return { npsGanho: 0, npsNovo: kpis.value.score, receitaSalva: 0 };

  const detratoresConvertidos = Math.round(kpis.value.detratores * (porcentagemConversao.value / 100));

  const novosPromotores = kpis.value.promotores + detratoresConvertidos;
  const novosDetratores = kpis.value.detratores - detratoresConvertidos;

  const npsNovo = Math.round(((novosPromotores / kpis.value.total_respostas) - (novosDetratores / kpis.value.total_respostas)) * 100);
  const npsGanho = npsNovo - kpis.value.score;

  const ticketMedio = kpis.value.detratores > 0 
    ? (kpis.value.revenue_at_risk / kpis.value.detratores) 
    : 0;
  
  const receitaSalva = detratoresConvertidos * ticketMedio;

  return { npsGanho, npsNovo, receitaSalva };
});

// --- GRÁFICOS ---
const chartDataLine = ref(null);
const chartOptionsLine = ref(null);
const chartDataPie = ref(null);
const chartOptionsPie = ref(null);

// ==========================================
// 📅 VIGILANTE DO FILTRO DE DATAS
// ==========================================
watch(datasFiltro, (novasDatas) => {
  // Se o utilizador escolheu as DUAS datas (início e fim)
  if (novasDatas && novasDatas[0] && novasDatas[1]) {
    carregarDashboard();
  } 
  // Se o utilizador clicou no "X" para limpar o calendário
  else if (!novasDatas || novasDatas.length === 0) {
    carregarDashboard(); 
  }
});

// ==========================================
// 📅 CENTRAL DE FILTROS (Corrige bug de fuso horário)
// ==========================================

const obterParametrosFiltro = () => {
  if (datasFiltro.value && datasFiltro.value[0] && datasFiltro.value[1]) {
    // Formata a data respeitando o fuso horário local (evita que volte 1 dia atrás)
    const formatarData = (data) => {
      const d = new Date(data);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    };
    
    const inicio = formatarData(datasFiltro.value[0]);
    const fim = formatarData(datasFiltro.value[1]);
    return `?data_inicio=${inicio}&data_fim=${fim}`;
  }
  return '';
};

// ==========================================
// 📊 CARREGAMENTO DE DADOS
// ==========================================
const carregarDashboard = async () => {
  loading.value = true;
  try {
    const queryParams = obterParametrosFiltro();

    // Chamamos a nossa nova rota unificada + as rotas de tendências/detalhes
    const [resKpis, resDetalhes, resTrend] = await Promise.all([
      api.get(`/dashboard/kpis${queryParams}`),
      api.get(`/dashboard/detalhes${queryParams}`),
      api.get(`/dashboard/trend${queryParams}`)
    ]);

    if (resKpis.data.status === 'success') {
      // 1. Atualiza KPIs e Feedbacks
      kpis.value = { ...kpis.value, ...resKpis.data.kpis };
      feedbacks.value = resKpis.data.feedbacks;
      
      // 2. 🚀 MAPEIA A NUVEM DE PALAVRAS (vindo da nova rota)
      nuvemPalavras.value = resKpis.data.kpis.termos_frequentes || [];
      
      // 3. Insights Financeiros
      const percDetratores = kpis.value.total_respostas > 0 ? (kpis.value.detratores / kpis.value.total_respostas) * 100 : 0;
      smartInsights.value.valor_em_risco = `€ ${kpis.value.revenue_at_risk.toLocaleString('pt-PT')}`; 
      smartInsights.value.nivel_alerta = percDetratores > 20 ? 'Crítico' : 'Estável';
      
      montarGraficos(resTrend.data);
    }

    if (resDetalhes.data) {
      ranking.value = resDetalhes.data.ranking;
      taxaResposta.value = resDetalhes.data.taxa_resposta;
    }

    nomeUsuario.value = (localStorage.getItem('usuario_nome') || 'Executivo').split(' ')[0];
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao processar dados do dashboard.', life: 5000 });
  } finally {
    loading.value = false;
  }
};

const montarGraficos = (trendData) => {
  chartDataLine.value = {
    labels: trendData.labels || [],
    datasets: [{
      label: 'NPS',
      data: trendData.scores || [],
      fill: true,
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.08)',
      borderWidth: 3,
      tension: 0.5,
      pointRadius: 0,
      pointHoverRadius: 6
    }]
  };
  
  chartOptionsLine.value = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { display: false, min: -100, max: 100 }, x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } } },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  chartDataPie.value = {
    labels: ['Promotores', 'Neutros', 'Detratores'],
    datasets: [{
      data: [kpis.value.promotores, kpis.value.neutros, kpis.value.detratores],
      backgroundColor: ['#10b981', '#f59e0b', '#f43f5e'],
      borderWidth: 0,
      cutout: '82%',
      borderRadius: 10
    }]
  };
  
  chartOptionsPie.value = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    layout: { padding: 10 }
  };
};

// Dentro do <script setup>, logo abaixo das suas outras computed
const maxFrequencia = computed(() => {
  if (!nuvemPalavras.value || nuvemPalavras.value.length === 0) return 1;
  return Math.max(...nuvemPalavras.value.map(p => p.quantidade));
});

// Função para calcular o tamanho dinâmico (entre 0.7rem e 1.6rem)
const calcularEstiloBolha = (quantidade) => {
  const minSize = 0.7;
  const maxSize = 1.6;
  // Regra de três para definir o tamanho proporcional
  const tamanho = minSize + ((quantidade / maxFrequencia.value) * (maxSize - minSize));
  
  return {
    fontSize: `${tamanho}rem`,
    opacity: 0.5 + ((quantidade / maxFrequencia.value) * 0.5),
    padding: `${tamanho * 0.4}rem ${tamanho * 0.8}rem`
  };
};

const obterCorNPS = (nota) => nota >= 9 ? 'bg-emerald-500 shadow-emerald-500/30' : nota >= 7 ? 'bg-yellow-500 shadow-yellow-500/30' : 'bg-rose-500 shadow-rose-500/30';

// ==========================================
// 🤖 MAGIC AI: SÍNTESE EXECUTIVA
// ==========================================
const dialogAI = ref(false);
const loadingAI = ref(false);
const resultadoAI = ref(null);

const gerarInsightIA = async () => {
  dialogAI.value = true;     
  loadingAI.value = true;    
  resultadoAI.value = null;  
  
  try {
    const queryParams = obterParametrosFiltro(); // Agora a IA recebe as datas!
    const response = await api.get(`/dashboard/magic-ai${queryParams}`);
    
    if (response.data.status === 'success' && response.data.insights.arder) {
      resultadoAI.value = response.data.insights;
    } else {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: response.data.insights?.recomendacao || 'Não foi possível gerar a análise.', life: 5000 });
      dialogAI.value = false;
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro de IA', detail: 'O modelo demorou a responder ou falhou. Tente novamente.', life: 5000 });
    dialogAI.value = false;
  } finally {
    loadingAI.value = false;
  }
};

// ==========================================
// 📥 EXPORTAR DADOS
// ==========================================
const exportando = ref(false);

const exportarDados = async () => {
  exportando.value = true;
  try {
    const queryParams = obterParametrosFiltro(); // Agora exporta apenas as datas filtradas
    const response = await api.get(`/dashboard/exportar${queryParams}`, { responseType: 'blob' });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'NPS_CommandCenter.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.add({ severity: 'success', summary: 'Download Concluído', detail: 'O relatório foi gerado com sucesso.', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao exportar os dados.', life: 3000 });
  } finally {
    exportando.value = false;
  }
};

onMounted(carregarDashboard);
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 class="text-4xl lg:text-5xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Command Center <span class="text-orange-500">.</span>
          </h1>
          <div class="flex items-center gap-3 mt-3">
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Olá, {{ nomeUsuario }} • Sistema Operacional e Preditivo
            </p>
          </div>
        </div>
        <div class="flex flex-wrap md:flex-nowrap gap-3">
          
          <div class="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-10 shadow-sm transition-all focus-within:ring-2 focus-within:ring-orange-500/20">
            <i class="pi pi-calendar text-slate-400 text-xs"></i>
            <Calendar v-model="datasFiltro" selectionMode="range" :manualInput="false" placeholder="Filtrar por período..." dateFormat="dd/mm/yy" class="border-none w-56 shadow-none !text-[11px] !font-bold custom-calendar bg-transparent" @hide="carregarDashboard" />
            <i v-if="datasFiltro && datasFiltro[1]" class="pi pi-times-circle text-slate-300 hover:text-rose-500 cursor-pointer ml-2 transition-colors" @click="datasFiltro = null; carregarDashboard()" title="Limpar Filtro"></i>
          </div>

          <Button icon="pi pi-refresh" @click="carregarDashboard" :loading="loading" class="w-10 h-10 !bg-white dark:!bg-slate-900 !text-slate-600 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700 !rounded-xl hover:!bg-slate-50 transition-colors shadow-sm" />
          <Button label="Sintetizar com IA" icon="pi pi-sparkles" @click="gerarInsightIA" class="!bg-gradient-to-r !from-indigo-500 !to-purple-600 !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl shadow-indigo-500/30 hover:scale-105 transition-transform duration-300" />
          <Button label="Exportar" icon="pi pi-cloud-download" @click="exportarDados" :loading="exportando" class="!bg-gradient-to-r !from-slate-900 !to-slate-800 dark:!from-orange-500 dark:!to-orange-600 !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform duration-300 hidden md:flex" />
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton v-for="i in 4" :key="i" height="200px" borderRadius="2rem" class="dark:bg-slate-800/50" />
      </div>

      <div v-else class="space-y-6">
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div class="flex justify-between items-start mb-6">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Score Global</span>
              <Tag :value="kpis.delta_score + '%'" severity="success" class="!text-[9px] !font-black !bg-emerald-50 !text-emerald-600 dark:!bg-emerald-500/10 dark:!text-emerald-400" />
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-7xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm">{{ kpis.score }}</span>
              <span class="text-orange-500 font-black text-xl">pts</span>
            </div>
          </div>

          <div class="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-slate-800">
            <div class="absolute -right-16 -top-16 w-48 h-48 bg-rose-500/20 rounded-full blur-[50px] group-hover:bg-rose-500/30 transition-colors duration-500"></div>
            <div class="relative z-10 flex justify-between items-start mb-6">
              <span class="text-[10px] font-black uppercase tracking-widest text-rose-400">Revenue at Risk</span>
              <i class="pi pi-chart-line text-rose-500/50"></i>
            </div>
            <div class="relative z-10">
              <div class="text-5xl font-black text-white tracking-tighter drop-shadow-md">{{ smartInsights.valor_em_risco }}</div>
              <div class="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
                 <div class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                 <span class="text-[9px] text-slate-300 font-black uppercase tracking-widest">Base Detratora</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div class="flex justify-between items-start">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Visão Decisores</span>
              <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center"><i class="pi pi-star-fill text-blue-500 text-xs"></i></div>
            </div>
            <div class="mt-6">
              <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.nps_decisor }}</span>
              <div class="mt-2 flex items-center gap-2">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score Executivo</span>
                <span class="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  Vol: {{ kpis.total_decisores }}
                </span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div class="flex justify-between items-start">
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Ação no Jira</span>
              <div class="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center"><i class="pi pi-ticket text-orange-500 text-xs"></i></div>
            </div>
            <div class="mt-6">
               <div class="flex items-baseline gap-1">
                 <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.taxa_jira }}</span>
                 <span class="text-xl font-bold text-slate-400">%</span>
               </div>
               <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 mt-3 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-orange-400 to-orange-500" :style="{ width: kpis.taxa_jira + '%' }"></div>
               </div>
            </div>
          </div>
        </div>

        <div v-if="topRisco && topRisco.nps < 30" class="relative overflow-hidden bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-6 lg:p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 lg:gap-8 group">
          <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-rose-500/5 to-transparent pointer-events-none"></div>
          <div class="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <i class="pi pi-bolt text-white text-2xl lg:text-3xl"></i>
          </div>
          <div class="flex-1 text-center md:text-left z-10">
            <h4 class="text-rose-600 dark:text-rose-400 font-black uppercase text-[10px] lg:text-[11px] tracking-[0.2em] mb-2">Atenção Prioritária</h4>
            <p class="text-slate-700 dark:text-slate-300 text-sm lg:text-base font-medium leading-relaxed">
              O cliente <strong class="text-slate-900 dark:text-white font-black">{{ topRisco.nome }}</strong> registou um NPS crítico de <strong class="text-rose-500">{{ topRisco.nps }} pts</strong>. 
              Ação de retenção aconselhada nas próximas 24h.
            </p>
          </div>
          <Button label="Acionar CS" icon="pi pi-arrow-right" iconPos="right" class="w-full md:w-auto !bg-rose-600 hover:!bg-rose-700 !border-none !text-[10px] !font-black !px-6 !py-3 !rounded-xl shadow-md transition-colors z-10 uppercase tracking-widest" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div class="lg:col-span-2 bg-white dark:bg-slate-900/80 p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="flex justify-between items-center mb-8">
              <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Evolução da Marca</h3>
              <div class="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">6 Meses</div>
            </div>
            <div class="h-[250px] w-full">
              <Chart v-if="chartDataLine" type="line" :data="chartDataLine" :options="chartOptionsLine" class="h-full" />
            </div>
          </div>

          <div class="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 lg:p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-xl relative overflow-hidden group flex flex-col justify-between">
            <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none"></div>
            
            <div>
              <div class="flex items-center gap-2 mb-2">
                <i class="pi pi-sparkles text-indigo-400 text-xs"></i>
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Simulador de Retenção</h3>
              </div>
              <p class="text-[10px] text-slate-400 font-medium mb-8">Arraste a barra para prever o impacto de converter Detratores em Promotores.</p>
              
              <div class="mb-6 relative z-10">
                <div class="flex justify-between text-white text-xs font-bold mb-3">
                  <span class="uppercase tracking-widest text-[9px] text-slate-300">Meta de Conversão</span>
                  <span class="text-indigo-400 font-black">{{ porcentagemConversao }}%</span>
                </div>
                <Slider v-model="porcentagemConversao" :min="0" :max="100" class="w-full custom-slider" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-4 relative z-10">
              <div class="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm transition-all duration-300" :class="{'border-emerald-500/30 bg-emerald-500/5': simulador.npsGanho > 0}">
                <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest">NPS Projetado</span>
                <div class="text-3xl font-black text-white mt-1">{{ simulador.npsNovo }}</div>
                <div class="text-[9px] font-black text-emerald-400 uppercase mt-1" v-if="simulador.npsGanho > 0">+{{ simulador.npsGanho }} pts</div>
              </div>
              <div class="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm transition-all duration-300" :class="{'border-emerald-500/30 bg-emerald-500/5': simulador.receitaSalva > 0}">
                <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Receita Salva</span>
                <div class="text-2xl font-black text-emerald-400 mt-1">€ {{ (simulador.receitaSalva / 1000).toFixed(1) }}k</div>
                <div class="text-[9px] font-black text-slate-400 uppercase mt-1" v-if="simulador.receitaSalva === 0">Sem ganhos</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center relative">
            <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] w-full text-left mb-6">Polaridade</h3>
            <div class="relative w-40 h-40 flex items-center justify-center">
              <Chart v-if="chartDataPie" type="doughnut" :data="chartDataPie" :options="chartOptionsPie" class="w-full h-full absolute z-10 drop-shadow-md" />
              <div class="absolute flex flex-col items-center z-0">
                <span class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.total_respostas }}</span>
                <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Respostas</span>
              </div>
            </div>
            <div class="flex gap-4 mt-8 w-full justify-center">
               <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-500"></div><span class="text-[9px] font-black uppercase text-slate-500">{{ kpis.promotores }}</span></div>
               <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-yellow-500"></div><span class="text-[9px] font-black uppercase text-slate-500">{{ kpis.neutros }}</span></div>
               <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-rose-500"></div><span class="text-[9px] font-black uppercase text-slate-500">{{ kpis.detratores }}</span></div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6">Top 5 Clientes</h3>
            <div class="space-y-5">
              <div v-for="(item, idx) in ranking.slice(0, 5)" :key="item.nome" class="group">
                <div class="flex justify-between items-end mb-2">
                  <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pr-4 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{{ idx + 1 }}. {{ item.nome }}</span>
                  <span class="text-[10px] font-black" :class="item.nps >= 50 ? 'text-emerald-500' : item.nps > 0 ? 'text-yellow-500' : 'text-rose-500'">{{ item.nps }}</span>
                </div>
                <div class="w-full h-1 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
                  <div class="h-full transition-all duration-1000" :class="item.nps >= 50 ? 'bg-emerald-500' : item.nps > 0 ? 'bg-yellow-500' : 'bg-rose-500'" :style="{ width: Math.max(((item.nps + 100) / 200) * 100, 5) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Última Voz</h3>
              <router-link to="/respostas" class="text-[9px] font-black text-slate-400 hover:text-orange-500 transition-colors uppercase tracking-widest flex items-center gap-1">Mais <i class="pi pi-angle-right"></i></router-link>
            </div>
            <div class="space-y-4 flex-1">
              <div v-for="(f, i) in feedbacks.slice(0, 2)" :key="i" class="p-5 rounded-[1.5rem] bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-700/30 flex flex-col justify-between hover:shadow-md transition-shadow group">
                <p class="text-[11px] text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed mb-4 group-hover:text-slate-800 dark:group-hover:text-white transition-colors line-clamp-2">"{{ f.comentario || 'Apenas nota submetida.' }}"</p>
                <div class="flex items-center gap-3 mt-auto">
                  <div :class="['w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white shrink-0', obterCorNPS(f.nota)]">{{ f.nota }}</div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-[10px] font-black text-slate-800 dark:text-white truncate">{{ f.cliente }}</span>
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tight truncate">{{ f.empresa }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 col-span-12 lg:col-span-4 overflow-hidden">
              <div class="flex items-center justify-between mb-8">
                  <h3 class="text-xs font-black uppercase tracking-widest text-slate-400">Nuvem de Sentimentos</h3>
                  <i class="pi pi-cloud text-slate-300"></i>
              </div>

              <div class="flex flex-wrap items-center justify-center gap-3">
                  <div v-for="item in nuvemPalavras" :key="item.palavra" 
                      :style="calcularEstiloBolha(item.quantidade)"
                      class="transition-all duration-300 hover:scale-110 cursor-default
                              bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50
                              rounded-full flex items-center gap-2 group shadow-sm hover:shadow-orange-500/10 hover:border-orange-500/30">
                      
                      <span class="font-bold text-slate-600 dark:text-slate-300 group-hover:text-orange-600 transition-colors">
                          {{ item.palavra }}
                      </span>
                      
                      <span class="text-[9px] opacity-40 group-hover:opacity-100 font-black px-1.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 transition-all">
                          {{ item.quantidade }}
                      </span>
                  </div>
              </div>

              <div v-if="nuvemPalavras.length === 0" class="py-12 text-center opacity-30 italic text-xs">
                  Aguardando dados de comentários...
              </div>
          </div>

        </div>

      </div>
    </div>
    <Dialog v-model:visible="dialogAI" :modal="true" :style="{width: '650px'}" :closable="false" class="rounded-[2.5rem] overflow-hidden p-0 shadow-2xl bg-slate-900 border border-indigo-500/20 custom-dialog-no-header">
      
      <div class="relative bg-slate-900 p-8 overflow-hidden">
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]"></div>
        <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"></div>
        
        <div class="relative z-10 flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-3">
              <i class="pi pi-sparkles text-indigo-400"></i> Síntese de IA
            </h2>
            <p class="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2 font-bold">Processamento de Linguagem Natural</p>
          </div>
          <button @click="dialogAI = false" class="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors backdrop-blur-md"><i class="pi pi-times"></i></button>
        </div>
      </div>

      <div v-if="loadingAI" class="p-12 bg-slate-900 flex flex-col items-center justify-center relative z-10 min-h-[300px]">
        <div class="relative flex justify-center items-center w-24 h-24 mb-6">
          <div class="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin"></div>
          <div class="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style="animation-direction: reverse; animation-duration: 1.5s;"></div>
          <i class="pi pi-bolt text-indigo-400 text-3xl animate-pulse"></i>
        </div>
        <h3 class="text-white font-black uppercase tracking-widest text-xs mb-2">A ler feedbacks...</h3>
        <p class="text-slate-500 text-[10px] uppercase tracking-widest font-bold">A correlacionar Detratores e Promotores</p>
      </div>

      <div v-else-if="resultadoAI" class="p-8 space-y-4 bg-slate-900/90 relative z-10">
        
        <div class="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex gap-5 items-start group hover:bg-rose-500/20 transition-colors">
          <div class="w-12 h-12 rounded-[1.2rem] bg-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform"><i class="pi pi-fire text-white text-lg"></i></div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">O Que Está a Falhar</h4>
            <p class="text-sm text-slate-300 font-medium leading-relaxed">{{ resultadoAI.arder }}</p>
          </div>
        </div>

        <div class="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex gap-5 items-start group hover:bg-emerald-500/20 transition-colors">
          <div class="w-12 h-12 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform"><i class="pi pi-heart-fill text-white text-lg"></i></div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">O Que Está a Funcionar</h4>
            <p class="text-sm text-slate-300 font-medium leading-relaxed">{{ resultadoAI.amar }}</p>
          </div>
        </div>

        <div class="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex gap-5 items-start group hover:bg-indigo-500/20 transition-colors">
          <div class="w-12 h-12 rounded-[1.2rem] bg-indigo-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform"><i class="pi pi-compass text-white text-lg"></i></div>
          <div>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Plano de Ação Sugerido</h4>
            <p class="text-sm text-indigo-200 font-medium leading-relaxed">{{ resultadoAI.recomendacao }}</p>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.animate-ping { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }

/* Customização Premium do Slider do PrimeVue para combinar com o Dark Mode */
:deep(.custom-slider.p-slider) {
  @apply bg-white/10 h-1.5 border-none;
}
:deep(.custom-slider.p-slider .p-slider-range) {
  @apply bg-indigo-500 shadow-[0_0_10px_#6366f1];
}
:deep(.custom-slider.p-slider .p-slider-handle) {
  @apply bg-white border-2 border-indigo-500 w-4 h-4 shadow-lg hover:bg-indigo-50 transition-colors focus:ring-4 focus:ring-indigo-500/30;
}
:deep(.custom-dialog-no-header .p-dialog-header) {
  display: none;
}
:deep(.custom-dialog-no-header .p-dialog-content) {
  padding: 0;
  background-color: transparent;
}
:deep(.custom-calendar .p-inputtext) { 
  border: none; 
  background: transparent; 
  padding: 0.5rem 0.5rem; 
  outline: none; 
  box-shadow: none; 
  color: inherit; }

::-webkit-scrollbar { display: none; }
</style>
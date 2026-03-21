<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

import Chart from 'primevue/chart';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Slider from 'primevue/slider';
import Calendar from 'primevue/calendar';
import Tooltip from 'primevue/tooltip';

const vTooltip = Tooltip;
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
  delta_score: "+2.1", 
  delta_total: "+5%",
  total_decisores: 0, 
  revenue_at_risk: 0,
});

const ranking = ref([]);
const nuvemPalavras = ref([]);
const taxaResposta = ref(0);

// --- TÓPICOS CRÍTICOS (Substituiu Última Voz) ---
const topicosCriticos = ref([
  { tema: 'Lentidão no Atendimento', mencoes: 14, notaMedia: 3.2 },
  { tema: 'Bugs no Sistema', mencoes: 8, notaMedia: 5.5 },
  { tema: 'Falta de Funcionalidades', mencoes: 5, notaMedia: 7.0 },
  { tema: 'Preço/Valor Injusto', mencoes: 3, notaMedia: 4.0 }
]);

// --- INTELIGÊNCIA PREDITIVA ---
const smartInsights = ref({
  valor_em_risco: "€ 0",
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

// --- DISPARO DE E-MAIL PARA O GESTOR ---
const acionandoGestor = ref(false);

const dispararEmailGestor = async () => {
  if (!topRisco.value || !topRisco.value.gestor) {
    toast.add({ severity: 'warn', summary: 'Aviso', detail: 'Esta conta não tem um Gestor associado para notificar.', life: 4000 });
    return;
  }
  
  acionandoGestor.value = true;
  try {
    const payload = {
      empresa: topRisco.value.nome,
      gestor: topRisco.value.gestor,
      nps: topRisco.value.nps
    };
    const res = await api.post('/dashboard/acionar-gestor', payload);
    toast.add({ severity: 'success', summary: 'Fecho de Loop Acionado', detail: res.data.message, life: 5000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro de Envio', detail: error.response?.data?.detail || 'Falha ao enviar e-mail.', life: 5000 });
  } finally {
    acionandoGestor.value = false;
  }
};

// --- GRÁFICOS ---
const chartDataLine = ref(null);
const chartOptionsLine = ref(null);
const chartDataPie = ref(null);
const chartOptionsPie = ref(null);

// ==========================================
// 🤖 MAGIC AI: SÍNTESE EXECUTIVA (AGORA INLINE)
// ==========================================
const loadingAI = ref(false);
const resultadoAI = ref(null);
const fromCacheAI = ref(false);
const cooldownTimerAI = ref(0);
let intervalAI = null;

const iniciarCooldownAI = () => {
  cooldownTimerAI.value = 30;
  if (intervalAI) clearInterval(intervalAI);
  intervalAI = setInterval(() => {
    cooldownTimerAI.value--;
    if (cooldownTimerAI.value <= 0) clearInterval(intervalAI);
  }, 1000);
};

onUnmounted(() => {
  if (intervalAI) clearInterval(intervalAI);
});

const gerarInsightIA = async (forcarNova = false) => {
  loadingAI.value = true;
  fromCacheAI.value = false;
  
  try {
    const queryParams = obterParametrosFiltro();
    const dataHoje = new Date().toISOString().split('T')[0];
    const cacheKey = `dashboard_ia_${queryParams}_${dataHoje}`;
    
    if (!forcarNova) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
          resultadoAI.value = JSON.parse(cached);
          fromCacheAI.value = true;
          loadingAI.value = false;
          return;
      }
    }

    const response = await api.get(`/dashboard/magic-ai${queryParams}`);
    
    if (response.data.status === 'success' && response.data.insights.arder) {
      resultadoAI.value = response.data.insights;
      localStorage.setItem(cacheKey, JSON.stringify(response.data.insights));
      if (forcarNova) iniciarCooldownAI();
    } else {
      toast.add({ severity: 'warn', summary: 'Atenção', detail: response.data.insights?.recomendacao || 'Não foi possível gerar a análise.', life: 5000 });
    }
  } catch (error) {
    console.error("Erro IA:", error);
    toast.add({ severity: 'error', summary: 'Erro de IA', detail: 'O modelo demorou a responder ou falhou.', life: 5000 });
  } finally {
    loadingAI.value = false;
  }
};

// ==========================================
// 📅 VIGILANTE DO FILTRO DE DATAS
// ==========================================
watch(datasFiltro, (novasDatas) => {
  if (novasDatas && novasDatas[0] && novasDatas[1]) {
    carregarDashboard();
    gerarInsightIA(false); // Carrega IA do Cache automaticamente
  } 
  else if (!novasDatas || novasDatas.length === 0) {
    carregarDashboard(); 
    gerarInsightIA(false); // Carrega IA do Cache automaticamente
  }
});

const obterParametrosFiltro = () => {
  if (datasFiltro.value && datasFiltro.value[0] && datasFiltro.value[1]) {
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

    const [resKpis, resDetalhes, resTrend] = await Promise.all([
      api.get(`/dashboard/kpis${queryParams}`),
      api.get(`/dashboard/detalhes${queryParams}`),
      api.get(`/dashboard/trend${queryParams}`)
    ]);

    if (resKpis.data.status === 'success') {
      kpis.value = { ...kpis.value, ...resKpis.data.kpis };
      nuvemPalavras.value = resKpis.data.kpis.termos_frequentes || [];
      
      const percDetratores = kpis.value.total_respostas > 0 ? (kpis.value.detratores / kpis.value.total_respostas) * 100 : 0;
      smartInsights.value.valor_em_risco = `€ ${kpis.value.revenue_at_risk.toLocaleString('pt-PT')}`; 
      smartInsights.value.nivel_alerta = percDetratores > 20 ? 'Crítico' : 'Estável';
      
      // Se a sua API já enviar os tópicos críticos, descomente aqui:
      // topicosCriticos.value = resKpis.data.topicos_criticos || topicosCriticos.value;

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
      borderWidth: 4,
      tension: 0.4,
      backgroundColor: (context) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return null;
        
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(249, 115, 22, 0.3)'); 
        gradient.addColorStop(1, 'rgba(249, 115, 22, 0.0)'); 
        return gradient;
      },
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#f97316',
      pointBorderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 6
    }]
  };
  
  chartOptionsLine.value = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 14, weight: 'bold' },
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `NPS: ${context.parsed.y} pts`
        }
      }
    },
    scales: {
      x: { 
        grid: { display: false, drawBorder: false },
        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8' } 
      },
      y: { 
        grid: { color: 'rgba(148, 163, 184, 0.1)', borderDash: [5, 5], drawBorder: false },
        ticks: { font: { size: 10, weight: 'bold' }, color: '#94a3b8', stepSize: 20 } 
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
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

const maxFrequencia = computed(() => {
  if (!nuvemPalavras.value || nuvemPalavras.value.length === 0) return 1;
  return Math.max(...nuvemPalavras.value.map(p => p.quantidade));
});

const calcularEstiloBolha = (quantidade) => {
  const minSize = 0.7;
  const maxSize = 1.6;
  const tamanho = minSize + ((quantidade / maxFrequencia.value) * (maxSize - minSize));
  
  return {
    fontSize: `${tamanho}rem`,
    opacity: 0.5 + ((quantidade / maxFrequencia.value) * 0.5),
    padding: `${tamanho * 0.4}rem ${tamanho * 0.8}rem`
  };
};

// ==========================================
// 📥 EXPORTAR DADOS
// ==========================================
const exportando = ref(false);

const exportarDados = async () => {
  exportando.value = true;
  try {
    const queryParams = obterParametrosFiltro();
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

onMounted(() => {
  carregarDashboard();
  gerarInsightIA(false); // Inicia verificando se há cache
});
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 class="text-4xl lg:text-5xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Visão Geral <span class="text-orange-500">.</span>
          </h1>
          <div class="flex items-center gap-3 mt-3">
            <span class="flex h-2 w-2 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Olá, {{ nomeUsuario }} • Como estão os nossos clientes hoje?
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
          <Button label="Exportar" icon="pi pi-cloud-download" @click="exportarDados" :loading="exportando" class="!bg-gradient-to-r !from-slate-900 !to-slate-800 dark:!from-orange-500 dark:!to-orange-600 !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform duration-300 hidden md:flex" />
        </div>
      </div>

      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton v-for="i in 4" :key="i" height="200px" borderRadius="2rem" class="dark:bg-slate-800/50" />
      </div>

      <div v-else class="space-y-6">
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white dark:bg-slate-900/80 p-6 xl:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Score Global</span>
                <span class="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest mt-0.5">Net Promoter Score</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center border border-orange-100 dark:border-orange-500/20 group-hover:bg-orange-500 transition-colors duration-300">
                <i class="pi pi-chart-line text-orange-500 group-hover:text-white transition-colors text-xs"></i>
              </div>
            </div>
            
            <div class="mt-4">
               <div class="flex items-baseline gap-2">
                 <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.score || 0 }}</span>
                 <span class="text-orange-500 font-black text-xl">pts</span>
               </div>
               
                <div class="mt-3 flex items-center gap-2">
                  <span v-if="kpis.variacao_nps !== undefined" 
                        v-tooltip.bottom="'Variação em relação ao período anterior'"
                        :class="[
                          'text-[10px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1 uppercase tracking-widest transition-colors cursor-help',
                          kpis.variacao_nps > 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                          kpis.variacao_nps < 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' : 
                          'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                        ]">
                    <i :class="kpis.variacao_nps > 0 ? 'pi pi-arrow-up' : kpis.variacao_nps < 0 ? 'pi pi-arrow-down' : 'pi pi-minus'" class="text-[9px]"></i>
                    {{ kpis.variacao_nps > 0 ? '+' : '' }}{{ kpis.variacao_nps }} pts
                  </span>
               </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-6 xl:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Polaridade</span>
                <span class="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest mt-0.5">Distribuição de Sentimento</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center border border-sky-100 dark:border-sky-500/20 group-hover:bg-sky-500 transition-colors duration-300">
                <i class="pi pi-users text-sky-500 group-hover:text-white transition-colors text-xs"></i>
              </div>
            </div>
            
            <div class="mt-4">
               <div class="flex items-baseline gap-2">
                 <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.promotores || 0 }}</span>
                 <span class="text-sky-500 font-black text-xl">promotores</span>
               </div>
               
               <div class="mt-3 flex items-center gap-2">
                  <span class="text-[9px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 uppercase tracking-widest transition-colors bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700">
                    <i class="pi pi-chart-pie text-[8px]"></i> 
                    {{ kpis.neutros || 0 }} Neutros &bull; {{ kpis.detratores || 0 }} Detratores
                  </span>
               </div>
            </div>

          </div>

          <div class="bg-white dark:bg-slate-900/80 p-6 xl:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">NPS Decisores</span>
                <span class="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest mt-0.5">Visão Nível Executivo</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20 group-hover:bg-blue-500 transition-colors duration-300">
                <i class="pi pi-star-fill text-blue-500 group-hover:text-white transition-colors text-xs"></i>
              </div>
            </div>
            <div class="mt-4">
              <div class="flex items-baseline gap-2">
                <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.nps_decisor }}</span>
                <span class="text-blue-500 font-black text-xl">pts</span>
              </div>
              <div class="mt-3 flex items-center gap-2">
                <span class="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-500/20 flex items-center gap-1.5 uppercase tracking-widest">
                  <i class="pi pi-users text-[8px]"></i> {{ kpis.total_decisores }} Avaliações
                </span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-6 xl:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Conversão de Detratores</span>
                <span class="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest mt-0.5">Evolução de Safra</span>
              </div>
              <div class="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 group-hover:bg-emerald-500 transition-colors duration-300">
                <i class="pi pi-arrow-up-right text-emerald-500 group-hover:text-white transition-colors text-xs"></i>
              </div>
            </div>
            <div class="mt-4">
               <div class="flex items-baseline gap-2">
                 <span class="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{{ kpis.clientes_resgatados || 0 }}</span>
                 <span class="text-emerald-500 font-black text-xl">clientes</span>
               </div>
               <div class="mt-3 flex items-center gap-2">
                  <span class="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-1.5 uppercase tracking-widest">
                    <i class="pi pi-sync text-[8px]"></i> Convertidos p/ Promotor
                  </span>
               </div>
            </div>
          </div>
        </div>

        <div v-if="topRisco && topRisco.nps <= 30" class="relative overflow-hidden bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-6 lg:p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 lg:gap-8 group animate-fadein">
          <div class="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-rose-500/5 to-transparent pointer-events-none"></div>
          
          <div class="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <i class="pi pi-bolt text-white text-2xl lg:text-3xl"></i>
          </div>
          
          <div class="flex-1 text-center md:text-left z-10">
            <div class="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h4 class="text-rose-600 dark:text-rose-400 font-black uppercase text-[10px] lg:text-[11px] tracking-[0.2em]">Atenção Prioritária</h4>
                <span v-if="topRisco.gestor" class="px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase tracking-widest rounded-md border border-rose-200 dark:border-rose-500/30 flex items-center gap-1">
                    <i class="pi pi-briefcase text-[8px]"></i> Gestor: {{ topRisco.gestor }}
                </span>
            </div>
            
            <p class="text-slate-700 dark:text-slate-300 text-sm lg:text-base font-medium leading-relaxed">
              O cliente <strong class="text-slate-900 dark:text-white font-black">{{ topRisco.nome }}</strong> 
              <span v-if="topRisco.empresa" class="text-slate-500 text-xs font-bold uppercase tracking-widest mx-1">({{ topRisco.empresa }})</span>
              registou um NPS crítico de <strong class="text-rose-500">{{ topRisco.nps }} pts</strong>. 
              Ação de retenção aconselhada nas próximas 24h.
            </p>
          </div>
          
          <Button 
            label="Acionar Gestor" 
            icon="pi pi-envelope" 
            iconPos="right" 
            :loading="acionandoGestor"
            @click="dispararEmailGestor"
            class="w-full md:w-auto !bg-rose-600 hover:!bg-rose-700 !border-none !text-[10px] !font-black !px-6 !py-3 !rounded-xl shadow-md hover:shadow-rose-500/40 hover:-translate-y-1 transition-all duration-300 z-10 uppercase tracking-widest" 
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div class="lg:col-span-2 bg-white dark:bg-slate-900/80 p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div class="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-orange-500/20 transition-colors duration-700"></div>
            
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
              <div>
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <i class="pi pi-chart-line text-orange-500"></i> Evolução da Marca
                </h3>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Histórico de Performance NPS</p>
              </div>
              
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 bg-orange-50 dark:bg-orange-500/10 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-500/20">
                  <span class="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                  <span class="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Atual: {{ kpis.score }} pts</span>
                </div>
              </div>
            </div>
            
            <div class="h-[280px] w-full relative z-10">
              <Chart v-if="chartDataLine" type="line" :data="chartDataLine" :options="chartOptionsLine" class="h-full" />
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <i class="pi pi-trophy absolute -right-4 -bottom-4 text-[120px] text-slate-50 dark:text-slate-800/30 -rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500"></i>
            <div class="relative z-10 h-full flex flex-col">
              <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <i class="pi pi-star text-yellow-500"></i> Top 5 Clientes
              </h3>
              <div class="space-y-4 flex-1 justify-center flex flex-col">
                <div v-for="(item, idx) in ranking.slice(0, 5)" :key="item.nome" class="group/item">
                  <div class="flex items-center gap-3 mb-1.5">
                    <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-colors"
                         :class="idx === 0 ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' : 
                                 idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : 
                                 idx === 2 ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 
                                 'bg-slate-50 dark:bg-slate-800/50 text-slate-400'">
                      {{ idx + 1 }}
                    </div>
                    <div class="flex-1 flex justify-between items-end min-w-0">
                      <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate pr-2 group-hover/item:text-slate-900 dark:group-hover/item:text-white transition-colors">{{ item.nome }}</span>
                      <span class="text-[10px] font-black shrink-0" :class="item.nps >= 50 ? 'text-emerald-500' : item.nps > 0 ? 'text-yellow-500' : 'text-rose-500'">{{ item.nps }} pts</span>
                    </div>
                  </div>
                  <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden ml-8" style="width: calc(100% - 32px)">
                    <div class="h-full transition-all duration-1000 shadow-sm" :class="item.nps >= 50 ? 'bg-emerald-500 shadow-emerald-500/50' : item.nps > 0 ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-rose-500 shadow-rose-500/50'" :style="{ width: Math.max(((item.nps + 100) / 200) * 100, 5) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div class="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 lg:p-10 rounded-[2.5rem] border border-indigo-500/20 shadow-xl relative overflow-hidden group flex flex-col justify-between">
            <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[40px] pointer-events-none"></div>
            <div>
              <div class="flex items-center gap-2 mb-2">
                <i class="pi pi-sparkles text-indigo-400 text-xs"></i>
                <h3 class="text-xs font-black text-indigo-400 uppercase tracking-[0.2em]">Simulador de Retenção</h3>
              </div>
              <p class="text-[10px] text-slate-400 font-medium mb-8">Arraste a barra para prever impacto.</p>
              <div class="mb-6 relative z-10">
                <div class="flex justify-between text-white text-xs font-bold mb-3">
                  <span class="uppercase tracking-widest text-[9px] text-slate-300">Meta Conversão</span>
                  <span class="text-indigo-400 font-black">{{ porcentagemConversao }}%</span>
                </div>
                <Slider v-model="porcentagemConversao" :min="0" :max="100" class="w-full custom-slider" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-auto relative z-10">
              <div class="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10" :class="{'border-emerald-500/30 bg-emerald-500/5': simulador.npsGanho > 0}">
                <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest">NPS Projetado</span>
                <div class="text-3xl font-black text-white mt-1">{{ simulador.npsNovo }}</div>
                <div class="text-[9px] font-black text-emerald-400 uppercase mt-1" v-if="simulador.npsGanho > 0">+{{ simulador.npsGanho }} pts</div>
              </div>
              <div class="bg-white/5 p-4 rounded-[1.5rem] border border-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/10" :class="{'border-emerald-500/30 bg-emerald-500/5': simulador.receitaSalva > 0}">
                <span class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Receita Salva</span>
                <div class="text-2xl font-black text-emerald-400 mt-1 truncate">€ {{ (simulador.receitaSalva / 1000).toFixed(1) }}k</div>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden flex flex-col justify-center border border-slate-800 group hover:shadow-rose-500/10 transition-shadow duration-500">
            <div class="absolute -right-16 -top-16 w-64 h-64 bg-rose-500/20 rounded-full blur-[60px] group-hover:bg-rose-500/30 group-hover:scale-110 transition-all duration-700 pointer-events-none"></div>
            
            <div class="relative z-10 flex justify-between items-center mb-8">
              <h3 class="text-xs font-black text-rose-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <i class="pi pi-exclamation-triangle"></i> Revenue at Risk
              </h3>
            </div>
            
            <div class="relative z-10 flex-1 flex flex-col justify-center items-start">
              <div class="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tighter drop-shadow-md truncate w-full">
                {{ smartInsights.valor_em_risco }}
              </div>
              <div class="mt-8 inline-flex items-center gap-3 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl backdrop-blur-md">
                 <div class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                 <span class="text-[9px] text-rose-200 font-black uppercase tracking-widest">Base Detratora Financeira</span>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden group">
            <div class="absolute inset-0 bg-gradient-to-br from-transparent to-indigo-50/50 dark:to-indigo-900/10 pointer-events-none"></div>
            
            <div class="relative z-10 flex justify-between items-center mb-6">
              <h3 class="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <i class="pi pi-comments"></i> Tópicos Críticos
              </h3>
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg">Comentários</span>
            </div>
            
            <div class="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2 relative z-10">
               <div v-for="(prob, idx) in topicosCriticos" :key="idx" class="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
                  <div class="flex flex-col overflow-hidden pr-2">
                     <span class="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate" :title="prob.tema">{{ prob.tema }}</span>
                     <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1"><i class="pi pi-hashtag text-[8px] mr-0.5"></i> {{ prob.mencoes }} menções</span>
                  </div>
                  <div class="flex flex-col items-end shrink-0 pl-3 border-l border-slate-200 dark:border-slate-700">
                     <span class="text-lg font-black leading-none" :class="prob.notaMedia <= 6 ? 'text-rose-500' : (prob.notaMedia <= 8 ? 'text-yellow-500' : 'text-emerald-500')">
                       {{ prob.notaMedia.toFixed(1) }}
                     </span>
                     <span class="text-[8px] font-bold text-slate-400 uppercase mt-1">Nota Média</span>
                  </div>
               </div>
               <div v-if="topicosCriticos.length === 0" class="text-center text-xs text-slate-400 italic py-8">
                  Nenhum tópico mapeado no período.
               </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900/80 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm relative group mt-6">
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50 pointer-events-none"></div>
            
            <div class="flex items-center justify-between mb-8 relative z-10">
                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                   <i class="pi pi-cloud text-slate-300"></i> Nuvem de Sentimentos
                </h3>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 min-h-[120px] relative z-10">
                <div v-for="item in nuvemPalavras" :key="item.palavra" 
                    :style="calcularEstiloBolha(item.quantidade)"
                    class="transition-all duration-300 hover:scale-110 cursor-default backdrop-blur-sm
                            bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700
                            rounded-full flex items-center gap-2 group shadow-sm hover:shadow-orange-500/20 hover:border-orange-500/40">
                    <span class="font-bold text-slate-600 dark:text-slate-300 group-hover:text-orange-600 transition-colors">
                        {{ item.palavra }}
                    </span>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                        {{ item.quantidade }}
                    </span>
                </div>
                <div v-if="nuvemPalavras.length === 0" class="py-12 w-full text-center opacity-40 italic text-xs text-slate-500 font-medium">
                    Aguardando dados de comentários para gerar a nuvem...
                </div>
            </div>
        </div>

        <div class="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 lg:p-10 rounded-[3rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group mt-6 print-break-inside-avoid">
            <div class="absolute right-0 top-0 p-10 opacity-10 pointer-events-none">
                <svg class="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.28 9.82a6 6 0 0 0-6.51-2.9 6.07 6.07 0 0 0-10.79-2.74A6 6 0 0 0 .74 11.27a6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9 6.07 6.07 0 0 0 10.79 2.74 6 6 0 0 0 3.72-11.99zM12 15.18a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36z"/></svg>
            </div>
            
            <div class="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                <div class="w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 mt-2">
                    <i class="pi pi-bolt text-indigo-400 text-3xl" :class="{'animate-pulse': loadingAI}"></i>
                </div>
                
                <div class="flex-1 w-full">
                    <div class="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                        <div>
                            <h2 class="text-xl font-black text-white italic tracking-tighter">Gauge AI: Síntese Preditiva</h2>
                            <p class="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Processamento de Linguagem Natural</p>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <span v-if="fromCacheAI" class="text-[9px] font-black text-emerald-400/70 border border-emerald-500/20 px-3 py-2 rounded-xl uppercase tracking-widest" v-tooltip.top="'Resposta carregada da memória (Zero custo de API)'">
                              <i class="pi pi-database text-[8px] mr-1"></i> Cached
                            </span>
                            
                            <button @click="gerarInsightIA(true)" :disabled="loadingAI || cooldownTimerAI > 0" class="shrink-0 flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/30 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed">
                               <i class="pi" :class="loadingAI ? 'pi-spin pi-spinner' : (cooldownTimerAI > 0 ? 'pi-clock' : 'pi-sparkles')"></i>
                               {{ loadingAI ? 'A Processar...' : (cooldownTimerAI > 0 ? `Aguarde ${cooldownTimerAI}s` : 'Gerar Análise') }}
                            </button>
                        </div>
                    </div>

                    <div v-if="loadingAI" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton width="100%" height="180px" borderRadius="2rem" class="bg-indigo-800/50" />
                        <Skeleton width="100%" height="180px" borderRadius="2rem" class="bg-indigo-800/50" />
                        <Skeleton width="100%" height="180px" borderRadius="2rem" class="bg-indigo-800/50" />
                    </div>
                    
                    <div v-else-if="resultadoAI" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex flex-col gap-4 group hover:bg-rose-500/20 transition-colors shadow-inner shadow-rose-500/5">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-[1rem] bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 group-hover:scale-110 transition-transform"><i class="pi pi-fire text-white"></i></div>
                                <h4 class="text-[10px] font-black uppercase tracking-widest text-rose-400">O Que Está a Falhar</h4>
                            </div>
                            <p class="text-[13px] text-slate-300 font-medium leading-relaxed">{{ resultadoAI.arder }}</p>
                        </div>

                        <div class="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex flex-col gap-4 group hover:bg-emerald-500/20 transition-colors shadow-inner shadow-emerald-500/5">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-[1rem] bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 group-hover:scale-110 transition-transform"><i class="pi pi-heart-fill text-white"></i></div>
                                <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-400">O Que Está a Funcionar</h4>
                            </div>
                            <p class="text-[13px] text-slate-300 font-medium leading-relaxed">{{ resultadoAI.amar }}</p>
                        </div>

                        <div class="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex flex-col gap-4 group hover:bg-indigo-500/20 transition-colors shadow-inner shadow-indigo-500/5">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-[1rem] bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0 group-hover:scale-110 transition-transform"><i class="pi pi-compass text-white"></i></div>
                                <h4 class="text-[10px] font-black uppercase tracking-widest text-indigo-400">Plano de Ação Sugerido</h4>
                            </div>
                            <p class="text-[13px] text-indigo-200 font-medium leading-relaxed">{{ resultadoAI.recomendacao }}</p>
                        </div>
                    </div>
                    
                    <div v-else class="text-slate-400 text-sm font-medium border border-dashed border-slate-700/50 p-6 rounded-2xl text-center">
                        Clique em "Gerar Análise" para a inteligência artificial processar os feedbacks deste período.
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.animate-ping { animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }

/* --- Slider Customizado (Resiliente ao Dark Mode) --- */
:deep(.custom-slider.p-slider) {
  @apply bg-slate-200 dark:bg-white/20 h-1.5 border-none;
}
:deep(.custom-slider.p-slider .p-slider-range) {
  @apply bg-indigo-500 shadow-[0_0_10px_#6366f1];
}
:deep(.custom-slider.p-slider .p-slider-handle) {
  @apply bg-white dark:bg-slate-100 border-2 border-indigo-500 w-4 h-4 shadow-lg hover:bg-indigo-50 transition-colors focus:ring-4 focus:ring-indigo-500/30;
}

/* --- Calendário Customizado --- */
:deep(.custom-calendar .p-inputtext) { 
  border: none; 
  @apply bg-transparent p-2 outline-none shadow-none text-slate-700 dark:text-slate-100 font-medium;
}

/* Esconder Scrollbars */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 dark:bg-slate-700 rounded-full; }
::-webkit-scrollbar { display: none; } /* Oculta a principal */
</style>
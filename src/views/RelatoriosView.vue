<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 class="text-4xl lg:text-5xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Laboratório <span class="text-indigo-500">Analítico</span>
          </h1>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">
            Business Intelligence • Cruzamento de Dados e Risco
          </p>
        </div>
        
        <div class="flex gap-3 no-print">
          <Button label="Exportar PDF" icon="pi pi-file-pdf" @click="exportarPDF" class="!bg-white dark:!bg-slate-900 !text-rose-500 !border-slate-200 dark:!border-slate-700 !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-sm hover:scale-105 transition-transform" />
          <Button label="Enviar Report" icon="pi pi-envelope" @click="abrirModalEmail" class="!bg-slate-900 dark:!bg-white dark:!text-slate-900 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print relative overflow-hidden mb-6">
        
        <div class="absolute left-0 top-0 w-1 h-full bg-indigo-500"></div>
        
        <div class="flex flex-col gap-1.5 px-3">
          <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-calendar text-[8px]"></i> Período</span>
          <Dropdown v-model="filtros.periodo" :options="opcoesPeriodo" class="custom-dropdown-minimal w-full" />
        </div>

        <div class="flex flex-col gap-1.5 px-3 md:border-l border-slate-100 dark:border-slate-800">
          <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-briefcase text-[8px]"></i> Segmento</span>
          <Dropdown v-model="filtros.segmento" :options="opcoesSegmento" class="custom-dropdown-minimal w-full" />
        </div>

        <div class="flex flex-col gap-1.5 px-3 lg:border-l border-slate-100 dark:border-slate-800">
          <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-chart-pie text-[8px]"></i> Tamanho / ARR</span>
          <Dropdown v-model="filtros.arr" :options="opcoesARR" class="custom-dropdown-minimal w-full" />
        </div>

        <div class="flex flex-col gap-1.5 px-3 md:border-l border-slate-100 dark:border-slate-800">
          <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><i class="pi pi-hourglass text-[8px]"></i> Tempo de Casa</span>
          <Dropdown v-model="filtros.safra" :options="opcoesSafra" class="custom-dropdown-minimal w-full" />
        </div>

      </div>

      <div v-if="loadingDados" class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-[450px]">
           <Skeleton width="40%" height="2rem" borderRadius="16px" class="mb-8"></Skeleton>
           <Skeleton width="100%" height="300px" borderRadius="16px"></Skeleton>
        </div>
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-[450px]">
           <Skeleton width="60%" height="2rem" borderRadius="16px" class="mb-8"></Skeleton>
           <Skeleton width="100%" height="300px" borderRadius="16px"></Skeleton>
        </div>
      </div>

      <div v-else class="space-y-8">
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative print-break-inside-avoid overflow-hidden">
            <div class="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 rounded-bl-[100px] pointer-events-none"></div>
            
            <div class="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Matriz de Priorização</h3>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Frequência do Problema vs. Nota Média</p>
              </div>
              <div class="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-500/20 uppercase tracking-widest flex items-center gap-1">
                <i class="pi pi-arrow-down-right"></i> Quadrante Crítico
              </div>
            </div>
            
            <div class="h-[300px] relative z-10">
              <Chart type="scatter" :data="dataScatter" :options="optionsScatter" class="h-full" />
            </div>
          </div>

          <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print-break-inside-avoid">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Análise de Safra (Cohort)</h3>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Distribuição de Sentimento por Tempo de Casa</p>
              </div>
            </div>
            
            <div class="h-[300px]">
              <Chart type="bar" :data="dataStackedBar" :options="optionsStackedBar" class="h-full" />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          <div class="lg:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print-break-inside-avoid relative overflow-hidden">
            <div class="absolute left-0 top-0 w-32 h-32 bg-rose-500/5 rounded-br-[100px] pointer-events-none"></div>
            
            <div class="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <i class="pi pi-dollar text-emerald-500"></i> Matriz de Risco Financeiro
                </h3>
                <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">NPS vs Receita (ARR). Tamanho = Base de Usuários</p>
              </div>
            </div>
            
            <div class="h-[350px] relative z-10">
              <Chart type="bubble" :data="dataBubble" :options="optionsBubble" class="h-full" />
            </div>
          </div>

          <div class="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group print-break-inside-avoid flex flex-col">
            <div class="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
              <svg class="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.28 9.82a6 6 0 0 0-6.51-2.9 6.07 6.07 0 0 0-10.79-2.74A6 6 0 0 0 .74 11.27a6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9 6.07 6.07 0 0 0 10.79 2.74 6 6 0 0 0 3.72-11.99zM12 15.18a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36z"/></svg>
            </div>
            
            <div class="relative z-10 flex justify-between items-start mb-6">
              <div>
                <h2 class="text-lg font-black text-white italic tracking-tighter flex items-center gap-2">
                  <i class="pi pi-sparkles text-indigo-400"></i> Consultoria IA
                </h2>
                <p class="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Pareto Analítico</p>
              </div>
              <button @click="gerarAnaliseIA(true)" :disabled="loadingIA" class="no-print bg-white/5 hover:bg-white/10 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                 <i class="pi" :class="loadingIA ? 'pi-spin pi-spinner' : 'pi-refresh'"></i>
              </button>
            </div>

            <div v-if="loadingIA" class="flex-1 flex flex-col gap-3 justify-center">
              <Skeleton width="100%" height="1rem" class="bg-indigo-800/50" />
              <Skeleton width="100%" height="1rem" class="bg-indigo-800/50" />
              <Skeleton width="80%" height="1rem" class="bg-indigo-800/50" />
              <Skeleton width="90%" height="1rem" class="bg-indigo-800/50" />
            </div>
            
            <div v-else class="flex-1 flex flex-col justify-between relative z-10">
              <div class="text-sm text-slate-300 font-medium leading-relaxed space-y-4">
                <p v-html="resumoParetoIA || 'Aguardando processamento IA...'"></p>
              </div>
              
              <div class="mt-6 pt-6 border-t border-indigo-500/20" v-if="recomendacaoIA">
                <h4 class="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-2">Recomendação Tática:</h4>
                <p class="text-xs text-white font-bold leading-relaxed bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                  {{ recomendacaoIA }}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <Dialog v-model:visible="modalEmailOpen" modal header="Compartilhar Relatório Analítico" :style="{ width: '400px' }" class="custom-dialog">
        <div class="space-y-6 pt-2">
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Enviar para:</label>
            <MultiSelect v-model="gestoresSelecionados" :options="listaGestores" optionLabel="nome" placeholder="Selecione os Gestores" :maxSelectedLabels="3" class="w-full !bg-slate-50 dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !rounded-xl" />
          </div>
          <div class="pt-2">
            <Button :label="enviandoEmail ? 'A enviar...' : 'Disparar E-mail'" icon="pi pi-send" @click="confirmarEnvioEmail" :loading="enviandoEmail" class="w-full !bg-indigo-500 !text-white !border-none !rounded-xl !text-xs !font-black !uppercase !tracking-widest !py-3 shadow-lg shadow-indigo-500/30" />
          </div>
        </div>
      </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import Dialog from 'primevue/dialog';
import MultiSelect from 'primevue/multiselect';
import Skeleton from 'primevue/skeleton';

const toast = useToast();

// ==========================================
// 🎛️ ESTADOS GERAIS & FILTROS REAIS
// ==========================================
const loadingDados = ref(true);
const loadingIA = ref(false);

const filtros = ref({
  periodo: 'Últimos 6 Meses',
  segmento: 'Todos',
  arr: 'Todos',
  safra: 'Todos'
});

// Opções dinâmicas e estáticas
const opcoesPeriodo = ref(['Últimos 3 Meses', 'Últimos 6 Meses', 'Este Ano', 'Todos']);
const opcoesSegmento = ref(['Todos']); // <-- Começa só com 'Todos', depois preenche da API
const opcoesARR = ref(['Todos', '> € 100k', '€ 50k - € 100k', '< € 50k']);
const opcoesSafra = ref(['Todos', '0-3 Meses (Onboarding)', '3-12 Meses', '+1 Ano']);

// ESTADOS DE E-MAIL
const modalEmailOpen = ref(false);
const enviandoEmail = ref(false);
const listaGestores = ref([]);
const gestoresSelecionados = ref([]);

// ESTADOS IA
const resumoParetoIA = ref('');
const recomendacaoIA = ref('');

// ESTADOS DE GRÁFICOS
const dataScatter = ref(null);
const optionsScatter = ref(null);

const dataStackedBar = ref(null);
const optionsStackedBar = ref(null);

const dataBubble = ref(null);
const optionsBubble = ref(null);

// OBSERVA MUDANÇAS NOS FILTROS E RECARREGA TUDO
watch(filtros, () => {
  fetchGraficos();
  gerarAnaliseIA(false);
}, { deep: true });

// ==========================================
// 📡 FETCH DE CADASTROS (Segmentos e Gestores)
// ==========================================
const carregarFiltrosIniciais = async () => {
  try {
    const res = await api.get('/cadastros/segmentos');
    // Mapeia o nome dos segmentos reais e adiciona a opção 'Todos' no início
    opcoesSegmento.value = ['Todos', ...res.data.map(seg => seg.nome)];
  } catch (error) {
    console.error("Erro ao carregar os segmentos reais:", error);
  }
};


// ==========================================
// 📊 FETCH DOS DADOS REAIS (API PYTHON)
// ==========================================
const fetchGraficos = async () => {
  loadingDados.value = true;
  try {
    const config = { params: filtros.value };

    // 1. MATRIZ DE PRIORIZAÇÃO (SCATTER)
    try {
        const resScatter = await api.get('/reports/bi-scatter', config);
        const scatterData = resScatter.data;
        
        dataScatter.value = {
            datasets: [
                {
                    label: 'Tópicos Críticos',
                    data: scatterData.filter(d => d.y <= 6),
                    backgroundColor: 'rgba(244, 63, 94, 0.8)', // Rose-500
                    borderColor: '#f43f5e',
                },
                {
                    label: 'Atenção/Melhoria',
                    data: scatterData.filter(d => d.y > 6),
                    backgroundColor: 'rgba(245, 158, 11, 0.8)', // Yellow-500
                    borderColor: '#f59e0b',
                }
            ]
        };
        optionsScatter.value = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10, weight: 'bold' } } },
                tooltip: {
                    callbacks: { label: (ctx) => `${ctx.raw.tema}: ${ctx.raw.x} menções | Nota: ${ctx.raw.y}` }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Frequência (Menções)', font: { size: 10, weight: 'bold' } }, grid: { borderDash: [5, 5] } },
                y: { title: { display: true, text: 'Nota Média', font: { size: 10, weight: 'bold' } }, min: 0, max: 10, grid: { borderDash: [5, 5] } }
            }
        };
    } catch(e) {
        console.error("Erro Scatter:", e);
    }

    // 2. ANÁLISE DE SAFRA (STACKED BAR)
    try {
        const resSafra = await api.get('/reports/bi-safra', config);
        const safraData = resSafra.data;
        
        dataStackedBar.value = {
            labels: safraData.labels,
            datasets: [
                { label: 'Promotores', backgroundColor: '#10b981', data: safraData.promotores },
                { label: 'Neutros', backgroundColor: '#f59e0b', data: safraData.neutros },
                { label: 'Detratores', backgroundColor: '#f43f5e', data: safraData.detratores }
            ]
        };
        optionsStackedBar.value = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10, weight: 'bold' } } } },
            scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { borderDash: [5, 5] } } }
        };
    } catch(e) {
        console.error("Erro Safra:", e);
    }

    // 3. RISCO FINANCEIRO (BUBBLE CHART)
    try {
        const resBubble = await api.get('/reports/bi-risco', config);
        const bubbleData = resBubble.data;
        
        dataBubble.value = {
            datasets: [
                {
                    label: 'Risco Alto (Detratores)',
                    data: bubbleData.filter(b => b.x <= 0),
                    backgroundColor: 'rgba(244, 63, 94, 0.6)', borderColor: '#f43f5e', borderWidth: 2
                },
                {
                    label: 'Saudável (Promotores/Neutros)',
                    data: bubbleData.filter(b => b.x > 0),
                    backgroundColor: 'rgba(16, 185, 129, 0.6)', borderColor: '#10b981', borderWidth: 2
                }
            ]
        };
        optionsBubble.value = {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10, weight: 'bold' } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.raw.empresa}: NPS ${ctx.raw.x} | ARR: €${ctx.raw.y.toLocaleString()}` } }
            },
            scales: {
                x: { title: { display: true, text: 'NPS Score', font: { size: 10, weight: 'bold' } }, min: -100, max: 100 },
                y: { title: { display: true, text: 'Receita ARR (€)', font: { size: 10, weight: 'bold' } } }
            }
        };
    } catch(e) {
        console.error("Erro Risco Financeiro:", e);
    }

  } catch (error) {
    console.error("Erro geral no fetchGraficos:", error);
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar os dados do Laboratório.', life: 4000 });
  } finally {
    loadingDados.value = false;
  }
};

// --- GAUGE AI CONSULTORA ---
const gerarAnaliseIA = async (forcarNova = false) => {
  loadingIA.value = true;
  try {
    const resIA = await api.get('/reports/bi-ia', { params: filtros.value });
    resumoParetoIA.value = resIA.data.resumoParetoIA;
    recomendacaoIA.value = resIA.data.recomendacaoIA;
  } catch (error) {
    console.error("Erro IA:", error);
    resumoParetoIA.value = "Falha ao contactar a Gauge AI. Verifique os logs do servidor.";
    recomendacaoIA.value = "";
  } finally {
    loadingIA.value = false;
  }
};

// --- EXPORTAÇÃO E E-MAIL ---
const exportarPDF = () => window.print();

const abrirModalEmail = async () => {
  modalEmailOpen.value = true;
  if (listaGestores.value.length === 0) {
    try {
      // 🚨 Corrigido o endpoint para puxar da rota real de cadastros
      const res = await api.get('/cadastros/gestores'); 
      listaGestores.value = res.data;
    } catch (e) {
        console.error("Erro ao carregar gestores", e);
    }
  }
};

const confirmarEnvioEmail = async () => {
  if (gestoresSelecionados.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Selecione pelo menos um gestor.', life: 3000 });
    return;
  }
  enviandoEmail.value = true;
  try {
     setTimeout(() => {
        toast.add({ severity: 'success', summary: 'Sucesso!', detail: 'Relatório BI enviado.', life: 4000 });
        modalEmailOpen.value = false;
        gestoresSelecionados.value = [];
        enviandoEmail.value = false;
    }, 1000);
  } catch (e) {
      console.error(e);
      enviandoEmail.value = false;
  }
};

// 🌟 INICIALIZAÇÃO CORRETA DA PÁGINA
onMounted(async () => {
  await carregarFiltrosIniciais(); // Primeiro carrega os segmentos reais
  fetchGraficos();                 // Depois desenha os gráficos
  gerarAnaliseIA();                // Depois chama a IA
});
</script>

<style scoped lang="postcss">
@reference "tailwindcss";

/* ==========================================
   🌟 FILTROS ESTILO DASHBOARD (Minimalistas e Uniformes)
   ========================================== */

/* Força transparência em TODOS os Dropdowns da barra superior */
:deep(.custom-dropdown-minimal) {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    color: inherit !important;
    @apply text-[10px] font-black uppercase text-slate-800 dark:text-white w-full outline-none ring-0;
}

/* Remove completamente os fundos que o PrimeVue injeta ao passar o rato ou focar */
:deep(.p-dropdown:not(.p-disabled):focus),
:deep(.p-dropdown:not(.p-disabled):hover) {
    background-color: transparent !important;
    border-color: transparent !important;
    box-shadow: none !important;
}

/* Alinhamento perfeito do texto e da setinha dentro do Dropdown */
:deep(.custom-dropdown-minimal .p-dropdown-label) {
    @apply p-0 font-black flex items-center text-[10px] uppercase text-slate-800 dark:text-white !important;
}
:deep(.custom-dropdown-minimal .p-dropdown-trigger) {
    @apply w-4 text-slate-400 !important;
}

/* Menu de opções flutuante (Indigo para a aba Analítica) */
:deep(.p-dropdown-panel) {
    @apply dark:bg-slate-800 dark:border-slate-700 shadow-xl !important;
}
:deep(.p-dropdown-panel .p-dropdown-item) {
    @apply text-xs font-medium text-slate-600 dark:text-slate-300 !important;
}
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight) {
    @apply bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 !important;
}

/* ==========================================
   🖨️ REGRAS BLINDADAS DE IMPRESSÃO (Intactas)
   ========================================== */
@media print {
  @page { margin: 1cm; size: landscape; }
  .no-print { display: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
  .shadow-sm, .shadow-2xl { box-shadow: none !important; }
  .border-slate-100 { border-color: #e2e8f0 !important; }
}
</style>
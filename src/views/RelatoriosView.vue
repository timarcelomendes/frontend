<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <h1 class="text-4xl lg:text-5xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Relatórios <span class="text-orange-500">Inteligentes</span>
          </h1>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">
            Análise Profunda e Tendências de Longo Prazo
          </p>
        </div>
        
        <div class="flex gap-3">
          <Button label="Exportar PDF" icon="pi pi-file-pdf" class="!bg-white dark:!bg-slate-900 !text-rose-500 !border-slate-200 dark:!border-slate-700 !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-sm hover:scale-105 transition-transform" />
          <Button label="Imprimir" icon="pi pi-print" @click="imprimirRelatorio" class="!bg-slate-900 dark:!bg-white dark:!text-slate-900 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-wrap gap-4 items-center">
        <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-700">
          <i class="pi pi-filter text-slate-400 text-xs"></i>
          <span class="text-[10px] font-black uppercase text-slate-500">Período de Análise:</span>
          <Dropdown v-model="periodoSelecionado" :options="opcoesPeriodo" class="custom-dropdown-minimal" />
        </div>
      </div>

      <div v-if="loadingDados" class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-[400px] flex items-center justify-center">
            <i class="pi pi-spin pi-spinner text-4xl text-slate-300 dark:text-slate-700"></i>
        </div>
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 h-[400px] flex items-center justify-center">
             <i class="pi pi-spin pi-spinner text-4xl text-slate-300 dark:text-slate-700"></i>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div class="flex justify-between items-start mb-8">
            <div>
              <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Desempenho Longitudinal</h3>
              <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Comparativo de NPS Mensal</p>
            </div>
          </div>
          <div class="h-[300px]">
            <Chart type="bar" :data="dataBarChart" :options="optionsBarChart" />
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <h3 class="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8">Impacto por Atributo</h3>
          <div class="space-y-6 relative z-10 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            <div v-for="item in atributos" :key="item.nome" class="space-y-2 group/item">
              <div class="flex justify-between items-end">
                <span class="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest truncate max-w-[200px]">{{ item.nome }}</span>
                <span class="text-[10px] font-bold" :class="item.nps >= 50 ? 'text-emerald-500' : (item.nps >= 0 ? 'text-yellow-500' : 'text-rose-500')">{{ item.nps }} pts</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full transition-all duration-1000" 
                     :class="item.nps >= 50 ? 'bg-emerald-500' : (item.nps >= 0 ? 'bg-yellow-500' : 'bg-rose-500')" 
                     :style="{ width: Math.max(item.percentual, 5) + '%' }"></div>
              </div>
            </div>
            <div v-if="atributos.length === 0" class="text-center py-10 text-slate-400 text-xs italic">
              A processar categorias...
            </div>
          </div>
        </div>

        <div class="lg:col-span-2 bg-gradient-to-br from-slate-900 to-indigo-950 p-8 lg:p-10 rounded-[3rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
          <div class="absolute right-0 top-0 p-10 opacity-10">
            <svg class="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M22.28 9.82a6 6 0 0 0-6.51-2.9 6.07 6.07 0 0 0-10.79-2.74A6 6 0 0 0 .74 11.27a6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9 6.07 6.07 0 0 0 10.79 2.74 6 6 0 0 0 3.72-11.99zM12 15.18a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36z"/></svg>
          </div>
          
          <div class="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
            <div class="w-20 h-20 rounded-3xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 mt-2">
                <i class="pi pi-bolt text-indigo-400 text-3xl" :class="{'animate-pulse': loadingIA}"></i>
            </div>
            
            <div class="flex-1 w-full">
              <div class="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
                <h2 class="text-xl font-black text-white italic tracking-tighter">Gauge AI: Conclusões Estratégicas</h2>
                
                <button @click="gerarAnaliseIA(true)" :disabled="loadingIA" class="shrink-0 flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/30 hover:border-indigo-400 disabled:opacity-50">
                   <i class="pi" :class="loadingIA ? 'pi-spin pi-spinner' : 'pi-sparkles'"></i>
                   {{ loadingIA ? 'A Processar...' : 'Refazer Análise' }}
                </button>
              </div>

              <div v-if="loadingIA" class="space-y-2 mt-2">
                <div class="h-4 bg-indigo-800/50 rounded w-full animate-pulse"></div>
                <div class="h-4 bg-indigo-800/50 rounded w-5/6 animate-pulse"></div>
                <div class="h-4 bg-indigo-800/50 rounded w-4/6 animate-pulse"></div>
              </div>
              
              <div v-else>
                <p class="text-slate-300 leading-relaxed text-sm lg:text-base font-medium">
                  {{ resumoIA || 'Clique em "Refazer Análise" para gerar os insights com base nos dados atuais.' }}
                </p>
                
                <div class="mt-6 flex gap-4 flex-wrap" v-if="focoIA && prioridadeIA">
                  <span class="text-[9px] font-black text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                    Foco: <span class="text-white">{{ focoIA }}</span>
                  </span>
                  <span class="text-[9px] font-black text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full uppercase tracking-widest">
                    Prioridade: <span :class="prioridadeIA === 'ALTA' || prioridadeIA === 'CRÍTICA' ? 'text-rose-400' : 'text-white'">{{ prioridadeIA }}</span>
                  </span>
                  
                  <span v-if="fromCache" class="text-[9px] font-black text-emerald-400/70 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest ml-auto" v-tooltip.top="'Resposta carregada da memória (Zero custo de API)'">
                    <i class="pi pi-database text-[8px] mr-1"></i> Cached
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../services/api';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Chart from 'primevue/chart';

// ESTADOS
const loadingDados = ref(true);
const loadingIA = ref(false);
const periodoSelecionado = ref('Últimos 6 Meses');
const opcoesPeriodo = ['Últimos 3 Meses', 'Últimos 6 Meses', 'Este Ano', 'Comparativo Trimestral'];

// GRÁFICOS
const atributos = ref([]);
const dataBarChart = ref({ labels: [], datasets: [] });

// GAUGE AI
const resumoIA = ref('');
const focoIA = ref('');
const prioridadeIA = ref('');
const fromCache = ref(false);

const optionsBarChart = ref({
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' }, min: -100, max: 100 },
    x: { border: { display: false }, grid: { display: false } }
  }
});

// --- DETETOR DE MUDANÇA ---
watch(periodoSelecionado, () => {
  fetchGraficos();
  gerarAnaliseIA(false); // False = Tenta usar o Cache primeiro
});

// --- FUNÇÃO 1: CARREGA SÓ OS GRÁFICOS (SUPER RÁPIDO) ---
const fetchGraficos = async () => {
  loadingDados.value = true;
  try {
    const config = { params: { periodo: periodoSelecionado.value } };
    const [resMensal, resAtributos] = await Promise.all([
      api.get('/reports/nps-mensal', config),
      api.get('/reports/impacto-categorias', config)
    ]);

    dataBarChart.value = {
      labels: resMensal.data.labels,
      datasets: [{ label: 'NPS', backgroundColor: '#f97316', borderRadius: 8, data: resMensal.data.data }]
    };
    atributos.value = resAtributos.data;
  } catch (error) {
    console.error("Erro nos gráficos:", error);
  } finally {
    loadingDados.value = false;
  }
};

// --- FUNÇÃO 2: A MÁGICA DA GAUGE AI (CACHE + MANUAL) ---
const gerarAnaliseIA = async (forcarNova = false) => {
  loadingIA.value = true;
  fromCache.value = false;
  
  // Cria uma chave única por DIA e por PERÍODO. Ex: gauge_ia_Últimos 6 Meses_2023-10-25
  const dataHoje = new Date().toISOString().split('T')[0];
  const cacheKey = `gauge_ia_${periodoSelecionado.value}_${dataHoje}`;

  // Se não foi clicado o botão "Refazer" e existe cache hoje, poupamos dinheiro!
  if (!forcarNova) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      resumoIA.value = data.texto;
      focoIA.value = data.foco;
      prioridadeIA.value = data.prioridade;
      fromCache.value = true; // Mostra a etiqueta verde "Cached"
      loadingIA.value = false;
      return;
    }
  }

  // Se forçou nova ou não tem cache, chama a API
  try {
    const resIA = await api.get('/reports/resumo-ia', { params: { periodo: periodoSelecionado.value } });
    
    resumoIA.value = resIA.data.texto;
    focoIA.value = resIA.data.foco;
    prioridadeIA.value = resIA.data.prioridade;

    // Guarda no LocalStorage para o resto do dia!
    localStorage.setItem(cacheKey, JSON.stringify(resIA.data));

  } catch (error) {
    console.error("Erro na IA:", error);
    resumoIA.value = "Não foi possível gerar a análise executiva. Tente novamente.";
  } finally {
    loadingIA.value = false;
  }
};

const imprimirRelatorio = () => window.print();

onMounted(() => {
  fetchGraficos();
  gerarAnaliseIA(false); // Inicia tentando puxar do cache
});
</script>

<style scoped>
@reference "tailwindcss";

.custom-dropdown-minimal { @apply bg-transparent border-none shadow-none text-[10px] font-black uppercase text-slate-800 dark:text-white p-0; }
:deep(.p-dropdown-label) { @apply p-0 font-black; }
:deep(.p-dropdown-trigger) { @apply w-4; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 dark:bg-slate-700 rounded-full; }

@media print {
  .pi-filter, .custom-dropdown-minimal, button { display: none !important; }
  body { background-color: white !important; }
}
</style>
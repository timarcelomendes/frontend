<script setup>
import { ref, onMounted, watch } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

// Componentes PrimeVue (Apenas os utilizados)
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Chart from 'primevue/chart';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Timeline from 'primevue/timeline';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const toast = useToast();

// ==========================================
// 🎛️ ESTADOS GERAIS
// ==========================================
const abaAtiva = ref(0);
const loadingDados = ref(true);
const loadingIA = ref(false);

const filtros = ref({
  periodo: 'Últimos 6 Meses',
  segmento: 'Todos',
  arr: 'Todos',
  safra: 'Todos'
});

// Opções
const opcoesPeriodo = ref(['Últimos 3 Meses', 'Últimos 6 Meses', 'Este Ano', 'Todos']);
const opcoesSegmento = ref(['Todos']);
const opcoesARR = ref(['Todos', '> € 100k', '€ 50k - € 100k', '< € 50k']);
const opcoesSafra = ref(['Todos', '0-3 Meses (Onboarding)', '3-12 Meses', '+1 Ano']);

// ==========================================
// 🏢 ESTADOS DA JORNADA (PEDIDO CEO)
// ==========================================
const empresaSelecionadaJornada = ref(null);
const historicoJornada = ref([]);
const loadingJornada = ref(false);
const listaEmpresas = ref([]);

const buscarJornada = async () => {
  if (!empresaSelecionadaJornada.value) return;
  loadingJornada.value = true;
  try {
    const res = await api.get('/reports/jornada', { params: { empresa: empresaSelecionadaJornada.value } });
    historicoJornada.value = res.data;
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar jornada da empresa.' });
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
// ⚙️ ESTADOS OPERACIONAIS
// ==========================================
const dadosOperacionais = ref({ taxa_resposta: 0, sla_medio_dias: 0 });

// 👇 NOVOS ESTADOS PARA A TABELA DE INATIVOS
const clientesInativos = ref([]);
const limiteRecorrencia = ref(90);
const loadingInativos = ref(false);

const carregarOperacional = async () => {
  try {
    const res = await api.get('/reports/operacional');
    dadosOperacionais.value = res.data;
  } catch (e) {
    console.error("Erro ao carregar dados operacionais:", e);
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar KPIs operacionais.' });
  }
};

// 👇 NOVA FUNÇÃO
const carregarInativos = async () => {
  loadingInativos.value = true;
  try {
    const res = await api.get('/reports/operacional/inativos');
    clientesInativos.value = res.data.lista;
    limiteRecorrencia.value = res.data.recorrencia_dias;
  } catch (e) {
    console.error("Erro inativos:", e);
  } finally {
    loadingInativos.value = false;
  }
};

// 👇 UTILITÁRIO PARA A TABELA
const formatarData = (dataStr) => {
  if (!dataStr) return '---';
  try {
    const d = new Date(dataStr);
    return d.toLocaleDateString('pt-PT');
  } catch (e) {
    return dataStr;
  }
};

// ==========================================
// 📊 LÓGICA DE GRÁFICOS
// ==========================================
const dataScatter = ref(null);
const optionsScatter = ref(null);
const dataStackedBar = ref(null);
const optionsStackedBar = ref(null);
const dataBubble = ref(null);
const optionsBubble = ref(null);
const resumoParetoIA = ref('');
const recomendacaoIA = ref('');

const fetchGraficos = async () => {
  loadingDados.value = true;
  try {
    const config = { params: filtros.value };
    const [resScatter, resSafra, resBubble] = await Promise.all([
      api.get('/reports/bi-scatter', config),
      api.get('/reports/bi-safra', config),
      api.get('/reports/bi-risco', config)
    ]);

    // Processamento Scatter
    dataScatter.value = {
      datasets: [
        { label: 'Tópicos Críticos', data: resScatter.data.filter(d => d.y <= 6), backgroundColor: 'rgba(244, 63, 94, 0.8)' },
        { label: 'Melhoria', data: resScatter.data.filter(d => d.y > 6), backgroundColor: 'rgba(245, 158, 11, 0.8)' }
      ]
    };
    optionsScatter.value = { responsive: true, maintainAspectRatio: false };

    // Processamento Safra
    dataStackedBar.value = {
      labels: resSafra.data.labels,
      datasets: [
        { label: 'Promotores', backgroundColor: '#10b981', data: resSafra.data.promotores },
        { label: 'Neutros', backgroundColor: '#f59e0b', data: resSafra.data.neutros },
        { label: 'Detratores', backgroundColor: '#f43f5e', data: resSafra.data.detratores }
      ]
    };
    optionsStackedBar.value = { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } };

    // Processamento Risco
    dataBubble.value = {
      datasets: [
        { label: 'Risco', data: resBubble.data.filter(b => b.x <= 0), backgroundColor: 'rgba(244, 63, 94, 0.6)' },
        { label: 'Saudável', data: resBubble.data.filter(b => b.x > 0), backgroundColor: 'rgba(16, 185, 129, 0.6)' }
      ]
    };
    optionsBubble.value = { responsive: true, maintainAspectRatio: false };

  } catch (error) {
    console.error("Erro ao carregar gráficos:", error);
  } finally {
    loadingDados.value = false;
  }
};

const gerarAnaliseIA = async () => {
  loadingIA.value = true;
  try {
    const resIA = await api.get('/reports/bi-ia', { params: filtros.value });
    resumoParetoIA.value = resIA.data.resumoParetoIA;
    recomendacaoIA.value = resIA.data.recomendacaoIA;
  } catch (error) {
    console.error("Erro ao gerar análise de IA:", error);
  } finally { 
    loadingIA.value = false; 
  }
};

watch(filtros, () => { fetchGraficos(); gerarAnaliseIA(); }, { deep: true });

// ==========================================
// 👔 ESTADOS E LÓGICA: ABA GESTORES
// ==========================================
const gestorSelecionado = ref(null);
const listaGestores = ref([]);
const dadosGestor = ref(null);
const loadingGestor = ref(false);
const chartGestor = ref(null);

// Opções visuais para o gráfico do Gestor
const optionsChartGestor = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
    },
    scales: {
        y: { 
            min: 0, 
            max: 10,
            grid: { display: false },
            ticks: { font: { size: 10, weight: 'bold' } }
        },
        x: { 
            grid: { display: false },
            ticks: { font: { size: 9, weight: 'bold' } }
        }
    }
});

const carregarPerformanceGestor = async () => {
  if (!gestorSelecionado.value) return;
  
  loadingGestor.value = true;
  chartGestor.value = null; // Reseta o gráfico antes da nova carga para evitar erros de renderização
  
  try {
    const res = await api.get('/reports/gestor', { 
      params: { gestor_id: gestorSelecionado.value } 
    });
    
    dadosGestor.value = res.data;
    
    chartGestor.value = {
      labels: res.data.ranking_empresas.map(e => e.nome),
      datasets: [{
        label: 'Média de Nota',
        backgroundColor: '#6366f1',
        borderRadius: 8,
        data: res.data.ranking_empresas.map(e => e.media_nota)
      }]
    };
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar scorecard do gestor.' });
  } finally {
    loadingGestor.value = false;
  }
};

const carregarListaGestores = async () => {
  try {
    const res = await api.get('/reports/lista-gestores');
    listaGestores.value = res.data; 
  } catch (e) {
    console.error("Falha ao carregar lista de gestores", e);
    toast.add({ severity: 'error', summary: 'Aviso', detail: 'Não foi possível carregar a lista de gestores.' });
  }
};

onMounted(() => {
  // 1. Disparamos estas funções em paralelo (sem o 'await' a travar a fila)
  fetchGraficos();
  gerarAnaliseIA();
  carregarOperacional();
  carregarListaGestores(); 
  carregarInativos();

  Promise.all([
    api.get('/cadastros/empresas'),
    api.get('/cadastros/segmentos')
  ])
  .then(([resEmp, resSeg]) => {
    listaEmpresas.value = resEmp.data.map(e => e.nome);
    opcoesSegmento.value = ['Todos', ...resSeg.data.map(s => s.nome)];
  })
  .catch(e => {
    console.error("Erro ao carregar opções de filtros.", e);
  });
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
        </div>
      </div>

      <TabView v-model:activeIndex="abaAtiva" class="custom-tabview-premium">
        
        <TabPanel>
          <template #header><i class="pi pi-chart-bar mr-2"></i> Estratégico</template>
          
          <div class="space-y-8 mt-6">
            <div class="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="flex flex-col gap-1.5 px-3">
                <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Período</span>
                <Dropdown v-model="filtros.periodo" :options="opcoesPeriodo" class="custom-dropdown-minimal" />
              </div>
              <div class="flex flex-col gap-1.5 px-3 border-l border-slate-100 dark:border-slate-800">
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
          
          <div class="space-y-8 mt-6"> <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Taxa de Resposta Global</span>
                 <div class="text-6xl font-black text-indigo-500">{{ dadosOperacionais.taxa_resposta }}%</div>
                 <p class="text-xs text-slate-500 mt-4 max-w-xs">Percentagem de clientes da base ativa que responderam a pelo menos uma pesquisa.</p>
              </div>
              
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">SLA Médio de Fechamento</span>
                 <div class="text-6xl font-black text-emerald-500">{{ dadosOperacionais.sla_medio_dias }} <span class="text-2xl">dias</span></div>
                 <p class="text-xs text-slate-500 mt-4 max-w-xs">Tempo médio entre a criação de uma ação no Kanban e o seu encerramento.</p>
              </div>
            </div>

            <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              
              <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 class="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <i class="pi pi-exclamation-triangle text-rose-500"></i> Risco de Omissão (Churn de Feedback)
                  </h3>
                  <p class="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                    Clientes sem resposta há mais de {{ limiteRecorrencia }} dias (limite de carência).
                  </p>
                </div>
                <Tag severity="danger" :value="clientesInativos.length + ' Clientes Críticos'" class="!text-[10px] !font-black uppercase tracking-widest !px-4" />
              </div>

              <DataTable :value="clientesInativos" :loading="loadingInativos" :paginator="true" :rows="10" class="p-datatable-sm custom-table" responsiveLayout="scroll">
                
                <template #empty>
                   <div class="text-center py-12 text-emerald-500 text-[11px] uppercase tracking-widest font-black">
                     <i class="pi pi-check-circle text-3xl mb-3 block opacity-50"></i>
                     Nenhum cliente em atraso crítico. A base está saudável!
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
                
                <Column field="data_envio" header="Disparado em" sortable>
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
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Escolha a Empresa para Auditoria</label>
                <Dropdown v-model="empresaSelecionadaJornada" :options="listaEmpresas" filter placeholder="Selecione uma conta..." class="w-full custom-dropdown-premium" />
              </div>
              <Button label="Gerar Linha do Tempo" icon="pi pi-search" @click="buscarJornada" :loading="loadingJornada" class="!bg-slate-900 dark:!bg-white dark:!text-slate-900 !rounded-xl !px-8 !py-3 !font-black !text-xs !uppercase" />
            </div>

            <div v-if="historicoJornada.length > 0" class="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <Timeline :value="historicoJornada" align="left">
                <template #content="slotProps">
                  <div class="mb-12 ml-4 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 relative">
                    <div class="absolute -left-10 top-6 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-4" :class="`border-${getCorNota(slotProps.item.nota)}`"></div>
                    
                    <div class="flex justify-between items-start mb-4">
                      <div class="flex items-center gap-3">
                        <Tag :value="slotProps.item.nota" :severity="getCorNota(slotProps.item.nota)" class="!text-xl !font-black !px-4 !py-2 !rounded-xl" />
                        <div>
                          <h4 class="text-sm font-black text-slate-800 dark:text-white">{{ slotProps.item.cliente_nome }}</h4>
                          <p class="text-[10px] font-bold text-slate-400 uppercase">{{ slotProps.item.cargo }}</p>
                        </div>
                      </div>
                      <span class="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">{{ slotProps.item.data_formatada }}</span>
                    </div>

                    <p class="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
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
               <p>Selecione uma empresa acima para visualizar o histórico de feedbacks.</p>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          <template #header><i class="pi pi-user mr-2"></i> Gestores</template>
          
          <div class="space-y-6 mt-6">
            <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div class="flex-1 space-y-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecionar Gestor de Contas</label>
                <Dropdown 
                  v-model="gestorSelecionado" 
                  :options="listaGestores" 
                  optionLabel="nome" 
                  optionValue="id" 
                  filter 
                  placeholder="Selecione um Gestor" 
                  class="w-full custom-dropdown-premium" 
                  @change="carregarPerformanceGestor" 
                >
                  <template #option="slotProps">
                    <div class="flex items-center">
                      <span class="text-xs font-bold uppercase">{{ slotProps.option.nome }}</span>
                    </div>
                  </template>
                </Dropdown>
              </div>
            </div>

            <div v-if="loadingGestor" class="py-20 text-center">
              <i class="pi pi-spin pi-spinner text-4xl text-indigo-500 mb-4"></i>
              <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">A analisar a carteira do gestor...</p>
            </div>

            <div v-else-if="dadosGestor" class="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadein">
              
              <div class="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                 <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">NPS do Gestor</span>
                 <div class="text-7xl font-black" :class="dadosGestor.nps >= 70 ? 'text-emerald-500' : 'text-orange-500'">
                   {{ dadosGestor.nps }}
                 </div>
                 <Tag :value="dadosGestor.total_respostas + ' respostas'" severity="secondary" class="mt-4" />
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
               <p>Selecione um gestor para visualizar o scorecard de performance.</p>
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
</style>
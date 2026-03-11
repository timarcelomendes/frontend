<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';
import Skeleton from 'primevue/skeleton';

const toast = useToast();
const respostas = ref([]);
const loading = ref(true);

// 🔍 FILTROS COM MEMÓRIA DE SESSÃO
const filtros = ref({
  q: '', 
  empresa: '', 
  categoria: 'Todas', 
  perfil: 'Todos', 
  // Lê do navegador se o botão estava ligado na última vez
  incluir_excluidas: localStorage.getItem('nps_ver_arquivados') === 'true' 
});

const opcoesCategoria = ['Todas', 'Promotor', 'Neutro', 'Detrator'];
const opcoesPerfil = ['Todos', 'Decisor', 'Influenciador', 'Outro'];

// ... (Mantenha as funções metricasAtuais, carregarRespostas, etc. como estão) ...

// 🚀 O SEGREDO DA UX: Watcher Inteligente com "Debounce"
let timeoutPesquisa = null;

watch(filtros, (novosFiltros) => {
  // 1. Guarda instantaneamente a preferência do botão no navegador
  localStorage.setItem('nps_ver_arquivados', novosFiltros.incluir_excluidas);
  
  // 2. Aguarda 500ms após o utilizador parar de digitar para chamar a base de dados
  clearTimeout(timeoutPesquisa);
  timeoutPesquisa = setTimeout(() => {
    carregarRespostas();
  }, 500);
}, { deep: true }); // O deep:true faz o Vue observar TODOS os campos (q, empresa, dropdowns e switch)

// 📊 MÉTRICAS EM TEMPO REAL
const metricasAtuais = computed(() => {
  const total = respostas.value.length;
  if (total === 0) return { nps: 0, promotores: 0, neutros: 0, detratores: 0, total: 0 };
  
  let p = 0, n = 0, d = 0;
  respostas.value.forEach(r => {
    if (r.nota >= 9) p++;
    else if (r.nota >= 7) n++;
    else d++;
  });
  
  const nps = Math.round(((p / total) * 100) - ((d / total) * 100));
  return { nps, promotores: p, neutros: n, detratores: d, total };
});

// 📝 ESTADO DE EDIÇÃO (Close the Loop)
const dialogEdicao = ref(false);
const salvando = ref(false);
const respostaAtual = ref({
  id: '', nota: 0, categoria: '', motivo: '', canal: '', expectativas: '', o_que_faltava: ''
});

// ==========================================
// 📡 COMUNICAÇÃO COM A API
// ==========================================

const carregarRespostas = async () => {
  loading.value = true;
  try {
    const params = {
      q: filtros.value.q,
      empresa: filtros.value.empresa,
      categoria: filtros.value.categoria,
      perfil: filtros.value.perfil,
      incluir_excluidas: filtros.value.incluir_excluidas,
      topn: 300
    };
    
    const response = await api.get('/respostas', { params });
    
    // 💡 BLINDAGEM: Converte o texto "False" / "True" ou números 0 / 1 em booleanos reais do JavaScript
    respostas.value = response.data.map(item => {
      const estaArquivado = item.excluido === true || item.excluido === 'True' || item.excluido === 'true' || item.excluido === 1 || item.excluido === '1';
      return {
        ...item,
        excluido: estaArquivado
      };
    });

  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar feedbacks.', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const abrirEdicao = (dados) => {
  respostaAtual.value = { 
    id: dados.resposta_id, nota: dados.nota, categoria: dados.categoria || 'Não Categorizado', 
    motivo: dados.motivo || '', canal: dados.canal || '', expectativas: dados.expectativas || '', 
    o_que_faltava: dados.o_que_faltava || ''
  };
  dialogEdicao.value = true;
};

const salvarResposta = async () => {
  salvando.value = true;
  try {
    await api.put(`/respostas/${respostaAtual.value.id}`, respostaAtual.value);
    toast.add({ severity: 'success', summary: 'Enriquecido', detail: 'Feedback atualizado com sucesso.', life: 3000 });
    dialogEdicao.value = false;
    carregarRespostas();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar a análise.', life: 3000 });
  } finally {
    salvando.value = false;
  }
};

// 💡 LÓGICA DE UX OTIMISTA: Muda na tela na mesma hora que clica
const alternarEstadoArquivo = async (dados) => {
  const estadoAnterior = dados.excluido;
  dados.excluido = !estadoAnterior; // Inverte instantaneamente o ícone na tela
  
  try {
    if (!estadoAnterior) { // Agora o false é realmente false!
      await api.post(`/respostas/${dados.resposta_id}/soft-delete`);
      toast.add({ severity: 'info', summary: 'Arquivado', detail: 'Feedback ocultado do Dashboard.', life: 3000 });
    } else {
      await api.post(`/respostas/${dados.resposta_id}/restore`);
      toast.add({ severity: 'success', summary: 'Restaurado', detail: 'Feedback voltou a ficar ativo.', life: 3000 });
    }

    // Se o switch "Ver Arquivados" estiver desligado, removemos a linha da tabela na hora
    if (!filtros.value.incluir_excluidas && !estadoAnterior) {
      respostas.value = respostas.value.filter(r => r.resposta_id !== dados.resposta_id);
    }
    
  } catch (error) {
    dados.excluido = estadoAnterior; // Se a API falhar (ex: sem net), desfazemos o ícone
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao comunicar com o servidor.', life: 3000 });
  }
};

// ==========================================
// 🎨 UTILITÁRIOS DE UI
// ==========================================
const formatarData = (dataStr) => {
  if (!dataStr) return '-';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dataStr));
};

const obterCorNPS = (nota) => {
  if (nota >= 9) return 'bg-emerald-500 shadow-emerald-500/30';
  if (nota >= 7) return 'bg-yellow-500 shadow-yellow-500/30 text-slate-900';
  return 'bg-rose-500 shadow-rose-500/30';
};

watch([() => filtros.value.categoria, () => filtros.value.perfil, () => filtros.value.incluir_excluidas], () => {
  carregarRespostas();
});

onMounted(carregarRespostas);

</script>

<template>
  <div class="max-w-[1600px] mx-auto animate-fadein p-4">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
      <div>
        <h1 class="text-4xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Auditoria de Feedbacks <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest">
          Categorização e Enriquecimento Qualitativo (Close the Loop)
        </p>
      </div>
      <Button icon="pi pi-refresh" label="Sincronizar" @click="carregarRespostas" :loading="loading" class="!bg-white dark:!bg-slate-900 !text-slate-800 dark:!text-white !border !border-slate-200 dark:!border-slate-700 !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest shadow-sm hover:!bg-slate-50" />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fadein">
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Filtrado</span>
          <div class="text-2xl font-black text-slate-800 dark:text-white mt-1">{{ metricasAtuais.total }}</div>
        </div>
        <div class="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"><i class="pi pi-list"></i></div>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800/30 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Promotores</span>
          <div class="text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-1">{{ metricasAtuais.promotores }}</div>
        </div>
        <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-500"><i class="pi pi-arrow-up-right"></i></div>
      </div>
      <div class="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-[1.5rem] border border-rose-100 dark:border-rose-800/30 shadow-sm flex items-center justify-between">
        <div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Detratores</span>
          <div class="text-2xl font-black text-rose-600 dark:text-rose-500 mt-1">{{ metricasAtuais.detratores }}</div>
        </div>
        <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-rose-500"><i class="pi pi-arrow-down-right"></i></div>
      </div>
      <div class="bg-slate-900 dark:bg-white p-5 rounded-[1.5rem] shadow-xl relative overflow-hidden flex items-center justify-between group">
        <div class="absolute -right-6 -top-6 w-20 h-20 bg-orange-500/20 rounded-full blur-xl group-hover:bg-orange-500/40 transition-all"></div>
        <div class="relative z-10">
          <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">NPS (Visão Atual)</span>
          <div class="flex items-baseline gap-1 mt-1">
            <span class="text-3xl font-black text-white dark:text-slate-900 tracking-tighter">{{ metricasAtuais.nps }}</span>
            <span class="text-orange-500 font-black text-xs">pts</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm mb-6 flex flex-wrap items-center gap-3">
        
        <InputText v-model="filtros.q" placeholder="Pesquisar comentário..." class="flex-1 min-w-[200px] custom-input !py-3 !text-xs !rounded-xl" />
        <InputText v-model="filtros.empresa" placeholder="Filtrar por Empresa" class="flex-1 min-w-[150px] custom-input !py-3 !text-xs !rounded-xl" />
        
        <Dropdown v-model="filtros.categoria" :options="opcoesCategoria" placeholder="Categoria" class="w-full md:w-40 custom-dropdown !text-xs !py-1 !rounded-xl" />
        <Dropdown v-model="filtros.perfil" :options="opcoesPerfil" placeholder="Perfil" class="w-full md:w-40 custom-dropdown !text-xs !py-1 !rounded-xl" />
        
        <div class="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors hover:border-slate-300">
            <InputSwitch v-model="filtros.incluir_excluidas" />
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer" @click="filtros.incluir_excluidas = !filtros.incluir_excluidas">
            Ver Arquivados
            </label>
        </div>
        </div>

    <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-6">
      
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="flex gap-4 p-4 border-b border-slate-50 dark:border-slate-800">
          <Skeleton shape="circle" size="3rem" class="shrink-0"></Skeleton>
          <div class="flex-1 space-y-2">
            <Skeleton width="20%"></Skeleton>
            <Skeleton width="80%"></Skeleton>
            <Skeleton width="60%"></Skeleton>
          </div>
        </div>
      </div>

      <DataTable v-else :value="respostas" :paginator="true" :rows="10" dataKey="resposta_id" class="p-datatable-custom" rowHover>
        <template #empty>
          <div class="text-center py-20">
            <i class="pi pi-inbox text-4xl text-slate-300 mb-4 block"></i>
            <span class="text-xs font-black uppercase tracking-widest text-slate-400">Caixa Limpa. Nenhum feedback encontrado.</span>
          </div>
        </template>

        <Column field="nota" header="Score" style="width: 80px">
          <template #body="s">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-lg', obterCorNPS(s.data.nota)]">
              {{ s.data.nota }}
            </div>
          </template>
        </Column>

        <Column field="cliente_nome" header="Autoria" style="min-width: 220px">
          <template #body="s">
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="text-[12px] font-bold text-slate-800 dark:text-slate-100" :class="{'line-through text-slate-400': s.data.excluido}">
                  {{ s.data.cliente_nome || 'Utilizador Anónimo' }}
                </span>
                <i v-if="s.data.perfil_cliente === 'Decisor'" class="pi pi-star-fill text-yellow-500 text-[10px]" v-tooltip.top="'Decisor'"></i>
              </div>
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{{ s.data.empresa || 'Sem Empresa' }}</span>
            </div>
          </template>
        </Column>

        <Column field="motivo" header="Comentário & Contexto" style="min-width: 350px">
          <template #body="s">
            <div class="py-2">
              <p class="text-[12px] text-slate-600 dark:text-slate-300 font-medium italic leading-relaxed mb-2" :class="{'opacity-50 line-through': s.data.excluido}">
                "{{ s.data.motivo || 'Nenhum comentário textual deixado.' }}"
              </p>
              <div class="flex flex-wrap gap-2 items-center">
                <Tag v-if="s.data.categoria" :value="s.data.categoria" severity="secondary" class="!bg-slate-100 dark:!bg-slate-800 !text-slate-500 !text-[8px] !font-black !px-2 uppercase tracking-widest border border-slate-200 dark:border-slate-700" />
                
                <a v-if="s.data.jira_issue_url" :href="s.data.jira_issue_url" target="_blank" rel="noopener noreferrer" class="no-underline">
                  <Tag value="Abrir Ticket Jira" icon="pi pi-external-link" class="!bg-[#0052CC] hover:!bg-[#003B99] cursor-pointer !text-white !text-[8px] !font-black !px-2 uppercase tracking-widest shadow-md transition-colors" />
                </a>

                <span v-if="s.data.excluido" class="text-[9px] font-black uppercase text-rose-500 tracking-widest flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md"><i class="pi pi-folder"></i> Arquivado</span>
              </div>
            </div>
          </template>
        </Column>

        <Column field="created_at" header="Registo" style="width: 140px">
          <template #body="s">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{{ formatarData(s.data.created_at) }}</span>
          </template>
        </Column>

        <Column header="Auditoria" alignFrozen="right" style="width: 140px">
          <template #body="s">
            <div class="flex gap-2 justify-end">
              <Button icon="pi pi-sliders-h" label="Analisar" @click="abrirEdicao(s.data)" class="!bg-slate-50 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300 !border-none !text-[9px] !font-black !px-3 hover:!bg-slate-200 dark:hover:!bg-slate-700 transition-colors uppercase tracking-widest" />
              
              <Button :icon="s.data.excluido ? 'pi pi-undo' : 'pi pi-folder'" 
                      v-tooltip.top="s.data.excluido ? 'Desarquivar (Restaurar)' : 'Arquivar'" 
                      @click="alternarEstadoArquivo(s.data)" 
                      class="w-8 h-8 !p-0 flex items-center justify-center !text-slate-400 !bg-transparent !border-none hover:!bg-slate-100 dark:hover:!bg-slate-800 transition-colors rounded-lg"
                      :class="{'!text-rose-400 hover:!text-rose-600': !s.data.excluido, '!text-emerald-500 hover:!text-emerald-600': s.data.excluido}" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog v-model:visible="dialogEdicao" :modal="true" :style="{width: '650px'}" :closable="false" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog-no-header shadow-2xl">
      <div class="bg-slate-900 text-white p-6 flex justify-between items-center relative overflow-hidden">
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
        <div class="relative z-10">
          <h2 class="text-lg font-black italic tracking-tight flex items-center gap-2">
            <i class="pi pi-clipboard text-orange-500"></i> Enriquecimento Qualitativo
          </h2>
          <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">Close the Loop Tracker</p>
        </div>
        <button @click="dialogEdicao = false" class="text-slate-400 hover:text-white transition-colors relative z-10 p-2"><i class="pi pi-times text-xl"></i></button>
      </div>

      <div class="p-8 space-y-6 bg-white dark:bg-slate-900">
        
        <div class="grid grid-cols-2 gap-6">
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Revisão de Nota</label>
            <Dropdown v-model="respostaAtual.nota" :options="[0,1,2,3,4,5,6,7,8,9,10]" class="custom-dropdown !bg-slate-50 dark:!bg-slate-800" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Classificação (Tag)</label>
            <InputText v-model="respostaAtual.categoria" class="custom-input !bg-slate-50 dark:!bg-slate-800 !py-2.5 !text-xs" placeholder="Ex: UX, Preço..." />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Comentário Original (Voice of Customer)</label>
          <Textarea v-model="respostaAtual.motivo" rows="3" class="custom-input !bg-slate-50 dark:!bg-slate-800 !text-xs italic" />
        </div>

        <div class="p-6 bg-orange-50/50 dark:bg-orange-900/10 rounded-[2rem] border border-orange-100/50 dark:border-orange-800/30 space-y-5">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-sparkles text-orange-500 text-sm"></i>
            <h4 class="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">Análise Raiz</h4>
          </div>
          
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase text-slate-500 ml-1">O que faltava ao cliente?</label>
            <InputText v-model="respostaAtual.o_que_faltava" class="custom-input bg-white dark:bg-slate-900 !py-2.5 !text-xs border-orange-100 dark:border-slate-700" placeholder="Insira o ponto de falha..." />
          </div>
          
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase text-slate-500 ml-1">Alinhamento de Expectativas</label>
            <InputText v-model="respostaAtual.expectativas" class="custom-input bg-white dark:bg-slate-900 !py-2.5 !text-xs border-orange-100 dark:border-slate-700" placeholder="Como resolver no futuro..." />
          </div>
        </div>

      </div>
      
      <div class="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 w-full">
        <Button label="Cancelar" text class="flex-1 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors" @click="dialogEdicao = false" />
        <Button label="Guardar Auditoria" :loading="salvando" icon="pi pi-save" class="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl hover:-translate-y-0.5 transition-transform" @click="salvarResposta" />
      </div>
    </Dialog>

  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

:deep(.custom-input), :deep(.custom-dropdown) {
  @apply border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium;
}

:deep(.p-dropdown-label) { @apply py-1; }

:deep(.p-datatable .p-datatable-thead > tr > th) {
  @apply bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4;
}
:deep(.p-datatable .p-datatable-tbody > tr) {
  @apply bg-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-50 dark:border-slate-800/50;
}
:deep(.p-datatable .p-datatable-tbody > tr > td) {
  @apply py-5 px-4;
}

/* Remove padding padrão do Dialog para podermos customizar o header e footer totalmente */
:deep(.custom-dialog-no-header .p-dialog-header) {
  display: none !important;
}
:deep(.custom-dialog-no-header .p-dialog-content) {
  padding: 0 !important;
}
</style>
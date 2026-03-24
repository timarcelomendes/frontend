<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';
import Menu from 'primevue/menu';

import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Textarea from 'primevue/textarea';
import Tag from 'primevue/tag';
import Calendar from 'primevue/calendar';
import Avatar from 'primevue/avatar';

const toast = useToast();
const acoes = ref([]);
const loading = ref(true);

// ==========================================
// 📊 ESTATÍSTICAS E COLUNAS DO KANBAN
// ==========================================
const acoesPendentes = computed(() => acoes.value.filter(a => a.status === 'Pendente'));
const acoesAndamento = computed(() => acoes.value.filter(a => a.status === 'Em Andamento'));
const acoesConcluidas = computed(() => acoes.value.filter(a => a.status === 'Concluído'));

const estatisticas = computed(() => ({
  pendentes: acoesPendentes.value.length,
  emAndamento: acoesAndamento.value.length,
  concluidas: acoesConcluidas.value.length,
  total: acoes.value.length
}));

const carregarAcoes = async () => {
  loading.value = true;
  try {
    const res = await api.get('/acoes');
    acoes.value = res.data;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar planos de ação.' });
  } finally {
    loading.value = false;
  }
};

// ==========================================
// 🖱️ LÓGICA DE DRAG & DROP (KANBAN)
// ==========================================
const draggingId = ref(null);

const onDragStart = (event, id) => {
  event.dataTransfer.dropEffect = 'move';
  event.dataTransfer.effectAllowed = 'move';
  draggingId.value = id;
};

const onDrop = async (event, novoStatus) => {
  const id = draggingId.value;
  if (!id) return;

  const acao = acoes.value.find(a => a.id === id);
  
  // Se arrastou para a mesma coluna, não faz nada
  if (acao && acao.status !== novoStatus) {
    const statusAntigo = acao.status;
    
    // Atualização Otimista (Muda no ecrã imediatamente para UX fluída)
    acao.status = novoStatus;
    
    try {
      await api.put(`/acoes/${id}`, { status: novoStatus });
      toast.add({ severity: 'success', summary: 'Movido', detail: `Status alterado para ${novoStatus}`, life: 2000 });
    } catch (error) {
      // Se a API falhar, reverte a ação no ecrã
      acao.status = statusAntigo;
      toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao mover a tarefa. Tente novamente.' });
    }
  }
  draggingId.value = null;
};

// ==========================================
// 📝 EDIÇÃO MANUAL
// ==========================================
const dialogAcao = ref(false);
const salvando = ref(false);
const acaoAtual = ref({});

const opcoesStatus = ['Pendente', 'Em Andamento', 'Concluído'];
const opcoesPrioridade = ['Alta', 'Média', 'Baixa'];

const abrirEdicao = (acao) => {
  acaoAtual.value = { 
    ...acao,
    empresa_nome: acao.empresa_nome || 'Conta Geral',
    prazo_limite: acao.prazo_limite ? new Date(acao.prazo_limite) : null
  };
  dialogAcao.value = true;
};

const salvarAcao = async () => {
  salvando.value = true;
  try {
    await api.put(`/acoes/${acaoAtual.value.id}`, acaoAtual.value);
    toast.add({ severity: 'success', summary: 'Atualizado', detail: 'Ação atualizada com sucesso!' });
    dialogAcao.value = false;
    carregarAcoes();
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar alterações.' });
  } finally {
    salvando.value = false;
  }
};

const excluirAcao = async (id) => {
  // Confirmação para evitar exclusões acidentais
  if (!confirm('Tem certeza que deseja excluir permanentemente esta ação?')) return;
  
  try {
    await api.delete(`/acoes/${id}`);
    
    // Remove a ação da lista local para atualizar o Kanban instantaneamente
    acoes.value = acoes.value.filter(a => a.id !== id);
    
    toast.add({ 
      severity: 'success', 
      summary: 'Sucesso', 
      detail: 'Ação removida do quadro.', 
      life: 3000 
    });
    
    // Se o modal de edição estiver aberto, fecha-o
    if (dialogAcao.value) dialogAcao.value = false;
  } catch (error) {
    console.error('Erro ao excluir ação:', error);
    toast.add({ 
      severity: 'error', 
      summary: 'Erro', 
      detail: 'Não foi possível excluir a ação.', 
      life: 3000 
    });
  }
};

// ==========================================
// 🎨 UTILITÁRIOS VISUAIS
// ==========================================
const formatarData = (dataStr) => {
  if (!dataStr) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date(dataStr));
};

const isAtrasado = (dataStr, status) => {
  if (!dataStr || status === 'Concluído') return false;
  return new Date(dataStr) < new Date(new Date().setHours(0,0,0,0));
};

const getPrioridadeColor = (prio) => {
  if (prio === 'Alta') return 'danger';
  if (prio === 'Média') return 'warning';
  return 'secondary';
};

const gerarIniciais = (nome) => {
  if (!nome) return 'U';
  const partes = nome.trim().split(' ');
  return partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase() : partes[0][0].toUpperCase();
};

// ==========================================
// ⚙️ MENU DE OPÇÕES (Dropdown) E GESTORES
// ==========================================
const menuOpcoes = ref();
const acaoSelecionada = ref(null);
const gestoresLista = ref([]);

// Abre o menu na posição do clique
const toggleMenu = (event, acao) => {
  acaoSelecionada.value = acao;
  menuOpcoes.value.toggle(event);
};

// O formato dinâmico do Menu
const menuItens = ref([
  { 
    label: 'Editar Detalhes', 
    icon: 'pi pi-pencil', 
    command: () => abrirEdicao(acaoSelecionada.value) 
  },
  { 
    label: 'Alterar Responsável', 
    icon: 'pi pi-user-edit', 
    command: () => abrirEdicao(acaoSelecionada.value) 
  },
  { separator: true },
  { 
    label: 'Excluir', 
    icon: 'pi pi-trash', 
    command: () => excluirAcao(acaoSelecionada.value.id) 
  }
]);

// Buscar gestores para permitir a troca
const carregarGestores = async () => {
  try {
    const res = await api.get('/cadastros/gestores');
    gestoresLista.value = res.data;
  } catch (error) {
    console.error('Erro ao carregar gestores', error);
  }
};

onMounted(() => {
  carregarAcoes();
  carregarGestores();
});
</script>

<template>
  <div class="max-w-[1600px] mx-auto animate-fadein p-4 lg:p-8 h-[calc(100vh-2rem)] flex flex-col">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
      <div>
        <h1 class="text-4xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Planos de Ação <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-500 dark:text-slate-400 mt-2 font-bold uppercase tracking-widest">
          Close The Loop • Quadro Kanban
        </p>
      </div>
      <Button icon="pi pi-refresh" label="Sincronizar" @click="carregarAcoes" :loading="loading" class="!bg-white dark:!bg-slate-900 !text-slate-800 dark:!text-white !border !border-slate-200 dark:!border-slate-700 !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest shadow-sm hover:!bg-slate-50" />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 shrink-0">
      <div class="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total de Ações</span><div class="text-2xl font-black text-slate-800 dark:text-white mt-1">{{ estatisticas.total }}</div></div>
        <div class="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"><i class="pi pi-list"></i></div>
      </div>
      <div class="bg-orange-50 dark:bg-orange-500/10 p-5 rounded-[1.5rem] border border-orange-100 dark:border-orange-800/30 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Pendentes</span><div class="text-2xl font-black text-orange-600 dark:text-orange-500 mt-1">{{ estatisticas.pendentes }}</div></div>
        <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-orange-500"><i class="pi pi-clock"></i></div>
      </div>
      <div class="bg-sky-50 dark:bg-sky-500/10 p-5 rounded-[1.5rem] border border-sky-100 dark:border-sky-800/30 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">Em Andamento</span><div class="text-2xl font-black text-sky-600 dark:text-sky-500 mt-1">{{ estatisticas.emAndamento }}</div></div>
        <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-sky-500"><i class="pi pi-spinner"></i></div>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-800/30 shadow-sm flex items-center justify-between">
        <div><span class="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Concluídas</span><div class="text-2xl font-black text-emerald-600 dark:text-emerald-500 mt-1">{{ estatisticas.concluidas }}</div></div>
        <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-500"><i class="pi pi-check-circle"></i></div>
      </div>
    </div>

    <div class="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden pb-4">
      
      <div class="flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200/50 dark:border-slate-800 p-4"
           @dragover.prevent @drop="onDrop($event, 'Pendente')">
        <div class="flex items-center justify-between mb-4 px-2">
          <h3 class="text-xs font-black uppercase tracking-widest text-orange-500 flex items-center gap-2"><i class="pi pi-circle-fill text-[8px]"></i> Pendente</h3>
          <span class="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-md">{{ estatisticas.pendentes }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1 pb-4">
          <div v-for="acao in acoesPendentes" :key="acao.id" 
               draggable="true" @dragstart="onDragStart($event, acao.id)"
               class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-orange-300 dark:hover:border-orange-500/50 transition-all group">
            
            <div class="flex justify-between items-start mb-2">
              <span class="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-500/20">
                  <i class="pi pi-building text-[8px] mr-1"></i> 
                  {{ acao.empresa_nome || 'Conta Geral' }}
              </span>
              
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" aria-haspopup="true">
                <i class="pi pi-ellipsis-v text-xs"></i>
              </button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{{ acao.titulo }}</h4>
            
            <div class="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700/50">
               <div class="flex items-center gap-2" v-tooltip.top="acao.gestor_nome || 'Atribuindo...'">
                  <Avatar :label="gerarIniciais(acao.gestor_nome)" shape="circle" class="!bg-orange-100 !text-orange-600 !w-6 !h-6 !text-[10px] !font-black" />
                  <span class="text-[10px] font-bold text-slate-500 max-w-[80px] truncate">{{ acao.gestor_nome?.split(' ')[0] || 'Gestor' }}</span>
               </div>
               <Tag :value="acao.prioridade" :severity="getPrioridadeColor(acao.prioridade)" class="!bg-transparent !border !border-current !text-[8px] px-1.5 py-0 uppercase tracking-widest font-black" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200/50 dark:border-slate-800 p-4"
           @dragover.prevent @drop="onDrop($event, 'Em Andamento')">
        <div class="flex items-center justify-between mb-4 px-2">
          <h3 class="text-xs font-black uppercase tracking-widest text-sky-500 flex items-center gap-2"><i class="pi pi-spinner text-[10px] animate-spin"></i> Em Andamento</h3>
          <span class="bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-black px-2 py-0.5 rounded-md">{{ estatisticas.emAndamento }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1 pb-4">
          <div v-for="acao in acoesAndamento" :key="acao.id" 
               draggable="true" @dragstart="onDragStart($event, acao.id)"
               class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-sky-300 dark:hover:border-sky-500/50 transition-all group">
            
            <div class="flex justify-between items-start mb-2">
              <span class="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 dark:bg-sky-500/10 px-2 py-1 rounded-md border border-sky-100 dark:border-sky-500/20">
                  <i class="pi pi-building text-[8px] mr-1"></i> 
                  {{ acao.empresa_nome || 'Conta Geral' }}
              </span>
              
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" aria-haspopup="true">
                <i class="pi pi-ellipsis-v text-xs"></i>
              </button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-3 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{{ acao.titulo }}</h4>
            
            <div class="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700/50">
               <div class="flex items-center gap-2" v-tooltip.top="acao.gestor_nome || 'Gestor'">
                  <Avatar :label="gerarIniciais(acao.gestor_nome)" shape="circle" class="!bg-sky-100 !text-sky-600 !w-6 !h-6 !text-[10px] !font-black" />
                  <span class="text-[10px] font-bold text-slate-500 max-w-[80px] truncate">{{ acao.gestor_nome?.split(' ')[0] || 'Gestor' }}</span>
               </div>
               <div class="flex items-center gap-1 text-[10px] font-black" :class="isAtrasado(acao.prazo_limite, acao.status) ? 'text-rose-500' : 'text-slate-400'">
                 <i class="pi pi-calendar text-[9px]"></i> {{ formatarData(acao.prazo_limite) }}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 flex flex-col bg-slate-100/50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200/50 dark:border-slate-800 p-4"
           @dragover.prevent @drop="onDrop($event, 'Concluído')">
        <div class="flex items-center justify-between mb-4 px-2">
          <h3 class="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2"><i class="pi pi-check-circle text-[10px]"></i> Concluído</h3>
          <span class="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md">{{ estatisticas.concluidas }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-1 pb-4">
          <div v-for="acao in acoesConcluidas" :key="acao.id" 
               draggable="true" @dragstart="onDragStart($event, acao.id)"
               class="bg-white/60 dark:bg-slate-800/60 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all group opacity-80 hover:opacity-100">
            
            <div class="flex justify-between items-start mb-2">
              <span class="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20">
                  <i class="pi pi-building text-[8px] mr-1"></i> 
                  {{ acao.empresa_nome || 'Conta Geral' }}
              </span>
              
              <button @click.stop="toggleMenu($event, acao)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" aria-haspopup="true">
                <i class="pi pi-ellipsis-v text-xs"></i>
              </button>
            </div>
            
            <h4 class="text-sm font-bold text-slate-600 dark:text-slate-300 leading-tight mb-2 line-through">{{ acao.titulo }}</h4>
            
            <div class="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700/50">
               <div class="flex items-center gap-2">
                  <Avatar :label="gerarIniciais(acao.gestor_nome)" shape="circle" class="!bg-emerald-100 !text-emerald-600 !w-6 !h-6 !text-[10px] !font-black" />
                  <span class="text-[10px] font-bold text-slate-400">{{ acao.gestor_nome?.split(' ')[0] }}</span>
               </div>
               <div class="flex items-center gap-1 text-[10px] font-black text-emerald-500">
                 <i class="pi pi-check text-[9px]"></i> Fechado
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <Dialog v-model:visible="dialogAcao" :modal="true" :style="{width: '500px'}" :closable="false" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog-no-header shadow-2xl">
      <div class="bg-slate-900 text-white p-6 flex justify-between items-center">
        <div>
          <h2 class="text-lg font-black italic tracking-tight"><i class="pi pi-pencil text-orange-500 mr-2"></i> Detalhes da Ação</h2>
          <p class="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold">{{ acaoAtual.empresa_nome || 'Ajustes' }}</p>
        </div>
        <button @click="dialogAcao = false" class="text-slate-400 hover:text-white transition-colors p-2"><i class="pi pi-times text-xl"></i></button>
      </div>

      <div class="p-8 space-y-5 bg-white dark:bg-slate-900">
        <div class="flex flex-col gap-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">O que fazer?</label>
          <div class="text-sm font-bold text-slate-800 dark:text-slate-200 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">{{ acaoAtual.titulo }}</div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</label>
            <Dropdown v-model="acaoAtual.status" :options="opcoesStatus" class="custom-dropdown w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Responsável</label>
            <Dropdown v-model="acaoAtual.gestor_id" :options="gestoresLista" optionLabel="nome" optionValue="id" placeholder="Atribuir..." class="custom-dropdown w-full" filter />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Prioridade</label>
            <Dropdown v-model="acaoAtual.prioridade" :options="opcoesPrioridade" class="custom-dropdown w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Prazo de Resolução</label>
            <Calendar v-model="acaoAtual.prazo_limite" dateFormat="yy-mm-dd" class="w-full custom-calendar" inputClass="custom-input !w-full" />
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Notas / Descrição</label>
          <Textarea v-model="acaoAtual.descricao" rows="4" class="custom-input !text-xs" />
        </div>
      </div>
      
      <div class="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-4 w-full">
        <Button label="Cancelar" text class="flex-1 font-black text-[11px] uppercase tracking-widest text-slate-400" @click="dialogAcao = false" />
        <Button label="Guardar" :loading="salvando" icon="pi pi-save" class="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 border-none rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl hover:-translate-y-0.5 transition-transform" @click="salvarAcao" />
      </div>
    </Dialog>

    <Menu ref="menuOpcoes" :model="menuItens" :popup="true" class="w-48 !rounded-[1.5rem] !border-slate-200 dark:!border-slate-700 dark:!bg-slate-800 shadow-xl overflow-hidden py-2">
      <template #item="{ item, props }">
        <a v-ripple class="flex items-center px-4 py-2.5 cursor-pointer group" 
           :class="{'hover:bg-rose-50 dark:hover:bg-rose-500/10': item.label === 'Excluir', 'hover:bg-slate-50 dark:hover:bg-slate-700/50': item.label !== 'Excluir' && !item.separator}" 
           v-bind="props.action" @click="item.command">
            <i :class="[item.icon, item.label === 'Excluir' ? 'text-rose-500' : 'text-slate-400 group-hover:text-orange-500']" class="mr-3 text-sm transition-colors"></i>
            <span :class="item.label === 'Excluir' ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300 font-semibold'" class="text-[10px] uppercase tracking-widest">{{ item.label }}</span>
        </a>
      </template>
    </Menu>

  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

:deep(.custom-input), :deep(.custom-dropdown), :deep(.custom-calendar .p-inputtext) {
  @apply bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-700 dark:text-slate-200 border w-full;
}

:deep(.custom-dialog-no-header .p-dialog-header) { display: none !important; }
:deep(.custom-dialog-no-header .p-dialog-content) { padding: 0 !important; @apply dark:bg-slate-900; }

/* Scrollbar invisível para as colunas do Kanban ficarem clean */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { @apply bg-transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { @apply bg-slate-200 dark:bg-slate-700 rounded-full; }

/* Remove a linha feia padrão do PrimeVue Menu */
:deep(.p-menu) { @apply p-0 border-none !important; }
:deep(.p-menuitem-separator) { @apply my-1 border-slate-100 dark:border-slate-700 !important; }
</style>
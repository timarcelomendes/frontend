<template>
  <div class="p-6 md:p-8 animate-fadein">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Auditoria e Logs</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Registo de atividades, disparos e erros do sistema.</p>
      </div>
      
      <span class="p-input-icon-left w-full md:w-auto">
        <i class="pi pi-search" />
        <InputText 
          v-model="filters['global'].value" 
          placeholder="Pesquisar em todos os logs..." 
          class="w-full md:w-80 custom-input" 
        />
      </span>
    </div>

    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/5 border border-slate-200/60 dark:border-slate-800 overflow-hidden">
      <DataTable 
        :value="logs" 
        :paginator="true" 
        :rows="15" 
        v-model:filters="filters"
        :loading="loading"
        :globalFilterFields="['nivel', 'acao', 'mensagem', 'usuario_nome', 'data_criacao']"
        responsiveLayout="scroll"
        class="p-datatable-sm"
      >
        <Column field="nivel" header="Nível" :sortable="true" style="width: 10%">
          <template #body="slotProps">
            <span :class="getBadgeClass(slotProps.data.nivel)" class="font-black text-[10px] tracking-widest uppercase px-2 py-1 rounded-md">
              {{ slotProps.data.nivel }}
            </span>
          </template>
        </Column>

        <Column field="data_criacao" header="Data/Hora" :sortable="true" style="width: 15%">
          <template #body="slotProps">
            <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {{ formatarDataLocal(slotProps.data.data_criacao) }}
            </span>
          </template>
        </Column>

        <Column field="acao" header="Ação" :sortable="true" style="width: 15%">
          <template #body="slotProps">
            <span class="text-slate-500 dark:text-slate-400 font-mono text-xs bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
              {{ slotProps.data.acao || 'N/A' }}
            </span>
          </template>
        </Column>

        <Column field="mensagem" header="Mensagem" style="width: 45%">
          <template #body="slotProps">
            <span class="text-slate-700 dark:text-slate-200 block truncate max-w-[400px]" :title="slotProps.data.mensagem">
              {{ slotProps.data.mensagem }}
            </span>
          </template>
        </Column>

        <Column field="usuario_nome" header="Origem" :sortable="true" style="width: 15%">
          <template #body="slotProps">
            <div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <i :class="slotProps.data.usuario_nome === 'Sistema/Robô' ? 'pi pi-cog text-indigo-500' : 'pi pi-user text-slate-400'"></i>
              <span class="truncate">{{ slotProps.data.usuario_nome }}</span>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import api from '../services/api';
import { formatarDataLocal } from '../utils/formatters';

const toast = useToast();
const logs = ref([]);
const loading = ref(true);

// Configuração dos filtros
const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    
    nivel: { value: null, matchMode: FilterMatchMode.EQUALS },
    acao: { value: null, matchMode: FilterMatchMode.CONTAINS },
    mensagem: { value: null, matchMode: FilterMatchMode.CONTAINS },
    usuario_nome: { value: null, matchMode: FilterMatchMode.CONTAINS },
    data_criacao: { value: null, matchMode: FilterMatchMode.CONTAINS }
});



const carregarLogs = async () => {
    loading.value = true;
    try {
        const response = await api.get('/logs'); 
        logs.value = response.data;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar os logs do sistema.', life: 5000 });
        console.error("Erro ao buscar logs:", error);
    } finally {
        loading.value = false;
    }
};

const getBadgeClass = (nivel) => {
    const level = (nivel || '').toUpperCase();
    if (level === 'ERROR') return 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30';
    if (level === 'WARN') return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30';
    if (level === 'SUCCESS') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30';
    return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30';
};

onMounted(() => {
    carregarLogs();
});

</script>

<style scoped lang="postcss">
@reference "tailwindcss";

.animate-fadein { 
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
}
@keyframes fadeIn { 
  from { opacity: 0; transform: translateY(10px); } 
  to { opacity: 1; transform: translateY(0); } 
}

:deep(.custom-input) {
  @apply bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:border-orange-500 dark:focus:border-orange-500 outline-none transition-all pl-10;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
  @apply bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider py-4 border-b border-slate-200 dark:border-slate-700;
}

:deep(.p-datatable .p-datatable-tbody > tr) {
  @apply bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  @apply py-3;
}
</style>
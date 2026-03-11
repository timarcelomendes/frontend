<script setup>
import { ref, computed } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

import Button from 'primevue/button';
import ProgressBar from 'primevue/progressbar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';

const toast = useToast();

// --- ESTADOS DO WIZARD ---
const passoAtual = ref(1); 
const fileInput = ref(null);
const ficheiroSelecionado = ref(null);
const isProcessando = ref(false);
const progresso = ref(0);

// --- ESTADOS DE DADOS ---
const dadosPreview = ref([]);
const colunasExtra = ref([]); // Guarda dinamicamente todas as colunas extras
const configuracaoImportacao = ref({ overwrite: true });
const resumoFinal = ref(null);

// ==========================================
// 📥 DOWNLOAD DO TEMPLATE ABRANGENTE
// ==========================================
const baixarTemplate = () => {
  // Incluímos as datas de envio (ultimo_envio e proximo_envio)
  const cabecalhos = [
    'nome', 'email', 'empresa', 'perfil_decisor', 'segmento', 
    'telefone', 'cargo', 'valor_contrato', 'perfil', 'ativo',
    'ultimo_envio', 'proximo_envio'
  ];
  
  // Exemplo prático (datas em formato AAAA-MM-DD)
  const exemplo = [
    'João Silva', 'joao.silva@empresa.com', 'Stefanini', 'Decisor', 'Tecnologia', 
    '11999999999', 'Diretor de TI', '150000.00', 'Influenciador', 'true',
    '2026-03-01', '2026-06-01'
  ];
  
  const conteudoCSV = [cabecalhos.join(','), exemplo.join(',')].join('\n');

  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', 'modelo_importacao_nps_completo.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.add({ severity: 'success', summary: 'Download Iniciado', detail: 'O modelo CSV foi baixado.', life: 3000 });
};

// ==========================================
// PASSO 1: SELEÇÃO E PREVIEW
// ==========================================
const selecionarFicheiro = () => fileInput.value.click();

const aoMudarFicheiro = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const tiposValidos = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.ms-excel'];
  if (!tiposValidos.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
    toast.add({ severity: 'error', summary: 'Ficheiro Inválido', detail: 'Usa apenas .xlsx ou .csv', life: 3000 });
    return;
  }

  ficheiroSelecionado.value = file;
  await gerarPreview(file);
};

const gerarPreview = async (file) => {
  isProcessando.value = true;
  progresso.value = 30;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/importar/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (p) => progresso.value = Math.round((p.loaded * 100) / p.total)
    });

    // Sanitiza e valida as obrigatórias
    dadosPreview.value = response.data.map(item => ({
      ...item,
      valido: !!(item.nome && item.email && item.empresa)
    }));

    // Captura todas as colunas dinâmicas enviadas no CSV
    if (dadosPreview.value.length > 0) {
      const chavesCSV = Object.keys(dadosPreview.value[0]);
      // Exclui as fixas do array de "extras" para não duplicar na tabela
      colunasExtra.value = chavesCSV.filter(c => !['nome', 'email', 'empresa', 'valido'].includes(c));
    }

    toast.add({ severity: 'info', summary: 'Leitura Concluída', detail: `Foram encontrados ${dadosPreview.value.length} registos.`, life: 3000 });
    passoAtual.value = 2;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Falha na Leitura', detail: 'Verifique se as colunas estão corretas.', life: 5000 });
    removerFicheiro();
  } finally { isProcessando.value = false; }
};

const removerFicheiro = () => {
  ficheiroSelecionado.value = null;
  dadosPreview.value = [];
  colunasExtra.value = [];
  passoAtual.value = 1;
  if (fileInput.value) fileInput.value.value = '';
};

// ==========================================
// PASSO 2: CONFIRMAÇÃO FINAL
// ==========================================
const confirmarImportacaoBase = async () => {
  isProcessando.value = true;
  try {
    const payload = { overwrite: configuracaoImportacao.value.overwrite, clientes: dadosPreview.value };
    const response = await api.post('/importar/confirmar', payload);
    if (response.data.status === 'success') {
      resumoFinal.value = response.data.resultado;
      passoAtual.value = 3;
      toast.add({ severity: 'success', summary: 'Importação Concluída', detail: 'Base de dados atualizada.', life: 3000 });
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro Crítico', detail: error.response?.data?.detail || 'Falha ao gravar no banco de dados.', life: 5000 });
  } finally { isProcessando.value = false; }
};

const reiniciarProcesso = () => {
  removerFicheiro();
  resumoFinal.value = null;
  passoAtual.value = 1;
};

const totalInvalidos = computed(() => dadosPreview.value.filter(d => !d.valido).length);
</script>

<template>
  <div class="max-w-6xl mx-auto animate-fadein px-4 md:px-8 py-4">
    
    <div class="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Importação <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Gestão de Base em Massa</p>
      </div>
      
      <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
        <span :class="{'text-orange-500': passoAtual >= 1}">1. <span class="hidden sm:inline">Upload</span></span>
        <i class="pi pi-angle-right"></i>
        <span :class="{'text-orange-500': passoAtual >= 2}">2. <span class="hidden sm:inline">Validação</span></span>
        <i class="pi pi-angle-right"></i>
        <span :class="{'text-orange-500': passoAtual === 3}">3. <span class="hidden sm:inline">Conclusão</span></span>
      </div>
    </div>

    <div v-if="passoAtual === 1" class="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden animate-fadein">
      <input type="file" ref="fileInput" class="hidden" @change="aoMudarFicheiro" accept=".xlsx, .csv" />

      <div v-if="!isProcessando" @click="selecionarFicheiro"
           class="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-16 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/30 hover:bg-orange-50/10 transition-all group text-center">
        <div class="w-16 h-16 md:w-20 md:h-20 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-orange-500 group-hover:bg-orange-100 transition-all">
          <i class="pi pi-cloud-upload text-3xl md:text-4xl"></i>
        </div>
        <h3 class="text-md md:text-lg font-black text-slate-700 dark:text-white tracking-tight leading-tight">Clique ou arraste a planilha para carregar</h3>
        <p class="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Formatos aceites: .xlsx ou .csv</p>
      </div>

      <div v-if="!isProcessando" class="mt-8 flex justify-center">
        <Button icon="pi pi-download" label="Baixar Modelo de Planilha Completo" @click="baixarTemplate" class="!bg-slate-50 dark:!bg-slate-800 !text-slate-500 !border-none hover:!bg-slate-100 dark:hover:!bg-slate-700 !px-6 !py-3 !rounded-2xl !text-[11px] !font-black !uppercase !tracking-widest transition-all" />
      </div>

      <div v-else class="space-y-4 py-16 text-center">
        <i class="pi pi-spin pi-spinner text-3xl text-orange-500 mb-4"></i>
        <h4 class="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px]">A ler e validar dados...</h4>
        <ProgressBar :value="progresso" :showValue="false" class="h-1.5 rounded-full max-w-xs mx-auto" />
      </div>
    </div>

    <div v-if="passoAtual === 2" class="space-y-6 animate-fadein">
      <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4 md:p-8 shadow-sm">
        
        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 pb-6 border-b border-slate-50 dark:border-slate-800">
          <div>
            <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white">Pré-visualização de Dados</h3>
            <p class="text-[10px] text-slate-400 font-bold mt-1">Verifique as colunas identificadas.</p>
          </div>
          <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl w-full lg:w-auto">
            <span class="text-[10px] font-black uppercase text-slate-500 flex-1 lg:flex-none">Substituir existentes?</span>
            <InputSwitch v-model="configuracaoImportacao.overwrite" />
            <i class="pi pi-info-circle text-slate-400 text-xs" v-tooltip.top="'Se ativado, clientes com o mesmo e-mail terão seus dados atualizados.'"></i>
          </div>
        </div>

        <div v-if="totalInvalidos > 0" class="mb-6 bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl flex items-center gap-4 border border-rose-100 dark:border-rose-800/50">
          <i class="pi pi-exclamation-triangle text-rose-500 text-xl"></i>
          <div>
            <h4 class="text-[11px] font-black uppercase text-rose-700 dark:text-rose-400">Atenção aos Dados</h4>
            <p class="text-[10px] text-rose-600/80 font-medium">Existem {{ totalInvalidos }} registos ignorados por falta de nome, email ou empresa.</p>
          </div>
        </div>

        <DataTable :value="dadosPreview" responsiveLayout="stack" breakpoint="960px" class="p-datatable-sm custom-table" :rows="6" paginator rowHover>
          <Column header="Status" style="width: 70px">
            <template #body="s">
              <i v-if="s.data.valido" class="pi pi-check-circle text-emerald-500"></i>
              <i v-else class="pi pi-times-circle text-rose-500" v-tooltip.top="'Faltam dados obrigatórios'"></i>
            </template>
          </Column>
          
          <Column field="nome" header="Nome">
            <template #body="s"><span class="text-[11px] font-bold">{{ s.data.nome || '---' }}</span></template>
          </Column>
          <Column field="email" header="E-mail">
            <template #body="s"><span class="text-[11px] text-slate-500">{{ s.data.email || '---' }}</span></template>
          </Column>
          <Column field="empresa" header="Empresa">
            <template #body="s"><span class="text-[11px] font-bold text-slate-700 dark:text-slate-300">{{ s.data.empresa || '---' }}</span></template>
          </Column>

          <Column v-for="col in colunasExtra" :key="col" :field="col" :header="col.replace('_', ' ')">
            <template #body="s">
              <span class="text-[11px] text-slate-500">{{ s.data[col] || '---' }}</span>
            </template>
          </Column>
        </DataTable>

        <div class="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-50 dark:border-slate-800">
          <Button label="Cancelar e Voltar" icon="pi pi-arrow-left" text @click="removerFicheiro" class="flex-1 p-4 rounded-2xl font-black text-[11px] uppercase text-slate-400" />
          <Button label="Confirmar e Gravar Dados" icon="pi pi-database" @click="confirmarImportacaoBase" :loading="isProcessando" 
                  class="flex-1 p-4 bg-orange-500 border-none text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all" />
        </div>
      </div>
    </div>

    <div v-if="passoAtual === 3" class="animate-fadein space-y-6">
      <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm text-center">
        <div class="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <i class="pi pi-check text-4xl font-black"></i>
        </div>
        <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight italic mb-2">Importação Finalizada!</h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">O processamento da base foi concluído com sucesso.</p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
            <span class="text-3xl font-black text-emerald-500">{{ resumoFinal?.inserted || 0 }}</span>
            <span class="text-[9px] font-black uppercase text-slate-400 mt-2">Novos Registos</span>
          </div>
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
            <span class="text-3xl font-black text-blue-500">{{ resumoFinal?.updated || 0 }}</span>
            <span class="text-[9px] font-black uppercase text-slate-400 mt-2">Atualizados</span>
          </div>
          <div class="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
            <span class="text-3xl font-black text-slate-400">{{ resumoFinal?.ignored || 0 }}</span>
            <span class="text-[9px] font-black uppercase text-slate-400 mt-2">Ignorados / Inválidos</span>
          </div>
        </div>

        <Button label="Realizar Nova Importação" icon="pi pi-refresh" @click="reiniciarProcesso" class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] shadow-xl" />
      </div>
    </div>

    <div v-if="passoAtual === 1" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
      <div class="p-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
        <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <i class="pi pi-info-circle"></i> Colunas Obrigatórias
        </h4>
        <ul class="text-[11px] text-slate-600 dark:text-slate-300 space-y-3 font-bold">
          <li class="flex items-center gap-3"><i class="pi pi-check-circle text-emerald-500"></i> nome</li>
          <li class="flex items-center gap-3"><i class="pi pi-check-circle text-emerald-500"></i> email</li>
          <li class="flex items-center gap-3"><i class="pi pi-check-circle text-emerald-500"></i> empresa</li>
        </ul>
      </div>
      <div class="p-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900">
        <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
          <i class="pi pi-star"></i> Campos Extras Permitidos
        </h4>
        <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
          Pode mapear colunas adicionais como: <span class="font-bold text-slate-700 dark:text-white">telefone, cargo, segmento, valor_contrato</span>, as regras de negócio de envio com <span class="font-bold text-slate-700 dark:text-white">ultimo_envio</span> e <span class="font-bold text-slate-700 dark:text-white">proximo_envio</span> (AAAA-MM-DD), além da flag <span class="font-bold text-slate-700 dark:text-white">ativo (true/false)</span>.
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
:deep(.p-progressbar-value) { @apply bg-orange-500 transition-all duration-300; }

:deep(.custom-table),
:deep(.custom-table .p-datatable-wrapper),
:deep(.custom-table table) { @apply !bg-transparent; }
:deep(.custom-table .p-datatable-thead > tr > th) { @apply !bg-transparent border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 py-4; }
:deep(.custom-table .p-datatable-tbody > tr) { @apply !bg-transparent text-slate-700 dark:text-slate-300 transition-colors duration-200; }
:deep(.custom-table .p-datatable-tbody > tr > td) { @apply !bg-transparent border-b border-slate-50 dark:border-slate-800/70 py-3; }
</style>
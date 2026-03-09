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
const passoAtual = ref(1); // 1: Upload, 2: Preview, 3: Sucesso
const fileInput = ref(null);
const ficheiroSelecionado = ref(null);
const isProcessando = ref(false);
const progresso = ref(0);

// --- ESTADOS DE DADOS ---
const dadosPreview = ref([]);
const configuracaoImportacao = ref({
  overwrite: true // Substituir clientes existentes se o email coincidir
});
const resumoFinal = ref(null);

// ==========================================
// 📥 DOWNLOAD DO TEMPLATE
// ==========================================
const baixarTemplate = () => {
  // Define as colunas obrigatórias e opcionais
  const cabecalhos = ['nome', 'email', 'empresa', 'perfil_decisor', 'segmento', 'telefone'];
  
  // Cria uma linha de exemplo para orientar o utilizador
  const exemplo = ['João Silva', 'joao.silva@empresa.com', 'Stefanini', 'Decisor', 'Tecnologia', '912345678'];
  
  // Monta o conteúdo do CSV
  const conteudoCSV = [
    cabecalhos.join(','),
    exemplo.join(',')
  ].join('\n');

  // Cria o ficheiro virtual e força o download
  const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_nps.csv');
  link.style.visibility = 'hidden';
  
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
    // Chama o endpoint de preview do main.py
    const response = await api.post('/importar/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        progresso.value = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      }
    });

    // Sanitiza os dados para garantir que não existam nulls que quebrem a tabela
    dadosPreview.value = response.data.map(item => ({
      ...item,
      valido: !!(item.nome && item.email && item.empresa) // Validação Frontend Básica
    }));

    toast.add({ severity: 'info', summary: 'Leitura Concluída', detail: `Foram encontrados ${dadosPreview.value.length} registos.`, life: 3000 });
    passoAtual.value = 2; // Avança para o Preview
  } catch (error) {
    console.error("Erro no preview:", error);
    toast.add({ severity: 'error', summary: 'Falha na Leitura', detail: 'Verifique se as colunas estão corretas.', life: 5000 });
    removerFicheiro();
  } finally {
    isProcessando.value = false;
  }
};

const removerFicheiro = () => {
  ficheiroSelecionado.value = null;
  dadosPreview.value = [];
  passoAtual.value = 1;
  if (fileInput.value) fileInput.value.value = '';
};

// ==========================================
// PASSO 2: CONFIRMAÇÃO FINAL
// ==========================================

const confirmarImportacaoBase = async () => {
  isProcessando.value = true;
  try {
    // Monta o payload esperado pela rota /api/importar/confirmar
    const payload = {
      overwrite: configuracaoImportacao.value.overwrite,
      clientes: dadosPreview.value
    };

    const response = await api.post('/importar/confirmar', payload);
    
    if (response.data.status === 'success') {
      resumoFinal.value = response.data.resultado;
      passoAtual.value = 3; // Avança para o Resumo
      toast.add({ severity: 'success', summary: 'Importação Concluída', detail: 'Base de dados atualizada.', life: 3000 });
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro Crítico', detail: error.response?.data?.detail || 'Falha ao gravar no banco de dados.', life: 5000 });
  } finally {
    isProcessando.value = false;
  }
};

const reiniciarProcesso = () => {
  removerFicheiro();
  resumoFinal.value = null;
  passoAtual.value = 1;
};

// Computado para total de inválidos no preview
const totalInvalidos = computed(() => dadosPreview.value.filter(d => !d.valido).length);
</script>

<template>
  <div class="max-w-6xl mx-auto animate-fadein p-4">
    
    <div class="mb-10 flex justify-between items-end">
      <div>
        <h1 class="text-3xl font-black text-slate-800 dark:text-white tracking-tight italic">
          Importação <span class="text-orange-500">.</span>
        </h1>
        <p class="text-[12px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Gestão de Base em Massa</p>
      </div>
      
      <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
        <span :class="{'text-orange-500': passoAtual >= 1}">1. Upload</span>
        <i class="pi pi-angle-right"></i>
        <span :class="{'text-orange-500': passoAtual >= 2}">2. Validação</span>
        <i class="pi pi-angle-right"></i>
        <span :class="{'text-orange-500': passoAtual === 3}">3. Conclusão</span>
      </div>
    </div>

    <div v-if="passoAtual === 1" class="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden animate-fadein">
      <input type="file" ref="fileInput" class="hidden" @change="aoMudarFicheiro" accept=".xlsx, .csv" />

      <div v-if="!isProcessando" @click="selecionarFicheiro"
           class="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/30 hover:bg-orange-50/10 transition-all group">
        <div class="w-20 h-20 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:text-orange-500 group-hover:bg-orange-100 transition-all shadow-sm">
          <i class="pi pi-cloud-upload text-4xl"></i>
        </div>
        <h3 class="text-lg font-black text-slate-700 dark:text-white tracking-tight">Arraste a planilha ou clique para carregar</h3>
        <p class="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Formatos aceites: .xlsx ou .csv</p>
      </div>

      <div v-if="!isProcessando" class="mt-8 flex justify-center">
        <Button 
          icon="pi pi-download" 
          label="Baixar Modelo de Planilha (CSV)" 
          @click="baixarTemplate" 
          class="!bg-slate-50 dark:!bg-slate-800 !text-slate-500 !border-none hover:!bg-slate-100 dark:hover:!bg-slate-700 !px-6 !py-3 !rounded-2xl !text-[11px] !font-black !uppercase !tracking-widest transition-all" 
        />
      </div>

      <div v-else class="space-y-4 py-16 px-10 text-center">
        <div class="w-16 h-16 mx-auto bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center animate-spin">
          <i class="pi pi-spinner text-3xl font-bold"></i>
        </div>
        <h4 class="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">A ler e validar dados...</h4>
        <ProgressBar :value="progresso" :showValue="false" class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 max-w-md mx-auto" />
      </div>
    </div>

    <div v-if="passoAtual === 2" class="space-y-6 animate-fadein">
      <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-slate-50 dark:border-slate-800">
          <div>
            <h3 class="text-sm font-black uppercase text-slate-800 dark:text-white">Pré-visualização de Dados</h3>
            <p class="text-[10px] text-slate-400 font-bold">Verifique se as colunas foram mapeadas corretamente.</p>
          </div>
          <div class="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-700">
            <span class="text-[10px] font-black uppercase text-slate-500">Substituir clientes existentes?</span>
            <InputSwitch v-model="configuracaoImportacao.overwrite" />
            <i class="pi pi-info-circle text-slate-400 text-xs" v-tooltip.top="'Se ativado, clientes com o mesmo e-mail terão seus dados atualizados.'"></i>
          </div>
        </div>

        <div v-if="totalInvalidos > 0" class="mb-6 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50 p-4 rounded-2xl flex items-center gap-4">
          <i class="pi pi-exclamation-triangle text-rose-500 text-xl"></i>
          <div>
            <h4 class="text-[11px] font-black uppercase text-rose-700 dark:text-rose-400">Atenção aos Dados</h4>
            <p class="text-[10px] text-rose-600/80 font-medium">Existem {{ totalInvalidos }} registos com campos obrigatórios ausentes. Eles serão ignorados na importação.</p>
          </div>
        </div>

        <DataTable :value="dadosPreview" class="p-datatable-sm" :rows="6" paginator rowHover>
          <Column header="Status" style="width: 80px">
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
            <template #body="s"><span class="text-[11px] font-bold text-slate-700">{{ s.data.empresa || '---' }}</span></template>
          </Column>
          <Column field="perfil" header="Perfil">
             <template #body="s">
               <Tag :value="s.data.perfil_decisor || s.data.perfil || 'Decisor'" severity="info" class="text-[8px] uppercase font-black px-2" />
             </template>
          </Column>
        </DataTable>

        <div class="flex gap-4 mt-8 pt-6 border-t border-slate-50 dark:border-slate-800">
          <Button label="Cancelar e Voltar" icon="pi pi-arrow-left" text @click="removerFicheiro" class="flex-1 p-4 rounded-2xl font-black text-[11px] text-slate-400 hover:bg-slate-50" />
          <Button label="Confirmar e Gravar Dados" icon="pi pi-database" @click="confirmarImportacaoBase" :loading="isProcessando" 
                  class="flex-1 p-4 bg-orange-500 border-none text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:-translate-y-1 transition-all" />
        </div>
      </div>
    </div>

    <div v-if="passoAtual === 3" class="animate-fadein space-y-6">
      <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-10 shadow-sm text-center">
        <div class="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <i class="pi pi-check text-4xl font-black"></i>
        </div>
        <h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight italic mb-2">Importação Finalizada!</h2>
        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">O processamento da base foi concluído com sucesso.</p>

        <div class="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
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

    <div v-if="passoAtual === 1" class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 opacity-60 hover:opacity-100 transition-opacity">
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
          <i class="pi pi-star"></i> Dicas de Enriquecimento
        </h4>
        <p class="text-[11px] text-slate-500 font-medium leading-relaxed">
          Pode incluir as colunas <span class="font-bold text-slate-700 dark:text-white">perfil_decisor</span> (ex: Decisor, Operacional) e <span class="font-bold text-slate-700 dark:text-white">segmento</span> para melhorar a precisão dos KPIs e filtros no Dashboard.
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
@reference "tailwindcss";

.animate-fadein { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

:deep(.p-progressbar-value) { @apply bg-orange-500 transition-all duration-300; }
</style>
<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';
import { useToast } from 'primevue/usetoast';

import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import Skeleton from 'primevue/skeleton';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';

const toast = useToast();
const saving = ref(false);

// --- ESTADOS GLOBAIS (Tabelas) ---
const clientes = ref([]);
const empresas = ref([]);
const segmentos = ref([]);
const perfis = ref([]);
const cargos = ref([]); 
const loading = ref(true);

// --- OPÇÕES DOS DROPDOWNS ---
const opcoesSegmento = ['Tecnologia', 'Financeiro', 'Saúde', 'Varejo', 'Indústria', 'Educação', 'Outro'];
const opcoesPerfil = ['Decisor', 'Influenciador', 'Usuário Final', 'Técnico'];

// ==========================================
// 🧑‍💼 ESTADOS: CLIENTES (PESSOAS)
// ==========================================
const dialogVisivel = ref(false);
const editando = ref(false);

// ==========================================
// 🗑️ ESTADOS: EXCLUSÃO
// ==========================================
const dialogExclusao = ref(false);
const idParaExcluir = ref(null);
const excluindo = ref(false);

const cliente = ref({
  cliente_id: null,
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  perfil_decisor: null, 
  cargo: null
});

// ==========================================
// 🏢 ESTADOS: EMPRESAS
// ==========================================
const dialogEmpresa = ref(false);
const editandoEmpresa = ref(false);
const empresaForm = ref({
  id: null,
  nome: '',
  segmento: null,
  valor_contrato: 0
});

// ==========================================
// 📊 ESTADOS: SEGMENTOS
// ==========================================
const dialogSegmento = ref(false);
const editandoSegmento = ref(false);
const segmentoForm = ref({ id: null, nome: '' });

// ==========================================
// 🏷️ ESTADOS: PERFIS
// ==========================================
const dialogPerfil = ref(false);
const editandoPerfil = ref(false);
const perfilForm = ref({ id: null, nome: '' });

// ==========================================
// 💼 ESTADOS: CARGOS
// ==========================================
const dialogCargo = ref(false);
const editandoCargo = ref(false);
const cargoForm = ref({ id: null, nome: '' });

// ==========================================
// 🚀 FUNÇÃO MESTRE: CARREGAR TUDO
// ==========================================
const carregarTudo = async () => {
  loading.value = true;
  try {
    const [resCli, resEmp, resSeg, resPerf, resCargos] = await Promise.all([
      api.get('/clientes'),
      api.get('/cadastros/empresas'),
      api.get('/cadastros/segmentos'),
      api.get('/cadastros/perfis'),
      api.get('/cadastros/cargos') 
    ]);
    
    clientes.value = resCli.data;
    empresas.value = resEmp.data;
    segmentos.value = resSeg.data;
    perfis.value = resPerf.data;
    cargos.value = resCargos.data; 
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar a base de dados.', life: 3000 });
  } finally {
    loading.value = false;
  }
};

// ==========================================
// ⚡ CRUD: CLIENTES (PESSOAS)
// ==========================================

const abrirNovo = () => { 
  cliente.value = { cliente_id: null, nome: '', email: '', telefone: '', empresa: '', perfil_decisor: null, cargo: null }; 
  editando.value = false; 
  dialogVisivel.value = true; 
};

const editarCliente = (dados) => { 
  cliente.value = { ...dados }; 
  editando.value = true; 
  dialogVisivel.value = true; 
};

const salvarCliente = async () => {
  if (!cliente.value.nome || !cliente.value.email || !cliente.value.cargo) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'Nome, E-mail e Cargo são obrigatórios.', life: 3000 });
    return;
  }
  saving.value = true;
  try {
    const id = cliente.value.cliente_id || cliente.value.id;
    if (editando.value) await api.put(`/clientes/${id}`, cliente.value);
    else await api.post('/clientes', cliente.value);
    dialogVisivel.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Atualizado', detail: 'Ficha da pessoa atualizada com sucesso.' });
  } catch (error) { 
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar os dados.' }); 
  } finally { 
    saving.value = false; 
  }
};

// Abre o modal e guarda o ID da pessoa que foi clicada
const confirmarExclusao = (id) => {
  idParaExcluir.value = id;
  dialogExclusao.value = true;
};

// Executa a exclusão após o clique no "Sim, confirmo!"
const executarExclusao = async () => {
  if (!idParaExcluir.value) return;
  excluindo.value = true;
  
  try { 
    await api.delete(`/clientes/${idParaExcluir.value}`); 
    toast.add({ severity: 'success', summary: 'Removido', detail: 'Pessoa excluída com sucesso.', life: 3000 }); 
    dialogExclusao.value = false;
    carregarTudo(); 
  } catch (error) { 
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir a pessoa.', life: 3000 }); 
  } finally {
    excluindo.value = false;
    idParaExcluir.value = null;
  }
};

// ==========================================
// ⚡ CRUD: EMPRESAS (CONTAS)
// ==========================================

const abrirNovaEmpresa = () => { empresaForm.value = { id: null, nome: '', segmento: null, valor_contrato: 0 }; editandoEmpresa.value = false; dialogEmpresa.value = true; };
const editarFichaEmpresa = (dados) => { 
  empresaForm.value = { id: dados.id, nome: dados.nome, segmento: dados.segmento, valor_contrato: dados.arr_total || 0 }; 
  editandoEmpresa.value = true; 
  dialogEmpresa.value = true; 
};

const salvarEmpresa = async () => {
  if (!empresaForm.value.nome) {
    toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O nome da conta é obrigatório.', life: 3000 });
    return;
  }
  saving.value = true;
  try {
    if (editandoEmpresa.value) await api.put(`/cadastros/empresas/${empresaForm.value.id}`, empresaForm.value);
    else await api.post('/cadastros/empresas', empresaForm.value);
    dialogEmpresa.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Conta Salva', detail: 'Empresa atualizada com sucesso.' });
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar a empresa.' }); } 
  finally { saving.value = false; }
};

// ==========================================
// ⚡ CRUD: SEGMENTOS
// ==========================================

const abrirNovoSegmento = () => { segmentoForm.value = { id: null, nome: '' }; editandoSegmento.value = false; dialogSegmento.value = true; };
const editarFichaSegmento = (dados) => { segmentoForm.value = { ...dados }; editandoSegmento.value = true; dialogSegmento.value = true; };

const salvarSegmento = async () => {
  if (!segmentoForm.value.nome) return;
  saving.value = true;
  try {
    if (editandoSegmento.value) await api.put(`/cadastros/segmentos/${segmentoForm.value.id}`, segmentoForm.value);
    else await api.post('/cadastros/segmentos', segmentoForm.value);
    dialogSegmento.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Segmento salvo com sucesso.' });
  } catch (e) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar.' }); } 
  finally { saving.value = false; }
};

// ==========================================
// ⚡ CRUD: PERFIS
// ==========================================

const abrirNovoPerfil = () => { perfilForm.value = { id: null, nome: '' }; editandoPerfil.value = false; dialogPerfil.value = true; };
const editarFichaPerfil = (dados) => { perfilForm.value = { ...dados }; editandoPerfil.value = true; dialogPerfil.value = true; };

const salvarPerfil = async () => {
  if (!perfilForm.value.nome) return;
  saving.value = true;
  try {
    if (editandoPerfil.value) await api.put(`/cadastros/perfis/${perfilForm.value.id}`, perfilForm.value);
    else await api.post('/cadastros/perfis', perfilForm.value);
    dialogPerfil.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Perfil salvo com sucesso.' });
  } catch (e) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar.' }); } 
  finally { saving.value = false; }
};

// ==========================================
// ⚡ CRUD: CARGOS (NOVO)
// ==========================================

const abrirNovoCargo = () => { cargoForm.value = { id: null, nome: '' }; editandoCargo.value = false; dialogCargo.value = true; };
const editarFichaCargo = (dados) => { cargoForm.value = { ...dados }; editandoCargo.value = true; dialogCargo.value = true; };

const salvarCargo = async () => {
  if (!cargoForm.value.nome) return;
  saving.value = true;
  try {
    if (editandoCargo.value) await api.put(`/cadastros/cargos/${cargoForm.value.id}`, cargoForm.value);
    else await api.post('/cadastros/cargos', cargoForm.value);
    dialogCargo.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Cargo salvo com sucesso.' });
  } catch (e) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao salvar cargo.' }); } 
  finally { saving.value = false; }
};

// ==========================================
// 🛠️ FUNÇÕES UTILITÁRIAS
// ==========================================

const formatarMoeda = (valor) => {
  if (!valor) return '€ 0,00';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);
};

const getIniciais = (nome) => nome ? nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CL';

// Arranque da Página
onMounted(carregarTudo);
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white">
            Contas <span class="text-orange-500">.</span>
          </h1>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">
            Gestão de Contas e Receita Associada
          </p>
        </div>
        <div class="flex gap-3">
          <Button icon="pi pi-refresh" @click="carregarTudo" :loading="loading" class="w-10 h-10 !bg-white dark:!bg-slate-900 !text-slate-600 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700 !rounded-xl shadow-sm hover:!bg-slate-50" />
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-2 sm:p-4">
        <TabView class="custom-tabview">
          
          <TabPanel>
            <template #header>
              <div class="flex items-center gap-2 px-2">
                <i class="pi pi-users text-indigo-500"></i>
                <span class="font-black tracking-widest uppercase text-[10px]">Pessoas</span>
              </div>
            </template>
            
            <div class="pt-4">
              <div class="flex justify-end mb-4">
                 <Button label="Nova Pessoa" icon="pi pi-plus" @click="abrirNovo" class="!bg-indigo-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
              </div>

              <DataTable :value="clientes" :paginator="true" :rows="10" dataKey="cliente_id" 
                   :loading="loading" class="p-datatable-sm custom-table" rowHover
                   emptyMessage="Nenhuma pessoa encontrada na base de dados.">
                
                <Column header="Pessoa" sortable field="nome" style="min-width: 250px">
                  <template #body="{ data }">
                    <div class="flex items-center gap-4 py-2">
                      <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-100 dark:border-slate-700 shrink-0">
                        {{ getIniciais(data.nome) }}
                      </div>
                      <div class="flex flex-col">
                        <span class="text-[13px] font-black text-slate-800 dark:text-white">{{ data.nome }}</span>
                        <span class="text-[10px] text-slate-400 font-medium">{{ data.email }}</span>
                      </div>
                    </div>
                  </template>
                </Column>

                <Column header="Conta (Empresa)" sortable field="empresa">
                  <template #body="{ data }">
                    <span class="text-[12px] font-bold text-slate-600 dark:text-slate-300">{{ data.empresa || '-' }}</span>
                  </template>
                </Column>

                <Column header="Perfil">
                  <template #body="{ data }">
                      <div v-if="data.perfil_decisor" class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                        <i :class="data.perfil_decisor === 'Decisor' ? 'pi pi-star-fill text-orange-500' : 'pi pi-user'"></i> {{ data.perfil_decisor }}
                      </div>
                  </template>
                </Column>

                <Column header="Ações" alignFrozen="right" style="width: 100px">
                  <template #body="slotProps">
                    <div class="flex gap-1.5 justify-end">
                      <Button icon="pi pi-pencil" v-tooltip.top="'Editar'" @click="editarCliente(slotProps.data)" class="w-7 h-7 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none hover:!text-slate-700 rounded-lg transition-colors !text-xs" />
                      
                      <Button icon="pi pi-trash" v-tooltip.top="'Excluir'" @click="confirmarExclusao(slotProps.data.cliente_id || slotProps.data.id)" class="w-7 h-7 !bg-rose-50 dark:!bg-rose-500/10 !text-rose-400 !border-none hover:!bg-rose-100 rounded-lg transition-colors !text-xs" />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header>
              <div class="flex items-center gap-2 px-2">
                <i class="pi pi-building text-orange-500"></i>
                <span class="font-black tracking-widest uppercase text-[10px]">Empresas</span>
              </div>
            </template>
            <div class="pt-4">
              <div class="flex justify-end mb-4">
                 <Button label="Nova Empresa" icon="pi pi-plus" @click="abrirNovaEmpresa" class="!bg-orange-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
              </div>

              <DataTable :value="empresas" :paginator="true" :rows="10" class="p-datatable-sm custom-table" emptyMessage="Nenhuma empresa registada.">
                <Column field="nome" header="Conta (Empresa)" sortable>
                  <template #body="{ data }">
                    <span class="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3">
                      <div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500"><i class="pi pi-building text-xs"></i></div>
                      {{ data.nome }}
                    </span>
                  </template>
                </Column>
                <Column field="segmento" header="Segmento">
                  <template #body="{ data }">
                    <Tag v-if="data.segmento" :value="data.segmento" class="!bg-slate-100 !text-slate-600 dark:!bg-slate-800 dark:!text-slate-300 !text-[9px] !font-black !uppercase !tracking-widest !px-3" />
                  </template>
                </Column>
                <Column field="total_contatos" header="Pessoas" sortable align="center">
                  <template #body="{ data }">
                    <div class="text-[11px] font-bold text-slate-500"><i class="pi pi-users mr-1"></i> {{ data.total_contatos }}</div>
                  </template>
                </Column>
                <Column field="arr_total" header="Receita Anual (ARR)" sortable align="right">
                  <template #body="{ data }">
                    <span class="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {{ formatarMoeda(data.arr_total) }}
                    </span>
                  </template>
                </Column>
                <Column alignFrozen="right" style="width: 80px">
                  <template #body="{ data }">
                    <Button icon="pi pi-pencil" @click="editarFichaEmpresa(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-orange-50 hover:!text-orange-500 transition-colors" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header>
              <div class="flex items-center gap-2 px-2">
                <i class="pi pi-chart-pie text-emerald-500"></i>
                <span class="font-black tracking-widest uppercase text-[10px]">Segmentos</span>
              </div>
            </template>
            <div class="pt-4">
              <div class="flex justify-end mb-4">
                 <Button label="Novo Segmento" icon="pi pi-plus" @click="abrirNovoSegmento" class="!bg-emerald-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
              </div>

              <DataTable :value="segmentos" :paginator="true" :rows="10" class="p-datatable-sm custom-table" emptyMessage="Nenhum segmento registado.">
                <Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column>
                <Column field="nome" header="Segmento de Mercado" sortable>
                  <template #body="{ data }">
                    <Tag :value="data.nome" class="!bg-slate-100 !text-slate-600 dark:!bg-slate-800 dark:!text-slate-300 !text-[10px] !font-black !uppercase !tracking-widest !px-3" />
                  </template>
                </Column>
                <Column alignFrozen="right" style="width: 80px">
                  <template #body="{ data }">
                    <Button icon="pi pi-pencil" @click="editarFichaSegmento(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-emerald-50 hover:!text-emerald-500 transition-colors" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header>
              <div class="flex items-center gap-2 px-2">
                <i class="pi pi-id-card text-rose-500"></i>
                <span class="font-black tracking-widest uppercase text-[10px]">Perfis</span>
              </div>
            </template>
            <div class="pt-4">
              <div class="flex justify-end mb-4">
                 <Button label="Novo Perfil" icon="pi pi-plus" @click="abrirNovoPerfil" class="!bg-rose-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
              </div>

              <DataTable :value="perfis" :paginator="true" :rows="10" class="p-datatable-sm custom-table" emptyMessage="Nenhum perfil registado.">
                <Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column>
                <Column field="nome" header="Papel na Conta" sortable>
                  <template #body="{ data }">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <i class="pi pi-user text-rose-500"></i> {{ data.nome }}
                    </span>
                  </template>
                </Column>
                <Column alignFrozen="right" style="width: 80px">
                  <template #body="{ data }">
                    <Button icon="pi pi-pencil" @click="editarFichaPerfil(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-rose-50 hover:!text-rose-500 transition-colors" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header>
              <div class="flex items-center gap-2 px-2">
                <i class="pi pi-briefcase text-purple-500"></i>
                <span class="font-black tracking-widest uppercase text-[10px]">Cargos</span>
              </div>
            </template>
            <div class="pt-4">
              <div class="flex justify-end mb-4">
                 <Button label="Novo Cargo" icon="pi pi-plus" @click="abrirNovoCargo" class="!bg-purple-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105 transition-transform" />
              </div>

              <DataTable :value="cargos" :paginator="true" :rows="10" class="p-datatable-sm custom-table" emptyMessage="Nenhum cargo registado.">
                <Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column>
                <Column field="nome" header="Cargo / Função" sortable>
                  <template #body="{ data }">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <i class="pi pi-briefcase text-purple-500"></i> {{ data.nome }}
                    </span>
                  </template>
                </Column>
                <Column alignFrozen="right" style="width: 80px">
                  <template #body="{ data }">
                    <Button icon="pi pi-pencil" @click="editarFichaCargo(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-purple-50 hover:!text-purple-500 transition-colors" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

        </TabView>
      </div>

      <Dialog v-model:visible="dialogVisivel" :header="editando ? 'Editar Pessoa' : 'Nova Pessoa'" modal :style="{width: '450px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo *</label>
            <InputText v-model="cliente.nome" class="custom-input w-full" placeholder="Ex: João Silva" />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail Corporativo *</label>
            <InputText v-model="cliente.email" type="email" class="custom-input w-full" placeholder="joao@empresa.com" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Telefone</label>
            <InputText v-model="cliente.telefone" class="custom-input w-full" placeholder="+351 900 000 000" />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Conta (Empresa)</label>
            <Dropdown v-model="cliente.empresa" :options="empresas" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Perfil</label>
            <Dropdown v-model="cliente.perfil_decisor" :options="perfis" optionLabel="nome" optionValue="nome" editable placeholder="Selecione ou digite" class="custom-dropdown w-full" />
          </div>
          
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Cargo *</label>
            <Dropdown v-model="cliente.cargo" :options="cargos" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
          </div>
        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full">
            <Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="dialogVisivel = false" />
            <Button :label="editando ? 'Guardar' : 'Adicionar'" :loading="saving" class="flex-1 !bg-indigo-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg hover:scale-[1.02] transition-transform border-none py-3" @click="salvarCliente" />
          </div>
        </template>
      </Dialog>

      <Dialog v-model:visible="dialogExclusao" header="Confirmar Exclusão" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900 text-center flex flex-col items-center">
          
          <div class="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mb-4">
            <i class="pi pi-exclamation-triangle text-rose-500 text-3xl"></i>
          </div>
          
          <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">
            Tem a certeza absoluta que deseja excluir esta pessoa?
          </p>
          <p class="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">
            Esta ação não poderá ser desfeita.
          </p>

        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full">
            <Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="dialogExclusao = false" />
            <Button label="Sim, confirmo!" :loading="excluindo" @click="executarExclusao" class="flex-1 !bg-rose-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg shadow-rose-500/30 hover:scale-[1.02] transition-transform border-none py-3" />
          </div>
        </template>
      </Dialog>

      <Dialog v-model:visible="dialogEmpresa" :header="editandoEmpresa ? 'Editar Conta' : 'Nova Conta'" modal :style="{width: '450px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome da Empresa *</label>
            <InputText v-model="empresaForm.nome" class="custom-input w-full" placeholder="Ex: Microsoft Portugal" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Segmento de Mercado</label>
            <Dropdown v-model="empresaForm.segmento" :options="opcoesSegmento" placeholder="Selecione" class="custom-dropdown w-full" />
          </div>
          <div class="flex flex-col gap-1.5 pt-2">
            <label class="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 ml-1 flex items-center gap-1">
              <i class="pi pi-euro"></i> Valor Anual do Contrato (ARR)
            </label>
            <InputNumber v-model="empresaForm.valor_contrato" mode="currency" currency="EUR" locale="pt-PT" class="w-full" inputClass="custom-input w-full !text-lg !font-black !text-emerald-600 dark:!text-emerald-400 !bg-emerald-50 dark:!bg-emerald-900/10" />
          </div>
        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900">
            <Button :label="editandoEmpresa ? 'Atualizar Conta' : 'Criar Conta'" @click="salvarEmpresa" :loading="saving" class="w-full !bg-orange-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" />
          </div>
        </template>
      </Dialog>

      <Dialog v-model:visible="dialogSegmento" :header="editandoSegmento ? 'Editar Segmento' : 'Novo Segmento'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Segmento *</label>
            <InputText v-model="segmentoForm.nome" class="custom-input w-full" placeholder="Ex: Tecnologia" />
          </div>
        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900">
            <Button :label="editandoSegmento ? 'Atualizar Segmento' : 'Criar Segmento'" @click="salvarSegmento" :loading="saving" class="w-full !bg-emerald-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" />
          </div>
        </template>
      </Dialog>

      <Dialog v-model:visible="dialogPerfil" :header="editandoPerfil ? 'Editar Perfil' : 'Novo Perfil'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Perfil *</label>
            <InputText v-model="perfilForm.nome" class="custom-input w-full" placeholder="Ex: Decisor" />
          </div>
        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900">
            <Button :label="editandoPerfil ? 'Atualizar Perfil' : 'Criar Perfil'" @click="salvarPerfil" :loading="saving" class="w-full !bg-rose-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" />
          </div>
        </template>
      </Dialog>

      <Dialog v-model:visible="dialogCargo" :header="editandoCargo ? 'Editar Cargo' : 'Novo Cargo'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Cargo *</label>
            <InputText v-model="cargoForm.nome" class="custom-input w-full" placeholder="Ex: Diretor de Vendas" />
          </div>
        </div>
        <template #footer>
          <div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900">
            <Button :label="editandoCargo ? 'Atualizar Cargo' : 'Criar Cargo'" @click="salvarCargo" :loading="saving" class="w-full !bg-purple-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" />
          </div>
        </template>
      </Dialog>

    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* ==========================================
   🌟 O SEGREDO: Abas Transparentes
   Isto impede que o branco das abas fure a tabela, sem forçar cores nas linhas!
   ========================================== */
:deep(.p-tabview-panels), :deep(.p-tabview-panel) {
  @apply bg-transparent !important;
  padding: 0 !important;
}

/* ==========================================
   🌟 Tabela PrimeVue (IDÊNTICO À AUDIÊNCIA)
   Usa apenas o "dark:bg-slate-900" (Azul escuro do Tailwind)
   ========================================== */
:deep(.p-datatable .p-datatable-thead > tr > th) { 
  @apply bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4; 
}

:deep(.p-datatable .p-datatable-tbody > tr) { 
  @apply bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300; 
}

:deep(.p-datatable .p-datatable-tbody > tr > td) { 
  @apply py-4 px-4; 
}

:deep(.p-datatable .p-datatable-emptymessage > td) {
  @apply bg-white dark:bg-slate-900 text-center text-slate-400 py-8 text-sm font-medium;
}

/* ==========================================
   🌟 Inputs, Dropdowns e Modais (IDÊNTICO À AUDIÊNCIA)
   ========================================== */
:deep(.custom-input), :deep(.p-dropdown.custom-dropdown) { 
  @apply bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium !important; 
}
:deep(.p-dropdown.custom-dropdown .p-dropdown-trigger),
:deep(.p-dropdown.custom-dropdown .p-dropdown-trigger-icon),
:deep(.p-dropdown.custom-dropdown .p-dropdown-trigger svg) { 
  @apply text-slate-400 dark:text-slate-400 !important; 
}
:deep(.p-dropdown.custom-dropdown .p-dropdown-label) { 
  @apply bg-transparent py-0 text-xs text-slate-700 dark:text-slate-200 !important; 
}
:deep(.custom-dropdown.w-full) { @apply flex items-center px-1; }
:deep(.p-dropdown-panel) { @apply dark:bg-slate-800 dark:border-slate-700 !important; }
:deep(.p-dropdown-panel .p-dropdown-item) { @apply dark:text-slate-300 hover:dark:bg-slate-700 !important; }
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight) { @apply dark:bg-orange-500/20 dark:text-orange-500 !important; }

/* ==========================================
   🌟 Customização dos Modais (Dialog) e Tabs Header
   ========================================== */
:deep(.custom-dialog .p-dialog-header) { @apply bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-6; }
:deep(.custom-dialog .p-dialog-content) { @apply dark:bg-slate-900; }
:deep(.custom-dialog .p-dialog-title) { @apply text-lg font-black italic tracking-tight text-slate-800 dark:text-white; }

:deep(.custom-tabview .p-tabview-nav) { @apply bg-transparent border-none flex flex-wrap gap-2 mb-4 p-2; }
:deep(.custom-tabview .p-tabview-nav li .p-tabview-nav-link) { @apply bg-slate-50 dark:bg-slate-800/50 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 outline-none shadow-sm; }
:deep(.custom-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link) { @apply bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md transform scale-[1.02]; }
</style>
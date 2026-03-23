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
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';

const toast = useToast();
const saving = ref(false);

const clientes = ref([]);
const empresas = ref([]);
const segmentos = ref([]);
const perfis = ref([]);
const cargos = ref([]); 
const gestores = ref([]); 
const loading = ref(true);

const dialogVisivel = ref(false);
const editando = ref(false);
const dialogExclusao = ref(false);
const idParaExcluir = ref(null);
const excluindo = ref(false);

const cliente = ref({
  cliente_id: null, nome: '', email: '', telefone: '', empresa: '', perfil_decisor: null, cargo: null
});

const dialogEmpresa = ref(false);
const editandoEmpresa = ref(false);
const empresaForm = ref({
  id: null, nome: '', segmento: null, valor_contrato: 0, gestor: null 
});

const dialogSegmento = ref(false);
const editandoSegmento = ref(false);
const segmentoForm = ref({ id: null, nome: '' });

const dialogPerfil = ref(false);
const editandoPerfil = ref(false);
const perfilForm = ref({ id: null, nome: '' });

const dialogCargo = ref(false);
const editandoCargo = ref(false);
const cargoForm = ref({ id: null, nome: '' });

const dialogGestor = ref(false);
const editandoGestor = ref(false);
const gestorForm = ref({ id: null, nome: '', papel: '', email: '' });

const carregarTudo = async () => {
  loading.value = true;
  try {
    const [resCli, resEmp, resSeg, resPerf, resCargos, resGestores] = await Promise.all([
      api.get('/clientes'), api.get('/cadastros/empresas'), api.get('/cadastros/segmentos'),
      api.get('/cadastros/perfis'), api.get('/cadastros/cargos'), api.get('/cadastros/gestores') 
    ]);
    
    clientes.value = resCli.data; empresas.value = resEmp.data;
    segmentos.value = resSeg.data; perfis.value = resPerf.data;
    cargos.value = resCargos.data; gestores.value = resGestores.data;
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao carregar dados.' }); } 
  finally { loading.value = false; }
};

const abrirNovo = () => { cliente.value = { cliente_id: null, nome: '', email: '', telefone: '', empresa: '', perfil_decisor: null, cargo: null }; editando.value = false; dialogVisivel.value = true; };
const editarCliente = (dados) => { cliente.value = { ...dados }; editando.value = true; dialogVisivel.value = true; };

const salvarCliente = async () => {
  if (!cliente.value.nome || !cliente.value.email || !cliente.value.cargo) {
    toast.add({ severity: 'warn', summary: 'Campos Obrigatórios', detail: 'Por favor, preencha o Nome, E-mail e Cargo.', life: 4000 });
    return;
  }
  
  saving.value = true;
  try {
    if (editando.value) {
      await api.put(`/clientes/${cliente.value.cliente_id || cliente.value.id}`, cliente.value);
    } else {
      await api.post('/clientes', cliente.value);
    }
    
    dialogVisivel.value = false; 
    carregarTudo();
    toast.add({ severity: 'success', summary: 'Atualizado', detail: 'Pessoa salva com sucesso.', life: 3000 });
  } catch (error) { 
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao guardar os dados.', life: 3000 }); 
  } finally { 
    saving.value = false; 
  }
};

const confirmarExclusao = (id) => { idParaExcluir.value = id; dialogExclusao.value = true; };
const executarExclusao = async () => {
  excluindo.value = true;
  try { 
    await api.delete(`/clientes/${idParaExcluir.value}`); 
    toast.add({ severity: 'success', summary: 'Removido', detail: 'Pessoa excluída.' }); 
    dialogExclusao.value = false; carregarTudo(); 
  } catch (error) { toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao excluir.' }); } 
  finally { excluindo.value = false; idParaExcluir.value = null; }
};

const abrirNovaEmpresa = () => { empresaForm.value = { id: null, nome: '', segmento: null, valor_contrato: 0, gestor: null }; editandoEmpresa.value = false; dialogEmpresa.value = true; };
const editarFichaEmpresa = (dados) => { 
  empresaForm.value = { 
    id: dados.id, 
    nome: dados.nome, 
    segmento: dados.segmento, 
    valor_contrato: dados.arr_total || 0, 
    gestor: gestores.value.find(g => g.nome === dados.gestor) || null
  }; 
  editandoEmpresa.value = true; 
  dialogEmpresa.value = true; 
};

const salvarEmpresa = async () => {
  saving.value = true;
  const payload = {
    nome: empresaForm.value.nome,
    segmento: empresaForm.value.segmento,
    valor_contrato: empresaForm.value.valor_contrato,
    gestor: empresaForm.value.gestor ? empresaForm.value.gestor.nome : null,
    gestor_id: empresaForm.value.gestor ? empresaForm.value.gestor.id : null
  };

  try {
    const url = editandoEmpresa.value ? `/cadastros/empresas/${empresaForm.value.id}` : '/cadastros/empresas';
    const metodo = editandoEmpresa.value ? 'put' : 'post';
    await api[metodo](url, payload);
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Conta salva com sucesso!' });
    dialogEmpresa.value = false;
    carregarTudo(); 
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao comunicar com o servidor.' });
  } finally {
    saving.value = false;
  }
};

const abrirNovoSegmento = () => { segmentoForm.value = { id: null, nome: '' }; editandoSegmento.value = false; dialogSegmento.value = true; };
const editarFichaSegmento = (dados) => { segmentoForm.value = { ...dados }; editandoSegmento.value = true; dialogSegmento.value = true; };
const salvarSegmento = async () => {
  if (!segmentoForm.value.nome) return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O nome do segmento é obrigatório.', life: 3000 });
  saving.value = true;
  try {
    if (editandoSegmento.value) await api.put(`/cadastros/segmentos/${segmentoForm.value.id}`, segmentoForm.value);
    else await api.post('/cadastros/segmentos', segmentoForm.value);
    dialogSegmento.value = false; carregarTudo();
  } catch (e) {} finally { saving.value = false; }
};

const abrirNovoPerfil = () => { perfilForm.value = { id: null, nome: '' }; editandoPerfil.value = false; dialogPerfil.value = true; };
const editarFichaPerfil = (dados) => { perfilForm.value = { ...dados }; editandoPerfil.value = true; dialogPerfil.value = true; };
const salvarPerfil = async () => {
  if (!perfilForm.value.nome) return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O nome do perfil é obrigatório.', life: 3000 });
  saving.value = true;
  try {
    if (editandoPerfil.value) await api.put(`/cadastros/perfis/${perfilForm.value.id}`, perfilForm.value);
    else await api.post('/cadastros/perfis', perfilForm.value);
    dialogPerfil.value = false; carregarTudo();
  } catch (e) {} finally { saving.value = false; }
};

const abrirNovoCargo = () => { cargoForm.value = { id: null, nome: '' }; editandoCargo.value = false; dialogCargo.value = true; };
const editarFichaCargo = (dados) => { cargoForm.value = { ...dados }; editandoCargo.value = true; dialogCargo.value = true; };
const salvarCargo = async () => {
  if (!cargoForm.value.nome) return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O nome do cargo é obrigatório.', life: 3000 });
  saving.value = true;
  try {
    if (editandoCargo.value) await api.put(`/cadastros/cargos/${cargoForm.value.id}`, cargoForm.value);
    else await api.post('/cadastros/cargos', cargoForm.value);
    dialogCargo.value = false; carregarTudo();
  } catch (e) {} finally { saving.value = false; }
};

const abrirNovoGestor = () => { gestorForm.value = { id: null, nome: '', papel: '', email: '' }; editandoGestor.value = false; dialogGestor.value = true; };
const editarFichaGestor = (dados) => { gestorForm.value = { ...dados }; editandoGestor.value = true; dialogGestor.value = true; };
const salvarGestor = async () => {
  if (!gestorForm.value.nome) return toast.add({ severity: 'warn', summary: 'Atenção', detail: 'O nome do gestor é obrigatório.', life: 3000 });
  saving.value = true;
  try {
    if (editandoGestor.value) await api.put(`/cadastros/gestores/${gestorForm.value.id}`, gestorForm.value);
    else await api.post('/cadastros/gestores', gestorForm.value);
    dialogGestor.value = false; carregarTudo();
    toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Gestor salvo.' });
  } catch (e) {} finally { saving.value = false; }
};

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor || 0);
const getIniciais = (nome) => nome ? nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CL';

// 🌟 FUNÇÃO QUE CRUZA A EMPRESA COM O GESTOR
const getGestorPorEmpresa = (nomeEmpresa) => {
  if (!nomeEmpresa || nomeEmpresa === '-') return 'Sem Empresa';
  const emp = empresas.value.find(e => e.nome === nomeEmpresa);
  if (emp && emp.gestor) {
    return typeof emp.gestor === 'object' ? emp.gestor.nome : emp.gestor;
  }
  return 'Não definido';
};

onMounted(carregarTudo);
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 lg:p-8">
    <div class="max-w-[1600px] mx-auto space-y-8 animate-fadein">
      
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-4xl font-black tracking-tighter italic text-slate-900 dark:text-white">Contas <span class="text-orange-500">.</span></h1>
          <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Gestão de Contas e Receita</p>
        </div>
        <Button icon="pi pi-refresh" @click="carregarTudo" :loading="loading" class="w-10 h-10 !bg-white dark:!bg-slate-900 !text-slate-600 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700 !rounded-xl shadow-sm hover:!bg-slate-50" />
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden p-2 sm:p-4">
        <TabView class="custom-tabview">
          
          <TabPanel>
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-users text-indigo-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Pessoas</span></div></template>
            <div class="pt-4">
              <div class="flex justify-end mb-4"><Button label="Nova Pessoa" icon="pi pi-plus" @click="abrirNovo" class="!bg-indigo-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div>
              
              <DataTable :value="clientes" :paginator="true" :rows="10" dataKey="cliente_id" :loading="loading" class="p-datatable-sm custom-table" rowHover>
                
                <Column header="Pessoa" sortable field="nome" style="min-width: 250px">
                  <template #body="{ data }">
                    <div class="flex items-center gap-4 py-2">
                      <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-500 border border-slate-100 dark:border-slate-700 shrink-0">{{ getIniciais(data.nome) }}</div>
                      <div class="flex flex-col"><span class="text-[13px] font-black text-slate-800 dark:text-white">{{ data.nome }}</span><span class="text-[10px] text-slate-400 font-medium">{{ data.email }}</span></div>
                    </div>
                  </template>
                </Column>
                
                <Column header="Conta (Empresa)" sortable field="empresa">
                  <template #body="{ data }">
                    <div class="flex flex-col">
                      <span class="text-[12px] font-bold text-slate-600 dark:text-slate-300">{{ data.empresa || '-' }}</span>
                      <span v-if="data.cargo" class="text-[9px] text-slate-400 uppercase tracking-tighter mt-0.5">{{ data.cargo }}</span>
                    </div>
                  </template>
                </Column>

                <Column header="Gestor (Responsável)">
                  <template #body="slotProps">
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <i class="pi pi-shield text-slate-400 text-[10px]"></i>
                        <span class="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                          {{ getGestorPorEmpresa(slotProps.data.empresa) }}
                        </span>
                      </div>
                      <span class="text-[9px] text-slate-400 uppercase font-black tracking-tighter mt-1">
                        Vinculado via Empresa
                      </span>
                    </div>
                  </template>
                </Column>

                <Column header="Perfil">
                  <template #body="{ data }"><div v-if="data.perfil_decisor" class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight"><i :class="data.perfil_decisor === 'Decisor' ? 'pi pi-star-fill text-orange-500' : 'pi pi-user'"></i> {{ data.perfil_decisor }}</div></template>
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
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-building text-orange-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Empresas</span></div></template>
            <div class="pt-4">
              <div class="flex justify-end mb-4"><Button label="Nova Empresa" icon="pi pi-plus" @click="abrirNovaEmpresa" class="!bg-orange-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div>
              <DataTable :value="empresas" :paginator="true" :rows="10" class="p-datatable-sm custom-table">
                <Column field="nome" header="Conta" sortable>
                  <template #body="{ data }"><span class="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3"><div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500"><i class="pi pi-building text-xs"></i></div>{{ data.nome }}</span></template>
                </Column>
                <Column field="gestor" header="Gestor">
                  <template #body="{ data }">
                    <span v-if="data.gestor" class="text-[10px] font-bold text-sky-600 dark:text-sky-400"><i class="pi pi-briefcase text-xs mr-1"></i> {{ typeof data.gestor === 'object' ? data.gestor.nome : data.gestor }}</span>
                    <span v-else class="text-[10px] text-slate-400 italic">Não associado</span>
                  </template>
                </Column>
                <Column field="segmento" header="Segmento">
                  <template #body="{ data }"><Tag v-if="data.segmento" :value="data.segmento" class="!bg-slate-100 !text-slate-600 dark:!bg-slate-800 dark:!text-slate-300 !text-[9px] !font-black !uppercase !tracking-widest !px-3" /></template>
                </Column>
                <Column field="total_contatos" header="Pessoas" sortable align="center">
                  <template #body="{ data }"><div class="text-[11px] font-bold text-slate-500"><i class="pi pi-users mr-1"></i> {{ data.total_contatos }}</div></template>
                </Column>
                <Column field="arr_total" header="Receita Anual" sortable align="right">
                  <template #body="{ data }"><span class="text-sm font-black text-emerald-600 dark:text-emerald-400">{{ formatarMoeda(data.arr_total) }}</span></template>
                </Column>
                <Column alignFrozen="right" style="width: 80px">
                  <template #body="{ data }"><Button icon="pi pi-pencil" @click="editarFichaEmpresa(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-orange-50 hover:!text-orange-500" /></template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-star-fill text-sky-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Gestores</span></div></template>
            <div class="pt-4">
              <div class="flex justify-end mb-4"><Button label="Novo Gestor" icon="pi pi-plus" @click="abrirNovoGestor" class="!bg-sky-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div>
              <DataTable :value="gestores" :paginator="true" :rows="10" class="p-datatable-sm custom-table">
                <Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column>
                <Column field="nome" header="Nome" sortable><template #body="{ data }"><span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i class="pi pi-user text-sky-500"></i> {{ data.nome }}</span></template></Column>
                <Column field="papel" header="Papel / Função"><template #body="{ data }"><span class="text-[11px] font-medium text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">{{ data.papel || 'Não definido' }}</span></template></Column>
                <Column field="email" header="E-mail"><template #body="{ data }"><span class="text-[11px] font-medium text-slate-400">{{ data.email || 'Sem e-mail' }}</span></template></Column>
                <Column alignFrozen="right" style="width: 80px"><template #body="{ data }"><Button icon="pi pi-pencil" @click="editarFichaGestor(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-sky-50 hover:!text-sky-500" /></template></Column>
              </DataTable>
            </div>
          </TabPanel>

          <TabPanel>
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-chart-pie text-emerald-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Segmentos</span></div></template>
            <div class="pt-4"><div class="flex justify-end mb-4"><Button label="Novo Segmento" icon="pi pi-plus" @click="abrirNovoSegmento" class="!bg-emerald-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div><DataTable :value="segmentos" :paginator="true" :rows="10" class="p-datatable-sm custom-table"><Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column><Column field="nome" header="Segmento" sortable><template #body="{ data }"><Tag :value="data.nome" class="!bg-slate-100 !text-slate-600 dark:!bg-slate-800 dark:!text-slate-300 !text-[10px] !font-black !uppercase !tracking-widest !px-3" /></template></Column><Column alignFrozen="right" style="width: 80px"><template #body="{ data }"><Button icon="pi pi-pencil" @click="editarFichaSegmento(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-emerald-50 hover:!text-emerald-500" /></template></Column></DataTable></div>
          </TabPanel>
          <TabPanel>
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-id-card text-rose-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Perfis</span></div></template>
            <div class="pt-4"><div class="flex justify-end mb-4"><Button label="Novo Perfil" icon="pi pi-plus" @click="abrirNovoPerfil" class="!bg-rose-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div><DataTable :value="perfis" :paginator="true" :rows="10" class="p-datatable-sm custom-table"><Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column><Column field="nome" header="Papel na Conta" sortable><template #body="{ data }"><span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i class="pi pi-user text-rose-500"></i> {{ data.nome }}</span></template></Column><Column alignFrozen="right" style="width: 80px"><template #body="{ data }"><Button icon="pi pi-pencil" @click="editarFichaPerfil(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-rose-50 hover:!text-rose-500" /></template></Column></DataTable></div>
          </TabPanel>
          <TabPanel>
            <template #header><div class="flex items-center gap-2 px-2"><i class="pi pi-briefcase text-purple-500"></i><span class="font-black tracking-widest uppercase text-[10px]">Cargos</span></div></template>
            <div class="pt-4"><div class="flex justify-end mb-4"><Button label="Novo Cargo" icon="pi pi-plus" @click="abrirNovoCargo" class="!bg-purple-500 !text-white !border-none !rounded-xl !text-[10px] !font-black !uppercase !tracking-widest !px-6 shadow-xl hover:scale-105" /></div><DataTable :value="cargos" :paginator="true" :rows="10" class="p-datatable-sm custom-table"><Column field="id" header="ID" style="width: 80px" class="text-slate-400 text-xs font-bold"></Column><Column field="nome" header="Cargo" sortable><template #body="{ data }"><span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><i class="pi pi-briefcase text-purple-500"></i> {{ data.nome }}</span></template></Column><Column alignFrozen="right" style="width: 80px"><template #body="{ data }"><Button icon="pi pi-pencil" @click="editarFichaCargo(data)" class="w-8 h-8 !bg-slate-50 dark:!bg-slate-800 !text-slate-400 !border-none !text-[10px] rounded-lg hover:!bg-purple-50 hover:!text-purple-500" /></template></Column></DataTable></div>
          </TabPanel>

        </TabView>
      </div>

      <Dialog v-model:visible="dialogVisivel" :header="editando ? 'Editar Pessoa' : 'Nova Pessoa'" modal :style="{width: '550px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5 md:col-span-2"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome Completo *</label><InputText v-model="cliente.nome" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail *</label><InputText v-model="cliente.email" type="email" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Telefone</label><InputText v-model="cliente.telefone" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5 md:col-span-2"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Conta (Empresa)</label><Dropdown v-model="cliente.empresa" :options="empresas" optionLabel="nome" optionValue="nome" editable filter class="custom-dropdown w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Perfil</label><Dropdown v-model="cliente.perfil_decisor" :options="perfis" optionLabel="nome" optionValue="nome" editable class="custom-dropdown w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Cargo *</label><Dropdown v-model="cliente.cargo" :options="cargos" optionLabel="nome" optionValue="nome" editable filter class="custom-dropdown w-full" /></div>
        </div>
        <template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full"><Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="dialogVisivel = false" /><Button :label="editando ? 'Guardar' : 'Adicionar'" :loading="saving" class="flex-1 !bg-indigo-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg border-none py-3" @click="salvarCliente" /></div></template>
      </Dialog>

      <Dialog v-model:visible="dialogEmpresa" :header="editandoEmpresa ? 'Editar Conta' : 'Nova Conta'" modal :style="{width: '450px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome da Empresa *</label><InputText v-model="empresaForm.nome" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase text-slate-500 ml-1">Segmento de Mercado</label>
            <Dropdown v-model="empresaForm.segmento" :options="segmentos" optionLabel="nome" optionValue="nome" editable filter placeholder="Selecione ou digite" class="custom-dropdown w-full" />
          </div>
          
          <div class="flex flex-col gap-1.5 pt-2">
            <label class="text-[10px] font-black uppercase text-sky-500 ml-1">
              <i class="pi pi-star-fill text-[8px]"></i> Pessoa de Contacto (Gestor)
            </label>
            <Dropdown 
              v-model="empresaForm.gestor" 
              :options="gestores" 
              optionLabel="nome" 
              placeholder="Selecione o Gestor" 
              filter
              class="custom-dropdown w-full" 
            />
          </div>

          <div class="flex flex-col gap-1.5 pt-2">
            <label class="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 ml-1 flex items-center gap-1"><i class="pi pi-euro"></i> Valor Anual do Contrato (ARR)</label>
            <InputNumber v-model="empresaForm.valor_contrato" mode="currency" currency="EUR" locale="pt-PT" class="w-full" inputClass="custom-input w-full !text-lg !font-black !text-emerald-600 dark:!text-emerald-400 !bg-emerald-50 dark:!bg-emerald-900/10" />
          </div>
        </div>
        <template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900"><Button :label="editandoEmpresa ? 'Atualizar Conta' : 'Criar Conta'" @click="salvarEmpresa" :loading="saving" class="w-full !bg-orange-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl" /></div></template>
      </Dialog>

      <Dialog v-model:visible="dialogGestor" :header="editandoGestor ? 'Editar Gestor' : 'Novo Gestor'" modal :style="{width: '500px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 grid grid-cols-1 gap-4 bg-slate-50/50 dark:bg-slate-900">
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Gestor *</label><InputText v-model="gestorForm.nome" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Papel / Função</label><InputText v-model="gestorForm.papel" class="custom-input w-full" /></div>
          <div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">E-mail de Contacto</label><InputText v-model="gestorForm.email" type="email" class="custom-input w-full" /></div>
        </div>
        <template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full"><Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="dialogGestor = false" /><Button :label="editandoGestor ? 'Atualizar' : 'Criar'" @click="salvarGestor" :loading="saving" class="flex-1 !bg-sky-500 !text-white py-3 !rounded-xl font-bold text-[11px] uppercase tracking-widest shadow-xl border-none" /></div></template>
      </Dialog>

      <Dialog v-model:visible="dialogExclusao" header="Confirmar Exclusão" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog">
        <div class="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900 text-center flex flex-col items-center">
          <div class="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center mb-4"><i class="pi pi-exclamation-triangle text-rose-500 text-3xl"></i></div>
          <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">Tem a certeza absoluta que deseja excluir esta pessoa?</p>
          <p class="text-slate-500 dark:text-slate-400 text-xs mt-2 font-medium">Esta ação não poderá ser desfeita.</p>
        </div>
        <template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900 flex gap-3 w-full"><Button label="Cancelar" text class="flex-1 font-bold text-[11px] text-slate-400" @click="dialogExclusao = false" /><Button label="Sim, confirmo!" :loading="excluindo" @click="executarExclusao" class="flex-1 !bg-rose-500 !text-white !rounded-xl font-bold text-[11px] shadow-lg border-none py-3" /></div></template>
      </Dialog>

      <Dialog v-model:visible="dialogSegmento" :header="editandoSegmento ? 'Editar Segmento' : 'Novo Segmento'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog"><div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900"><div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Segmento *</label><InputText v-model="segmentoForm.nome" class="custom-input w-full" /></div></div><template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900"><Button :label="editandoSegmento ? 'Atualizar Segmento' : 'Criar Segmento'" @click="salvarSegmento" :loading="saving" class="w-full !bg-emerald-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" /></div></template></Dialog>
      <Dialog v-model:visible="dialogPerfil" :header="editandoPerfil ? 'Editar Perfil' : 'Novo Perfil'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog"><div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900"><div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Perfil *</label><InputText v-model="perfilForm.nome" class="custom-input w-full" /></div></div><template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900"><Button :label="editandoPerfil ? 'Atualizar Perfil' : 'Criar Perfil'" @click="salvarPerfil" :loading="saving" class="w-full !bg-rose-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" /></div></template></Dialog>
      <Dialog v-model:visible="dialogCargo" :header="editandoCargo ? 'Editar Cargo' : 'Novo Cargo'" modal :style="{width: '400px'}" class="rounded-[2.5rem] overflow-hidden p-0 custom-dialog"><div class="p-6 md:p-8 space-y-4 bg-slate-50/50 dark:bg-slate-900"><div class="flex flex-col gap-1.5"><label class="text-[10px] font-black uppercase text-slate-500 ml-1">Nome do Cargo *</label><InputText v-model="cargoForm.nome" class="custom-input w-full" /></div></div><template #footer><div class="px-8 pb-8 pt-4 bg-slate-50/50 dark:bg-slate-900"><Button :label="editandoCargo ? 'Atualizar Cargo' : 'Criar Cargo'" @click="salvarCargo" :loading="saving" class="w-full !bg-purple-500 !text-white py-4 !rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-transform" /></div></template></Dialog>
    </div>
  </div>
</template>

<style scoped lang="postcss">
@reference "tailwindcss";
.animate-fadein { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

:deep(.p-tabview-panels), :deep(.p-tabview-panel) { @apply bg-transparent !important; padding: 0 !important; }
:deep(.p-datatable .p-datatable-thead > tr > th) { @apply bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 py-6 px-4; }
:deep(.p-datatable .p-datatable-tbody > tr) { @apply bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300; }
:deep(.p-datatable .p-datatable-tbody > tr > td) { @apply py-4 px-4; }
:deep(.p-datatable .p-datatable-emptymessage > td) { @apply bg-white dark:bg-slate-900 text-center text-slate-400 py-8 text-sm font-medium; }

:deep(.custom-input), :deep(.p-dropdown.custom-dropdown) { @apply bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-medium !important; }
:deep(.p-dropdown.custom-dropdown .p-dropdown-trigger), :deep(.p-dropdown.custom-dropdown .p-dropdown-trigger-icon), :deep(.p-dropdown.custom-dropdown .p-dropdown-trigger svg) { @apply text-slate-400 dark:text-slate-400 !important; }
:deep(.p-dropdown.custom-dropdown .p-dropdown-label) { @apply bg-transparent py-0 text-xs text-slate-700 dark:text-slate-200 !important; }
:deep(.custom-dropdown.w-full) { @apply flex items-center px-1; }
:deep(.p-dropdown-panel) { @apply dark:bg-slate-800 dark:border-slate-700 !important; }
:deep(.p-dropdown-panel .p-dropdown-item) { @apply dark:text-slate-300 hover:dark:bg-slate-700 !important; }
:deep(.p-dropdown-panel .p-dropdown-item.p-highlight) { @apply dark:bg-orange-500/20 dark:text-orange-500 !important; }

:deep(.custom-dialog .p-dialog-header) { @apply bg-slate-50/50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-6; }
:deep(.custom-dialog .p-dialog-content) { @apply dark:bg-slate-900; }
:deep(.custom-dialog .p-dialog-title) { @apply text-lg font-black italic tracking-tight text-slate-800 dark:text-white; }

/* TABS: REMOÇÃO DE MARGENS E FUNDOS */
:deep(.p-tabview), 
:deep(.p-tabview-nav-container), 
:deep(.p-tabview-nav-content), 
:deep(.p-tabview-nav) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
}

:deep(.p-tabview-panels) {
    background: transparent !important;
    padding: 0 !important;   
    margin-top: -10px !important; 
}

:deep(.p-tabview-nav li) {
    background: transparent !important;
    border: none !important;
    margin-right: 6px !important;
    margin-bottom: 0 !important; 
}

:deep(.p-tabview-nav li .p-tabview-nav-link) {
    @apply bg-slate-100 dark:bg-slate-800 text-slate-500 !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 10px 18px !important; 
    transition: all 0.2s ease !important;
}

:deep(.p-tabview-nav li.p-highlight .p-tabview-nav-link) {
    @apply bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md !important;
}

:deep(.p-tabview .p-tabview-nav) {
    border-bottom: none !important;
}
</style>
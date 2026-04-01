import { createRouter, createWebHistory } from 'vue-router';
import AdminLimpezaView from '../views/AdminLimpezaView.vue';

const routes = [
  // ==========================================
  // 🔓 ROTAS PÚBLICAS (Autenticação)
  // ==========================================
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false } 
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/redefinir-senha',
    name: 'redefinir-senha', 
    component: () => import('../views/RedefinirSenhaView.vue'),
    meta: { requiresAuth: false }
  },
  

  // ==========================================
  // 🔒 ROTAS PRIVADAS (Core da Aplicação)
  // ==========================================
{
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, roles: ['Admin', 'Manager', 'Viewer'] } // Todos acedem
  },
  {
    path: '/respostas',
    name: 'Respostas',
    component: () => import('../views/RespostasView.vue'),
    meta: { requiresAuth: true }
  },
{
    path: '/acoes',
    name: 'Acoes',
    component: () => import('../views/AcoesView.vue'),
    meta: { requiresAuth: true, roles: ['Admin', 'Manager', 'Viewer'] } // Viewers apenas leem (bloqueio visual no .vue)
  },
  {
    path: '/audiencia',
    name: 'Audiencia',
    component: () => import('../views/AudienciaView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clientes',
    name: 'Clientes', 
    component: () => import('../views/ClientesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/relatorios',
    name: 'Relatorios',
    component: () => import('../views/RelatoriosView.vue'),
    meta: { requiresAuth: true }
  },

  // ==========================================
  // ⚙️ ROTAS PRIVADAS (Gestão e Sistema)
  // ==========================================
{
    path: '/configuracoes',
    name: 'Configuracoes',
    component: () => import('../views/ConfiguracoesView.vue'),
    meta: { requiresAuth: true, roles: ['Admin'] } // 🚫 APENAS ADMINS
  },
  {
    path: '/importacao',
    name: 'Importacao',
    component: () => import('../views/ImportacaoView.vue'),
    meta: { requiresAuth: true, roles: ['Admin', 'Manager'] } // 🚫 SEM VIEWERS
  },
  {
  path: '/admin/limpeza',
  name: 'limpeza-dados',
  component: AdminLimpezaView,
  meta: { requiresAuth: true } 
  },


  // ==========================================
  // ❌ ROTA FALLBACK (Página não encontrada)
  // ==========================================
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Guardião de Navegação Blindado
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token');
  const usuarioTipo = localStorage.getItem('usuario_tipo') || 'Viewer'; 

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.roles && !to.meta.roles.includes(usuarioTipo)) {
    next('/'); 
  } else {
    next();
  }
});

export default router;
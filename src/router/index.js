import { createRouter, createWebHistory } from 'vue-router';

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
    path: '/reset-password',
    name: 'ResetPassword', 
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
    meta: { requiresAuth: true } 
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
    meta: { requiresAuth: true } // 👈 CORREÇÃO: Faltava a proteção aqui!
  },
  {
    path: '/audiencia',
    name: 'Audiencia',
    component: () => import('../views/AudienciaView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clientes',
    name: 'Clientes', // 👈 CORREÇÃO: Nome padronizado para maiúscula
    component: () => import('../views/ClientesView.vue'), // 👈 CORREÇÃO: Transformado em Lazy Loading
    meta: { requiresAuth: true }
  },
  {
    path: '/relatorios',
    name: 'Relatorios',
    component: () => import('../views/RelatoriosView.vue'), // 👈 CORREÇÃO: Transformado em Lazy Loading
    meta: { requiresAuth: true }
  },

  // ==========================================
  // ⚙️ ROTAS PRIVADAS (Gestão e Sistema)
  // ==========================================
  {
    path: '/importacao',
    name: 'Importacao',
    component: () => import('../views/ImportacaoView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/configuracoes',
    name: 'Configuracoes',
    component: () => import('../views/ConfiguracoesView.vue'),
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

// Guardião de Navegação (Verifica se tem token antes de abrir a página)
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token');

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
import { createRouter, createWebHistory } from 'vue-router';
import ClientesView from '../views/ClientesView.vue';

const routes = [
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
  // 👆 ---------------------- 👆
  {
    path: '/reset-password',
    name: 'ResetPassword', 
    component: () => import('../views/RedefinirSenhaView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true } 
  },
  {
    path: '/audiencia',
    name: 'Audiencia',
    component: () => import('../views/AudienciaView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/respostas',
    name: 'Respostas',
    component: () => import('../views/RespostasView.vue'),
    meta: { requiresAuth: true }
  },
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
  {
    path: '/clientes',
    name: 'clientes',
    component: ClientesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token'); // ou a chave que você usa

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
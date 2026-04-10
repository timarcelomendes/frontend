// src/utils/permissoes.js

export const temPermissao = (permissaoNecessaria) => {
  // 🎯 MUDANÇA VITAL: Trocar localStorage por sessionStorage
  const tipoUtilizador = sessionStorage.getItem('usuario_tipo') || 'Viewer';
  
  // O Admin é o super-utilizador
  if (tipoUtilizador === 'Admin') return true;

  // 🎯 MUDANÇA VITAL: Trocar aqui também
  const permissoesSalvas = sessionStorage.getItem('usuario_permissoes');
  
  if (!permissoesSalvas) return false;

  try {
    const permissoesDoPerfil = JSON.parse(permissoesSalvas);
    return permissoesDoPerfil.includes(permissaoNecessaria) || permissoesDoPerfil.includes('*');
  } catch (e) {
    console.error("Erro ao ler permissões", e);
    return false;
  }
};
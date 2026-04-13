// src/utils/permissoes.js
export const temPermissao = (permissaoNecessaria) => {
  const tipoUtilizador = sessionStorage.getItem('usuario_tipo') || 'Viewer';
  
  if (tipoUtilizador === 'Admin') return true;

  const permissoesSalvas = sessionStorage.getItem('usuario_permissoes');
  if (!permissoesSalvas) return false;

  try {
    const permissoesDoPerfil = JSON.parse(permissoesSalvas);
    return permissoesDoPerfil.includes(permissaoNecessaria) || permissoesDoPerfil.includes('*');
  } catch (e) {
    return false;
  }
};
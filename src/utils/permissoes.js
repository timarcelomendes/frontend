// src/utils/permissoes.js

export const temPermissao = (permissaoNecessaria) => {
  const tipoUtilizador = localStorage.getItem('usuario_tipo') || 'Viewer';
  
  // O Admin é o super-utilizador, tem sempre passe livre
  if (tipoUtilizador === 'Admin') return true;

  // Busca a lista de permissões que vieram da base de dados no Login
  const permissoesSalvas = localStorage.getItem('usuario_permissoes');
  
  if (!permissoesSalvas) return false;

  try {
    const permissoesDoPerfil = JSON.parse(permissoesSalvas);
    
    // Verifica se tem a permissão exata ou o wildcard '*'
    return permissoesDoPerfil.includes(permissaoNecessaria) || permissoesDoPerfil.includes('*');
  } catch (e) {
    console.error("Erro ao ler permissões", e);
    return false;
  }
};
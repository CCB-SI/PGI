export const PALETTE = {
    // Eventos
    'Batismo': '#0288D1',        // Azul escuro vibrante
    'Santa Ceia': '#AD1457',     // Vinho
    'Mocidade': '#388E3C',       // Verde folha
    'Reunião Ministerial': '#455A64', // Cinza azulado
    'RMA': '#455A64',
    'RRM': '#455A64',
    'Ensaio Regional': '#1976D2',// Azul marinho
    'Culto': '#616161',          // Cinza padrão
    'GEM': '#00796B',            // Verde escuro
    'Ensaio local': '#F57C00',   // Laranja
    'Culto para Mocidade': '#2E7D32',
    'Reunião para Mocidade': '#2E7D32',
    'Reunião de Conselhos/Oficialização': '#512DA8', // Roxo

    // Cargos Ministeriais
    'Ancião': '#5D4037',         // Marrom escuro
    'Diácono': '#1976D2',        // Azul 
    'Cooperador': '#388E3C',     // Verde
    'Encarregado Regional': '#D32F2F', // Vermelho
    'Encarregado Local': '#E64A19', // Laranja Escuro
    'Examinadora': '#C2185B',    // Rosa escuro
    'Cooperador de Jovens': '#0288D1',
    'Secretário': '#607D8B',

    // Fallbacks
    'Ministerial': '#f44336',    // Vermelho p/ Confidenciais
    'Público': '#4CAF50',        // Verde
    'Geral': '#1a4d8f'           // Primária do sistema
};

export const getColorForTerm = (term, fallbackHex) => {
    // Se a string já for um HEX, retorna ela.
    if (term && term.startsWith('#')) return term;

    // Busca na paleta ou retorna o fallback, ou a cor padrão do sistema.
    return PALETTE[term] || fallbackHex || '#1a4d8f';
};

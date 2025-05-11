/**
 * Utilitaires de formatage
 * -------------------------------------------------
 * Fonctions pour formater les données
 */

/**
 * Formate un montant en devise
 * @param {number} amount - Montant à formatter
 * @param {string} currency - Code de devise (défaut: EUR)
 * @returns {string} - Montant formaté
 */
const formatCurrency = (amount, currency = 'EUR') => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Formate un pourcentage
 * @param {number} value - Valeur à formatter
 * @param {number} decimals - Nombre de décimales
 * @returns {string} - Pourcentage formaté
 */
const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Formate une date
 * @param {string|Date} date - Date à formatter
 * @param {Object} options - Options de formatage
 * @returns {string} - Date formatée
 */
const formatDate = (date, options = {}) => {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return new Intl.DateTimeFormat('fr-FR', {
    ...defaultOptions,
    ...options
  }).format(dateObj);
};

/**
 * Formate un texte pour l'affichage (tronque si trop long)
 * @param {string} text - Texte à formatter
 * @param {number} maxLength - Longueur maximale
 * @returns {string} - Texte formaté
 */
const formatText = (text, maxLength = 100) => {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Formate des données pour l'API
 */
const formatForAPI = {
  /**
   * Formate les données d'un prompt pour l'API
   * @param {Object} promptData - Données du prompt
   * @returns {Object} - Données formatées
   */
  prompt: (promptData) => {
    const {
      title,
      description,
      prompt_text,
      price,
      category,
      tags,
      image_url
    } = promptData;
    
    return {
      title: title.trim(),
      description: description.trim(),
      prompt_text: prompt_text.trim(),
      price: Math.round(parseFloat(price)),
      category: category.toLowerCase().trim(),
      tags: tags.map(tag => tag.toLowerCase().trim()),
      image_url: image_url || null
    };
  },
  
  /**
   * Formate les données d'un bundle pour l'API
   * @param {Object} bundleData - Données du bundle
   * @returns {Object} - Données formatées
   */
  bundle: (bundleData) => {
    const {
      name,
      description,
      prompt_ids,
      price,
      original_price
    } = bundleData;
    
    return {
      name: name.trim(),
      description: description.trim(),
      prompt_ids: Array.isArray(prompt_ids) ? prompt_ids : [prompt_ids],
      price: Math.round(parseFloat(price)),
      original_price: Math.round(parseFloat(original_price))
    };
  },
  
  /**
   * Formate les données d'une promotion pour l'API
   * @param {Object} promotionData - Données de la promotion
   * @returns {Object} - Données formatées
   */
  promotion: (promotionData) => {
    const {
      name,
      description,
      prompt_ids,
      discount_percentage,
      start_time,
      end_time
    } = promotionData;
    
    return {
      name: name.trim(),
      description: description ? description.trim() : null,
      prompt_ids: Array.isArray(prompt_ids) ? prompt_ids : [prompt_ids],
      discount_percentage: Math.min(Math.round(parseFloat(discount_percentage)), 90), // Max 90% de remise
      start_time: start_time,
      end_time: end_time
    };
  }
};

/**
 * Formate un tableau pour affichage dans la console
 * @param {Array} data - Données à afficher
 * @param {Array} columns - Colonnes à afficher
 * @returns {string} - Tableau formaté
 */
const formatTableForConsole = (data, columns) => {
  if (!data || data.length === 0) {
    return 'No data to display';
  }
  
  // Déterminer la largeur maximale pour chaque colonne
  const columnWidths = {};
  
  // Initialiser avec la longueur des noms de colonnes
  columns.forEach(column => {
    columnWidths[column.key] = column.label.length;
  });
  
  // Trouver la largeur maximale pour chaque colonne
  data.forEach(row => {
    columns.forEach(column => {
      const value = column.formatter ? column.formatter(row[column.key]) : String(row[column.key] || '');
      columnWidths[column.key] = Math.max(columnWidths[column.key], value.length);
    });
  });
  
  // Créer la ligne d'en-tête
  let table = columns.map(column => {
    return column.label.padEnd(columnWidths[column.key]);
  }).join(' | ');
  
  // Créer la ligne de séparation
  table += '\n' + columns.map(column => {
    return '-'.repeat(columnWidths[column.key]);
  }).join('-+-');
  
  // Ajouter les lignes de données
  data.forEach(row => {
    table += '\n' + columns.map(column => {
      const value = column.formatter ? column.formatter(row[column.key]) : String(row[column.key] || '');
      return value.padEnd(columnWidths[column.key]);
    }).join(' | ');
  });
  
  return table;
};

module.exports = {
  formatCurrency,
  formatPercentage,
  formatDate,
  formatText,
  formatForAPI,
  formatTableForConsole
};
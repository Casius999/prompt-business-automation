/**
 * Générateur d'images
 * -------------------------------------------------
 * Génère des images pour les prompts
 */

const { OpenAI } = require('openai');

// Initialiser l'API OpenAI
let openai;

/**
 * Initialise le générateur d'images
 */
const initialize = () => {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  console.log('Générateur d\'images initialisé');
};

/**
 * Génère une image pour un prompt
 * @param {string} title - Titre du prompt
 * @param {string} category - Catégorie du prompt
 * @returns {Promise<string>} - URL de l'image générée
 */
const generatePromptImage = async (title, category) => {
  try {
    // Si OpenAI n'est pas initialisé, l'initialiser
    if (!openai) {
      initialize();
    }
    
    // Vérifier si la clé API est configurée
    if (!process.env.OPENAI_API_KEY) {
      console.log('Clé API OpenAI non configurée, utilisation d\'une image par défaut');
      return getDefaultImageUrl(category);
    }
    
    // Dans une implémentation réelle, on génèrerait une image avec DALL-E
    // Pour ce prototype, nous simulons la génération
    
    console.log(`Génération d'image pour le prompt "${title}" (catégorie: ${category})`);
    
    // Créer un prompt pour DALL-E
    const imagePrompt = createImagePrompt(title, category);
    
    // Dans une implémentation réelle :
    /*
    const response = await openai.images.generate({
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url'
    });
    
    return response.data[0].url;
    */
    
    // Pour ce prototype, retourner une image par défaut
    return getDefaultImageUrl(category);
  } catch (error) {
    console.error('Erreur lors de la génération d\'image:', error.message);
    return getDefaultImageUrl(category);
  }
};

/**
 * Crée un prompt pour la génération d'image
 * @param {string} title - Titre du prompt
 * @param {string} category - Catégorie du prompt
 * @returns {string} - Prompt pour DALL-E
 */
const createImagePrompt = (title, category) => {
  // Mapping des catégories vers des descriptions visuelles
  const categoryVisuals = {
    marketing: 'digital marketing dashboard with analytics and content charts',
    sales: 'professional sales presentation with charts and handshake',
    business: 'modern business meeting with strategy board and documents',
    creative: 'colorful creative workspace with artistic elements',
    productivity: 'organized desk with productivity tools and calendar',
    default: 'professional workspace with laptop and documents'
  };
  
  // Obtenir la description visuelle pour la catégorie
  const visualDescription = categoryVisuals[category] || categoryVisuals.default;
  
  // Créer un prompt qui combine le titre et la description visuelle
  return `Create a professional, clean image representing "${title}". The image should feature ${visualDescription}. Use a modern, professional style with a color palette appropriate for business context. No text overlay. Centered composition.`;
};

/**
 * Obtient une URL d'image par défaut pour une catégorie
 * @param {string} category - Catégorie du prompt
 * @returns {string} - URL de l'image par défaut
 */
const getDefaultImageUrl = (category) => {
  // Dans une implémentation réelle, on utiliserait des images stockées
  // Pour ce prototype, nous utilisons des URL d'images génériques
  
  const defaultImages = {
    marketing: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    sales: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=800&h=600&fit=crop',
    business: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop',
    creative: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&h=600&fit=crop',
    productivity: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=600&fit=crop',
    default: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop'
  };
  
  return defaultImages[category] || defaultImages.default;
};

module.exports = {
  initialize,
  generatePromptImage
};
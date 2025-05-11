/**
 * Générateur de prompts
 * -------------------------------------------------
 * Responsable de la génération automatique de nouveaux prompts
 */

const { OpenAI } = require('openai');
const { generatePromptImage } = require('../utils/image-generator');
const { formatForAPI } = require('../utils/formatters');
const { sendNotification } = require('../utils/notifications');

class PromptGenerator {
  /**
   * Initialise le générateur de prompts
   * @param {Object} api - Instance de l'API SnackPrompt
   */
  constructor(api) {
    this.api = api;
    
    // Initialiser l'API OpenAI pour la génération de prompts
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Catégories de prompts et leurs caractéristiques
    this.categories = {
      marketing: {
        name: 'marketing',
        description: 'Prompts pour le marketing digital et la création de contenu',
        keywords: ['SEO', 'social media', 'email', 'content', 'copywriting', 'advertising']
      },
      sales: {
        name: 'sales',
        description: 'Prompts pour la vente et la prospection commerciale',
        keywords: ['prospecting', 'outreach', 'follow-up', 'negotiation', 'closing', 'objection handling']
      },
      business: {
        name: 'business',
        description: 'Prompts pour la stratégie et la gestion d\'entreprise',
        keywords: ['strategy', 'management', 'productivity', 'analysis', 'planning', 'finance']
      },
      creative: {
        name: 'creative',
        description: 'Prompts pour la création et la narration',
        keywords: ['writing', 'storytelling', 'fiction', 'poetry', 'scripts', 'creativity']
      },
      productivity: {
        name: 'productivity',
        description: 'Prompts pour l\'efficacité personnelle et l\'organisation',
        keywords: ['planning', 'organization', 'habits', 'time management', 'goals', 'focus']
      }
    };
  }

  /**
   * Génère de nouveaux prompts
   * @param {number} count - Nombre de prompts à générer
   * @returns {Promise<Array>} - Liste des prompts générés
   */
  async generateNewPrompts(count = 3) {
    try {
      console.log(`Génération de ${count} nouveaux prompts...`);
      
      // Récupérer les prompts existants pour analyse
      const existingPrompts = await this.api.getPrompts();
      
      // Analyser les tendances et identifier les niches prometteuses
      const promisingNiches = await this.analyzeMarketTrends(existingPrompts);
      
      // Limiter le nombre de niches à explorer
      const selectedNiches = promisingNiches.slice(0, count);
      
      // Générer de nouveaux prompts pour chaque niche
      const generatedPrompts = [];
      
      for (const niche of selectedNiches) {
        try {
          console.log(`Génération d'un prompt pour la niche: ${niche.name}`);
          
          // Générer un nouveau prompt
          const newPromptData = await this.generatePromptForNiche(niche);
          
          // Générer une image pour le prompt
          const imageUrl = await generatePromptImage(newPromptData.title, niche.category);
          
          // Formater les données pour l'API
          const apiData = formatForAPI.prompt({
            title: newPromptData.title,
            description: newPromptData.description,
            prompt_text: newPromptData.content,
            price: newPromptData.suggestedPrice,
            category: niche.category,
            tags: newPromptData.tags,
            image_url: imageUrl
          });
          
          // Publier le prompt
          const publishedPrompt = await this.api.createPrompt(apiData);
          
          // Stocker les variations pour les tests A/B futurs
          if (newPromptData.variations) {
            await this.storePromptVariations(publishedPrompt.id, newPromptData.variations);
          }
          
          generatedPrompts.push(publishedPrompt);
          
          console.log(`Prompt généré et publié avec succès: ${publishedPrompt.id}`);
          
          // Attendre 30 secondes entre chaque publication pour éviter les rate limits
          if (generatedPrompts.length < selectedNiches.length) {
            await new Promise(resolve => setTimeout(resolve, 30000));
          }
        } catch (error) {
          console.error(`Erreur lors de la génération du prompt pour la niche ${niche.name}:`, error.message);
        }
      }
      
      // Notification de rapport
      await sendNotification({
        type: 'success',
        subject: 'Nouveaux prompts générés',
        message: `${generatedPrompts.length} nouveaux prompts ont été générés et publiés avec succès.`
      });
      
      return generatedPrompts;
    } catch (error) {
      console.error('Erreur lors de la génération de nouveaux prompts:', error.message);
      
      // Notification d'erreur
      await sendNotification({
        type: 'error',
        subject: 'Erreur de génération de prompts',
        message: `Une erreur est survenue lors de la génération de nouveaux prompts: ${error.message}`
      });
      
      return [];
    }
  }

  /**
   * Analyse les tendances du marché et identifie les niches prometteuses
   * @param {Array} existingPrompts - Liste des prompts existants
   * @returns {Promise<Array>} - Liste des niches prometteuses
   */
  async analyzeMarketTrends(existingPrompts) {
    try {
      // Dans une implémentation réelle, on analyserait les données de vente, les recherches des utilisateurs, etc.
      // Pour ce prototype, nous simulons l'analyse et générons des niches basées sur les catégories existantes
      
      // Compter les prompts par catégorie
      const categoryCounts = {};
      existingPrompts.forEach(prompt => {
        if (!categoryCounts[prompt.category]) {
          categoryCounts[prompt.category] = 0;
        }
        categoryCounts[prompt.category]++;
      });
      
      // Identifier les catégories sous-représentées
      const underrepresentedCategories = Object.entries(this.categories)
        .filter(([key, _]) => !categoryCounts[key] || categoryCounts[key] < 3)
        .map(([key, value]) => key);
      
      // Si toutes les catégories sont bien représentées, sélectionner les plus performantes
      let targetCategories;
      if (underrepresentedCategories.length > 0) {
        targetCategories = underrepresentedCategories;
      } else {
        // Dans une implémentation réelle, on sélectionnerait les catégories avec les meilleures performances
        // Pour ce prototype, nous sélectionnons aléatoirement
        targetCategories = Object.keys(this.categories);
      }
      
      // Générer des niches prometteuses
      const promisingNiches = [];
      
      for (const category of targetCategories) {
        // Pour chaque catégorie, identifier des mots-clés populaires non couverts
        const categoryKeywords = this.categories[category].keywords;
        
        // Calculer les mots-clés déjà couverts
        const coveredKeywords = new Set();
        existingPrompts.forEach(prompt => {
          if (prompt.category === category && prompt.tags) {
            prompt.tags.forEach(tag => coveredKeywords.add(tag.toLowerCase()));
          }
        });
        
        // Identifier les mots-clés non couverts
        const uncoveredKeywords = categoryKeywords.filter(keyword => !coveredKeywords.has(keyword.toLowerCase()));
        
        if (uncoveredKeywords.length > 0) {
          // Créer une niche basée sur des mots-clés non couverts
          promisingNiches.push({
            category,
            name: `${category} - ${uncoveredKeywords[0]}`,
            keywords: uncoveredKeywords.slice(0, 3),
            description: this.categories[category].description
          });
        } else {
          // Si tous les mots-clés sont couverts, créer une niche plus spécifique
          promisingNiches.push({
            category,
            name: `${category} - advanced strategies`,
            keywords: categoryKeywords.slice(0, 3),
            description: `Advanced ${this.categories[category].description}`
          });
        }
      }
      
      // Trier les niches par priorité (dans une implémentation réelle, ce serait basé sur le potentiel de revenus)
      return promisingNiches;
    } catch (error) {
      console.error('Erreur lors de l\'analyse des tendances du marché:', error.message);
      
      // Retourner des niches par défaut en cas d'erreur
      return Object.values(this.categories).map(category => ({
        category: category.name,
        name: `${category.name} - general`,
        keywords: category.keywords.slice(0, 3),
        description: category.description
      }));
    }
  }

  /**
   * Génère un nouveau prompt pour une niche spécifique
   * @param {Object} niche - Informations sur la niche
   * @returns {Promise<Object>} - Données du prompt généré
   */
  async generatePromptForNiche(niche) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer un prompt complet
      // Pour ce prototype, nous simulons la génération avec l'API OpenAI
      
      // Créer le prompt pour OpenAI
      const promptTemplate = `
Tu es un expert en création de prompts IA pour des professionnels. Crée un prompt premium pour la niche "${niche.name}" dans la catégorie "${niche.category}".

Keywords à cibler: ${niche.keywords.join(', ')}

Format de réponse (JSON):
{
  "title": "Titre captivant (max 70 caractères)",
  "description": "Description claire et marketing qui explique la valeur (max 150 caractères)",
  "content": "Le prompt complet à utiliser avec un modèle IA (max 500 caractères)",
  "tags": ["5 tags pertinents"],
  "suggestedPrice": "Prix suggéré entre 25 et 100€",
  "variations": {
    "titles": ["3 variations du titre pour tests A/B"],
    "descriptions": ["3 variations de la description pour tests A/B"]
  }
}

Le prompt doit être:
1. Professionnel et soigné
2. Structuré avec des étapes numérotées
3. Inclure des variables en [MAJUSCULES]
4. Résoudre un problème concret dans la niche
5. Générer de la valeur quantifiable (gain de temps, augmentation des revenus, etc.)
`;
      
      // Générer le prompt avec OpenAI
      const completion = await this.openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: promptTemplate,
        max_tokens: 1000,
        temperature: 0.7
      });
      
      // Parser la réponse JSON
      const responseText = completion.choices[0].text.trim();
      const jsonStartIndex = responseText.indexOf('{');
      const jsonEndIndex = responseText.lastIndexOf('}') + 1;
      const jsonContent = responseText.substring(jsonStartIndex, jsonEndIndex);
      
      const promptData = JSON.parse(jsonContent);
      
      // S'assurer que le prix est un nombre
      promptData.suggestedPrice = parseInt(promptData.suggestedPrice.replace(/\D/g, ''));
      if (isNaN(promptData.suggestedPrice) || promptData.suggestedPrice < 25) {
        promptData.suggestedPrice = 45; // Prix par défaut
      }
      
      return promptData;
    } catch (error) {
      console.error(`Erreur lors de la génération du prompt pour la niche ${niche.name}:`, error.message);
      
      // Créer un prompt par défaut en cas d'erreur
      return this.createDefaultPrompt(niche);
    }
  }

  /**
   * Crée un prompt par défaut pour une niche
   * @param {Object} niche - Informations sur la niche
   * @returns {Object} - Données du prompt par défaut
   */
  createDefaultPrompt(niche) {
    const title = `Ultimate ${niche.name.charAt(0).toUpperCase() + niche.name.slice(1)} Prompt for Professionals`;
    const description = `Transform your ${niche.name} results with this expert-crafted prompt that saves time and increases effectiveness.`;
    
    const content = `
Create a comprehensive ${niche.name} strategy for [TARGET_AUDIENCE] with the following specifications:

1. Current situation analysis: [CURRENT_STATE]
2. Desired objectives: [OBJECTIVES]
3. Key constraints: [CONSTRAINTS]
4. Available resources: [RESOURCES]

Provide the following outputs:
1. A detailed 30-day action plan with specific steps
2. 3-5 key performance indicators to track success
3. Common obstacles and how to overcome them
4. Resources needed for implementation
5. Timeline with milestones

Format the response as a professional report with clear sections, bullet points for actionable items, and highlight the most important insights.
`;
    
    return {
      title,
      description,
      content: content.trim(),
      tags: [...niche.keywords, niche.category, 'professional'],
      suggestedPrice: 45,
      variations: {
        titles: [
          title,
          `Professional ${niche.name.charAt(0).toUpperCase() + niche.name.slice(1)} Framework Generator`,
          `${niche.name.charAt(0).toUpperCase() + niche.name.slice(1)} Excellence: Strategic Prompt for Experts`
        ],
        descriptions: [
          description,
          `Elevate your ${niche.name} strategies with this professional prompt designed for measurable results and efficiency.`,
          `The definitive ${niche.name} prompt that industry leaders use to achieve outstanding results in less time.`
        ]
      }
    };
  }

  /**
   * Stocke les variations d'un prompt pour les tests A/B futurs
   * @param {string} promptId - ID du prompt
   * @param {Object} variations - Variations du prompt
   * @returns {Promise<void>}
   */
  async storePromptVariations(promptId, variations) {
    try {
      // Dans une implémentation réelle, on stockerait cela dans une base de données
      // Pour ce prototype, nous simulons le stockage
      console.log(`Variations stockées pour le prompt ${promptId}:`, JSON.stringify(variations));
    } catch (error) {
      console.error(`Erreur lors du stockage des variations pour le prompt ${promptId}:`, error.message);
    }
  }
}

module.exports = PromptGenerator;
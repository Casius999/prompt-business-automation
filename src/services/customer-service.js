/**
 * Service Client
 * -------------------------------------------------
 * Responsable de la gestion automatisée du service client
 */

const { OpenAI } = require('openai');
const { sendNotification } = require('../utils/notifications');

class CustomerService {
  /**
   * Initialise le service client
   * @param {Object} api - Instance de l'API SnackPrompt
   */
  constructor(api) {
    this.api = api;
    
    // Initialiser l'API OpenAI pour la génération de réponses
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Compteurs de service client
    this.stats = {
      questionsAnswered: 0,
      refundsProcessed: 0,
      refundsApproved: 0,
      refundsDenied: 0
    };
    
    // Seuils pour les décisions automatiques
    this.refundThresholds = {
      maxDaysAfterPurchase: 3, // Remboursement automatique si moins de X jours après l'achat
      maxRefundsPerUser: 5     // Refuser automatiquement après X remboursements par utilisateur
    };
  }

  /**
   * Traite une question d'un client
   * @param {Object} questionData - Données de la question
   * @returns {Promise<Object>} - Résultat du traitement
   */
  async handleCustomerQuestion(questionData) {
    try {
      const { userId, promptId, questionId, question } = questionData;
      
      console.log(`Question reçue - User: ${userId}, Prompt: ${promptId}, Question: "${question}"`);
      
      // Analyser la question pour déterminer la catégorie
      const category = await this.analyzeQuestionCategory(question);
      
      // Générer une réponse appropriée
      let response;
      switch (category) {
        case 'how_to_use':
          response = await this.generateUsageInstructions(promptId);
          break;
        case 'pricing':
          response = await this.explainPricing(promptId);
          break;
        case 'refund':
          response = await this.handleRefundInQuestion(userId, promptId, question);
          break;
        case 'technical':
          response = await this.generateTechnicalResponse(promptId, question);
          break;
        default:
          response = await this.generateGenericResponse(question);
      }
      
      // Envoyer la réponse
      await this.api.respondToQuestion(questionId, response);
      
      // Mettre à jour les statistiques
      this.stats.questionsAnswered++;
      
      console.log(`Réponse envoyée pour la question ${questionId} (Catégorie: ${category})`);
      
      return {
        success: true,
        category,
        response: response.substring(0, 100) + '...' // Pour le logging
      };
    } catch (error) {
      console.error('Erreur lors du traitement de la question client:', error.message);
      
      // Notification en cas d'erreur
      await sendNotification({
        type: 'error',
        subject: 'Erreur dans le service client',
        message: `Erreur lors du traitement d'une question: ${error.message}`
      });
      
      // Essayer de renvoyer une réponse générique en cas d'erreur
      if (questionData && questionData.questionId) {
        try {
          const genericResponse = "Je vous remercie pour votre question. Notre équipe est en train d'examiner ce point et vous contactera sous peu avec une réponse complète.";
          await this.api.respondToQuestion(questionData.questionId, genericResponse);
        } catch (secondError) {
          console.error('Erreur lors de l\'envoi de la réponse de secours:', secondError.message);
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyse la catégorie d'une question
   * @param {string} question - Texte de la question
   * @returns {Promise<string>} - Catégorie de la question
   */
  async analyzeQuestionCategory(question) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour classifier
      // Pour ce prototype, nous utilisons une méthode simplifiée basée sur des mots-clés
      
      question = question.toLowerCase();
      
      if (question.includes('utiliser') || question.includes('fonctionne') || 
          question.includes('comment') || question.includes('instructions')) {
        return 'how_to_use';
      }
      
      if (question.includes('prix') || question.includes('coût') || 
          question.includes('remise') || question.includes('promotion')) {
        return 'pricing';
      }
      
      if (question.includes('remboursement') || question.includes('rembourser') || 
          question.includes('annuler') || question.includes('annulation')) {
        return 'refund';
      }
      
      if (question.includes('erreur') || question.includes('bug') || 
          question.includes('problème technique') || question.includes('ne fonctionne pas')) {
        return 'technical';
      }
      
      return 'generic';
    } catch (error) {
      console.error('Erreur lors de l\'analyse de la catégorie de la question:', error.message);
      return 'generic'; // Par défaut en cas d'erreur
    }
  }

  /**
   * Génère des instructions d'utilisation pour un prompt
   * @param {string} promptId - ID du prompt
   * @returns {Promise<string>} - Instructions d'utilisation
   */
  async generateUsageInstructions(promptId) {
    try {
      // Récupérer les détails du prompt
      const promptDetails = await this.api.getPrompt(promptId);
      
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer des instructions personnalisées
      // Pour ce prototype, nous utilisons un template
      
      return `
Merci pour votre question concernant l'utilisation de "${promptDetails.title}".

Ce prompt est conçu pour ${promptDetails.description.toLowerCase()}. Voici comment l'utiliser efficacement :

1. Copiez le prompt complet dans votre interface de modèle IA (comme ChatGPT, Claude, etc.)
2. Remplacez les variables indiquées entre crochets [EXEMPLE] par vos informations spécifiques
3. Soumettez le prompt au modèle d'IA et attendez la réponse

Astuces pour de meilleurs résultats :
- Soyez aussi précis que possible dans les informations que vous fournissez
- Pour des résultats optimaux, utilisez ce prompt avec des modèles avancés comme GPT-4 ou Claude
- N'hésitez pas à ajuster légèrement le prompt en fonction de vos besoins spécifiques

Si vous rencontrez des difficultés ou avez besoin d'aide pour l'adapter à votre cas particulier, n'hésitez pas à me contacter à nouveau.
`;
    } catch (error) {
      console.error(`Erreur lors de la génération des instructions pour le prompt ${promptId}:`, error.message);
      return "Je vous remercie pour votre question sur l'utilisation de ce prompt. Malheureusement, je n'ai pas pu récupérer les détails spécifiques en ce moment. De manière générale, nos prompts sont conçus pour être copiés et collés dans votre interface de modèle d'IA préférée (comme ChatGPT ou Claude), en remplaçant les variables indiquées entre crochets par vos informations spécifiques.";
    }
  }

  /**
   * Explique la tarification d'un prompt
   * @param {string} promptId - ID du prompt
   * @returns {Promise<string>} - Explication de la tarification
   */
  async explainPricing(promptId) {
    try {
      // Récupérer les détails du prompt
      const promptDetails = await this.api.getPrompt(promptId);
      
      // Dans une implémentation réelle, on récupérerait également les bundles contenant ce prompt
      // Pour ce prototype, nous utilisons un template simple
      
      const price = promptDetails.price;
      const isOnPromotion = promptDetails.on_promotion || false;
      const promotionPercentage = promptDetails.promotion_percentage || 0;
      const originalPrice = isOnPromotion ? Math.round(price / (1 - promotionPercentage / 100)) : price;
      
      let pricingExplanation = `
Merci pour votre question concernant le prix de "${promptDetails.title}".

`;
      
      if (isOnPromotion) {
        pricingExplanation += `Ce prompt est actuellement en promotion à ${price}€ (${promotionPercentage}% de réduction par rapport au prix normal de ${originalPrice}€).`;
      } else {
        pricingExplanation += `Le prix de ce prompt est de ${price}€.`;
      }
      
      pricingExplanation += `

Ce que vous obtenez pour ce prix :
- Accès illimité et permanent au prompt
- Possibilité de l'utiliser avec n'importe quel modèle d'IA compatible
- Mise à jour gratuite lorsque nous améliorons ce prompt

Nous proposons également des bundles qui incluent ce prompt à un prix avantageux :
- Pack ${promptDetails.category.charAt(0).toUpperCase() + promptDetails.category.slice(1)} Premium: Économisez 15% sur une collection de prompts de cette catégorie
- Pack Complet: Économisez 30% sur notre collection complète de prompts

N'hésitez pas à me contacter si vous avez d'autres questions sur nos tarifs ou nos offres.
`;
      
      return pricingExplanation;
    } catch (error) {
      console.error(`Erreur lors de l'explication de la tarification du prompt ${promptId}:`, error.message);
      return "Je vous remercie pour votre question sur le prix de ce prompt. Malheureusement, je n'ai pas pu récupérer les détails spécifiques en ce moment. Tous nos prompts sont proposés à un prix unique qui vous donne un accès illimité et permanent. Nous proposons également des bundles qui vous permettent d'économiser jusqu'à 30% sur nos collections de prompts.";
    }
  }

  /**
   * Gère une demande de remboursement dans une question
   * @param {string} userId - ID de l'utilisateur
   * @param {string} promptId - ID du prompt
   * @param {string} question - Texte de la question
   * @returns {Promise<string>} - Réponse à la demande de remboursement
   */
  async handleRefundInQuestion(userId, promptId, question) {
    try {
      // Récupérer les informations d'achat
      const purchaseInfo = await this.api.getPurchaseInfo(userId, promptId);
      
      // Calculer le nombre de jours depuis l'achat
      const purchaseDate = new Date(purchaseInfo.purchase_date);
      const now = new Date();
      const daysSincePurchase = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
      
      // Récupérer le nombre de remboursements de l'utilisateur
      const userRefunds = await this.api.getUserRefundCount(userId);
      
      // Déterminer si le remboursement est automatiquement approuvé
      const isAutomaticallyApproved = daysSincePurchase <= this.refundThresholds.maxDaysAfterPurchase && 
                                     userRefunds < this.refundThresholds.maxRefundsPerUser;
      
      if (isAutomaticallyApproved) {
        // Dans une implémentation réelle, on créerait une demande de remboursement automatique
        // Pour ce prototype, nous simulons l'approbation
        
        this.stats.refundsProcessed++;
        this.stats.refundsApproved++;
        
        return `
Je suis désolé d'apprendre que ce prompt ne répond pas à vos attentes. Votre demande de remboursement a été automatiquement approuvée et sera traitée sous 1-2 jours ouvrés.

Le montant de ${purchaseInfo.amount}€ sera crédité sur votre mode de paiement d'origine.

Puis-je vous demander la raison de votre insatisfaction afin que nous puissions améliorer nos produits ? Vos commentaires sont très précieux pour nous.

Merci pour votre compréhension.
`;
      } else {
        // Remboursement non automatique, mais proposer la procédure
        return `
Merci pour votre message concernant un remboursement. Pour traiter correctement votre demande, je vous invite à utiliser le bouton "Demander un remboursement" sur la page du prompt ou dans votre historique d'achats.

Pour information, notre politique de remboursement permet un remboursement intégral dans les 3 jours suivant l'achat.

Si vous rencontrez des difficultés avec le prompt, je serais heureux de vous aider à résoudre le problème avant de procéder à un remboursement. Pourriez-vous me préciser ce qui ne fonctionne pas comme prévu ?
`;
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de la demande de remboursement:`, error.message);
      return "Je vous remercie pour votre demande de remboursement. Pour traiter cette requête, veuillez utiliser le bouton "Demander un remboursement" sur la page du prompt ou dans votre historique d'achats. Notre équipe traitera votre demande dans les plus brefs délais.";
    }
  }

  /**
   * Génère une réponse technique pour un problème
   * @param {string} promptId - ID du prompt
   * @param {string} question - Texte de la question
   * @returns {Promise<string>} - Réponse technique
   */
  async generateTechnicalResponse(promptId, question) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer une réponse technique personnalisée
      // Pour ce prototype, nous utilisons un template
      
      return `
Merci de m'avoir signalé ce problème technique. Je comprends que cela puisse être frustrant.

Voici quelques solutions possibles pour résoudre le problème :

1. Vérifiez que vous utilisez un modèle d'IA compatible avec ce prompt (GPT-3.5, GPT-4, Claude, etc.)
2. Assurez-vous d'avoir remplacé toutes les variables entre crochets [EXEMPLE] par vos informations
3. Si le prompt contient des sections techniques (comme du code), vérifiez que vous les avez copiées sans modification
4. Essayez de diviser le prompt en sections plus petites si le modèle atteint ses limites de tokens

Si le problème persiste après ces étapes, n'hésitez pas à me fournir plus de détails sur l'erreur spécifique que vous rencontrez, et je vous aiderai à le résoudre.
`;
    } catch (error) {
      console.error(`Erreur lors de la génération de la réponse technique:`, error.message);
      return "Je vous remercie de m'avoir signalé ce problème technique. Pour vous aider efficacement, pourriez-vous me fournir plus de détails sur l'erreur spécifique que vous rencontrez ? En attendant, je vous suggère de vérifier que vous utilisez un modèle d'IA compatible et que vous avez correctement remplacé toutes les variables entre crochets par vos informations.";
    }
  }

  /**
   * Génère une réponse générique à une question
   * @param {string} question - Texte de la question
   * @returns {Promise<string>} - Réponse générique
   */
  async generateGenericResponse(question) {
    try {
      // Dans une implémentation réelle, on utiliserait OpenAI pour générer une réponse personnalisée
      // Pour ce prototype, nous simulons une réponse avec l'API OpenAI
      
      const completion = await this.openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt: `Tu es un service client pour une plateforme de vente de prompts d'IA. Réponds à cette question de client de manière professionnelle, amicale et utile. Question: "${question}"`,
        max_tokens: 250,
        temperature: 0.7
      });
      
      return completion.choices[0].text.trim();
    } catch (error) {
      console.error(`Erreur lors de la génération de la réponse générique:`, error.message);
      return `
Merci pour votre message. Je suis heureux de pouvoir vous aider.

Votre question est intéressante et je vais faire de mon mieux pour y répondre de manière complète. Si vous avez besoin de précisions supplémentaires ou si vous avez d'autres questions, n'hésitez pas à me contacter à nouveau.

Notre équipe est dédiée à votre satisfaction et nous sommes toujours disponibles pour vous aider.
`;
    }
  }

  /**
   * Traite une demande de remboursement
   * @param {Object} refundData - Données de la demande de remboursement
   * @returns {Promise<Object>} - Résultat du traitement
   */
  async handleRefundRequest(refundData) {
    try {
      const { userId, promptId, refundId, reason } = refundData;
      
      console.log(`Demande de remboursement reçue - User: ${userId}, Prompt: ${promptId}, Raison: "${reason}"`);
      
      // Récupérer les informations d'achat
      const purchaseInfo = await this.api.getPurchaseInfo(userId, promptId);
      
      // Calculer le nombre de jours depuis l'achat
      const purchaseDate = new Date(purchaseInfo.purchase_date);
      const now = new Date();
      const daysSincePurchase = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
      
      // Récupérer le nombre de remboursements de l'utilisateur
      const userRefunds = await this.api.getUserRefundCount(userId);
      
      // Déterminer si le remboursement est automatiquement approuvé
      const isAutomaticallyApproved = daysSincePurchase <= this.refundThresholds.maxDaysAfterPurchase && 
                                     userRefunds < this.refundThresholds.maxRefundsPerUser;
      
      // Traiter la demande
      if (isAutomaticallyApproved) {
        await this.api.approveRefund(refundId);
        
        this.stats.refundsProcessed++;
        this.stats.refundsApproved++;
        
        console.log(`Remboursement ${refundId} approuvé automatiquement`);
        
        return {
          success: true,
          approved: true,
          autoApproved: true,
          reason: `Remboursement automatique: ${daysSincePurchase} jours depuis l'achat, ${userRefunds} remboursements précédents`
        };
      } else {
        // Dans une implémentation réelle avec plus de logique, on pourrait avoir des cas où le remboursement
        // est automatiquement refusé, mais pour ce prototype, nous refusons uniquement si l'achat date de plus de 7 jours
        
        if (daysSincePurchase > 7) {
          const denyReason = `Nous ne pouvons traiter votre demande de remboursement car elle dépasse notre fenêtre de remboursement de 7 jours.`;
          
          await this.api.denyRefund(refundId, denyReason);
          
          this.stats.refundsProcessed++;
          this.stats.refundsDenied++;
          
          console.log(`Remboursement ${refundId} refusé automatiquement (${daysSincePurchase} jours depuis l'achat)`);
          
          return {
            success: true,
            approved: false,
            autoDenied: true,
            reason: denyReason
          };
        } else {
          // Cas limite, notification à l'équipe
          await sendNotification({
            type: 'info',
            subject: 'Demande de remboursement à examiner',
            message: `Une demande de remboursement nécessite une attention manuelle. User: ${userId}, Prompt: ${promptId}, Raison: "${reason}"`
          });
          
          console.log(`Remboursement ${refundId} marqué pour révision manuelle`);
          
          return {
            success: true,
            approved: null,
            needsManualReview: true,
            reason: `Cas limite: ${daysSincePurchase} jours depuis l'achat, ${userRefunds} remboursements précédents`
          };
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la demande de remboursement:', error.message);
      
      // Notification en cas d'erreur
      await sendNotification({
        type: 'error',
        subject: 'Erreur de traitement de remboursement',
        message: `Erreur lors du traitement d'une demande de remboursement: ${error.message}`
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtient les statistiques du service client
   * @returns {Object} - Statistiques du service client
   */
  getStats() {
    return {
      ...this.stats,
      refundApprovalRate: this.stats.refundsProcessed > 0 
        ? this.stats.refundsApproved / this.stats.refundsProcessed * 100 
        : 0
    };
  }
}

module.exports = CustomerService;
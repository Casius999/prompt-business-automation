/**
 * Système de notifications
 * -------------------------------------------------
 * Gère l'envoi de notifications par email, Slack, etc.
 */

const nodemailer = require('nodemailer');

// Configuration du transporteur d'emails
let transporter;

/**
 * Initialise le système de notifications
 */
const initialize = () => {
  // Configurer le transporteur d'emails
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  console.log('Système de notifications initialisé');
};

/**
 * Envoie une notification
 * @param {Object} options - Options de notification
 * @param {string} options.type - Type de notification (info, success, error, warning, report)
 * @param {string} options.subject - Sujet de la notification
 * @param {string} options.message - Message de la notification
 * @param {string|Object} [options.attachment] - Pièce jointe (optionnel)
 * @returns {Promise<boolean>} - true si envoyé avec succès
 */
const sendNotification = async (options) => {
  try {
    const { type, subject, message, attachment } = options;
    
    // Vérifier si la notification doit être envoyée
    // (Dans une implémentation réelle, on vérifierait les préférences de notification)
    
    // Pour ce prototype, envoyons un email pour tous les types
    await sendEmail(type, subject, message, attachment);
    
    // Dans une implémentation réelle, on pourrait aussi envoyer des notifications par Slack, webhook, etc.
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification:', error.message);
    
    // En cas d'erreur, essayer d'enregistrer la notification dans la console
    console.log(`NOTIFICATION [${options.type}]: ${options.subject} - ${options.message}`);
    
    return false;
  }
};

/**
 * Envoie un email
 * @param {string} type - Type de notification
 * @param {string} subject - Sujet de l'email
 * @param {string} message - Corps de l'email
 * @param {string|Object} [attachment] - Pièce jointe (optionnel)
 * @returns {Promise<void>}
 */
const sendEmail = async (type, subject, message, attachment) => {
  // Si le transporteur n'est pas configuré, initialiser
  if (!transporter) {
    initialize();
  }
  
  // Vérifier si les variables d'environnement requises sont définies
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.NOTIFICATION_EMAIL) {
    console.log(`EMAIL [${type}]: ${subject} - ${message}`);
    return;
  }
  
  // Préparer les options de l'email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFICATION_EMAIL,
    subject: `[PromptBusiness] ${subject}`,
    html: formatEmailHtml(type, message)
  };
  
  // Ajouter une pièce jointe si fournie
  if (attachment) {
    if (typeof attachment === 'string') {
      // Si c'est une chaîne de caractères, l'ajouter comme texte
      mailOptions.attachments = [
        {
          filename: 'attachment.txt',
          content: attachment
        }
      ];
    } else if (typeof attachment === 'object') {
      // Si c'est un objet, le convertir en JSON
      mailOptions.attachments = [
        {
          filename: 'attachment.json',
          content: JSON.stringify(attachment, null, 2)
        }
      ];
    }
  }
  
  // Dans une implémentation réelle, on enverrait l'email
  // Pour ce prototype, nous simulons l'envoi
  console.log(`EMAIL [${type}]: ${subject}`);
  
  // Décommenter pour envoyer réellement l'email
  // await transporter.sendMail(mailOptions);
};

/**
 * Formate le contenu HTML d'un email
 * @param {string} type - Type de notification
 * @param {string} message - Message à formater
 * @returns {string} - HTML formaté
 */
const formatEmailHtml = (type, message) => {
  // Définir la couleur en fonction du type
  let color;
  switch (type) {
    case 'success':
      color = '#28a745';
      break;
    case 'error':
      color = '#dc3545';
      break;
    case 'warning':
      color = '#ffc107';
      break;
    case 'report':
      color = '#17a2b8';
      break;
    default:
      color = '#007bff'; // info
  }
  
  // Template HTML simple
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PromptBusiness Notification</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid ${color}; padding-bottom: 10px; margin-bottom: 20px; }
    .content { padding: 20px; background-color: #f9f9f9; border-radius: 5px; }
    .footer { margin-top: 20px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="color: ${color};">PromptBusiness Automated System</h2>
    </div>
    <div class="content">
      ${message.replace(/\n/g, '<br>')}
    </div>
    <div class="footer">
      <p>This is an automated notification from the PromptBusiness System</p>
      <p>Date: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = {
  initialize,
  sendNotification
};
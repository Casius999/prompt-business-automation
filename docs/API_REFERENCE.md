# Documentation Complète de l'API SnackPrompt

Cette documentation détaille toutes les fonctionnalités et endpoints de l'API SnackPrompt pour une intégration optimale avec notre système d'automatisation.

## Table des matières

- [Authentification](#authentification)
- [Formats standards](#formats-standards)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Rate Limits](#rate-limits)
- [Endpoints](#endpoints)
  - [Prompts](#prompts)
  - [Bundles](#bundles)
  - [Analytics](#analytics)
  - [Service Client](#service-client)
  - [Promotions](#promotions)
  - [Utilisateurs](#utilisateurs)
  - [Webhooks](#webhooks)
- [Modèles de données](#modèles-de-données)
- [Webhooks](#webhooks-events)
- [Exemples d'intégration](#exemples-dintégration)

## Authentification

L'API SnackPrompt utilise l'authentification par clé API (API key). Chaque requête doit inclure cette clé dans l'en-tête HTTP:

```
Authorization: Bearer YOUR_API_KEY
```

Pour obtenir une clé API:
1. Connectez-vous à votre compte SnackPrompt
2. Accédez à la section Paramètres > API
3. Générez une nouvelle clé API
4. Copiez et stockez-la de manière sécurisée

## Formats standards

### Format des requêtes

Les requêtes qui nécessitent un corps doivent être au format JSON avec l'en-tête:
```
Content-Type: application/json
```

### Format des réponses

Les réponses suivent un format standard:

```json
{
  "success": true,
  "data": {
    // Les données demandées
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "next_page_token": "token"
  }
}
```

## Gestion des erreurs

En cas d'erreur, l'API renvoie:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description détaillée de l'erreur",
    "details": {}
  }
}
```

### Codes d'erreur communs

| Code HTTP | Code d'erreur | Description |
|-----------|--------------|-------------|
| 400 | INVALID_REQUEST | La requête contient des données invalides |
| 401 | UNAUTHORIZED | Authentification manquante ou invalide |
| 403 | FORBIDDEN | Utilisateur non autorisé pour cette action |
| 404 | NOT_FOUND | Ressource non trouvée |
| 409 | CONFLICT | Conflit avec l'état actuel de la ressource |
| 429 | RATE_LIMIT_EXCEEDED | Limite de taux dépassée |
| 500 | SERVER_ERROR | Erreur interne du serveur |

## Rate Limits

L'API impose les limites suivantes:

| Type d'endpoint | Limite |
|-----------------|--------|
| Lecture (GET) | 100 requêtes par minute |
| Analytics | 20 requêtes par minute |
| Écriture (POST, PUT, PATCH, DELETE) | 10 requêtes par minute |

En cas de dépassement, l'API renvoie un code 429 avec un en-tête `Retry-After` indiquant le délai d'attente en secondes.

## Endpoints

### Prompts

#### Récupérer tous les prompts

```
GET /api/v1/prompts
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| page | int | Numéro de page (défaut: 1) |
| limit | int | Résultats par page (défaut: 10, max: 100) |
| sort | string | Champ de tri (ex: "createdAt", "popularity") |
| order | string | Ordre de tri ("asc" ou "desc") |
| category | string | Filtrer par catégorie |
| tags | string | Liste de tags séparés par virgule |
| search | string | Terme de recherche |
| fields | string | Liste de champs à retourner |
| min_price | number | Prix minimum |
| max_price | number | Prix maximum |
| exclude_ids | string | IDs à exclure (séparés par virgule) |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prompt-123",
      "title": "Email Marketing Conversion Booster",
      "description": "Increase your email open rates and conversions",
      "price": 45,
      "category": "marketing",
      "tags": ["email", "conversion", "copywriting"],
      "image_url": "https://cdn.snackprompt.com/images/prompt-123.jpg",
      "created_at": "2025-04-15T10:30:00Z",
      "updated_at": "2025-05-01T14:22:00Z",
      "views": 1250,
      "sales": 78,
      "rating": 4.8,
      "on_promotion": false,
      "user": {
        "id": "user-456",
        "username": "marketingpro",
        "avatar_url": "https://cdn.snackprompt.com/avatars/user-456.jpg"
      }
    },
    // Plus de prompts...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 157,
    "next_page_token": "eyJwYWdlIjoyLCJsaW1pdCI6MTB9"
  }
}
```

#### Récupérer un prompt spécifique

```
GET /api/v1/prompts/{promptId}
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| fields | string | Liste de champs à retourner |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-123",
    "title": "Email Marketing Conversion Booster",
    "description": "Increase your email open rates and conversions",
    "content": "Create a compelling email sequence for [PRODUCT] targeting [AUDIENCE] with the following goals: [GOALS]. The sequence should include: 1) Attention-grabbing subject lines with at least 3 variants, 2) Personalized opening that addresses specific pain points, 3) Value proposition clearly articulated with social proof elements, 4) Storytelling elements that connect emotionally, 5) Clear call-to-action optimized for conversions. Each email should be between 200-300 words, mobile-friendly, and include both plain text and minimal HTML formatting options.",
    "price": 45,
    "category": "marketing",
    "tags": ["email", "conversion", "copywriting"],
    "image_url": "https://cdn.snackprompt.com/images/prompt-123.jpg",
    "created_at": "2025-04-15T10:30:00Z",
    "updated_at": "2025-05-01T14:22:00Z",
    "views": 1250,
    "sales": 78,
    "rating": 4.8,
    "reviews_count": 45,
    "on_promotion": false,
    "promotion_percentage": 0,
    "promotion_end_date": null,
    "user": {
      "id": "user-456",
      "username": "marketingpro",
      "avatar_url": "https://cdn.snackprompt.com/avatars/user-456.jpg"
    },
    "variations": [
      {
        "id": "variation-1",
        "title": "Email Sequence Conversion Optimizer",
        "description": "Boost your email marketing results with professionally crafted sequences",
        "created_at": "2025-04-18T09:15:00Z",
        "active": false
      },
      // Plus de variations...
    ]
  }
}
```

#### Créer un nouveau prompt

```
POST /api/v1/prompts
```

**Corps de la requête:**

```json
{
  "title": "Email Marketing Conversion Booster",
  "description": "Increase your email open rates and conversions",
  "content": "Create a compelling email sequence for [PRODUCT] targeting [AUDIENCE] with the following goals: [GOALS]. The sequence should include: 1) Attention-grabbing subject lines with at least 3 variants, 2) Personalized opening that addresses specific pain points, 3) Value proposition clearly articulated with social proof elements, 4) Storytelling elements that connect emotionally, 5) Clear call-to-action optimized for conversions. Each email should be between 200-300 words, mobile-friendly, and include both plain text and minimal HTML formatting options.",
  "price": 45,
  "category": "marketing",
  "tags": ["email", "conversion", "copywriting"],
  "image_url": "https://cdn.snackprompt.com/images/prompt-123.jpg",
  "variations": [
    {
      "title": "Email Sequence Conversion Optimizer",
      "description": "Boost your email marketing results with professionally crafted sequences"
    },
    {
      "title": "Professional Email Marketing Templates",
      "description": "Convert subscribers into customers with these proven email sequences"
    }
  ]
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-123",
    "title": "Email Marketing Conversion Booster",
    // Autres champs comme dans GET /prompts/{promptId}
  }
}
```

#### Mettre à jour un prompt

```
PATCH /api/v1/prompts/{promptId}
```

**Corps de la requête:**

```json
{
  "title": "Nouveau titre du prompt",
  "price": 50,
  "on_promotion": true,
  "promotion_percentage": 15,
  "promotion_end_date": "2025-06-01T23:59:59Z"
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-123",
    // Prompt mis à jour
  }
}
```

#### Supprimer un prompt

```
DELETE /api/v1/prompts/{promptId}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-123",
    "deleted": true
  }
}
```

### Bundles

#### Récupérer tous les bundles

```
GET /api/v1/bundles
```

**Paramètres de requête:**

Similaires à ceux de l'endpoint `/prompts`.

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "bundle-123",
      "name": "Marketing Pro Bundle",
      "description": "Complete set of marketing prompts for professionals",
      "price": 99,
      "original_price": 150,
      "savings_percentage": 34,
      "prompt_count": 5,
      "image_url": "https://cdn.snackprompt.com/images/bundle-123.jpg",
      "created_at": "2025-04-20T11:00:00Z",
      "updated_at": "2025-05-02T09:45:00Z",
      "sales": 32
    },
    // Plus de bundles...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "next_page_token": null
  }
}
```

#### Récupérer un bundle spécifique

```
GET /api/v1/bundles/{bundleId}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "bundle-123",
    "name": "Marketing Pro Bundle",
    "description": "Complete set of marketing prompts for professionals",
    "price": 99,
    "original_price": 150,
    "savings_percentage": 34,
    "created_at": "2025-04-20T11:00:00Z",
    "updated_at": "2025-05-02T09:45:00Z",
    "sales": 32,
    "prompts": [
      {
        "id": "prompt-123",
        "title": "Email Marketing Conversion Booster",
        "description": "Increase your email open rates and conversions",
        "price": 45,
        "category": "marketing",
        "image_url": "https://cdn.snackprompt.com/images/prompt-123.jpg"
      },
      // Plus de prompts...
    ]
  }
}
```

#### Créer un bundle

```
POST /api/v1/bundles
```

**Corps de la requête:**

```json
{
  "name": "Marketing Pro Bundle",
  "description": "Complete set of marketing prompts for professionals",
  "prompt_ids": ["prompt-123", "prompt-456", "prompt-789", "prompt-012", "prompt-345"],
  "price": 99,
  "image_url": "https://cdn.snackprompt.com/images/bundle-123.jpg"
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "bundle-123",
    "name": "Marketing Pro Bundle",
    // Autres détails du bundle
  }
}
```

#### Mettre à jour un bundle

```
PATCH /api/v1/bundles/{bundleId}
```

**Corps de la requête:**

```json
{
  "name": "Nouveau nom du bundle",
  "price": 89,
  "prompt_ids": ["prompt-123", "prompt-456", "prompt-789"]
}
```

#### Supprimer un bundle

```
DELETE /api/v1/bundles/{bundleId}
```

### Analytics

#### Obtenir les statistiques des prompts

```
GET /api/v1/analytics/prompts
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| period | string | Période (today, week, month, year, all) |
| start_date | string | Date de début (format ISO) |
| end_date | string | Date de fin (format ISO) |
| prompt_ids | string | Liste d'IDs de prompts (séparés par virgule) |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "prompt-123",
      "title": "Email Marketing Conversion Booster",
      "price": 45,
      "views": 1250,
      "views_last_hour": 28,
      "views_last_24_hours": 156,
      "views_last_7_days": 890,
      "views_last_30_days": 1250,
      "sales": 78,
      "sales_last_24_hours": 3,
      "sales_last_7_days": 22,
      "sales_last_30_days": 78,
      "revenue": 3510,
      "revenue_last_24_hours": 135,
      "revenue_last_7_days": 990,
      "revenue_last_30_days": 3510,
      "conversion_rate": 0.0624,
      "average_rating": 4.8
    },
    // Plus de prompts...
  ],
  "meta": {
    "total_prompts": 25,
    "total_views": 28750,
    "total_sales": 1245,
    "total_revenue": 52890,
    "average_conversion_rate": 0.0433
  }
}
```

#### Obtenir les performances d'un prompt

```
GET /api/v1/analytics/prompts/{promptId}/performance
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| period | string | Période (today, week, month, year, all) |
| start_date | string | Date de début (format ISO) |
| end_date | string | Date de fin (format ISO) |
| granularity | string | Granularité (hour, day, week, month) |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "prompt-123",
    "title": "Email Marketing Conversion Booster",
    "summary": {
      "views": 1250,
      "sales": 78,
      "revenue": 3510,
      "conversion_rate": 0.0624,
      "average_rating": 4.8
    },
    "trends": [
      {
        "date": "2025-05-05",
        "views": 42,
        "sales": 3,
        "revenue": 135,
        "conversion_rate": 0.0714
      },
      // Plus de points de données...
    ],
    "price_history": [
      {
        "date": "2025-04-15",
        "price": 40
      },
      {
        "date": "2025-04-22",
        "price": 45
      }
    ],
    "demographics": {
      "countries": [
        {"name": "United States", "percentage": 45},
        {"name": "United Kingdom", "percentage": 18},
        {"name": "Canada", "percentage": 12},
        {"name": "Australia", "percentage": 8},
        {"name": "Other", "percentage": 17}
      ],
      "devices": [
        {"name": "Desktop", "percentage": 65},
        {"name": "Mobile", "percentage": 30},
        {"name": "Tablet", "percentage": 5}
      ]
    }
  }
}
```

#### Obtenir des analyses horaires

```
GET /api/v1/analytics/hourly
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| days | int | Nombre de jours d'historique (défaut: 7, max: 30) |
| prompt_id | string | Filtrer par prompt ID (optionnel) |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-05-11T00:00:00Z",
      "views": 28,
      "sales": 2,
      "revenue": 90,
      "conversion_rate": 0.0714
    },
    {
      "timestamp": "2025-05-11T01:00:00Z",
      "views": 15,
      "sales": 1,
      "revenue": 45,
      "conversion_rate": 0.0667
    },
    // Plus de points de données...
  ],
  "meta": {
    "total_hours": 168,
    "average_hourly_views": 7.44,
    "peak_hour": {
      "timestamp": "2025-05-08T18:00:00Z",
      "views": 56
    },
    "lowest_hour": {
      "timestamp": "2025-05-09T04:00:00Z",
      "views": 2
    }
  }
}
```

#### Générer un rapport

```
POST /api/v1/analytics/reports
```

**Corps de la requête:**

```json
{
  "type": "performance",
  "period": "last_30_days",
  "prompt_ids": ["prompt-123", "prompt-456"],
  "format": "pdf",
  "include_recommendations": true
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "report_id": "report-123",
    "type": "performance",
    "status": "processing",
    "estimated_completion_time": "2025-05-11T22:05:00Z"
  }
}
```

#### Récupérer un rapport

```
GET /api/v1/analytics/reports/{reportId}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "report_id": "report-123",
    "type": "performance",
    "status": "completed",
    "created_at": "2025-05-11T22:00:00Z",
    "completed_at": "2025-05-11T22:03:45Z",
    "download_url": "https://api.snackprompt.com/downloads/reports/report-123.pdf",
    "expires_at": "2025-05-18T22:03:45Z"
  }
}
```

### Service Client

#### Récupérer les questions clients

```
GET /api/v1/customer-support/questions
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| status | string | Filtrer par statut (pending, answered, all) |
| prompt_id | string | Filtrer par prompt ID |
| page | int | Numéro de page |
| limit | int | Résultats par page |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "question-123",
      "user_id": "user-456",
      "prompt_id": "prompt-789",
      "question": "Does this prompt work with GPT-4?",
      "status": "pending",
      "created_at": "2025-05-11T20:30:00Z",
      "updated_at": "2025-05-11T20:30:00Z",
      "user": {
        "id": "user-456",
        "username": "techuser",
        "avatar_url": "https://cdn.snackprompt.com/avatars/user-456.jpg"
      },
      "prompt": {
        "id": "prompt-789",
        "title": "Advanced Data Analysis Framework"
      }
    },
    // Plus de questions...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "next_page_token": "eyJwYWdlIjoyLCJsaW1pdCI6MTB9"
  }
}
```

#### Répondre à une question

```
POST /api/v1/customer-support/questions/{questionId}/respond
```

**Corps de la requête:**

```json
{
  "response": "Yes, this prompt works perfectly with GPT-4. In fact, it was specifically optimized for GPT-4's capabilities, though it will also work with GPT-3.5 with slightly reduced effectiveness. Let me know if you have any other questions!"
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "question-123",
    "status": "answered",
    "response": "Yes, this prompt works perfectly with GPT-4. In fact, it was specifically optimized for GPT-4's capabilities, though it will also work with GPT-3.5 with slightly reduced effectiveness. Let me know if you have any other questions!",
    "responded_at": "2025-05-11T21:45:00Z"
  }
}
```

#### Récupérer les demandes de remboursement

```
GET /api/v1/customer-support/refunds
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| status | string | Filtrer par statut (pending, approved, denied, all) |
| prompt_id | string | Filtrer par prompt ID |
| page | int | Numéro de page |
| limit | int | Résultats par page |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "refund-123",
      "user_id": "user-456",
      "prompt_id": "prompt-789",
      "purchase_id": "purchase-012",
      "reason": "The prompt doesn't work as described with Claude AI.",
      "status": "pending",
      "created_at": "2025-05-11T19:15:00Z",
      "updated_at": "2025-05-11T19:15:00Z",
      "purchase_date": "2025-05-10T14:30:00Z",
      "purchase_amount": 39.99,
      "days_since_purchase": 1,
      "user": {
        "id": "user-456",
        "username": "techuser",
        "avatar_url": "https://cdn.snackprompt.com/avatars/user-456.jpg",
        "previous_refunds_count": 2
      },
      "prompt": {
        "id": "prompt-789",
        "title": "Advanced Data Analysis Framework"
      }
    },
    // Plus de demandes...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "next_page_token": null
  }
}
```

#### Approuver une demande de remboursement

```
POST /api/v1/customer-support/refunds/{refundId}/approve
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "refund-123",
    "status": "approved",
    "approved_at": "2025-05-11T21:30:00Z",
    "refund_amount": 39.99,
    "estimated_processing_time": "1-3 business days"
  }
}
```

#### Refuser une demande de remboursement

```
POST /api/v1/customer-support/refunds/{refundId}/deny
```

**Corps de la requête:**

```json
{
  "reason": "The refund request exceeds our 3-day refund policy window."
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "refund-123",
    "status": "denied",
    "denied_at": "2025-05-11T21:32:00Z",
    "denial_reason": "The refund request exceeds our 3-day refund policy window."
  }
}
```

### Promotions

#### Récupérer toutes les promotions

```
GET /api/v1/promotions
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| status | string | Filtrer par statut (active, scheduled, expired, all) |
| page | int | Numéro de page |
| limit | int | Résultats par page |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "promo-123",
      "name": "Flash Sale",
      "description": "25% off select prompts for 3 hours",
      "discount_percentage": 25,
      "start_time": "2025-05-12T10:00:00Z",
      "end_time": "2025-05-12T13:00:00Z",
      "status": "scheduled",
      "prompt_ids": ["prompt-123", "prompt-456", "prompt-789"],
      "created_at": "2025-05-11T15:30:00Z",
      "updated_at": "2025-05-11T15:30:00Z",
      "prompts_count": 3
    },
    // Plus de promotions...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "next_page_token": "eyJwYWdlIjoyLCJsaW1pdCI6MTB9"
  }
}
```

#### Récupérer une promotion spécifique

```
GET /api/v1/promotions/{promotionId}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "promo-123",
    "name": "Flash Sale",
    "description": "25% off select prompts for 3 hours",
    "discount_percentage": 25,
    "start_time": "2025-05-12T10:00:00Z",
    "end_time": "2025-05-12T13:00:00Z",
    "status": "scheduled",
    "created_at": "2025-05-11T15:30:00Z",
    "updated_at": "2025-05-11T15:30:00Z",
    "prompts": [
      {
        "id": "prompt-123",
        "title": "Email Marketing Conversion Booster",
        "original_price": 45,
        "discounted_price": 33.75
      },
      // Plus de prompts...
    ],
    "performance": {
      "views_before": 0,
      "views_during": 0,
      "sales_before": 0,
      "sales_during": 0,
      "revenue_before": 0,
      "revenue_during": 0,
      "conversion_rate_before": 0,
      "conversion_rate_during": 0
    }
  }
}
```

#### Créer une promotion

```
POST /api/v1/promotions
```

**Corps de la requête:**

```json
{
  "name": "Flash Sale",
  "description": "25% off select prompts for 3 hours",
  "prompt_ids": ["prompt-123", "prompt-456", "prompt-789"],
  "discount_percentage": 25,
  "start_time": "2025-05-12T10:00:00Z",
  "end_time": "2025-05-12T13:00:00Z"
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "promo-123",
    "name": "Flash Sale",
    // Autres détails de la promotion
  }
}
```

#### Mettre à jour une promotion

```
PATCH /api/v1/promotions/{promotionId}
```

**Corps de la requête:**

```json
{
  "name": "Extended Flash Sale",
  "end_time": "2025-05-12T15:00:00Z"
}
```

#### Annuler une promotion

```
POST /api/v1/promotions/{promotionId}/cancel
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "promo-123",
    "status": "cancelled",
    "cancelled_at": "2025-05-11T22:15:00Z"
  }
}
```

### Utilisateurs

#### Obtenir les achats d'un utilisateur

```
GET /api/v1/users/{userId}/purchases
```

**Paramètres de requête:**

| Paramètre | Type | Description |
|-----------|------|-------------|
| page | int | Numéro de page |
| limit | int | Résultats par page |

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "purchase-123",
      "user_id": "user-456",
      "prompt_id": "prompt-789",
      "amount": 45,
      "currency": "USD",
      "purchase_date": "2025-05-10T14:30:00Z",
      "prompt": {
        "id": "prompt-789",
        "title": "Advanced Data Analysis Framework"
      }
    },
    // Plus d'achats...
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "next_page_token": null
  }
}
```

#### Obtenir le nombre de remboursements d'un utilisateur

```
GET /api/v1/users/{userId}/refunds/count
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "user_id": "user-456",
    "refunds_count": 2,
    "approved_refunds_count": 1,
    "denied_refunds_count": 0,
    "pending_refunds_count": 1,
    "refunds_last_30_days": 1,
    "refunds_all_time": 2
  }
}
```

### Webhooks

#### Créer un webhook

```
POST /api/v1/webhooks
```

**Corps de la requête:**

```json
{
  "url": "https://your-server.com/callback",
  "events": ["sale.completed", "question.received", "refund.requested"],
  "secret": "your_secret_key",
  "description": "Main webhook for sales and customer service"
}
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": {
    "id": "webhook-123",
    "url": "https://your-server.com/callback",
    "events": ["sale.completed", "question.received", "refund.requested"],
    "description": "Main webhook for sales and customer service",
    "created_at": "2025-05-11T22:30:00Z",
    "updated_at": "2025-05-11T22:30:00Z",
    "status": "active"
  }
}
```

#### Récupérer tous les webhooks

```
GET /api/v1/webhooks
```

**Exemple de réponse:**

```json
{
  "success": true,
  "data": [
    {
      "id": "webhook-123",
      "url": "https://your-server.com/callback",
      "events": ["sale.completed", "question.received", "refund.requested"],
      "description": "Main webhook for sales and customer service",
      "created_at": "2025-05-11T22:30:00Z",
      "updated_at": "2025-05-11T22:30:00Z",
      "status": "active"
    },
    // Plus de webhooks...
  ],
  "meta": {
    "total": 1
  }
}
```

#### Mettre à jour un webhook

```
PATCH /api/v1/webhooks/{webhookId}
```

**Corps de la requête:**

```json
{
  "events": ["sale.completed", "question.received", "refund.requested", "prompt.viewed"],
  "status": "inactive"
}
```

#### Supprimer un webhook

```
DELETE /api/v1/webhooks/{webhookId}
```

## Modèles de données

### Prompt

| Champ | Type | Description |
|-------|------|-------------|
| id | string | Identifiant unique |
| title | string | Titre du prompt |
| description | string | Description du prompt |
| content | string | Contenu du prompt |
| price | number | Prix du prompt |
| category | string | Catégorie du prompt |
| tags | array | Liste de tags |
| image_url | string | URL de l'image |
| created_at | string | Date de création |
| updated_at | string | Date de dernière mise à jour |
| views | number | Nombre total de vues |
| sales | number | Nombre total de ventes |
| rating | number | Note moyenne |
| reviews_count | number | Nombre d'avis |
| on_promotion | boolean | Si le prompt est en promotion |
| promotion_percentage | number | Pourcentage de réduction |
| promotion_end_date | string | Date de fin de promotion |
| user | object | Informations sur l'auteur |
| variations | array | Variations du prompt |

### Bundle

| Champ | Type | Description |
|-------|------|-------------|
| id | string | Identifiant unique |
| name | string | Nom du bundle |
| description | string | Description du bundle |
| price | number | Prix du bundle |
| original_price | number | Prix original (somme des prompts) |
| savings_percentage | number | Pourcentage d'économie |
| prompt_count | number | Nombre de prompts inclus |
| image_url | string | URL de l'image |
| created_at | string | Date de création |
| updated_at | string | Date de dernière mise à jour |
| sales | number | Nombre total de ventes |
| prompts | array | Liste des prompts inclus |

### Promotion

| Champ | Type | Description |
|-------|------|-------------|
| id | string | Identifiant unique |
| name | string | Nom de la promotion |
| description | string | Description de la promotion |
| discount_percentage | number | Pourcentage de réduction |
| start_time | string | Date de début |
| end_time | string | Date de fin |
| status | string | Statut (scheduled, active, expired, cancelled) |
| prompt_ids | array | Liste des IDs de prompts |
| created_at | string | Date de création |
| updated_at | string | Date de dernière mise à jour |
| prompts_count | number | Nombre de prompts inclus |
| prompts | array | Liste des prompts inclus |
| performance | object | Métriques de performance |

## Webhooks Events

Les webhooks permettent de recevoir des notifications en temps réel pour différents événements:

### sale.completed

Déclenché lorsqu'un prompt est vendu.

```json
{
  "event": "sale.completed",
  "timestamp": "2025-05-11T22:45:00Z",
  "data": {
    "sale_id": "sale-123",
    "user_id": "user-456",
    "prompt_id": "prompt-789",
    "amount": 45,
    "currency": "USD",
    "prompt": {
      "id": "prompt-789",
      "title": "Advanced Data Analysis Framework"
    }
  }
}
```

### question.received

Déclenché lorsqu'un client pose une question.

```json
{
  "event": "question.received",
  "timestamp": "2025-05-11T22:50:00Z",
  "data": {
    "question_id": "question-123",
    "user_id": "user-456",
    "prompt_id": "prompt-789",
    "question": "Does this prompt work with GPT-4?",
    "prompt": {
      "id": "prompt-789",
      "title": "Advanced Data Analysis Framework"
    }
  }
}
```

### refund.requested

Déclenché lorsqu'un client demande un remboursement.

```json
{
  "event": "refund.requested",
  "timestamp": "2025-05-11T22:55:00Z",
  "data": {
    "refund_id": "refund-123",
    "user_id": "user-456",
    "prompt_id": "prompt-789",
    "purchase_id": "purchase-012",
    "reason": "The prompt doesn't work as described with Claude AI.",
    "purchase_date": "2025-05-10T14:30:00Z",
    "purchase_amount": 39.99,
    "days_since_purchase": 1,
    "prompt": {
      "id": "prompt-789",
      "title": "Advanced Data Analysis Framework"
    }
  }
}
```

### prompt.viewed

Déclenché lorsqu'un prompt est consulté.

```json
{
  "event": "prompt.viewed",
  "timestamp": "2025-05-11T23:00:00Z",
  "data": {
    "view_id": "view-123",
    "prompt_id": "prompt-789",
    "user_id": "user-456",
    "source": "search",
    "prompt": {
      "id": "prompt-789",
      "title": "Advanced Data Analysis Framework"
    }
  }
}
```

## Exemples d'intégration

### Exemple de client JavaScript

```javascript
class SnackPromptClient {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.snackprompt.com/api/v1';
    this.timeout = options.timeout || 30000;
  }

  async request(method, endpoint, data = null, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    // Ajouter les paramètres de requête
    if (Object.keys(params).length > 0) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });
    }
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: this.timeout
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    
    // Gérer les erreurs
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }
    
    return response.json();
  }
  
  // Prompts
  async getPrompts(params = {}) {
    return this.request('GET', '/prompts', null, params);
  }
  
  async getPrompt(promptId, params = {}) {
    return this.request('GET', `/prompts/${promptId}`, null, params);
  }
  
  async createPrompt(data) {
    return this.request('POST', '/prompts', data);
  }
  
  async updatePrompt(promptId, data) {
    return this.request('PATCH', `/prompts/${promptId}`, data);
  }
  
  async deletePrompt(promptId) {
    return this.request('DELETE', `/prompts/${promptId}`);
  }
  
  // Bundles
  async getBundles(params = {}) {
    return this.request('GET', '/bundles', null, params);
  }
  
  async getBundle(bundleId) {
    return this.request('GET', `/bundles/${bundleId}`);
  }
  
  async createBundle(data) {
    return this.request('POST', '/bundles', data);
  }
  
  // Analytics
  async getPromptStats(params = {}) {
    return this.request('GET', '/analytics/prompts', null, params);
  }
  
  async getPromptPerformance(promptId, params = {}) {
    return this.request('GET', `/analytics/prompts/${promptId}/performance`, null, params);
  }
  
  async getHourlyAnalytics(params = {}) {
    return this.request('GET', '/analytics/hourly', null, params);
  }
  
  // Customer Support
  async getQuestions(params = {}) {
    return this.request('GET', '/customer-support/questions', null, params);
  }
  
  async answerQuestion(questionId, response) {
    return this.request('POST', `/customer-support/questions/${questionId}/respond`, { response });
  }
  
  async approveRefund(refundId) {
    return this.request('POST', `/customer-support/refunds/${refundId}/approve`);
  }
  
  async denyRefund(refundId, reason) {
    return this.request('POST', `/customer-support/refunds/${refundId}/deny`, { reason });
  }
  
  // Promotions
  async createPromotion(data) {
    return this.request('POST', '/promotions', data);
  }
  
  // Webhooks
  async createWebhook(data) {
    return this.request('POST', '/webhooks', data);
  }
}

// Exemple d'utilisation
const client = new SnackPromptClient('your_api_key');

// Récupérer tous les prompts
const { data: prompts } = await client.getPrompts({ 
  category: 'marketing',
  limit: 20,
  sort: 'sales',
  order: 'desc'
});

// Créer un nouveau prompt
const { data: newPrompt } = await client.createPrompt({
  title: 'Email Marketing Conversion Booster',
  description: 'Increase your email open rates and conversions',
  content: 'Create a compelling email sequence...',
  price: 45,
  category: 'marketing',
  tags: ['email', 'conversion', 'copywriting']
});

// Optimiser les prix en fonction des performances
const { data: stats } = await client.getPromptStats();
for (const prompt of stats) {
  if (prompt.conversion_rate > 0.12 && prompt.views_last_hour > 20) {
    await client.updatePrompt(prompt.id, {
      price: Math.round(prompt.price * 1.05)
    });
    console.log(`Increased price for prompt ${prompt.id} to ${Math.round(prompt.price * 1.05)}€`);
  }
}
```

### Exemple de webhook handler

```javascript
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Middleware pour vérifier la signature du webhook
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-snackprompt-signature'];
  const webhookSecret = 'your_webhook_secret';
  
  if (!signature) {
    return res.status(401).json({ error: 'No signature provided' });
  }
  
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = hmac.update(JSON.stringify(req.body)).digest('hex');
  
  if (signature !== digest) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
};

app.post('/webhook', verifyWebhookSignature, (req, res) => {
  const { event, timestamp, data } = req.body;
  
  // Traiter l'événement
  switch (event) {
    case 'sale.completed':
      console.log(`New sale: ${data.prompt.title} for ${data.amount}${data.currency}`);
      // Logique pour traiter une vente
      break;
    case 'question.received':
      console.log(`New question: "${data.question}" for prompt "${data.prompt.title}"`);
      // Logique pour traiter une question
      break;
    case 'refund.requested':
      console.log(`Refund requested: ${data.prompt.title}, reason: "${data.reason}"`);
      // Logique pour traiter une demande de remboursement
      break;
    case 'prompt.viewed':
      console.log(`Prompt viewed: ${data.prompt.title} by user ${data.user_id}`);
      // Logique pour traiter une vue
      break;
    default:
      console.log(`Unknown event: ${event}`);
  }
  
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook handler listening on port 3000');
});
```
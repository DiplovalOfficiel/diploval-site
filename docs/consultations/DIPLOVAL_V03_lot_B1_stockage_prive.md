# Diploval V0.3 — Lot B1 : fondation du stockage privé

**Statut : développement interne, contrôlé par tests automatiques, non activé en production.**

Ce lot prépare la conservation et la récupération des contributions V0.3 dans un stockage serveur isolé. Il **n'ajoute aucune nouvelle route HTTP**, ne connecte aucun formulaire public à ce stockage et ne traite aucune contribution réelle.

## Fonctions préparées

- Création d'un dossier de contribution **privé par défaut**, à partir du modèle V0.3 du lot A.
- Réservation atomique d'une référence publique, distincte de l'identifiant interne et sans propriété d'authentification.
- Lecture privée impossible sans politique d'autorisation injectée par un futur service **après authentification côté serveur**.
- Contrôle des droits **avant la recherche** d'un dossier privé, puis de nouveau avant le retour de son contenu.
- Écriture conditionnelle par étiquette de version (ETag) : les opérations concurrentes ou obsolètes échouent.
- Relecture après chaque enregistrement et vérification de l'ETag ; aucun succès annoncé sans confirmation.
- Révisions et décisions de modération traçables, sans écrasement d'une version publique encore active.
- Lecture publique limitée à la projection autorisée du dernier texte validé, **sans notes internes, coordonnées, historiques privés ni consentements**.
- Si un dépôt a réservé une référence mais échoue avant de créer le dossier, la réservation demeure bloquée : l'opération échoue sans exposer de contenu ; un traitement d'entretien séparé sera nécessaire.

## Modèle d'autorisation

L'adaptateur exige un callback `authorize(principal,action,entry)`, sans valeur de repli permissive.

**Point critique :** ce callback et le `principal` ne sont pas encore alimentés par une authentification réelle. Le futur service doit produire les identités à partir de sessions vérifiées, jamais d'une valeur `role`, `email` ou `id` transmise librement par le navigateur. Les tests utilisent volontairement une politique fictive pour vérifier les refus. Cette étape **ne constitue donc pas une sécurité de bout en bout**.

## Stockage et protection des données

- L'adaptateur attend l'interface d'écriture conditionnelle déjà utilisée dans l'administration de modération : `getWithMetadata` et `set`.
- Le choix définitif du stockage, la localisation des données, les sauvegardes, leur restauration, le chiffrement au repos, la séparation des secrets, les règles de conservation, l'effacement et les droits des personnes restent **à expertiser et à valider**.
- Les contributions liées aux engagements électoraux sont susceptibles de révéler des **opinions politiques**, donc des données particulièrement protégées.
- Le code ne doit pas être relié à de véritables contributions avant une validation juridique/RGPD et une revue de sécurité.

## Essais automatiques

Depuis la racine du dépôt :

```sh
node --test tests/dialogue-model.test.mjs tests/dialogue-storage.test.mjs
```

Les nouveaux tests vérifient les règles de création, la confidentialité des lectures, les contrôles d'accès, la réservation des références, les erreurs de concurrence, la conservation des versions, le retrait de publication et l'échec sans confirmation.

Le build Netlify de cette branche les exécute avant la génération des pages. Ces tests unitaires **ne remplacent pas** les essais de charge, d'authentification réelle, de résilience ni un audit de sécurité.

## Prochain travail — Lot B2 et suivants

1. Définir des comptes et droits vérifiés côté serveur, distincts des accès déjà utilisés pour le CMS ou la modération historique.
2. Sélectionner et configurer un stockage privé, avec chiffrement, sauvegarde, restauration et politique de conservation adaptés à la sensibilité des données.
3. Définir l'API de dépôt/lecture avec protections anti-abus, limitation de fréquence, politiques CORS/CSRF, contrôles de taille et vérification explicite du consentement.
4. Préparer les jetons temporaires d'accès auteur, envoyés à une adresse de suivi vérifiée, sans jamais utiliser la référence comme mot de passe.
5. Créer les routes internes de modération et les conditions de publication, de retrait, de rectification et d'effacement.
6. Réaliser des essais réels **uniquement avec des jeux de données fictifs** avant d'envisager une ouverture.

**La consultation V0.2 reste indépendante. La V0.3 n'est pas ouverte au public.**

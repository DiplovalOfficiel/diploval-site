# Diploval V0.3 — Lot B2 : accès auteur et chiffrement privé (préparation)

**Statut au 19 novembre 2026 : modules et tests de développement uniquement.** Aucune nouvelle route publique ou administrative, aucun courriel réel, aucune configuration des clés et aucun stockage de contributions V0.3 sur la production.

## Objectifs

Une référence publique de contribution (exemple : `CE-2026-...`) **n'est jamais un secret d'accès**. L'auteur doit pouvoir, à terme, récupérer son propre dossier sans accès à celui d'autrui.

### Accès auteur

Module `netlify/lib/dialogue-author-access.mjs` :

- Le service exige un **chargement serveur de la fiche existante** (`loadEntry`), un stockage privé à écritures conditionnelles et une fonction d'envoi de lien (`sendLink`). Ces dépendances sont injectées et **ne sont pas encore configurées avec les vrais services Diploval**.
- Une demande de lien utilise une référence **interne** et une adresse de suivi. La réponse est générique, même si l'adresse ne correspond pas ; aucune donnée de dossier n'est renvoyée au demandeur.
- Si l'adresse correspond à celle de la fiche, un lien contenant un jeton cryptographiquement aléatoire peut être remis à un transport mail de confiance. Le jeton n'est **jamais rendu dans la réponse de la demande**.
- Le stockage ne conserve qu'une **empreinte HMAC** du jeton, sous un nom de domaine dédié ; aucune URL de récupération ni jeton en clair dans les données persistantes.
- Un lien expire après **10 minutes**, est **à usage unique** et son utilisation est marquée par écriture conditionnelle atomique.
- Une consommation correcte crée une session opaque de **2 heures**. La révocation et l'expiration sont vérifiées sur le stockage à chaque contrôle d'accès.
- Seul un principal vérifié côté serveur peut lire ou proposer une révision de **son propre** dossier. Une identité JSON forgée, un ancien numéro de contribution ou un rôle librement indiqué par le navigateur ne suffisent pas.
- Aucune habilitation de modération n'est accordée par ce module.
- Le service HTTP futur devra convertir les sessions en **cookies HttpOnly + Secure + SameSite**, empêcher leur diffusion aux scripts du navigateur, et installer les contrôles CSRF et anti-abus. Ce module ne fabrique aucun cookie et ne remplace pas la sécurisation du serveur.

**Point à ne pas surestimer :** sans système réel de courriel et de vérification d'adresse configuré, il n'y a **pas encore d'authentification citoyenne utilisable**. Les dépendances d'identité des tests sont fictives et isolées. La protection contre les demandes massives de liens, la recherche d'identifiants, la réémission et l'expiration des dossiers doivent être ajoutées au futur endpoint.

### Chiffrement privé

Module `netlify/lib/dialogue-encrypted-store.mjs` :

- Enveloppe **AES-256-GCM** avec nonce aléatoire de 96 bits, intégrité authentifiée et données associées au **chemin précis de stockage** : copier un enregistrement sur une autre clé ne permet pas de le déchiffrer.
- Le contenu original ne doit pas apparaître en clair dans le JSON persistant ; le stockage externe ne conserve que `version`, `algorithm`, `iv`, `payload` et `tag`.
- Le module préserve les **ETag** et les écritures conditionnelles du stockage du lot B1.
- Une enveloppe altérée, mal formée ou chiffrée avec une mauvaise clé est refusée sans exposer de contenu.
- Le chiffrement ne s'active **pas automatiquement** : une future initialisation côté serveur devra fournir la clé confidentielle et choisir le stockage.
- Il manque encore la rotation de clé, la sauvegarde/restauration vérifiée, la procédure d'incident et les traitements d'effacement de données.

### Configuration future (NON activée)

Aucun secret n'est codé dans le dépôt. Avant l'activation, prévoir dans les variables d'environnement **réservées aux fonctions serveur** :

- Une clé HMAC aléatoire de **32 octets minimum**, spécifique aux liens et sessions V0.3, distincte de toutes les clés de l'ancien système de modération.
- Une clé de chiffrement AES de **32 octets**, conservée hors du dépôt, avec une procédure de sauvegarde sécurisée et de rotation.
- Une configuration de stockage séparée du stockage des décisions de modération V0.2.
- Le transport des e-mails de vérification et la gestion des indisponibilités, sans journaliser les liens de connexion ni les jetons.
- Une gestion d'identité **distincte** pour les modérateurs (autorisations fines et traçabilité des décisions). Aucune authentification du CMS n'est réutilisée automatiquement.

Le nom précis des variables, leur localisation définitive, les rôles et les règles de rotation seront fixés **après examen juridique et technique**. Ne pas ajouter les clés à des fichiers `.env` committés, aux JSON du site, au HTML ni aux URL.

## Vérifications et limites

Commande exécutée avant chaque construction Netlify sur cette branche :

```bash
node --test tests/dialogue-model.test.mjs tests/dialogue-storage.test.mjs tests/dialogue-author-access.test.mjs tests/dialogue-encrypted-store.test.mjs
```

Les tests vérifient les droits d'accès, le caractère unique d'un lien, sa durée de validité, les sessions révoquées, l'absence de jetons en clair, l'authenticité des données chiffrées et la conservation des règles de versionnement V0.3.

Ces tests ne prouvent **ni** la conformité RGPD **ni** la résistance de la plateforme entière aux attaques ; ils ne remplacent pas les essais de charge, l'audit indépendant et la validation juridique.

## Étapes avant toute utilisation réelle

1. Établir les durées de conservation, finalités, bases légales et garanties particulières pour les réponses qui peuvent révéler des opinions politiques.
2. Choisir et configurer une infrastructure privée de stockage, les règles d'accès des opérateurs, la sauvegarde/restauration et la gestion des clés, avec audit.
3. Construire le service serveur autorisant les demandes de liens et contrôlant le chargement des dossiers ; mettre en place limitations de fréquence, anti-spam, réponses anti-énumération et protection CSRF.
4. Mettre en place le véritable transport e-mail et vérifier la délivrabilité, les expirations, les revocations et les liens réutilisés.
5. Prévoir un parcours adapté aux citoyens ne disposant pas d'une adresse e-mail.
6. Ajouter et tester les routes privées de modération et les droits d'accès du personnel, avant de les relier aux vrais fils de discussion.
7. Effectuer les tests de bout en bout avec données fictives (mobile, PC, sécurité, confidentialité), puis demander **une validation explicite** avant ouverture.

**La consultation électorale V0.2 et le site public restent indépendants.** La maquette V0.3 et les modules B1/B2 sont à ce stade des outils de développement.

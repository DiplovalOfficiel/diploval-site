# Diploval — Consultations participatives et dialogiques V0.3

**Statut : cadrage fonctionnel validé dans son principe ; document de conception, pas une mise en service.**

**Décision du 18 novembre 2026 :** lecture et échanges publics, ouverts à tout visiteur, sans obligation d'avoir préalablement participé au questionnaire, avec **modération humaine avant toute publication**.

## 1. Finalité et principes non négociables

- Favoriser la confrontation argumentée, la nuance, les compléments de sources et les propositions alternatives.
- Ne jamais transformer la consultation en système de popularité : pas de « j'aime / je n'aime pas » ni de classement des opinions par votes.
- Ne jamais confondre **publication après modération** et **approbation par Diploval**. Un avertissement explicite accompagne chaque fil public.
- Préserver la contribution initiale et les évolutions de l'auteur ; tenir compte des droits de rectification, de retrait de publication et d'effacement applicables.
- Ne publier automatiquement **aucune contribution, réponse, correction ou pièce jointe**.
- Distinguer les faits vérifiés, les opinions attribuées et les points restant à instruire.
- Préserver la V0.2 et ses fonctionnalités, indépendamment de cette nouvelle version.

## 2. Parcours citoyen : quatre espaces

### A. Contribuer
Le questionnaire initial reste distinct des discussions. Le visiteur commence par une expression libre, puis peut consulter des pistes facultatives. Une contribution est **privée par défaut** et transmise à la modération.

### B. Échanger
Les arguments autorisés à publication apparaissent par thème, regroupés en fils courts et lisibles. Tous les visiteurs peuvent les lire ; tout visiteur peut **proposer** une réponse, même sans contribution initiale. Les réponses restent en attente de modération avant leur éventuel affichage.

Organisation proposée : un argument principal, des réponses chronologiques, une éventuelle précision de l'auteur et une mise au point contextualisée de Diploval. Éviter les sous-fils imbriqués à l'infini ; prévoir recherche, pagination, filtre thématique et lien permanent vers le fil.

**Respect des désaccords :** publication possible de critiques de Diploval et de réponses opposées si elles respectent la charte et les exigences légales. Les commentaires signalés ne sont pas supprimés sur simple signalement.

### C. Suivre sa contribution
Après envoi, une référence de dossier est attribuée automatiquement, par exemple `CE-2026-0012`. Il faut **séparer** cette référence affichable d'un secret personnel d'accès. Connaître le numéro ne donne aucun droit de lecture privée ni de modification.

Un auteur peut demander un lien temporaire envoyé vers l'adresse vérifiée qu'il a utilisée. Le lien est à usage limité, expire et n'est ni publié ni stocké en clair. L'auteur peut proposer une nouvelle version ou compléter des références.

Toute modification crée une **nouvelle révision** en attente de contrôle humain. L'ancienne version publique reste affichée jusqu'à la validation de la nouvelle. L'historique interne est tracé ; l'affichage public des changements se limite aux informations appropriées et autorisées. Prévoir suppression/rectification de données selon le droit applicable et des durées de conservation documentées.

### D. Comprendre les suites
Une synthèse contradictoire présente les arguments distincts, les sources contrôlées, les propositions, les points non tranchés et les raisons des décisions ou recommandations. Ne pas faire passer le nombre de commentaires pour un sondage représentatif.

## 3. Modération et signalements

Deux files d'instruction séparées, accessibles uniquement aux personnes habilitées :
1. **Nouvelles contributions et réponses :** reçue → à examiner → vérifications utiles → publication autorisée ou non retenue (motif consigné) ; possibilité de demander une précision.
2. **Signalements :** reçu → analysé → aucune action / masquage motivé / correction / demande à l'auteur / autre suite documentée.

La modération est préalable à toute mise à disposition publique. Le signalement d'un commentaire produit un ticket privé, horodaté, sans retrait automatique. Prévoir un dispositif anti-abus et un traitement prioritaire des divulgations de données personnelles, menaces ou contenus manifestement illicites.

L'administration doit montrer l'origine de la réponse, son fil, sa version et l'historique de traitement, **sans exposer au public** coordonnées, adresse IP, secrets d'accès, notes internes ou identifiants de traitement privés. Les décisions humaines restent traçables et révisables.

## 4. Données et architecture technique — proposition, non déployée

**Données privées** (stockage serveur protégé ; jamais dans le dépôt GitHub, les JSON publics ou le HTML statique) :
- `consultations` : identifiant, version, statut, dates, sujets
- `submissions` : référence publique, identifiant interne opaque, auteur/contact protégé, texte, consentements, état d'instruction
- `revisions` : versions datées et auteur de la modification, avec séparation des données privées
- `threads` et `replies` : regroupement par argument/thème, contenu modéré, états de publication
- `reports` : signalement, raison, objet concerné, traitement et décision
- `audit_events` : actions horodatées et effectuées par des personnes habilitées
- `access_tokens` : secrets **hachés**, à durée limitée et à usage restreint

**Lecture publique :** seule une API filtrée peut exposer les fils explicitement autorisés à publication, après suppression des données privées et contrôle de tous les champs retournés. Aucun accès public direct au stockage des soumissions ni aux journaux de modération.

**Écriture :** routes distinctes pour (a) déposer une contribution ou réponse, (b) proposer une révision autorisée, (c) signaler, (d) modérer. Appliquer contrôles serveur, limites de taille et de fréquence, anti-spam, protection contre la falsification des requêtes, validation de l'origine et règles strictes d'autorisation.

L'infrastructure existante Netlify Forms et la modération privée constituent une base d'étude, **mais ne fournissent pas aujourd'hui** un espace public de discussions ni un système de modification des contributions. Ne pas prétendre qu'un formulaire Netlify seul réalise ces fonctionnalités.

## 5. Respect des droits et de la confidentialité

Les réponses sur les sujets électoraux peuvent révéler des opinions politiques : une **analyse juridique et RGPD spécifique** doit être réalisée avant l'activation, y compris sur les données sensibles, la base légale, l'éventuelle nécessité d'un consentement explicite, les sous-traitants, les durées de conservation, les demandes des personnes et la sécurité.

Le dépôt d'une contribution n'autorise pas en soi sa publication nominative. Prévoir un consentement ou une autorisation explicite et distincte pour rendre un extrait public, selon la base légale validée ; l'affichage sous pseudonyme ou sans nom ne doit jamais être confondu avec une anonymisation irréversible. Si la personne refuse la publication, sa contribution peut être examinée de manière privée et agrégée uniquement dans les conditions autorisées.

Clarifier dans la notice : responsable, finalités, base légale, destinataires, hébergement, durées, modalités d'accès/rectification/retrait/effacement, et contact `consultations@diploval.fr`. Prévoir une validation humaine des décisions éditoriales et des demandes d'exercice de droits.

## 6. Déploiement par étapes — jamais automatiquement en production

**Lot V0.3-A :** architecture et règles éditoriales/juridiques ; conception des écrans publics, des modèles de données et de la modération.

**Lot V0.3-B :** prototype sur environnement de test isolé : lecture de fils fictifs, réponses fictives, signalements, file de modération, contrôles d'accès et sécurité.

**Lot V0.3-C :** suivi individuel : identifiant de dossier, accès personnel vérifié, révisions horodatées, consentement public distinct, rectification et retrait, tests sur données fictives.

**Lot V0.3-D :** validation avant ouverture : essais complets sur PC/mobile, autorisations, attaques simples, modération, restauration des données, limites de charge, RGPD, droit de réponse, confidentialité et publication du guide de modération.

Chaque lot exige une validation avant passage au suivant. **L'ouverture de la consultation électorale V0.2 ne doit pas dépendre du développement V0.3.** Ne pas activer les fils publics, les comptes ni les modifications tant que V0.3 n'est pas approuvée et testée.

## 7. Décisions fonctionnelles déjà approuvées

- Discussions lisibles par tous et réponses proposées par tous, même sans participation initiale.
- Modération **avant** publication des contributions et réponses.
- Signalement des contenus, sans suppression automatique.
- Référence individuelle de suivi et modification contrôlée, avec traçabilité des versions.
- Lecture par thème, échanges argumentés, contextualisation des désaccords.
- Aucun classement des opinions par popularité.

**À préciser avant codage du prototype :** pseudonyme public facultatif ou affichage anonyme, modalités de vérification de l'e-mail pour les réponses, politique de durée de conservation, et charte détaillée de modération ; ces points ne doivent pas être supposés validés.

# Diploval V0.3 — Lot B3 : contrôleur serveur interne, non exposé

**État : infrastructure de développement uniquement, sans route Netlify et sans donnée citoyenne réelle.**

Ce lot relie les modèles métier A, le stockage B1 et les sessions chiffrées B2 à un **contrôleur serveur injectable**. Il n'est importé par **aucune fonction Netlify déployée**. Sa construction réussie n'ouvre aucun formulaire, échange, authentification ni espace de modération sur diploval.fr.

## Fonctionnement préparé

Le fichier source est \`netlify/lib/dialogue-service-v03.mjs\`.

Le contrôleur est **désactivé par défaut** : son instanciation sans activation retourne systématiquement un refus (503). Une activation éventuelle exigerait des dépendances serveur explicitement fournies, jamais une configuration partielle par défaut :

- une origine HTTPS contrôlée, le contrôle de la méthode et de l'origine des écritures ;
- un composant de **limitation distribuée des requêtes**, notamment pour les liens de connexion et les tentatives d'accès ;
- un service de correspondance entre la référence publique et l'identifiant privé, sans révéler ce dernier au navigateur ;
- le système d'accès auteur à lien unique B2 et le dépôt de dossiers B1 ;
- un service **distinct** d'authentification professionnelle, capable de fournir un principal vérifié et les seuls droits de modération nécessaires ;
- une lecture publique limitée à la projection déjà filtrée et autorisée.

### Parcours de développement simulés

| Fonction prévue | Contrôle requis | Informations exposables |
|---|---|---|
| Demander un lien d'accès | Référence publique + adresse concordante, contrôles anti-abus | Réponse générique, aucun jeton ni identifiant interne |
| Valider un lien | Jeton aléatoire à usage unique non expiré | Cookie de session HttpOnly, Secure, SameSite=Strict ; jamais de jeton dans le JSON |
| Voir son dossier | Session auteur active, association vérifiée au dossier | Textes personnels, versions et états ; aucun audit interne ni adresse dans la réponse |
| Proposer une nouvelle version | Session auteur, contrôles de taille et de version | Accusé de réception ; ancienne version publique conservée jusqu'à validation |
| Consulter pour modérer | Session professionnelle spécifique et autorisée | Version et état de la contribution, sans contact privé ni historique interne intégral dans la vue synthétique |
| Autoriser/refuser | Décision habilitée, concurrence contrôlée, motif obligatoire pour refus | Seule une version approuvée et autorisée passe en public |
| Retirer une publication | Modérateur habilité, motif documenté | Disparition immédiate de la projection publique, sans effacement physique automatisé |
| Lire un argument public | Lecture publique filtrée et limitation d'accès | Aucune coordonnée, aucun secret, aucune note de modération |

Les routes utilisées dans le module sont **des chemins de simulation testés en mémoire**. Il n'existe aucun point d'entrée HTTP V0.3 qui les expose aujourd'hui.

### Mesures vérifiées dans le code

1. Tous les appels d'écriture exigent une origine exacte et un en-tête applicatif spécifique, en complément du cookie strict. Un contrôle CSRF complet reste à auditer au futur point d'entrée.
2. Les réponses privées ne sérialisent jamais directement une fiche complète de stockage.
3. Un citoyen n'obtient aucun droit de modération en annonçant un rôle, un nom ou un identifiant dans sa requête.
4. L'auteur est résolu **à partir de sa session**, sans devoir fournir son identifiant interne au navigateur.
5. Un modérateur doit être authentifié par un service serveur distinct ; le contrôleur ne décide jamais qu'un en-tête utilisateur constitue une authentification.
6. Les refus de publication sont motivés et les écritures concurrentes rejetées sans annoncer un succès fictif.
7. La limitation des requêtes n'a **aucun mode permissif de repli** dans le contrôleur activé ; une erreur technique de dépendance entraîne l'indisponibilité.

### Ce qui n'est pas encore prêt pour une exploitation réelle

- L'authentification de modération **n'est pas reliée à un fournisseur réel** ; seuls les tests simulent une session professionnelle. Ne pas réemployer directement les identifiants de l'administration historique.
- Le fournisseur de limitation de fréquence, l'envoi de courriels, la résolution privée des références et les clés de chiffrement **ne sont pas configurés**.
- Aucun outil de sélection de la file de modération, aucune gestion des habilitations par collaborateur, aucune fonction de réexamen/recours, aucun export complet ou journal d'audit externe n'est intégré à ce contrôleur.
- Le chiffrement, la sauvegarde/restauration, la rotation des clés, la gestion des incidents, les mises à jour d'une adresse de suivi et les droits de suppression/effacement restent à finaliser.
- L'analyse juridique/RGPD, particulièrement pour les opinions politiques éventuellement exprimées, est une condition bloquante avant le traitement de données réelles.
- Le futur parcours public devra être testé sur PC et mobile, dans le respect de la charte des échanges.

## Tests de ce lot

Le build Netlify exécute les suites métier A, stockage B1, accès/chiffrement B2 et service B3 :

\`\`\`sh
node --test tests/dialogue-model.test.mjs tests/dialogue-storage.test.mjs tests/dialogue-author-access.test.mjs tests/dialogue-encrypted-store.test.mjs tests/dialogue-b2-integration.test.mjs tests/dialogue-service-v03.test.mjs
\`\`\`

Les tests B3 vérifient la désactivation par défaut, l'origine des écritures, les limites de requêtes, les réponses génériques, les accès personnels, les refus de modération pour les citoyens, les décisions traçables et l'absence de publication sans accord humain. Le succès des tests ne constitue pas un audit de sécurité.

## Prochaine étape

Préparer une architecture d'habilitation professionnelle dédiée et une vraie file de modération **sur environnement de test fermé**, après choix du fournisseur de stockage et du transport des courriels. Le déploiement de fonction HTTP et toute collecte réelle devront être soumis à une validation supplémentaire explicite.

**La consultation électorale V0.2 et le site public restent inchangés fonctionnellement.**

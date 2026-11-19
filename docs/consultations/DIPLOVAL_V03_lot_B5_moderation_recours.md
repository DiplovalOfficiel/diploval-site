# Diploval — Consultations V0.3, lot B5
## File de modération, recours et maquette d’administration

**Statut : prototype interne non connecté. Aucun accès citoyen ni modérateur réel n'est activé.**

Ce lot complète le noyau V0.3 A–B4 avec un circuit de traitement distinct pour les contributions et les demandes de réexamen. Il ne modifie **aucun** formulaire public opérationnel, ne publie aucune contribution et ne donne aucun droit nouveau aux comptes de l’administration actuelle.

### 1. File des contributions

Module \`netlify/lib/dialogue-moderation-queue.mjs\` :

- Affichage par dossier en attente, publié, refusé ou retiré ; filtrage par consultation et pagination bornée.
- Lecture préalable des habilitations puis **nouveau contrôle sur chaque dossier**. Une référence trouvée dans un index ne constitue jamais une autorisation.
- Un observateur habilité peut consulter les dossiers attribués, mais ne peut pas valider, refuser ni retirer une contribution.
- La vue de file ne contient que référence, consultation, type, état, version et extrait limité. Elle **n'inclut jamais** l'adresse e-mail, l'audit, le consentement ou le nom/pseudonyme.
- Un index mal formé, incomplet ou trop grand entraîne un refus ; une panne de stockage ne sera pas interprétée comme une file vide.

**Limite :** la fonction \`listCandidateIds()\` est injectée. Sa véritable alimentation et sa synchronisation avec les créations, révisions, retraits et droits des personnes restent à développer dans le stockage réel. Les essais utilisent un index fictif. Le balayage borné de ce prototype devra évoluer vers une pagination côté stockage pour les grandes consultations.

### 2. Recours et réexamen des décisions

Modules \`netlify/lib/dialogue-appeals.mjs\` et \`netlify/lib/dialogue-appeal-queue.mjs\` :

- L’auteur authentifié peut déposer **une demande de réexamen par version rejetée ou publication retirée**, avec son motif.
- Le recours est conservé séparément du texte public. Son contenu n'est jamais ajouté à la contribution publique.
- La modération peut maintenir une décision, proposer une nouvelle rédaction à l'auteur ou transmettre le recours à un superviseur.
- Une escalade ne peut être résolue que par un superviseur habilité ; elle ne peut pas être fermée indéfiniment par un examinateur.
- Chaque opération exige un motif, conserve un historique privé et vérifie l'état attendu (écriture ETag conditionnelle).
- **Aucun résultat de recours ne change automatiquement l'état public** d'une contribution. Toute éventuelle publication/republication reste une action distincte, nécessitant l'autorisation de diffusion et l'examen de la nouvelle version.
- Le citoyen voit une projection minimale de son propre recours ; l'observateur, l'examinateur et le superviseur ne voient que les recours relevant de leur habilitation.
- Les files de recours ne présentent jamais une adresse privée, un secret d'authentification ni l'historique interne intégral.

**Limites :** \`listCandidateAppeals()\` reste un index fictif et injecté ; le lien entre registre des recours et file réelle doit être traité avec persistance atomique et procédure de reprise. Les notifications, délais de traitement, politique de recours, traitement des retraits RGPD et décisions finales du superviseur sont à formaliser. Une demande par version ne doit pas empêcher de demander un effacement ou un exercice de droit distinct.

### 3. Contrôleur de service interne

Le contrôleur existant \`netlify/lib/dialogue-service-v03.mjs\` peut **lorsqu'il est injecté en tests** traiter les chemins suivants :

| Chemin interne simulé | Usage | Contrôle |
|---|---|---|
| \`GET /moderation/queue\` | File des contributions | Authentification professionnelle et périmètre |
| \`GET /moderation/appeals-queue\` | File des demandes de recours | Authentification professionnelle et périmètre |
| \`GET /moderation/appeal\` | Fiche de recours | Droit de lecture du recours |
| \`POST /moderation/appeal/decide\` | Décision motivée et escalade | Examinateur ou superviseur selon le statut |
| \`POST /author/appeal\` | Demande de réexamen | Auteur vérifié de la contribution |
| \`GET /author/appeal\` | État de son recours | Auteur vérifié de la contribution |

Comme dans les lots antérieurs, **aucune fonction HTTP Netlify exposée n'importe ce contrôleur** : les chemins sont simulés par les tests et sont inaccessibles depuis diploval.fr. Les API n'ont pas été mises en service.

### 4. Maquette d'administration indépendante

Page de démonstration ajoutée à :

\`Diploval_Site_Complet_v20_2_Inscription_Zoom/admin/consultations-v03-b5/index.html\`

Elle permet de simuler, **uniquement dans la mémoire du navigateur**, la consultation des dossiers, les refus et validations motivés, les retraits, les demandes de recours et leur escalade. Elle affiche à chaque étape qu'il s'agit de **données fictives**.

La maquette ne contient **aucun appel réseau, stockage de navigateur, session réelle, courriel ni fonction de publication** ; elle n'est liée à aucune donnée du CMS, des utilisateurs ou des API internes.

**Important :** sa page HTML n'a **aucune authentification propre** et peut être consultée par URL directe sur une prévisualisation Netlify. Elle ne doit donc jamais être confondue avec une interface professionnelle sécurisée. Avant une intégration future, il faudra construire un véritable front-end derrière une vérification d'accès serveur et empêcher l'exposition des données privées sur un site purement statique.

### 5. Vérifications et ce qui reste à faire

Les tests du lot B5 sont exécutés avec les suites précédentes lors de la construction Netlify : file, séparation des rôles, pagination, recours, escalade, contrôle des décisions, interface fictive, absence d'appel réseau et refus de publication automatique.

**À faire avant toute ouverture** :

1. Fournir une véritable authentification du personnel, avec révocation, autorisations attribuées et journalisation des actions sensibles.
2. Déployer un stockage chiffré privé avec index de file, système de secours, test de restauration et rotation des clés.
3. Mettre en place des limites d'envoi et d'accès, une protection CSRF, une politique de durée de conservation et un traitement effectif des droits RGPD.
4. Finaliser le règlement des contributions, la charte éditoriale, les voies de recours et les délais, avec examen juridique (y compris les éventuelles données d'opinions politiques).
5. Développer et auditer un véritable espace d'administration connecté, avec navigation accessible, accusés de réception et notifications facultatives.
6. Effectuer des tests complets avec des données fictives et obtenir **une validation explicite** avant toute mise en service.

**La consultation électorale V0.2 reste indépendante.** Les travaux V0.3 ne doivent pas modifier son fonctionnement ou son calendrier.

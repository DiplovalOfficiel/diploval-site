# Diploval — Consultations V0.3, lot B6
## Suivi des dossiers, objectifs internes et réponses aux contributeurs

**Statut : module interne et maquette fictive, non raccordés aux utilisateurs ni aux boîtes mail réelles.** Les opérations ne sont pas activées sur diploval.fr. La consultation V0.2 et l'administration courante sont indépendantes.

Ce lot fait suite au B5 validé : file des contributions, recours et permissions des collaborateurs.

### 1. Un suivi fondé sur les événements réels, pas une promesse automatique

Module : \`netlify/lib/dialogue-followup.mjs\`.

- Les états sont dérivés des versions réellement enregistrées : en attente, nouvelle version en attente, publiée, refusée, version révisée refusée, retirée.
- Les recours sont suivis séparément : attente de réexamen, escalade et décision rendue.
- Un texte public approuvé reste le texte visible lorsqu'une nouvelle version est en cours d'examen ; un refus de révision ne supprime pas cette publication précédente.
- Un retrait n'est pas une suppression des données privées : les demandes d'effacement doivent suivre une procédure juridique et technique distincte.
- La projection destinée à l'auteur ou au modérateur ne contient **ni adresse e-mail, ni historique privé intégral, ni identité professionnelle, ni motivation interne non validée pour diffusion**.
- La date d'un événement est issue de la fiche enregistrée, et non d'une estimation ou d'un champ fourni par le navigateur.

**Délais** : ils sont **désactivés par défaut**. Ils n'apparaissent que si un responsable a fourni au serveur une politique explicite \`{enabled:true,version,reviewDays,appealDays}\` propre à la consultation. Le champ \`nonBinding:true\` les identifie comme **objectifs indicatifs internes**, et jamais comme délais légaux. Le dépassement déclenche un indicateur *attention_required*, sans refus automatique, radiation, publication ni notification.

La maquette prend pour seuls exemples **7 jours pour l'examen** et **14 jours pour un recours**. Ces valeurs ne sont **pas validées comme politique Diploval**. L'établissement réel des objectifs, les jours ouvrés éventuels, les suspensions, priorités et périodes de fermeture seront à décider au préalable.

### 2. Préparer une réponse personnelle, avec double validation

Module : \`netlify/lib/dialogue-contributor-responses.mjs\`.

- Un **examinateur** habilité peut rédiger un message : accusé de réception, demande de précisions, explication de décision ou information sur un recours.
- Chaque brouillon est lié à la consultation, à la référence et à la **version de mutation précise** du dossier. Une version devenue obsolète ne peut pas être approuvée.
- Un **superviseur différent du rédacteur** doit valider le texte, même lorsque le rédacteur dispose lui-même d'un rôle de superviseur. Les habilitations sont vérifiées à chaque opération.
- Un message en brouillon n'est **jamais lisible dans le dossier personnel**. Une réponse approuvée devient consultable dans le dossier par son auteur vérifié, sans être publiée dans le débat public.
- Une réponse approuvée peut être révoquée par un superviseur, avec un motif privé ; la décision de retrait n'efface pas automatiquement le dossier initial.
- Le dépôt et la modification sont protégés par écritures conditionnelles et relecture après sauvegarde. Aucune réussite ne doit être annoncée sans confirmation du stockage.
- Les projections n'exposent ni adresse privée ni journal de modération.

**Limitation actuelle** : un seul message de réponse peut être créé par mutation d'une contribution dans cette première version. Avant une exploitation réelle, il faudra choisir une structure autorisant plusieurs échanges, demandes de clarification et réponses successives, avec un index privé de messages et un identifiant par message. Le présent lot ne crée aucun index permanent des réponses.

**Aucun e-mail envoyé** : la validation d'une réponse ne déclenche ni notification, ni transfert de données, ni publication. L'envoi de notifications devra être **facultatif**, lié à une préférence distincte, avec vérification de l'adresse, gestion de la désinscription, envoi sans information sensible dans l'objet ou le contenu et mécanismes anti-abus. La boîte \`consultations@diploval.fr\` déjà utilisée pour la collecte/modération historique n'est pas raccordée au B6.

### 3. Rôles et contrôleur interne

Les droits professionnels B4/B5 sont complétés par :

| Rôle | Lire les dossiers habilités | Préparer une réponse | Valider une réponse |
|---|---|---|---|
| Observateur | Oui | Non | Non |
| Examinateur | Oui | Oui | Non |
| Superviseur | Oui | Oui | Oui, si rédigée par une autre personne |

L'identité professionnelle utilisée dans l'audit provient d'une **session vérifiée côté serveur**, jamais d'un champ \`staffId\` ou d'un rôle choisi par le navigateur.

Des chemins sont ajoutés au contrôleur **interne désactivé** \`netlify/lib/dialogue-service-v03.mjs\` :

- \`GET /author/followup\` : état du dossier de l'auteur authentifié.
- \`GET /author/response?mutation=...\` : réponse approuvée pour le dossier de cet auteur.
- \`GET /moderation/followup?id=...\` : suivi du dossier dans le périmètre autorisé.
- \`GET /moderation/response?id=...&mutation=...\` : réponse en préparation ou approuvée pour le modérateur habilité.
- \`POST /moderation/response/draft\` : dépôt d'un brouillon motivé.
- \`POST /moderation/response/approve\` : deuxième validation indépendante.

**Aucune fonction Netlify publique n'importe ou n'active ce contrôleur**. Il n'existe encore ni session réelle de contributeur V0.3, ni fournisseur d'identité professionnelle B6 relié à Diploval, ni stockage chiffré effectif de ces messages.

### 4. Prévisualisation de l'ergonomie

La démonstration se trouve sous :

\`Diploval_Site_Complet_v20_2_Inscription_Zoom/admin/consultations-v03-b6/\`

Cette interface propose des dossiers et dates **entièrement fictifs**, un suivi visuel des retards indicatifs et une simulation de rédaction par examinateur puis validation par superviseur. Elle n'effectue aucun appel réseau, ne conserve aucune donnée entre les visites, ne lit aucun cookie et n'utilise aucun compte. Sa page étant statique et consultable par URL, elle ne doit pas être présentée comme une véritable administration sécurisée.

### 5. Conditions non satisfaites avant une ouverture

1. Choisir et mettre en place le **stockage chiffré effectif**, avec sauvegarde vérifiée, gestion et rotation des secrets, audit et restauration.
2. Relier les comptes professionnels à un système de session réel, créer un registre privé de droits attribués et contrôler les accès de bout en bout.
3. Construire l'index sécurisé de la file et celui des réponses, avec gestion atomique et suppression/rectification conforme aux droits des personnes.
4. Arrêter une politique des délais et des voies de recours **validée par Diploval**, sans présumer d'obligation réglementaire.
5. Définir la base juridique et les durées de conservation, notamment au regard des contributions pouvant révéler des **opinions politiques**, et faire les analyses de risques nécessaires.
6. Prévoir les notifications **uniquement sur choix facultatif**, et les courriels de contenu minimal, avec un fournisseur SMTP/API sécurisé réellement vérifié.
7. Auditer les réponses HTTP d'erreur, la limitation de fréquence distribuée, les cookies HttpOnly/SameSite, le CSRF et les droits de session.
8. Préparer des tests d'accès adversariaux, de montée en charge, de mobile, d'accessibilité et de sauvegarde/restauration avant un éventuel pilote limité.
9. Obtenir une **validation explicite** avant toute activation ou collecte réelle.

### Contrôles

\`\`\`sh
node --test tests/dialogue-followup.test.mjs tests/dialogue-contributor-responses.test.mjs tests/dialogue-b6-service.test.mjs tests/dialogue-b6-preview.test.mjs
\`\`\`

Ces tests sont ajoutés aux tests des lots A à B5 avant les constructions Netlify. Leur réussite ne vaut ni un audit complet de cybersécurité, ni une conformité RGPD.

**La V0.2 reste inchangée. Aucun message citoyen réel n'est envoyé ou publié par le B6.**

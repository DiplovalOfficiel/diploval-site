# Diploval V0.3 — Recette des permissions institutionnelles — NO GO
**19 novembre 2026 — dossier de travail PR #20 (brouillon)**

## Preuve d'entrée
GitHub Actions `44572076302`, commit `3c044c6c29a68549b515f437e29d45a73bb1340b` : **190 tests techniques et 8 contrôles B7 réussis, soit 198/198**. Ce résultat précède les nouveaux fichiers et ne les couvre pas.

## Contrat de séparation des rôles retenu
L'interface institutionnelle envisagée n'est pas une interface d'administration Diploval. Même invitée, une institution ne doit pas recevoir d'accès aux coordonnées, versions internes, recours privés ou journaux de modération. Sa capacité doit être bornée à une **organisation, une consultation et une action**. Tout projet de réponse reste soumis à examen humain distinct par Diploval, sans publication automatique.

## Livrables
- `netlify/lib/dialogue-institutional-scope-gate.mjs` : contrôle interne **désactivé par défaut**, sans route HTTP, avec identité et mandat à valider par des services injectés ; seules les opérations `view` (projection publique filtrée) et `draftResponse` (projet soumis à modération) existent.
- `tests/dialogue-institutional-scope-gate.test.mjs` : **13 tests fictifs** couvrant désactivation, dépendances, exclusion des données privées, identité, organisation, consultation, révocation de permission, lecture seule, projet non publié, projection malformée, message invalide et absence de confirmation de stockage.
- Workflow Node 22 mis à jour pour lancer ces nouveaux tests.

## Matrice des rôles — principe de sécurité
| Rôle | Lecture publique | Lecture dossier privé | Dépôt de projet de réponse | Publication/validation |
|---|---|---|---|---|
| Citoyen non connecté | Publications effectivement visibles uniquement | Non | Non | Non |
| Contributeur authentifié | Publications visibles | Ses propres dossiers seulement | Contribution ou recours selon les règles | Non |
| Institution mandatée | Uniquement contribution publique liée à sa consultation autorisée | **Non** | Oui, projet de réponse dans son périmètre | **Non** |
| Modérateur Diploval habilité | Oui | Selon nécessité et droits explicites | Peut traiter les projets selon mandat | Décision humaine tracée |
| Administrateur technique | Selon mission | Pas de droit par défaut du seul fait de l'administration | Non, sauf habilitation distincte | Non par simple rôle technique |

## Lacunes réelles, à résoudre avant une ouverture
1. `resolveIdentity`, `loadMandate`, `verifyPermission`, `loadPublicContribution` et `recordDraft` restent des contrats injectés, non reliés à un fournisseur d'identité, à un annuaire officiel, à une administration ou à des droits réels.
2. Une simple adresse email ou le nom d'une institution **ne prouve pas un mandat**. Il faudra vérifier sa représentativité et les responsabilités d'une personne habilitée ; prévoir dates d'expiration, révocation, mutations de fonctions, séparation des tâches et audit.
3. Le dépôt de projet de réponse doit être rattaché au numéro de version publique ; si le contenu est retiré ou amendé entre lecture et publication, le futur validateur doit revérifier cette version.
4. Les réponses publiques et messages personnels sont des flux juridiques et éditoriaux différents : consentement, publicité, neutralité, diffamation, droit de réponse et protection des personnes exigent des règles explicites.
5. La frontière entre institutions, élus, experts invités et simples citoyens doit être lisible dans l'interface ; aucune institution ne doit être présentée comme soutenant une analyse Diploval sans déclaration claire.
6. Pas de connexion réelle au contrôleur HTTP, pas de journal fournisseur, pas de stockage multi-objets transactionnel, pas de sécurité MFA ni d'interface finale.
7. Ces 13 tests ont été **ajoutés**, mais il faut encore contrôler l'exécution GitHub Actions du commit les contenant pour attester leur réussite.
8. Les 16 barrières B7 (P01–P16) restent ouvertes, même si les tests unitaires fonctionnent.

## Étape suivante
Vérifier le résultat GitHub Actions de ce lot, puis développer une matrice de validation des mandats institutionnels et une simulation transversale du passage d'un projet de réponse institutionnelle à la modération Diploval, **sans publication directe**.

**V0.3 = NO GO. PR #20 brouillon/non fusionnée. V0.2 inchangée.**

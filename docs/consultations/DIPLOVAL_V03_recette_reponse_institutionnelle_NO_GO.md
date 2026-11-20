# Diploval V0.3 — Recette institutionnelle : dépôt, examen et refus de publication automatique
**19 novembre 2026 — environnement fictif, NO GO — PR #20**

## Dernière preuve CI vérifiée avant ce lot
GitHub Actions `44572590032` sur commit `b2759860e08fbc5aafa493165849f5852be45b2a` : 203 tests techniques et 8 contrôles B7 réussis, soit **211/211**. Cette attestation ne couvre pas les ajouts ci-dessous.

## Ajouts
- `netlify/lib/dialogue-institutional-draft-review.mjs` : revue éditoriale CAS/ETag, **désactivée par défaut**, sans endpoint ni publication. Elle exige une identité Diploval professionnelle distincte, une contribution source publique et une version inchangée, une décision et une trace d'audit confirmée.
- `tests/dialogue-institutional-draft-lifecycle.test.mjs` : 10 tests synthétiques qui composent le module de périmètre institutionnel existant et ce contrôle éditorial.
- Ajout de ces tests au workflow GitHub Actions sans déploiement.

## Chaîne de traitement simulée
1. Un agent fictif rattaché à une organisation autorisée ne peut travailler que sur une consultation de son mandat.
2. Il peut lire uniquement une projection publique filtrée d'une contribution déjà modérée.
3. Il propose une réponse ; le système conserve un **projet** `pending_diploval_review` et n'accorde aucune publication.
4. Un relecteur Diploval **distinct et habilité** examine la version source actuelle, l'intégrité de l'objet, sa preuve et sa révision.
5. Une réponse refusée devient `rejected` ; un avis favorable devient `reviewed_for_separate_publication`, ce qui **n'est pas une publication**.
6. Une publication éventuelle reste une opération distincte, non implémentée ni autorisée ici.

## Contrôles testés
- Absence de publication au dépôt, après avis favorable ou après refus
- Refus de décisions par un agent institutionnel ou un relecteur non habilité
- Mandat institutionnel absent
- Modification de la version publique source
- Deux décisions successives interdites
- Absence de preuve d'audit : pas de changement de statut

## Limites fondamentales
- Les identités, habilitations, lectures du contenu public et le stockage sont **des doubles fictifs**. Une personne ne peut pas être qualifiée d'agent habilité sur la seule base d'un email ou d'une déclaration de rôle.
- L'approbation d'un projet n'authentifie pas l'institution et ne constitue pas un soutien de Diploval à son contenu.
- Il faut encore traiter les procédures de contradiction, le droit de réponse, la traçabilité éditoriale, la représentativité, la responsabilité de publication et le risque juridique des contenus.
- Les événements d'audit et le projet sont écrits séparément. Cette recette ne prouve aucune atomicité fournisseur, reprise après panne, permanence d'audit, restauration ou protection réelle du stockage.
- Le futur système devra vérifier la version au **moment effectif de publication** et ne jamais considérer l'avis éditorial comme une autorisation de diffusion persistante.
- Les nouveaux tests sont déposés, mais ne peuvent être déclarés réussis que sur une exécution CI couvrant le commit les contenant.
- Les droits RGPD, le statut des institutions, la gestion des mineurs, les contrôles opérationnels et P01–P16 restent à traiter et à attester.

**Décision : V0.3 = NO GO ; proposition #20 brouillon/non fusionnée ; V0.2 inchangée.**

## Prochaine priorité
Vérifier la CI sur le dernier commit, puis examiner les écarts de la recette institutionnelle vis-à-vis de la modération Diploval, établir les prérequis d'une publication contrôlée et consolider les 16 conditions bloquantes dans un tableau unique plutôt que multiplier les modules.

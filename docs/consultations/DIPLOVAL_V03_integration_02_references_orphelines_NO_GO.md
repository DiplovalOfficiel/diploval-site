# Diploval V0.3 — Intégration 02 : cohérence des références privées et diagnostic d'orphelins
**19 novembre 2026 — banc d'essai interne / NO GO**

## État des tests antérieurs
Run GitHub Actions `44566269684` sur le commit `161992d6357c3c167c0709e2e5965929b3a2bd5a` : **8/8 contrôles B7 et 96/96 tests B8–B9 et stockage chiffré réussis**. Ne pas attribuer ces résultats aux nouveaux fichiers.

## Ajouts de la présente étape
- `netlify/lib/dialogue-reference-integrity-inspector.mjs` : audit **strictement en lecture**, désactivé par défaut ; exige une habilitation serveur `inspect_reference` et une lecture cohérente avec ETag.
- `tests/dialogue-reference-integrity-inspector.test.mjs` : dix scénarios fictifs couvrant références cohérentes, inexistantes, réservations sans dossier, correspondances contradictoires, métadonnées incomplètes, contrôles d'accès et chemin invalide.
- Workflow GitHub Actions actualisé pour exécuter les dix tests.

## Sémantique de diagnostic
| Classification | Signification | Action autorisée |
|---|---|---|
| `consistent` | Dossier et réservation se correspondent | Aucune réparation |
| `not_found` | Référence absente | Aucune suppression |
| `orphan_candidate` | Référence présente, dossier absent lors de la lecture | Enquête humaine, **jamais une suppression automatique** |
| `invalid_claim` | Identifiant interne mal formé | Enquête et confinement |
| `cross_reference_mismatch` | Deux objets désaccordés | Enquête et blocage éventuel de publication |

## Dangers restant à traiter
- Les opérations de création `createPrivate` réservent deux objets séparément, ce qui n'offre aucune atomicité multi-objet. Une référence sans dossier peut être transitoire alors qu'un dépôt est encore en cours.
- Le diagnostic d'orphelin **ne prouve pas** que la réservation puisse être effacée, recyclée ou réattribuée. Il faut vérifier les sessions, index, journaux, résultats de confirmation d'écriture et limites de cohérence du fournisseur.
- Aucun outil de suppression/désindexation réel n'a été développé ni autorisé ici.
- L'index HMAC des contacts et les sauvegardes ne sont pas encore coordonnés transactionnellement avec les dossiers.
- Pour la mise en exploitation, ajouter des tombstones, un état de création durable, un traitement idempotent des abandons et des preuves de reprise.
- Examiner les garanties contractuelles/techniques du fournisseur de stockage (ETags, cohérence, concurrence et invalidation cache), puis faire un test d'intégration isolé.
- Les nouvelles assertions n'ont pas encore de résultat CI attesté sur leur commit.
- Les 16 blocages B7 demeurent OPEN ; aucune collecte citoyenne V0.3 autorisée.

**Décision : diagnostic de référence préparé sans geste destructif ; statut V0.3 NO GO maintenu.**

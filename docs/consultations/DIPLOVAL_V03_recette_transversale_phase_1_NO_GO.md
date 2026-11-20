# Diploval V0.3 — Recette transversale fictive, phase 1 — NO GO
**19 novembre 2026 — consolidation sur la PR #20**

## Résultat d'entrée vérifié
GitHub Actions run `44570480887`, commit `a43cba205b4a7f0959f3bd9326b89262891bc4de` : 8 contrôles B7 + 162 tests techniques, **170/170 réussis**.

## Ce qui a été ajouté
- `tests/dialogue-v03-cross-module-acceptance.test.mjs` : sept tests transversaux composant **les véritables modules applicatifs** `dialogue-model.mjs`, `dialogue-storage.mjs` et `dialogue-data-rights.mjs`, avec un stockage et des identités strictement fictifs.
- Workflow GitHub Actions étendu pour exécuter la recette avec les autres suites.

## Parcours couverts
| Phase | Vérification | Portée |
|---|---|---|
| Dépôt privé | Création du dossier et absence de visibilité publique | Modèle + dépôt logiciel, stockage fictif |
| Modération | Publication après décision, projection sans adresse ni journal privé | Modèle + dépôt |
| Consentement | Refus explicite de publication empêche la décision de mise en ligne | Modèle + dépôt |
| Révision | Ancienne version publiée reste visible pendant qu'une nouvelle est en attente | Modèle + dépôt |
| Retrait | Le contenu n'est plus fourni par la projection après une décision de retrait | Modèle + dépôt, sans CDN |
| Droits RGPD | Export personnel et demande d'effacement en état d'examen, **sans suppression automatique** | Module B9.1 + dépôt |
| Cloisonnement | Tiers non autorisé et version de modération périmée rejetés | Politiques fictives |

## Points NON testés de bout en bout
**Ce lot n'est pas une recette finale.** À réaliser dans des essais distincts et intégrés :
1. Parcours HTTP réel et protections réseau (limitation d'abus, CSRF, CORS, erreurs, cookies, sessions et authentification) ; le contrôleur est désactivé.
2. Service de messagerie, preuve de possession d'une adresse, perte d'accès et contestation par deux décideurs réellement habilités.
3. Administration de la file, audit des décisions, notification et recours de modération.
4. Contribution et réponse d'institutions avec rôles professionnels authentifiés et limites de publication.
5. Toutes les données publiques en cache, sauvegardes, restaurations, synchronisations d'index, suppression matérielle et conservation.
6. Accessibilité, parcours mobile, langage clair, mineurs, pluralisme, prévention des abus.
7. Validation par le responsable du traitement des textes RGPD/CGU, base légale et éventuelle AIPD.

## Attestation
Les sept tests transversaux sont **ajoutés mais leur résultat CI reste à vérifier sur le SHA contenant le lot**. Les simulations ne constituent ni preuve de conformité ni test d'intégration d'un fournisseur.

## Priorités structurantes de la recette phase 2
- Corriger toute anomalie révélée par l'exécution CI.
- Cartographier la chaîne HTTP et les rôles institutionnels, puis effectuer des tests d'intégration des modules de réponse, suivi et recours sans données réelles.
- Ne pas raccorder la production avant fermeture documentée de **P01–P16**, qui demeurent `OPEN`.

**Décision : V0.3 NO GO, PR #20 brouillon/non fusionnée, V0.2 inchangée.**

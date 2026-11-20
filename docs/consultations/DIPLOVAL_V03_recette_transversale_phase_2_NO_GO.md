# Diploval V0.3 — Recette transversale, phase 2 — NO GO
**19 novembre 2026 — PR #20 brouillon**

## Résultat de départ attesté
Le run GitHub Actions `44570960902`, commit `ec9677a5ee55757a1c350ee394dfd5c6373265d4`, s'est terminé en succès : **8/8 contrôles B7 et 169/169 tests techniques**, soit 177/177. Ces résultats ne couvrent pas les nouveaux tests du présent lot.

## Ajouts réalisés
- `tests/dialogue-v03-cross-module-acceptance-phase2.test.mjs` : six tests composant les modules applicatifs existants `dialogue-model.mjs`, `dialogue-storage.mjs`, `dialogue-appeals.mjs`, `dialogue-followup.mjs` et `dialogue-contributor-responses.mjs`.
- `.github/workflows/consultations-v03-audit.yml` mis à jour pour lancer ces six tests dans le même workflow Node 22.
- Stockage, identité de contributeur et identités professionnelles **fictifs**, aucun SMTP, aucun endpoint activé, aucune institution réelle.

## Parcours préparés
| Parcours | Attendu |
|---|---|
| Refus de modération puis recours | Le contributeur peut déposer un recours et retrouver son statut privé de suivi |
| Décision sur recours | Elle est consultable par le contributeur, sans provoquer de publication automatique |
| Accès non autorisé | Une identité tierce ne peut lire le recours ni le suivi personnel |
| Réponse personnalisée | Une personne prépare, une autre approuve ; le brouillon n'est pas visible par le contributeur |
| Retrait d'une réponse | La réponse privée révoquée ne doit plus être fournie à l'auteur |
| Décision prématurée | Impossible de préparer un message de décision avant une décision enregistrée |

## Limites critiques et anomalie potentielle
1. **Ces parcours n'établissent aucune participation réelle des institutions.** Le module `dialogue-contributor-responses` exige deux identités professionnelles simulées, mais il ne vérifie pas des mandats institutionnels, des accès par organisation ni des habilitations authentifiées.
2. Les politiques d'autorisation du test sont des doubles ; la configuration réelle de gestion des sessions, rôles professionnels, rate limits, consentement, dépôts de preuves et sauvegardes manque.
3. Les recours et les réponses privées sont conservés dans des objets de stockage séparés : pas de transaction atomique inter-objets ni garantie de restauration.
4. Le parcours complet HTTP et l'expérience citoyenne/mobile ne sont pas validés.
5. Pas de mécanisme réel d'export global, d'effacement total, de contact rectifié ou d'AIPD finalisée.
6. Le résultat du workflow doit être inspecté sur **le commit contenant les nouveaux tests** ; leur création ne suffit pas pour attester un succès.

## Prochaine recette et conditions de publication
Faire une revue de sécurité du contrôleur HTTP interne, puis tester un parcours intégral en environnement isolé avec gestion authentifiée des rôles. Préparer un cahier d'essais accessibilité, RGPD et incident ; consigner les anomalies par gravité. Aucun branchement réel avant vérification des fournisseurs et fermeture documentée des seize points B7.

**Décision : V0.3 NO GO, P01–P16 toujours ouverts, PR #20 non fusionnée, V0.2 inchangée.**

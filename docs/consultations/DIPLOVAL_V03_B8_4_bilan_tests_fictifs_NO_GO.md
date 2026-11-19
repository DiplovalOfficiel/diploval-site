# Diploval — B8.4 : contrôle des scénarios fictifs et bilan d'exécution
**19 novembre 2026 — TESTS DE GARDE-FOUS AJOUTÉS / EXÉCUTION NON ATTESTÉE / NO GO**

## Réalisation
- Fichier de tests Node natif ajouté : `tests/dialogue-b8-4-safety-gates.test.mjs`.
- Dix assertions de garde-fous documentent la désactivation V0.3, l'absence de route Netlify, le refus sans autorisation, la longueur des clés, la dépendance du canal d'envoi, l'absence d'API de purge/export et la dépendance à un contrôle de débit externe.
- **Ces tests n'ont pas été exécutés ni attestés réussis dans cet audit** : aucun résultat GitHub Actions n'était disponible sur le commit au moment du contrôle et l'environnement local ne pouvait pas cloner le dépôt. L'ajout d'un fichier de test n'est pas une preuve de réussite.
- Les 14 scénarios d'acceptation B8.3 ne sont **pas** réputés exécutés : seuls certains garde-fous élémentaires sont couverts.

## Inventaire d'exécution
| Bloc | Statut | Justification |
|---|---|---|
| Lecture de cinq modules serveur | EFFECTUÉ | Analyse statique ciblée, pas audit exhaustif |
| Ajout de dix tests Node | EFFECTUÉ | Fichier sur la branche de PR #20 |
| Exécution de ces dix tests sur le commit | NON VÉRIFIÉE | Aucun workflow PR attesté |
| AT01–AT14 avec données fictives | À FAIRE | Exige adaptateurs de test et données de bout en bout |
| Export, effacement, restauration | NON IMPLÉMENTÉ ENSEMBLE | Fonctionnalités manquantes dans le dépôt de base |
| Tests indépendants sécurité | À FAIRE | Revue externe/intégration requise |
| Collecte réelle et ouverture V0.3 | INTERDITE | B7 gate à 16 conditions OPEN |

## Comment exécuter les nouveaux tests
À partir d'un clone fiable du dépôt disposant de Node 22+ :
```bash
node --test tests/dialogue-b8-4-safety-gates.test.mjs
node --test tests/dialogue-b7-audit-gate.test.mjs
```
En cas d'échec, conserver la porte NO GO ; ne pas interpréter une réussite des tests unitaires comme une validation d'exploitation.

## Parcours intégrés à réaliser plus tard avec données fictives exclusivement
1. Création puis accès individuel au bon dossier.
2. Demande de lien connu/inconnu, lien expiré, lien consommé et session révoquée.
3. Modification de texte, validation de publication, changement d'avis et retrait.
4. Lecture publique filtrée et contrôle de réidentification.
5. Recours et réponse humaine à double contrôle.
6. Demande RGPD, export, rectification de contact et suppression avec synchronisation d'index.
7. Restauration d'une sauvegarde après purge et vérification d'absence de résurrection.
8. Échecs partiels, accès inter-dossiers, CSRF, quotas et rôles professionnels révoqués.
Les objectifs AT01–AT14 de B8.3 restent les critères détaillés d'acceptation.

## Décision
**B8.4 incomplet du point de vue de l'exécution**. Les tests préparés n'autorisent aucune baisse des conditions de la grille `DIPLOVAL_V03_B7_gate_NO_GO.json`. Préserver `release: NO_GO`, `actual_processing_enabled: false`, et les 16 blocages ouverts. Ne pas fusionner ou publier les textes juridiques ni ouvrir les routes V0.3 sur cette seule base.

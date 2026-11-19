# Diploval V0.3 — B9.6, contrôle d'exécution et plan de reprise après incident
**19 novembre 2026 — DOCUMENT DE TRAVAIL / NO GO**

## Livrable réalisé
Ajout du workflow `.github/workflows/consultations-v03-audit.yml` sur la branche de la PR #20.
- GitHub Actions, Node.js 22, contrôles B7 + B8.4 + B9.1–B9.5.
- Permissions `contents: read`; aucun déploiement, aucun accès aux secrets de production ni activation du service.
- Exécution sur `pull_request` si les fichiers concernés changent, ou par commande manuelle `workflow_dispatch` si disponible.

## Lecture du résultat
**Création du workflow ≠ exécution réussie**. Le résultat doit être consulté dans GitHub Actions, en vérifiant le SHA du commit, le nom du job, le nombre de tests et l'absence d'échec. Si aucun run n'est disponible, état `NON ATTESTÉ`. Ne jamais annoncer la conformité RGPD sur la base de ces seuls tests unitaires.

## Scénario de reprise contrôlée à implémenter
1. **Détecter l'échec** (exécution interrompue, opération ambigüe, écriture de checkpoint non confirmée), conserver l'interdiction de publication.
2. **Geler l'exécution** : ne jamais déverrouiller automatiquement, empêcher le redémarrage du précédent détenteur.
3. **Reconstituer l'état** : lire le journal et les états vérifiables de chaque stockage ; si une étape a réussi avant l'écriture du checkpoint, ne pas la considérer automatiquement comme inexistante.
4. **Contrôle humain** : une personne habilitée confronte la décision d'effacement, les exceptions légales, la preuve des opérations et les éventuels caches/sauvegardes.
5. **Fencing** : révoquer l'ancien exécutant ; transmettre une révision supérieure dont les adaptateurs vérifieront l'actualité atomiquement au moment de l'écriture.
6. **Reprise idempotente** : reprendre seulement après preuve et contrôle de l'absence de concurrence ; rapporter toute étape en état indéterminé.
7. **Vérification post-exécution** : index HMAC, dossier, références, projection publique et caches, sauvegardes et restauration. L'effacement n'est déclaré complet qu'après vérification selon le périmètre et les exceptions retenues.

## Matrice d'essais à réaliser avec stockage isolé
| Cas | Résultat exigé |
|---|---|
| Deux exécutants acquièrent le même verrou simultanément | un seul autorisé, l'autre rejeté |
| Crash avant une mutation | journal bloque le redémarrage automatique |
| Crash après mutation mais avant checkpoint | reprise manuelle, étape ambiguë identifiée |
| Ancien exécutant après nouvelle révision | stockage refuse l'ancienne révision atomiquement |
| Lecture publique en parallèle du retrait | réponse post-blocage sans contenu privé |
| Cache/CDN conservant une projection | invalidation/TTL vérifiés avant confirmation |
| Dossier effacé restauré à partir d'une sauvegarde | impossible à republier sans reconciliation |
| Contact HMAC rectifié | index initial désactivé, nouvel accès vérifié |
| Journaux / observabilité | aucun token ni contenu sensible exposé |

## Bloquants non levés
- Une simulation synchrone en mémoire ne prouve pas le fencing dans Netlify Blobs ni les règles de cache du site.
- Aucune source ne démontre une opération atomique inter-stockages ; il faut une conception compatible avec les garanties réelles du fournisseur, ou changer d'architecture.
- Pas d'adaptateurs de sauvegardes/reprise ni de politique de conservation formellement adoptée.
- Pas d'AIPD conclue, de revue des fournisseurs/contrats, de contrôle de la sécurité d'exploitation, ni d'approbation juridique signée.
- **Toutes les 16 portes B7 demeurent OPEN.** La V0.3 reste désactivée et la PR #20 reste non fusionnée.

## Prochaine étape
Après réception des résultats CI : corriger les éventuels échecs puis préparer B9.7, un banc d'intégration isolé pour simuler l'état de référence, la lecture publique, les checkpoints et le crash après mutation.

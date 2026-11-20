# Diploval V0.3 — Intégration 03 : cohérence index HMAC / dossiers privés
**19 novembre 2026 — projet isolé, NO GO**

## Résultat CI vérifié avant ce lot
GitHub Actions run `44566837680`, commit `97c56829ea9cf7039c17f637f6ca0b7d06671a8a` : **8 contrôles B7 réussis + 106 tests B8–B9 et intégration réussis**. Ces résultats ne couvrent pas les tests ajoutés ici.

## Développement préparé
- `netlify/lib/dialogue-contact-index-integrity-inspector.mjs` : audit des identifiants associés à une empreinte HMAC, exclusivement côté serveur, désactivé par défaut, aucune mutation ni effacement.
- `tests/dialogue-contact-index-integrity-inspector.test.mjs` : dix scénarios fictifs couvrant le contrôle d'autorisation, la validation d'empreinte, la liste vide, les données manquantes, les incohérences et doublons.
- `.github/workflows/consultations-v03-audit.yml` mis à jour pour les exécuter.

## Classes de résultats et interprétation
- `record_exists_contact_unverified` : le dossier est présent et sa structure minimale paraît cohérente ; **cela ne prouve absolument pas** que le contact associé à l'empreinte est le contact actuel du dossier.
- `missing_record_candidate` : l'index mentionne un dossier absent lors de la lecture ; possible écriture en cours, suppression, panne ou incohérence du stockage.
- `invalid_record` : dossier présent mais identité ou structure incohérente.
- Empreinte ou liste d'index invalide, doublon ou accès non autorisé => arrêt avec erreur.

Les résultats ne présentent **ni adresse électronique en clair, ni texte de contribution**. Les identifiants internes restent privés et doivent être visibles uniquement des responsables habilités. Aucun résultat n'autorise une suppression : `safeToDelete:false`.

## Problèmes d'intégration encore à résoudre
1. L'index HMAC et le dossier ne constituent pas une transaction : inscription, correction de contact et suppression exigent un protocole de réconciliation multi-objets.
2. La preuve de propriété d'un contact doit découler d'un contrôle serveur attesté (session auteur et vérification d'email), jamais du seul fait qu'un ID existe dans l'index.
3. Éviter les diagnostics concurrents aux dépôts : suivre les opérations avec état/horodatage de création, rejets et identifiants de reprise, puis revalider sous contrôle humain.
4. Aucun fournisseur de stockage réel, cohérence ETag, restauration, suppression des sauvegardes ou chiffrement de bout en bout n'a été attesté.
5. N'exposer aucun index HMAC ni résultat administratif de ce module via des routes publiques ; protéger contre les recherches massives et l'inférence des contacts.
6. Les dix nouveaux tests sont ajoutés mais **non attestés réussis** tant qu'un résultat CI n'est pas consulté pour leur commit.

## Décision
La préparation du diagnostic est réalisée, sans correction automatique ni activation publique. Grille B7 : **P01–P16 toujours OPEN**. V0.3 : **NO GO**, PR #20 brouillon, V0.2 préservée.

## Étape suivante
Consulter la CI sur le commit exact, puis concevoir une machine d'état de création et de rectification avec reprise idempotente sur données fictives. Vérifier au préalable la sémantique de CAS et la cohérence des stockages réels.

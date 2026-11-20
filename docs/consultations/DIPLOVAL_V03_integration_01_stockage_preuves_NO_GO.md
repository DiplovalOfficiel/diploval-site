# Diploval V0.3 — intégration contrôlée, étape 1 : exigences de stockage
**19 novembre 2026 — audit de la branche de travail — NO GO**

## Preuve CI déjà obtenue
Run GitHub Actions `44564261116` sur `2132d3076853be72e6e6792f32f1c21d86c3f581` : 8/8 contrôles B7 et 89/89 tests B8–B9 réussis. **Cette preuve ne couvre pas les fichiers ajoutés après ce commit.**

## Constat de code, non une attestation fournisseur
- `dialogue-encrypted-store.mjs` fournit une enveloppe AES-256-GCM avec AAD dépendant du chemin, contrôles de taille et de clé 256 bits ; les clés, la rotation et la restauration ne sont pas opérationnalisées.
- `dialogue-storage.mjs` s'appuie sur des préconditions d'écriture `onlyIfNew` et `onlyIfMatch`, et relit les ETags, mais il exécute deux écritures distinctes (réservation de référence, puis dossier) : **aucune transaction multi-objet**. Échec entre les deux => référence orpheline.
- `dialogue-contact-index.mjs` conserve un index HMAC avec tentatives de comparaison ETag, mais sa synchronisation avec les dossiers privés et leur suppression n'est pas transactionnelle.
- `dialogue-erasure-journal-b9.mjs` a son propre CAS/ETag et des contrôles d'exclusion. Il n'offre **pas** une transaction atomique avec le stockage des dossiers et la publication.
- `dialogue-service-v03.mjs` reste désactivé par défaut et non raccordé à une fonction publique.

## Tests complémentaires préparés
`tests/dialogue-storage-integration-synthetic.test.mjs` : sept scénarios strictement en mémoire : chiffrement sans plaintext dans l'enveloppe, lecture/déchiffrement, rejet des réservations doubles, rejet d'un ETag périmé, détection d'altération de ciphertext, refus de recopie d'une enveloppe sur une autre clé (AAD), refus de clé faible, refus d'options inconnues. **Aucun résultat CI n'est encore attesté pour ces nouveaux tests.**

## Décisions architecturales encore nécessaires
1. Vérifier **dans la documentation et un environnement isolé du fournisseur retenu** si `getWithMetadata` avec `consistency:'strong'`, `set` conditionnels et ETags offrent les garanties requises sur le véritable stockage. Ne pas inférer ces garanties du comportement d'une `Map` locale.
2. Choisir un protocole robuste de coordination multi-objets (registre transactionnel ou outbox/reconciliation, tombstone de publication et index), ou changer de backend si les contraintes sont incompatibles.
3. Tester l'échec de la seconde écriture après réservation d'une référence, les restaurations, l'indisponibilité des clés et les conflits de rectification du contact.
4. Formaliser le contrôle d'accès professionnel MFA, les secrets, la rotation des clés, la purge des sauvegardes, les caches et la rétention des preuves.
5. Documenter et faire signer l'analyse juridique par finalité, en particulier articles 6, 9, 13, registre et AIPD si requise.

## Décision
La vérification Node du code existant est positive sur le SHA cité ; **pas de certification du fournisseur ni du RGPD**, et aucune autorisation de supprimer des données réelles.
PR #20 en brouillon, non fusionnée ; V0.3 `NO_GO` ; grille B7 P01–P16 conservée en `OPEN`.

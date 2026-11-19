# Diploval V0.3 — B9.1 : export privé et demandes d'exercice des droits
**19 novembre 2026 — Projet interne, sans activation — NO GO**

## Livrables sur la branche de préparation
- `netlify/lib/dialogue-data-rights.mjs` : service interne non exposé, dépendant d'un dépôt privé, d'un contrôleur d'autorisation côté serveur, d'un registre de demandes et d'un journal d'audit.
- `tests/dialogue-b9-data-rights.test.mjs` : huit tests unitaires fondés sur des dossiers entièrement fictifs.
- Aucune Netlify Function ni route publique ajoutée. Aucun accès direct depuis le navigateur.

## Capacités techniques construites
1. Un contributeur authentifié, après vérification serveur de son droit sur le dossier, peut obtenir une **projection limitée** de la contribution (référence, versions, contact personnel, présentation publique). Le registre et le journal d'audit doivent confirmer leurs opérations avant restitution.
2. Les demandes de rectification, effacement, limitation, opposition et retrait de consentement peuvent être **enregistrées pour instruction** avec une référence de traitement. Retour explicite `executed:false` : le dépôt réel **n'est pas modifié**.
3. Les informations internes d'audit, les permissions cachées, secrets et autres champs non listés ne font pas partie de la projection d'export. La projection actuelle n'est **pas** une réponse RGPD complète : vérifier les autres stockages, recours, notifications, versions et données de tiers avant remise réelle.
4. Si les dépendances obligatoires sont absentes, si l'auteur n'est pas autorisé ou si le registre/audit échoue, l'opération échoue sans donner les données.

## Niveau de preuve
Un prototype équivalent a été testé localement sous Node 22, avec huit tests réussis (8/8). Le fichier repris sur GitHub suit la même logique, mais **son exécution depuis le commit GitHub n'est pas certifiée tant qu'une CI ou un clone exact ne l'a pas exécuté**. Commande : `node --test tests/dialogue-b9-data-rights.test.mjs`.

## Limites bloquantes restantes
- Un `recordRequest` réel, transactionnel, persistant, cloisonné et audité doit être développé.
- La politique d'autorisation doit être reliée à une identité auteur réellement vérifiée ; la confiance dans un simple argument JavaScript est interdite.
- L'accès complet doit être étendu aux données de recours, réponses, index et autres systèmes, sans divulguer de données de tiers.
- Rectification d'email : transaction ou compensation entre dossier, index HMAC, liens et sessions ; réauthentification adaptée, révocation des anciens accès.
- Effacement : matrice de conservation et décision humaine, dépublication, suppression/limitation du stockage, index de contact et référence, backups et journaux, gestion des pannes partielles et preuve de non-résurrection.
- Suppression d'un seul objet sans index ni sauvegardes ne sera **jamais** présentée comme effacement complet.
- Contrats des prestataires, qualification AIPD, bases légales, mesures de production et revue indépendante restent à faire.
- Ne pas fusionner le lot ni activer la V0.3 avant que les seize points bloquants du B7 aient été vérifiés.

## Étape suivante proposée : B9.2
Concevoir une procédure d'effacement multi-stockages avec état, reprise après incident et tests adversariaux fictifs ; ensuite seulement implémenter les adaptateurs réels validés.

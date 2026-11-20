# Diploval — B9.5 : dépublication fictive et contrôle de révision
**19 novembre 2026 — PROTOTYPE ISOLÉ / NO GO**

## Livrables
- `netlify/lib/dialogue-fenced-projection-fixture.mjs` : double de stockage purement en mémoire, non branché au système.
- `tests/dialogue-b9-5-fenced-projection.test.mjs` : dix tests Node à exécuter.
- Aucun endpoint, aucune opération réelle, aucune modification de V0.2, aucun changement du statut de la grille B7.

## Résultat de conception
La lecture publique refuse un contenu dès qu'un marqueur de blocage est posé. Une référence publique ne peut être retirée qu'après le blocage préalable. Chaque mutation simulée exige la révision et le propriétaire actuellement associés au dossier : une ancienne révision ne suffit pas. La répétition de dépublication et de retrait de référence est idempotente. Les données fictives ne contiennent aucune information citoyenne.

## Précautions décisives
**Cette garantie est uniquement celle d'une simulation synchrone en mémoire.** Le contrôle du propriétaire et l'opération sont indivisibles dans cette simulation ; cela ne démontre pas la même propriété pour Netlify Blobs, CDN, caches, bases externes ou processus répartis. En particulier :
- Le prototype ne fournit aucune persistance durable, transaction distribuée ou invalidation de CDN.
- Une ancienne réponse déjà transmise au navigateur peut subsister dans des caches privés ou archives de tiers : il faut définir le périmètre et les garanties vérifiables.
- `createLockedErasureRunner` B9.4 reste non raccordé à ce double ; les adaptateurs de production auront besoin de leur propre fencing atomique.
- Sauvegardes, restauration, autres copies, index de contact, recours et emails ne sont pas pris en charge.
- La gestion d'une suspension pendant une erreur de journal doit préserver le blocage public.

## Scénarios prêts
Visibilité initiale, blocage, exigence de blocage avant retrait, retrait de la référence, refus de l'ancien propriétaire, autorisation du nouveau, idempotences, refus de référence/révision erronée, isolation des objets renvoyés.
Commande : `node --test tests/dialogue-b9-5-fenced-projection.test.mjs`.
**Aucun résultat CI ni exécution du commit exact attestée à la rédaction** ; il est interdit d'annoncer ces dix tests comme réussis avant exécution observée.

## Étape suivante B9.6
1. Exécuter les tests B9.3 à B9.5 sur le commit.
2. Comparer les garanties de stockage fournisseur avec le modèle : conditionnalité ETag, opérations atomiques, invalider le cache.
3. Concevoir des adaptateurs durables test-only et exercer le retrait en concurrence avec les lectures publiques.
4. Simuler des crashs avant/après chaque confirmation du journal et démontrer la reprise surveillée.
5. Compléter la politique juridique de conservation et les preuves RGPD avant toute suppression réelle.

**Décision : B9.5 prêt pour revue technique, mais aucune garantie d'exploitation. V0.3 reste NO GO.**

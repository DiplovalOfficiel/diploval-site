# Diploval — B8.3 : sécurité, conservation et exercice des droits
**Projet technique interne — 19 novembre 2026 — NO GO / aucune activation**

## Périmètre vérifié
Lecture statique ciblée des modules `dialogue-storage.mjs`, `dialogue-encrypted-store.mjs`, `dialogue-author-access.mjs`, `dialogue-contact-index.mjs` et `dialogue-service-v03.mjs` sur la branche de la PR #20. Cette lecture n'est ni un audit d'intrusion, ni un contrôle de prestataires, ni un test de production. Les fichiers B7/B8.1/B8.2 restent projets internes.

## Constat par couche
| Couche | Mesures visibles dans le code | Écart restant bloquant |
|---|---|---|
| Dépôt | Écritures conditionnelles ETag, contrôle d'accès obligatoire, projection publique filtrée | Pas de suppression physique, export, purge, correction de réservations orphelines |
| Chiffrement | Enveloppe AES-256-GCM avec authentification et AAD lié au chemin | Clés réelles, version de clés, rotation, récupération, sauvegardes et tests réels non déployés |
| Liens auteur | Jeton opaque aléatoire, usage unique, durée prévue 10 minutes ; session prévue 2 h, révocation serveur | Transport e-mail réel, purge physique des jetons/sessions expirés, prévention des abus, gestion des accès perdus |
| Index de contact | HMAC et modification conditionnelle, inscription/désinscription à disposition | Synchronisation transactionnelle avec rectification/effacement, reprise sur panne et preuve de désindexation absentes |
| API interne | Désactivée par défaut, pas de route publique, origine et en-tête spécifique vérifiés, limitation externe obligatoire | Authentification réelle, CSRF robuste, quotas distribués, supervision, gestion d'erreurs et tests adversariaux à finaliser |
| Modération | Rôles théoriques et décisions humaines prévues | Fournisseur de sessions pro, MFA, séparation des tâches en production, audit de consultation et révocation des accès |
| Informations | Textes B7 et matrice B8 en brouillon | Base légale validée, notice exacte, traitements de données sensibles et qualification AIPD manquants |

## Politique de conservation : matrice de décisions NON VALIDÉES
Aucune durée chiffrée ci-dessous n'est supposée approuvée. Le responsable de traitement et le conseil juridique doivent fixer pour chaque catégorie : point de départ, durée ou critère déterminable, exception justifiée, mécanisme de purge et preuve de test.

| Catégorie | Déclencheur à préciser | Action technique à implémenter | Vérification à fournir |
|---|---|---|---|
| Contributions privées et versions | clôture / dernier contact / demande recevable | purge des objets et historiques autorisés ; éventuelle restriction | lecture impossible après purge ; contrôle de cas litigieux |
| Publications | retrait, décision, échéance éditoriale | dépublication des projections et cache ; droit de retrait selon contexte | pas de texte retiré en API ni cache public |
| Contacts | suppression, correction, fin de nécessité | effacer contact, index HMAC, références liées | ancienne adresse ne récupère plus aucun dossier |
| Jetons liens, sessions et récupération | expiration/révocation | invalidation immédiatement et purge physique planifiée | jeton rejeté et absent du stockage à terme |
| Recours, motifs, réponses privées | décision finale et critère retenu | effacement ciblé et cohérent avec journal minimum requis | pas de réapparition après restauration |
| Journaux de sécurité | événement et durée nécessaire | rotation, minimisation, accès limité | aucun texte libre ou lien secret dans les logs |
| Sauvegardes | cycle des sauvegardes | politique de rétention, restauration contrôlée, réapplication des suppressions | exercice de restauration sans résurrection non autorisée |
| Réservations orphelines | échec d'écriture | réconciliation sécurisée, sans exposition publique | référence récupérable sans collision ni fantôme |

## Droits des personnes — procédure cible
1. **Réception** via canal désigné (contact métier actuel : consultations@diploval.fr, responsabilité RGPD à formaliser) ; classifier demande et éventuelle urgence de confidentialité.
2. **Vérification proportionnée** de l'identité, sans exiger systématiquement une pièce d'identité ; ne jamais utiliser une simple référence publique comme authentification.
3. **Identification du périmètre** : contribution, versions, messages, décisions, index, logs pertinents, publication, copies maîtrisées, sauvegardes.
4. **Qualification de droit** : accès, rectification, effacement, limitation, opposition, retrait d'un consentement ou portabilité si applicable ; motiver les exceptions et délais légaux.
5. **Exécution** : projection publique et caches, document source, index contact/référence, liens/sessions, réponses/recours ; plan de traitement des sauvegardes.
6. **Confirmation** sans révélation excessive ; enregistrement de preuve minimale, vérification contradictoire si besoin.
7. **Contrôle** après restauration simulée pour empêcher la réapparition d'objets purgés.
Les délais RGPD sont traités indépendamment des délais éditoriaux ; délai ordinaire de réponse un mois, extension motivée dans les conditions applicables.

## Exigences de sécurité avant pilote réel
- Identité et responsabilités juridiques vérifiées, registre et AIPD qualifiée ; contrats sous-traitants et flux documentés.
- Séparation environnement de test / exploitation, interdiction de données citoyennes réelles dans les tests et logs, secrets hors GitHub.
- Clés chiffrées et HMAC protégées, rotation avec lecture des anciens objets et mécanisme de reprise ; contrôle des accès au coffre.
- MFA pour chaque professionnel, révocation immédiate, contrôle des rôles par consultation et preuve de non-élévation de privilège.
- Protection anti-énumération et limitation de débit distribuée par IP et adresse ; messages de récupération de même teneur qu'une adresse soit connue ou non.
- Anti-CSRF revu en profondeur ; `Origin` et en-tête spécial ne doivent pas être les seuls éléments de défense considérés sans analyse.
- Export des données personnelles lisible et sûr, suppression par portée, purge sur index et sauvegardes ; mécanismes idempotents et reprise sur panne.
- Journal de sécurité sans contenu des contributions ni tokens, consultation par habilitation seulement, politique de rotation.
- Procédure d'incident, analyse de notification CNIL dans les délais applicables, suspension et restauration testée.
- Revue indépendante et campagne de tests fictifs de bout en bout, y compris échecs partiels et attaques d'accès croisé.

## Jeu de tests d'acceptation à construire (B8.4)
| Test | Résultat attendu |
|---|---|
| AT01 accès à un autre dossier par référence seule | refus, aucune fuite d'existence ou de contenu |
| AT02 lien expiré ou réutilisé | refus, aucune nouvelle session |
| AT03 révocation de session | effet immédiat y compris sur principal précédemment authentifié |
| AT04 retrait d'une publication | aucune projection publique ni réponse cache ancienne |
| AT05 droit d'accès export | périmètre exact, authentification renforcée si besoin, aucune donnée de tiers non justifiée |
| AT06 correction d'e-mail | ancien HMAC désindexé et nouveau correctement lié |
| AT07 effacement | données, versions, index et sessions concernés supprimés selon politique ; preuve conservée sans réidentifier inutilement |
| AT08 restauration | pas de résurrection non autorisée après purge |
| AT09 panne entre réservation référence et création dossier | récupération contrôlée sans exposition publique |
| AT10 modérateur sans habilitation, rôle révoqué ou autre consultation | refus côté serveur |
| AT11 tentative CSRF / requêtes massives | rejet et alerte proportionnée |
| AT12 contenu sensible en logs et notification | aucune divulgation |
| AT13 fuite indirecte par synthèse de petits effectifs | contrôle d'anonymisation préalable |
| AT14 traitement d'une demande RGPD pendant consultation ouverte | fonctionnement indépendant des recours éditoriaux |

## Porte de sortie
Les 16 verrous B7 restent OPEN. Aucune implémentation de purge ni test de restauration réelle n'a été effectué dans le cadre de B8.3 ; aucun feu vert de collecte ou d'exposition API. Passage au B8.4 uniquement sur données fictives. Approbation humaine datée et vérification indépendante avant toute activation.

## Références
- RGPD : https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra (articles 5, 12-22, 25, 28, 30, 32-35)
- CNIL : https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre
- Audit interne B7 : `DIPLOVAL_V03_B7_audit_preparation_NO_GO.md`
- Grille de sortie : `DIPLOVAL_V03_B7_gate_NO_GO.json`

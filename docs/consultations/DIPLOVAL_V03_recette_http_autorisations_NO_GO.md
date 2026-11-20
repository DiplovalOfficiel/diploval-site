# Diploval V0.3 — Audit du contrôleur HTTP et des frontières d'autorisation — NO GO
**19 novembre 2026 — proposition #20, non fusionnée**

## Preuve CI antérieure
Run GitHub Actions `44571473431` sur le commit `1a046f2a7f5ac29f5acac4b9edee38c14ecbba08` : **175 tests techniques et 8 contrôles B7 réussis (183/183)**. Ce résultat n'atteste pas les nouveaux tests de cette étape.

## Tests ajoutés
`tests/dialogue-v03-http-boundary-audit.test.mjs` : **15 tests d'intégration HTTP fictifs**, exécutant le véritable `createDialogueInternalHandler` avec des adaptateurs strictement simulés. Workflow `.github/workflows/consultations-v03-audit.yml` actualisé.

Contrôles : désactivation par défaut ; absence d'adaptateurs de confiance ; absence de divulgation sur référence privée ; refus d'origine étrangère ; refus POST avec Origin étranger ou en-tête de requête absent ; limitation distribuée simulée et refus HTTP 429 ; réponse générique si référence inconnue ou connue ; absence de session auteur ; cookie personnel vérifié par un double ; refus sans authentification professionnelle ; refus des en-têtes de rôle déclaratifs ; refus de chemin hors périmètre ; rejet JSON invalide.

## Matrice de garanties et limites
| Frontière | Vérification dans le code | Garantie réelle encore attendue |
|---|---|---|
| Activation | `enabled=false`, aucun endpoint Netlify exporté | Vérifier absence de chemin de déploiement ou d'import indirect de la V0.3 |
| Origine/CSRF | Contrôle `URL.origin`, Origin POST et en-tête applicatif | Revue reverse-proxy, cookie, CORS, comportements des navigateurs et éventuels sous-domaines |
| Auteur | Session opaque injectée, cookie HttpOnly Secure SameSite=Strict | Fournisseur réel des sessions, sécurité des emails, support et récupération, anti-bruteforce |
| Modération | `authenticateModerator` serveur obligatoire ; rôle navigateur refusé | Authentification forte professionnelle, gestion des habilitations et droits par consultation/organisation |
| Limitation des abus | Callback `rateLimit` exigé et 429 sur refus | Service distribué robuste et paramétrage éthique de seuils adaptés aux citoyens |
| Projection publique | Liste blanche des données et contrôles de visibilité | CDN/cache, suppression/rectification publique immédiate, vérification RGPD |
| Erreurs | Messages génériques sur échecs de service | Comparaison des temps de réponse et des profils d'erreur connus/inconnus pour éviter une énumération |
| Documents | Réponses personnelles et recours disponibles seulement via adaptateurs | Intégration réciproque des journaux, conservation et effacement, contrôle humain |

## Lacunes et risques à traiter
1. L'endpoint `/author/request-link` effectue une résolution serveur de référence et peut appeler un expéditeur de lien uniquement si la référence existe ; la réponse est générique en situation nominale, **mais les différences de durée et les erreurs de transport en cas d'adresse connue peuvent créer un risque d'énumération**. Il faudra découpler l'envoi, uniformiser l'erreur, journaliser sans données sensibles et tester sous conditions adverses.
2. L'authentification de modérateur est un contrat d'injection, pas une identité vérifiée en production. Les collectivités, institutions ou experts invités nécessitent des **droits séparés par organisation et consultation**, sans accès généralisé aux dossiers privés.
3. Les tests d'origine valident une fonction `Request` en mémoire, pas l'intégration Netlify, un navigateur réel, le proxy, les cookies ou les en-têtes réécrits.
4. La stratégie de limitation distribuée n'a pas été choisie ; surveiller les faux positifs et les demandes légitimes venant d'une même connexion (établissement scolaire, mairie).
5. Aucune chaîne transactionnelle fournisseur ne couvre encore les réservations, index, journaux d'audit, sauvegardes et effacements.
6. Cette phase ne comporte **aucune attaque sur service déployé** et n'autorise pas la V0.3 à recevoir des données réelles.

## Suite de recette
Contrôler les résultats GitHub Actions sur le commit final du lot. Ensuite, dresser la matrice précise d'autorisation des institutions, modérateurs et contributeurs et éprouver une réponse d'institution **sans permission de publication automatique, sans consultation de données privées par défaut et sans possibilité d'usurpation**. Préparer le test navigateur/mobile séparément de la conformité réglementaire.

**NO GO maintenu : 16 conditions B7 ouvertes ; PR #20 brouillon ; V0.2 inchangée.**

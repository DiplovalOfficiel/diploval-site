# Diploval V0.3 — Préregistre de traitement et examen préalable d'AIPD
**B7.0 — Document de travail non certifiant — 19 novembre 2026**

Ce registre est un **inventaire préparatoire** pour les articles 5, 6, 9, 13, 28, 30, 32 et 35 du RGPD. Il ne démontre pas l'existence d'un registre final adopté ni d'une AIPD achevée. Les catégories ci-dessous sont déduites de l'architecture **non activée** de la V0.3 ; les flux, fournisseurs, données et durées réels seront à confirmer avant tout dépôt citoyen.

## 1. Responsable du traitement
- Entité : **[forme et dénomination effectives à vérifier]**.
- Représentant et contact RGPD : **[à confirmer]**.
- Organisation : **[personnes habilitées, coordonnateur RGPD et éventuel DPO à déterminer]**.
- Périmètre : consultations et échanges citoyens V0.3 uniquement, distincts des formulaires existants V0.2.

## 2. Inventaire des opérations de traitement envisagées

| ID | Activité / finalité | Catégories de personnes et données | Source / destinataire | Art. 6 et 9 | Conservation | Mise en service |
|---|---|---|---|---|---|---|
| T01 | Recevoir et instruire des contributions | Contributeurs ; texte, références, éventuelles opinions politiques, dates, métadonnées de version | Formulaire → stockage privé → examinateurs habilités | **À déterminer** | **À déterminer** | **NON** |
| T02 | Publier après contrôle | Auteurs et tiers mentionnés ; texte approuvé, référence, nom/pseudonyme facultatif | Stockage privé → validation humaine → page publique | **À déterminer** | **À déterminer** | **NON** |
| T03 | Authentification / suivi auteur | Adresse de suivi, identifiant privé, HMAC, jeton, session, état | Service serveur → fournisseur d'envoi à choisir → espace privé | **À déterminer** | **À déterminer** | **NON** |
| T04 | Instruction des recours | Contributeurs ; version contestée, motif, décision, dates | Espace personnel → examinateur/superviseur habilité | **À déterminer** | **À déterminer** | **NON** |
| T05 | Réponse individuelle / notifications | Texte de réponse, auteur, relecteur, date, choix d'alerte éventuel | Examinateur → superviseur → espace auteur ; email optionnel non connecté | **À déterminer** | **À déterminer** | **NON** |
| T06 | Journal de sécurité et détection d'abus | Sessions, traces techniques minimales, opérations sensibles, anomalie | Services internes et équipe sécurité | **À déterminer** | **À déterminer** | **NON** |
| T07 | Droits RGPD et corrections | Demande, preuve d'accès, réponse, historique de suppression | Contact RGPD → équipe habilitée → purge et index | **À déterminer** | **À déterminer** | **NON** |
| T08 | Synthèses et statistiques | Agrégats ; risques de réidentification si faibles effectifs | Service de synthèse → public **si réellement anonymisé** | **À déterminer selon niveau d'identification** | **À déterminer** | **NON** |

**Données de tiers :** présence possible dans les champs libres et les citations. Prévoir une politique de suppression/anonymisation éditoriale avant toute diffusion. **Données de mineurs :** périmètre et mesures non définis.

**Données sensibles (art. 9) :** les arguments peuvent révéler des opinions politiques, des convictions philosophiques/religieuses ou d'autres catégories protégées ; dans certains cas, la publication d'une opinion « sans nom » peut tout de même rendre la personne identifiable. Chaque activité doit être qualifiée séparément. L'exception applicable au traitement de telles données doit être identifiée, documentée et reliée au modèle de recueil de l'accord ou à une autre condition légale appropriée.

## 3. Questions de nécessité et proportionnalité à faire approuver
1. Pourquoi conserver l'adresse de suivi dans le même dossier que le texte ? Une séparation logique ou une pseudonymisation renforcée est-elle nécessaire ?
2. Le suivi doit-il être possible **sans adresse e-mail** ? Sous quelles garanties de récupération ?
3. Les anciennes versions doivent-elles être visibles du public ? Si oui, avec quel choix de diffusion et quelle gestion des corrections/retraits ?
4. Quels renseignements sont réellement nécessaires à une décision de modération ? Peut-on masquer l'identité de l'auteur aux examinateurs ?
5. Les journaux d'accès conservent-ils des textes ou seulement des références et codes d'opération ?
6. Quels contenus ou pièces de tiers sont formellement interdits dans le dépôt ?
7. Quel traitement peut être rendu irréversiblement anonyme pour les bilans ?
8. Peut-on respecter l'effacement, l'opposition et le retrait de consentement dans tous les index, sauvegardes et traces, compte tenu des obligations légales éventuelles ?

## 4. Préexamen des critères d'AIPD
La CNIL exige une AIPD si le traitement est susceptible d'engendrer un **risque élevé** pour les droits et libertés. Elle propose des critères de qualification ; l'appréciation finale doit être documentée.

| Critère de risque à instruire | Indice V0.3 | Résultat provisoire |
|---|---|---|
| Traitement de données sensibles ou hautement personnelles | Des opinions politiques ou convictions peuvent être identifiables dans les champs libres | **Indice pertinent — à caractériser** |
| Volume / grande échelle | Nombre de participants, durée, nombre de consultations non connus | **Inconnu** |
| Personnes vulnérables / mineurs | Règles d'âge non encore adoptées | **Inconnu** |
| Croisement de fichiers | Index de récupération de plusieurs références lié à une même adresse | **À examiner : possibilité de rapprochement** |
| Surveillance systématique / profilage | Non prévu ; absence ne vaut pas garantie tant que journaux et outils ne sont pas définis | **Non établi** |
| Évaluation ou score des personnes | Le modèle modère des contenus, pas une note publique des personnes ; risques d'évaluation indirecte à examiner | **À examiner** |
| Technologie / mode d'accès nouveau | Jetons, sessions, stockage chiffré, outils de modération | **À examiner** |
| Atteinte aux droits ou à l'accès au service | Refus de publication, suspension, accès aux recours, conservation et retrait | **À examiner** |

**Conclusion provisoire : besoin d'un examen AIPD formalisé ; impossibilité de conclure à une dispense sur la seule base des tests actuels.** Si le risque élevé est établi, l'AIPD doit précéder la mise en œuvre. Le principe de précaution technique conduit à traiter **l'ouverture comme bloquée** jusqu'à ce que la qualification soit validée.

## 5. Flux et prestataires — à confirmer
- Navigateur → formulaire V0.3 (inexistant) → contrôleur HTTP V0.3 (inactif) ;
- Authentification par lien unique → service e-mail futur → vérification session ;
- Stockage d'identité/contact → index HMAC → stockage privé de contributions et recours ;
- Lectures privées autorisées → examinateur/superviseur ;
- Publication après validation → projection minimale → navigateur du public ;
- Journal de suivi, exports, suppression, sauvegarde et restauration : **à concevoir**.

**Ne pas déduire une localisation de stockage de la seule adresse du fournisseur.** Lister séparément : Netlify Forms existant, fonctions/blobs V0.3 futurs, hébergeur, transit courriel, gestion des clés, services de journalisation, sauvegarde et sous-traitants ultérieurs. Collecter et vérifier les documents contractuels nécessaires.

## 6. Contenu minimum de l'analyse d'impact, si exigée
- Description systématique des opérations, de leurs finalités, catégories de personnes, environnements et flux.
- Nécessité/proportionnalité, bases art. 6/9, minimisation et information préalable.
- Risques sur la vie privée et les droits : identification des opinions, représailles, discrimination, surveillance, divulgation de tiers, accès abusif, altération de propos, perte de disponibilité.
- Mesures de maîtrise et risques résiduels : accès, chiffrement, clés, journal, contrôle humain, limitations, export, suppression, formation des modérateurs.
- Consultation des responsables internes et, si nécessaire, des personnes concernées ou de leurs représentants.
- Décision et approbation datées, puis réévaluation en cas de changements.

## 7. Registre des décisions à obtenir
| Décision | Statut |
|---|---|
| Identité et siège du responsable au lancement | **Ouverte** |
| Bases art. 6 / conditions art. 9 par finalité | **Ouvertes** |
| Régime d'âge et collecte sans e-mail | **Ouvert** |
| Liste des fournisseurs, contrats DPA, régions, transferts éventuels | **Ouverte** |
| Durées distinctes et exécution technique de purge | **Ouvertes** |
| AIPD requise ou non : motivation et signature | **Ouverte** |
| Niveau de confidentialité des versions et synthèses | **Ouvert** |
| Critères de modération et conflit d'intérêts | **Ouverts** |
| Responsable du processus de violation et suspension | **Ouvert** |

### Sources primaires et professionnelles
- https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra
- https://www.cnil.fr/fr/definition/donnee-sensible
- https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement
- https://www.cnil.fr/fr/RGPD-analyse-impact-protection-des-donnees-aipd
- https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd
- https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence

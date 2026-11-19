# Diploval — Consultations citoyennes V0.3
## Audit B7 de préparation : conformité, sécurité, exploitation
**Version interne B7.0 — 19 novembre 2026 — NON PUBLIABLE EN L'ÉTAT**

### 0. Périmètre et méthode
Audit **documentaire et de code**, réalisé sur `main` au commit `43029b3a450f43aa650c71b5781d3c45aaa44133`, lots A à B6, scripts et pages légales actuelles. Les essais automatisés des lots antérieurs ont été validés en prévisualisation Netlify. Ce contrôle **ne constitue pas** un audit indépendant de sécurité, une AIPD terminée, une consultation juridique ni une évaluation des contrats fournisseurs.

**Décision B7 : NO GO à toute activation de la V0.3 sur des données réelles.** Le présent lot n'ouvre ni formulaire V0.3, ni API, ni espace professionnel, ne publie ni CGU ni nouvelle politique.

### 1. Périmètre technique effectivement examiné
| Objet | Source vérifiée | Constat |
|---|---|---|
| Modèle de contribution et de consentement | `netlify/lib/dialogue-model.mjs` | `createEntry`, versions, `processingAgreement`, `publicationAgreement`, `publicView`. Consentements booléens et horodatage ; base art. 6 et condition art. 9 **non qualifiées juridiquement**. |
| Dépôt privé | `netlify/lib/dialogue-storage.mjs` | ETag et contrôles avant lecture/modification ; **pas de purge, de durée de conservation ni d'export**. Réservations atomiques pouvant rester orphelines. |
| Accès auteur | `netlify/lib/dialogue-author-access.mjs` | Jeton unique 10 minutes, session 2 heures, transport e-mail injecté **non déployé**. |
| Chiffrement | `netlify/lib/dialogue-encrypted-store.mjs` | AES-256-GCM injectable ; **clés réelles, rotation, restauration et tests d'exploitation absents**. |
| Récupération de références | `netlify/lib/dialogue-reference-recovery.mjs`, `dialogue-contact-index.mjs` | Empreintes HMAC et récupération privée ; synchronisation de l'index avec effacement/rectification **non intégrée**. |
| Modération | `netlify/lib/dialogue-moderator-access.mjs`, `dialogue-moderation-queue.mjs` | Rôles par consultation ; fournisseur de sessions et liste réelle **non configurés**. |
| Recours | `netlify/lib/dialogue-appeals.mjs`, `dialogue-appeal-queue.mjs` | Motifs et escalade ; index persistant, procédure de traitement et délais **non finalisés**. |
| Réponses individuelles | `netlify/lib/dialogue-contributor-responses.mjs` | Double validation ; **une réponse par mutation**, aucun courrier réel, aucune politique de conservation/purge. |
| Suivi | `netlify/lib/dialogue-followup.mjs` | Objectifs **désactivés par défaut** ; politique à adopter. Exemples 7/14 jours non validés. |
| API interne | `netlify/lib/dialogue-service-v03.mjs` | Désactivée par défaut et **non importée par une Netlify Function publiée**. Nécessite un durcissement des réponses d'erreur, CSRF, quotas, authentification et supervision. |
| Démonstrations B5/B6 | `admin/consultations-v03-b5/`, `admin/consultations-v03-b6/` | Pages statiques publiques par URL, avec **dossiers exclusivement fictifs**, non utilisables comme interface réelle. |
| Avis juridiques actuels | `index.html`, `propositions-contributions.html` | Mentions légales et données personnelles déjà présentes ; ne couvrent **pas encore** les mécanismes V0.3. |
| Formulaire existant V0.2 | `scripts/consultations.mjs` | Formulaire Netlify Forms séparé, adresse de suivi et case d'information ; **ne pas modifier ni confondre** avec le nouveau traitement V0.3. |

Les éléments signalés « absents » signifient **non trouvés dans les modules inspectés**, pas une affirmation sur toutes les pratiques organisationnelles existantes hors GitHub.

### 2. Écarts réglementaires — classement
**Bloquant B7-P01 — Finalités, bases juridiques et catégories sensibles.** Un débat concernant des élus, convictions ou prises de position peut révéler des opinions politiques (article 9 RGPD), même sous pseudonyme ou via une contribution non publiée. Pour **chaque finalité distincte** (instruction, publication, authentification/suivi, recours, modération, sécurité, statistiques, éventuelle notification), documenter une base art. 6 et, lorsque pertinent, **une exception valable au principe d'interdiction art. 9(2)**. L'expression `processingAgreement:true` du modèle ne prouve **pas** à elle seule un consentement explicite au sens de l'article 9. Le simple fait qu'une personne ait écrit volontairement un avis ne suffit pas automatiquement à présumer que toutes ses données peuvent être publiées ou conservées. Séparer déclaration de prise de connaissance, base légale, éventuel consentement explicite et consentement à la publication.

**Bloquant B7-P02 — Information avant collecte (art. 12–14).** Notice V0.3 claire, courte au point de collecte, et détaillée à portée de clic : identité **juridiquement vérifiée** du responsable, finalités et bases, catégories de données, obligation ou caractère facultatif, destinataires/sous-traitants, transferts hors EEE et garanties le cas échéant, durées par catégorie, droits (dont retrait du consentement lorsque applicable), CNIL, décisions automatisées éventuelles (aucune prévue), coordonnées. Les informations générales actuelles ne suffisent pas pour annoncer une collecte V0.3.

**Bloquant B7-P03 — Règles de publication et droits de tiers.** Demander un choix distinct pour publication et mode d'identification ; prévoir l'exposition indirecte de données sensibles dans le texte, la présence de tiers, l'anonymisation éditoriale préalable, la correction, le droit d'opposition selon base, le retrait et les versions déjà publiées. Les contributions des citoyens **ne sont pas automatiquement placées sous la licence CC BY 4.0 appliquée aux propres textes de Diploval** : rédiger des règles de licence réutilisation spécifiques validées.

**Bloquant B7-P04 — Durées, suppression et export.** Définir précisément des durées distinctes pour contribution privée, texte public, métadonnées, coordonnées, identifiants des sessions/jetons, index HMAC, audits, recours, signalements, notifications, journaux, sauvegardes. Fournir une procédure d'accès, export, rectification, restriction, effacement et retrait, avec authentification proportionnée, traces minimales et propagation aux index/sauvegardes suivant règles retenues. La formule actuelle « jusqu'à la clôture et au traitement » n'est pas une règle opérationnelle suffisante pour V0.3 ; les demandes ne doivent pas être bloquées parce qu'une consultation est encore ouverte.

**Bloquant B7-P05 — Registre, qualification d'AIPD.** Créer une fiche dans le registre des traitements (article 30), une cartographie des flux et une **analyse documentée de la nécessité d'une AIPD** au regard du risque : données sensibles, potentiels croisements, modération de propos, exposition de tiers, volume, vulnérabilité éventuelle. Si le traitement est susceptible d'engendrer un risque élevé, réaliser une AIPD **avant mise en œuvre**, puis corriger les risques résiduels. La simple présence d'opinions politiques ne permet pas de conclure automatiquement « AIPD obligatoire » sans examen circonstancié.

**Bloquant B7-P06 — Sous-traitants et transferts.** Recenser Netlify (site/forms/blobs), hébergement, stockage, fournisseur d'email futur, observabilité et éventuels outils d'administration. Vérifier leurs fonctions exactes, régions **réelles** de traitement, sous-traitants ultérieurs, durée de conservation, clauses art. 28 et transferts hors EEE/garanties si applicables. **La domiciliation américaine d'un fournisseur ne suffit pas, seule, à conclure aux flux de toutes les données.** Ne pas saisir de secrets ou de données privées dans GitHub ni dans les pages statiques.

**Bloquant B7-P07 — Exploitation et sécurité.** Fournisseur d'identité de personnel séparé, MFA adaptée, distribution/retrait des habilitations, revue de rôles, sauvegardes chiffrées testées, rotation et révocation des clés/jetons, audit d'accès, limites de fréquence distribuées, CSRF, protection des liens de connexion, authentification avant lectures, cloisonnement prod/préviews, procédure incidents et violation de données (notification CNIL si critères remplis, dans les délais RGPD), tests de restauration et tests adversariaux. Les tests Node/Netlify ne remplacent pas ces mesures.

**Bloquant B7-P08 — Transparence et gouvernance de la modération.** Publier une charte et CGU précisant types de contenus acceptés, motifs de masquage, refus, retrait, procédure de réexamen, rôle des modérateurs, absence d'auto-publication, droits de réponse/correction, liens de parenté des versions, séparation des contributions privées et opinions de Diploval, absence de garantie de publication. Réserver la possibilité de suspendre **un compte abusif uniquement avec procédure proportionnée**, sans compromettre les droits RGPD ; un désaccord argumenté n'est pas une cause de modération.

**Bloquant B7-P09 — Identification de l'éditeur.** Les mentions visibles déclarent « SASU en cours d'immatriculation ». Vérifier **l'état juridique réel à la date de lancement** ainsi que les informations de l'éditeur et du responsable de traitement ; ne pas inventer de SIREN/RCS, capital, siège ou DPO. La V0.3 doit pointer vers les mentions à jour.

**Bloquant B7-P10 — Âge et publics vulnérables.** Définir si participation des mineurs acceptée et, si oui, les garanties, règles d'information et éventuelles règles d'autorisation propres au cas d'usage. Mettre en place l'exclusion/minimisation des informations sensibles de tiers si elles ne peuvent être instruites.

**Bloquant B7-P11 — Politique de notification.** Le contact de suivi ne doit pas entraîner un abonnement à un service de diffusion. Toute information de dossier par e-mail doit être strictement minimisée ; un choix distinct peut être requis selon la finalité. Aucune notification B6 réelle aujourd'hui.

**Bloquant B7-P12 — Incident, traçabilité et réversibilité.** Définir un responsable humain de l'astreinte, la procédure de suspension du dispositif, le traitement des signalements, la notification aux personnes selon risque, la continuité du service et une stratégie d'export/restauration en cas de changement de prestataire.

### 3. Non-régressions et mesures déjà présentes
- Refus par défaut du contrôleur V0.3 ; pas de fonction Netlify exposant ces modules.
- Versions privées séparées, publication soumise à contrôle humain, `publicView` filtrée.
- Accès auteur par lien unique et session à durée limitée, sous réserve de la mise en service du fournisseur de courrier et du stockage.
- Stockage privé conçu avec écritures conditionnelles et chiffrement injectable AES-GCM.
- Rôles internes par consultation et retrait immédiat possible par le vérificateur de session.
- Double contrôle humain des réponses, modération des recours ; aucun e-mail externe automatisé.
- Les maquettes B5/B6 sont clairement fictives et **ne devront jamais être substituées telles quelles** à l'administration réelle.

### 4. Évaluation des risques avant pilote (ordre)
| ID | Risque principal | Impact plausible | Mesure impérative | Priorité |
|---|---|---|---|---|
| R-01 | Opinion politique associée à une personne identifiable | Divulgation, discrimination, intimidation | Art. 6 et 9, minimisation, revue éditoriale, AIPD selon qualification | CRITIQUE |
| R-02 | Accès abusif d'un modérateur ou une session compromise | Lecture massive de dossiers | MFA, habilitations, quotas, journal, test d'intrusion | CRITIQUE |
| R-03 | Exposition des réponses en brouillon ou des coordonnées | Violation de confidentialité | Projections explicites, tests d'API, aucun secret au client | CRITIQUE |
| R-04 | Retrait/rectification non répercuté sur index et sauvegardes | Conservation illicite ou affichage persistant | Politique d'effacement et purge contrôlée, test de restauration | CRITIQUE |
| R-05 | Retour d'un utilisateur mal authentifié sur un autre dossier | Divulgation de contributions privées | Sessions liées au propriétaire, absence d'énumération, test adversarial | CRITIQUE |
| R-06 | Perte de données ou clé de chiffrement | Dossiers irrécupérables, traçabilité perdue | Sauvegardes et rotations testées hors production | HAUTE |
| R-07 | Données personnelles de tiers dans des arguments publics | Atteinte à la vie privée/diffamation | Modération et droits de signalement/retrait | HAUTE |
| R-08 | Communication trompeuse sur délais ou statut | Perte de confiance, promesse injustifiée | Politique versionnée, délais indicatifs approuvés seulement | HAUTE |
| R-09 | Envoi d'un message confidentiel par email | Exposition lors d'une erreur de destinataire | Liens de connexion, mails de contenu minimal, protections anti-abus | HAUTE |
| R-10 | Documents CGU/RGPD contradictoires | Information non transparente, contestations | Versions juridiques cohérentes, historisation et validation humaine | HAUTE |

### 5. Décision de préparation
**NO GO** jusqu'à : identité juridique vérifiée ; notices RGPD & CGU/charte adoptées ; base article 6 et, le cas échéant, exception article 9 documentées ; registre et AIPD évalués ; DPA et transferts vérifiés ; politique de conservation et exercice des droits **implémentés et testés** ; stockage et sauvegardes effectifs ; authentification/permissions réelles et tests adversariaux ; démonstration d'un parcours complet avec données fictives ; approbation expresse d'un responsable humain.

Il serait prématuré de choisir une date d'ouverture. Prochaine action : soumettre les **projets de textes B7** et la grille GO/NO GO à validation, puis prioriser l'implémentation des mesures bloquantes. Pas de raccordement réel dans ce lot.

### 6. Sources officielles à consulter lors de la validation
- RGPD consolidé : https://eur-lex.europa.eu/eli/reg/2016/679/oj/fra — articles 5–7, 9, 12–15, 17–22, 28, 30, 32–35.
- CNIL, données sensibles : https://www.cnil.fr/fr/definition/donnee-sensible
- CNIL, information des personnes : https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- CNIL, AIPD : https://www.cnil.fr/fr/RGPD-analyse-impact-protection-des-donnees-aipd
- CNIL, registre : https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement
- CNIL, sous-traitants : https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant
- CNIL, incidents et violations : https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre
- Service Public, mentions légales : https://entreprendre.service-public.gouv.fr/vosdroits/F37351

# Diploval — Consultations citoyennes V0.3
## Registre unique de préparation à l'ouverture — NO GO
**Version de synthèse : 1.0 — 19 novembre 2026**  
**Dossier de référence : PR GitHub #20, branche `audit/consultations-v03-b7-rgpd-cgu-2026-11-19`**

> Ce document consolide les preuves de tests et les 16 conditions de la grille B7. Ce n'est ni une autorisation de publication, ni une certification de sécurité ou de conformité. Aucune modification de la V0.2, aucune fusion, aucune collecte réelle V0.3.

### 1. Preuves techniques vérifiées

- **GitHub Actions** : [exécution 44573529219](https://github.com/DiplovalOfficiel/diploval-site/actions/runs/44573529219), statut `success`, commit `64dede6fbd47451b9529c8586191838f87db3fbf`.
- **Résultat** : 213 tests techniques réussis / 213 et 8 contrôles B7 réussis / 8, soit **221 / 221**, aucun échec dans cette exécution.
- La grille `DIPLOVAL_V03_B7_gate_NO_GO.json` indique `release=NO_GO`, `actual_processing_enabled=false`, `legal_docs_published=false`, **P01–P16 tous `OPEN`**, `approval_date=null`.
- Les tests d'intégration utilisent des stockages, identités, mandats et transport de messages simulés. Ils ne prouvent pas l'intégrité des prestataires réels ni la disponibilité en production.
- La PR #20 demeure brouillon/non fusionnée. Une fusion ne constituerait **jamais** en elle-même une autorisation d'ouverture.

### 2. Inventaire des fonctions et niveau de preuve

| Domaine | Ce qui existe dans la branche V0.3 | Preuve actuellement disponible | Limite bloquante |
|---|---|---|---|
| Dépôt et références | Modèle, stockage privé injectable, référence publique de suivi | Recettes simulées création/lecture et tests d'écriture conditionnelle | Pas de transaction multi-objets ni de fournisseur validé |
| Consultation publique | Projection filtrée ; consentement de publication distinct | Tests de refus de publication, publication modérée et retrait | Cache/CDN, version et effacement réel non validés |
| Espace personnel | Lien email à usage unique, session opaque, lecture privée et révision | Tests d'expiration, révocation, changement de contact | Envoi réel, anti-abus, récupération de boîte perdue non opérationnels |
| Index des contacts | Index HMAC et diagnostics lecture seule | Tests fictifs d'incohérence et d'orphelins | Pas de synchronisation transactionnelle avec dossier et sessions |
| Modération Diploval | Décisions humaines simulées, file et contrôleur privé | Tests de contrôle de versions, refus, approbation et retrait | Identités professionnelles, procédures réelles et audit externe à établir |
| Recours | Réexamen privé, escalade, suivi de statut | Recette transversale phase 2 réussie | Équipe indépendante, règles et délais d'exploitation non attestés |
| Réponses personnelles | Brouillon privé, seconde approbation distincte, révocation | Tests simulés de double validation et confidentialité | Transport et stockage de production non vérifiés |
| Participation institutionnelle | Contrôle de mandat par organisation/consultation, projet de réponse et revue Diploval séparée | 13 tests de périmètre et 10 tests de parcours institutionnel réussis | Mandats réels et identité professionnelle non vérifiés ; aucune publication autonome |
| Droits RGPD | Exports privés et demandes de droits ; prototypes de coordination d'effacement | Tests de demandes, accès, journalisation et garde-fous | Effacement effectif de tous les supports, délais et sauvegardes non attestés |
| Sécurité HTTP | Contrôleur interne désactivé, vérifications Origin, cookie, quota injecté | 15 tests HTTP fictifs réussis | Aucun essai sur application déployée, CDN/proxy, navigateur réel ou quotas distribués |
| Incident et reprise | Journaux CAS, diagnostics, revues humaines à deux intervenants | Tests de panne et de concurrence simulées | Fournisseur réel, fencing, reprises après panne, supervision et crise non testés |
| Interface et accessibilité | Parcours applicatifs décrits en code | Pas de recette utilisateur complète documentée dans ce registre | Mobile, accessibilité, langage clair et ergonomie à évaluer |

**Attention aux libellés** : « développé » et « réussi en simulation » ne signifient pas « opérationnel », « conforme » ou « prêt à recevoir des données ».

### 3. Registre de décision — les 16 conditions de blocage officielles

Les intitulés et responsables ci-dessous sont repris de la grille B7. **Aucun point n'est clôturé** ; les preuves attendues constituent des critères de sortie proposés, à valider avec les personnes compétentes.

| Point | Objet / responsable | État | Preuve ou décision attendue pour sortir du blocage |
|---|---|---|---|
| **P01** | Base art. 6 et conditions art. 9 RGPD par finalité — Juridique / responsable de traitement | OPEN | Tableau des finalités, bases légales, données sensibles, exceptions applicables, décision juridique motivée |
| **P02** | Information art. 13 et consentements éventuels — Responsable de traitement | OPEN | Notice V0.3 exacte au point de collecte, versionnée, vérifiée, lisible et approuvée |
| **P03** | CGU, charte, licences et publication — Diploval / juridique | OPEN | Textes consolidés et signés, protocole contradictoire et règles de diffusion approuvés |
| **P04** | Âge, tiers et minimisation des textes libres — Responsable de traitement | OPEN | Arbitrages documentés, garde-fous pour mineurs/tiers et tests de minimisation |
| **P05** | Registre art. 30 et AIPD — Responsable de traitement / conseil RGPD | OPEN | Registre complété et décision AIPD documentée ; AIPD réalisée si requise, mesures suivies |
| **P06** | Sous-traitants art. 28, localisation, transferts — Diploval / prestataires | OPEN | Inventaire des fournisseurs, contrats et garanties de localisation/transferts effectivement vérifiés |
| **P07** | Conservation et purge, sauvegardes incluses — Technique / juridique | OPEN | Durées par objet, purge/expiration et restauration sans réapparition testées |
| **P08** | Accès, export, rectification, retrait, effacement — Technique / RGPD | OPEN | Parcours effectifs des droits, refus motivés, effacement multi-stockages et traçabilité vérifiés |
| **P09** | Stockage chiffré, clés, rotation, restauration — Technique / sécurité | OPEN | Tests d'intégration du fournisseur réel, chiffrement, rotation et restauration documentés |
| **P10** | Authentification professionnelle, MFA, rôles — Administrateur sécurité | OPEN | Fournisseur d'identité, MFA, gestion des mandats institutionnels, révocation et audit des accès |
| **P11** | HTTP, quotas, CSRF, journaux, essais adversariaux — Technique / sécurité | OPEN | Recette de sécurité sur environnement isolé réaliste, limites distribuées et revue indépendante |
| **P12** | Emails facultatifs et suivi — Technique / responsable | OPEN | Transport sécurisé, consentement adapté, délivrabilité, indisponibilité et réponses neutres testés |
| **P13** | Modération, impartialité et recours — Responsable éditorial | OPEN | Règlement applicable, personnel habilité, escalade, recours et contrôles réels démontrés |
| **P14** | Responsable de traitement et mentions légales — Juridique | OPEN | Identité et statut juridique exacts, mentions mises à jour et approuvées |
| **P15** | Incidents, violations, réversibilité et suspension — Responsable sécurité | OPEN | Procédure d'incident et exercice de crise avec restauration, suspension, délais et responsabilités |
| **P16** | Pilote fictif intégral et test indépendant — Technique / responsable | OPEN | Recette de bout en bout sur environnement isolé, avis indépendant, corrections et décision datée |

**Note P08 :** la preuve historique de la grille B7 évoque l'absence de fonctions d'export/purge ; depuis, certains prototypes de demandes/export et de coordination ont été développés. Cela **ne justifie pas la clôture de P08**, faute de preuve d'exécution opérationnelle. Mettre à jour la preuve lors de la prochaine revue formelle, pas le statut de manière anticipée.

### 4. Ordre de levée des risques

**Vague A — Cadrage juridique et responsabilités.** P01, P02, P03, P04, P05, P06, P14. Responsables : direction du traitement, relecture juridique et prestataires. Produire des décisions datées et des textes complets.

**Vague B — Socle technique vérifiable.** P07, P08, P09, P10, P11, P12, P15. Installer un environnement de test isolé avec des fournisseurs réellement contractés, une authentification de test et des jeux fictifs. Éprouver concurrents, sauvegardes, purge, journaux, changements de rôles et incidents.

**Vague C — Gouvernance éditoriale, accessibilité et pilote indépendant.** P13, P16. Tester une consultation fictive complète : dépôt, consentement, modération, invitation d'une institution autorisée, proposition et réponse, recours, exercice des droits, incidents et clôture. Réaliser une revue indépendante ainsi que des essais mobiles et d'accessibilité.

Ces vagues peuvent avancer en parallèle, mais **aucune ne doit être considérée achevée à partir des seules simulations**.

### 5. Priorités opérationnelles non closes

| Priorité | Travail à produire | Livrable attendu |
|---|---|---|
| 1 — Critique | Désigner le responsable du traitement et le relecteur de conformité, arbitrer art. 6/9 et mineurs | Décisions juridiques et notice/CGU finalisées |
| 2 — Critique | Prouver les garanties du fournisseur stockage, secrets, CAS et détection des incohérences | Rapport de tests fournisseur et plan d'incident |
| 3 — Critique | Concevoir l'authentification professionnelle et la preuve des mandats | Matrice de rôles réelle, protocole de vérification et révocation |
| 4 — Critique | Tester effacement, rectification et conservation sur tous les supports, y compris sauvegardes | Procès-verbal contradictoire des droits RGPD |
| 5 — Élevée | Valider l'envoi facultatif de liens et la prévention de l'énumération | Tests de confidentialité, quotas et sécurité du transport |
| 6 — Élevée | Formaliser la modération, les recours et le traitement des réponses institutionnelles | Charte éditoriale, habilitations et dossiers d'essais |
| 7 — Élevée | Exécuter un pilote complet avec testeur indépendant et essais d'accessibilité | Rapport d'anomalies, corrections et procès-verbal de recette |

### 6. Registre des anomalies / limites ouvertes

| Référence | Gravité provisoire | Constat | Action nécessaire |
|---|---|---|---|
| INT-01 | Critique | Création dossier/référence/index sans transaction multi-objets | Protocole durable, reprise idempotente et test de panne |
| INT-02 | Critique | Aucun fournisseur d'identité institutionnelle réel | Vérification des mandats, MFA, séparation des organisations |
| INT-03 | Critique | Effacement et restauration globale non attestés | Essai d'effacement et non-réapparition après restauration |
| INT-04 | Élevée | Contrôleur HTTP non vérifié sur proxy, navigateur et infrastructure cible | Recette HTTP en environnement test isolé |
| INT-05 | Élevée | Énumération possible via écarts de durée ou d'erreurs lors de l'envoi de liens | Conception anti-énumération et tests adversariaux |
| INT-06 | Élevée | Publication de réponse institutionnelle non développée avec un contrôle final autonome | Circuit juridique/éditorial complet et revalidation de la version source |
| INT-07 | Élevée | Contrôle de suppression des caches publics non vérifié | Éprouver invalidation et absence de réapparition |
| INT-08 | Élevée | Absence d'essai usager et accessibilité documentés | Tests lecteurs d'écran, mobile, formulaires et langage clair |
| INT-09 | Critique | Bases juridiques et conditions du traitement de données sensibles non validées | Avis juridique, arbitrage documenté et AIPD si requise |

La gravité est **provisoire et conservatrice**, non la conclusion d'un audit indépendant. Ces anomalies ne doivent pas être supprimées du registre avant preuve de résolution.

### 7. Règles de décision de publication

La bascule vers `GO` exige **tous les points P01–P16 à `VERIFIED` avec preuves accessibles**, une relecture indépendante adaptée et **une décision humaine explicite, datée et enregistrée**. Une validation de tests, une fusion de branche ou un simple accord verbal n'y suffisent pas.

À ce jour : **NO GO — aucune activation, aucun traitement réel V0.3, aucune publication des textes juridiques V0.3 — PR #20 en brouillon — V0.2 préservée.**

### 8. Prochaine mise à jour de ce registre

Ne plus ouvrir de nouveaux « lots » de contrôle sans besoin identifié. Chaque travail suivant doit renseigner directement, dans ce registre : identifiant de condition, preuve, date, responsable, résultat du test, anomalie résiduelle, avis humain et nouveau statut. Les statuts de la grille JSON ne changent qu'après revue et attestation.

---

## 9. Ouverture du chantier juridique — responsabilité et qualifications (19 novembre 2026)

**Périmètre : P01–P06 et P14. Statut de chacun : OPEN.** Cette section est une grille de décision interne, **pas un avis juridique définitif**.

### 9.1. Identité du responsable du traitement — décision préalable P14

Selon les critères du RGPD, est responsable la personne physique ou morale qui **détermine les finalités et les moyens essentiels** du traitement. La présence d'un élu, d'une collectivité ou d'une institution répondante ne lui confère pas automatiquement le statut de responsable ni de coresponsable. Il faut analyser les décisions concrètes de chaque acteur.

**Constat à vérifier officiellement :** l'entité juridique exacte qui porte Diploval V0.3 et sa situation au registre national des entreprises **ne sont pas établies par la seule mention « SASU en cours » du site**. Ne pas afficher comme acquise une immatriculation non documentée. Récupérer un justificatif officiel actuel, le nom légal, l'adresse professionnelle pertinente, le représentant habilité et les coordonnées de contact RGPD. Si l'activité est portée par une EI, qualifier l'EI / la personne physique exploitante selon sa situation juridique effective ; si elle est portée par une société immatriculée, retenir sa dénomination exacte. Ne pas attribuer simultanément la même responsabilité aux deux par simple hypothèse.

**Décisions à consigner :**
1. Qui décide des consultations, du périmètre des données, du consentement, de la durée, des catégories de destinataires et des publications ?
2. Les institutions participantes agissent-elles seulement comme destinataires et auteurs de réponses, comme responsables distincts de leurs propres traitements, ou existe-t-il une décision conjointe de certaines finalités/moyens essentiels ? Définir des rôles **par finalité et flux**, non une étiquette globale.
3. Qui signe la notice, les CGU, les contrats de sous-traitance, la procédure d'incident et la décision finale d'ouverture ?
4. Le traitement exige-t-il la désignation d'un DPO au titre de l'article 37 ? **Ne pas présumer** qu'un DPO est obligatoire du seul fait de données sensibles : apprécier notamment l'activité de base et l'échelle. Désigner au minimum un interlocuteur RGPD et documenter la décision.

**Critère de sortie P14 :** identité et qualité établies par pièce officielle à jour ; rôles et contacts approuvés, mentions légales et notice cohérentes.

### 9.2. Matrice des finalités et bases — instruction P01

Les bases légales de l'article 6 et les exceptions de l'article 9 sont deux examens **distincts et cumulatifs** lorsqu'un traitement porte sur des données sensibles. Les cases `processingAgreement` et `publicationAgreement` du modèle actuel n'établissent ni à elles seules une base valide pour chaque finalité ni la licéité des contenus sensibles.

| Finalité envisagée | Données et risques | Fondement article 6 à instruire | Exception article 9 à instruire | Décision avant collecte |
|---|---|---|---|---|
| Réception et conservation d'une contribution privée | Texte libre susceptible de révéler opinions et informations de tiers ; identifiant, coordonnées facultatives | Consentement spécifique ou autre base réellement justifiable, à choisir par finalité | Consentement **explicite** spécifique si retenu et valable, ou autre exception réellement applicable ; absence d'exception = refus de collecte | **Non arbitré** |
| Affichage public après modération | Texte, pseudonyme ou nom choisi ; risque de données sensibles rendues publiques | Base de publication distincte à documenter ; accord de publication non précoché | Exception art. 9 valable **avant** publication de données sensibles ; ne pas présumer qu'une publication volontaire équivaut toujours à une manifestation « manifestement rendue publique » de toutes les données | **Non arbitré** |
| Espace personnel, lien de connexion, historique et versions | Email, empreinte de contact, jetons, sessions, journaux | Base par finalité à établir ; nécessité et proportionnalité à démontrer | Éviter le stockage de contenus sensibles dans les logs ; sinon vérifier exception | **Non arbitré** |
| Modération, recours, droits RGPD | Signalements, motifs, décisions, échanges potentiellement sensibles et tiers | Bases adaptées aux obligations, intérêts et finalités effectivement applicables à établir | Évaluer présence de contenus sensibles dans les dossiers de recours | **Non arbitré** |
| Réponse d'institution et transmission | Contribution, référence, éventuelle copie de texte ; risque de communication à un tiers ou réutilisation | Finalité, destinataire et rôle de l'institution à qualifier ; ne pas présumer « mission d'intérêt public » pour Diploval | Autorisation spécifique ou exception applicable avant transmission de données sensibles ; privilégier la seule projection publique | **Non arbitré** |
| Sécurité, traçabilité et gestion des incidents | Identifiants techniques, IP éventuelle, événements et références | Base légale et nécessité à documenter, distinctes de la communication volontaire | Minimisation renforcée des événements et suppression des données sensibles non nécessaires | **Non arbitré** |

**Arbitrage de conception à privilégier tant que les bases ne sont pas établies :** éviter de recueillir une opinion sensible identifiable non nécessaire ; fournir des avertissements et limites pour les champs libres, choix de confidentialité indépendants, et ne pas transmettre les textes privés aux institutions.

**Critère de sortie P01 :** tableau juridique signé, par finalité, avec fondement art. 6, exception art. 9 lorsque nécessaire, tests de nécessité et proportionnalité, analyse du retrait des consentements et conséquences opérationnelles. Les bases ne doivent pas être choisies artificiellement après collecte.

### 9.3. Information et politique éditoriale — P02, P03 et P04

**P02 — Notice art. 13 avant dépôt**, en langage clair, distinguant en premier niveau : responsable et contact, finalités, bases, destinataires institutionnels éventuels, caractères obligatoire/facultatif, stockage privé, publication séparée et modérée, données sensibles et de tiers, durées, droits/retrait, recours CNIL, éventuels transferts et garanties, existence éventuelle de décisions automatisées. Fournir second niveau détaillé et versions horodatées. **Ne pas présenter un simple accord général aux CGU comme un consentement explicite aux données sensibles.**

**P03 — CGU/charte :** dissocier conditions de service, autorisations de publication, licence éventuelle de reproduction, procédure de modération et recours, rôle et responsabilité éditoriale des institutions. L'usage d'une contribution dans un rapport Diploval doit être décrit distinctement de sa publication sur une page de consultation. Aucun usage secondaire général présumé.

**P04 — Mineurs et tiers :** établir la règle d'âge et les modalités applicables, limiter les champs libres, avertir qu'aucune information de santé, adresse ou accusation nominative inutile ne doit être déposée, prévoir suppression/masquage rapide et procédure de contestation. Ne pas promettre un contrôle d'âge fiable sans dispositif éprouvé.

**Critères de sortie :** textes finalisés, revus juridiquement, versionnés, testés pour lisibilité et correspondance exacte avec les fonctionnalités réellement offertes ; décision documentée pour mineurs et tiers.

### 9.4. Registre, analyse de risques et fournisseurs — P05 et P06

**P05 :** établir le registre article 30 **par finalité**, avec catégories de personnes/données, destinataires, transferts, durées et mesures de sécurité ; y joindre la cartographie des flux. Faire un examen formel des critères de l'AIPD article 35. Le texte libre pouvant contenir des catégories particulières de données, les risques de publication, les utilisateurs vulnérables et les accès institutionnels imposent un **examen approfondi**. L'obligation d'AIPD ne peut être tranchée par les tests actuels ; produire l'AIPD si les conditions sont réunies, et consigner la motivation si elle n'est pas retenue.

**P06 :** recenser pour chaque prestataire réel l'identité contractante, les fonctions exactes (hébergement du site, objets chiffrés, emails, noms de domaine, sauvegardes, statistiques éventuelles), les pays de stockage/accès, les sous-traitants ultérieurs, la gestion des clés et les transferts hors EEE. Examiner contrat article 28, clauses de confidentialité, assistance aux droits et aux incidents, restitution et suppression, audits, et garanties des transferts. **Aucun fournisseur ne doit être considéré contractuellement vérifié** par la seule présence d'une bibliothèque technique.

### 9.5. Registre des décisions et preuves à réunir

| Identifiant | Décision à produire | Responsable proposé (fonction) | Preuve acceptable | État |
|---|---|---|---|---|
| JUR-01 / P14 | Entité juridiquement responsable et représentant | Direction Diploval + conseil juridique | Justificatif officiel, approbation écrite, mentions corrigées | À instruire |
| JUR-02 / P01 | Bases art. 6 et exceptions art. 9 par finalité | Responsable du traitement + relecteur RGPD | Matrice signée et tests de proportionnalité | À instruire |
| JUR-03 / P02 | Notice et mécanismes d'accord réellement séparés | Responsable de traitement | Notice versionnée et procès-verbal de contrôle | À instruire |
| JUR-04 / P03 | CGU, modération, licence et réponses institutionnelles | Responsable éditorial + juridique | Versions approuvées et contrôle contradictoire | À instruire |
| JUR-05 / P04 | Règles sur mineurs, tiers et textes libres | Responsable de traitement | Politique approuvée, scénarios de tests et recours | À instruire |
| JUR-06 / P05 | Registre art. 30 et nécessité d'AIPD | Responsable de traitement + conseil RGPD | Registre par finalité, AIPD ou décision motivée | À instruire |
| JUR-07 / P06 | Sous-traitants, contrats, localisations et transferts | Direction Diploval + technique | Tableau fournisseurs, DPA, preuves techniques et contractuelles | À instruire |

**Aucune identité de responsable, signature, justificatif ni contrat n'est déduit ou inventé ici. Aucune des sept conditions ne change de statut.**

### 9.6. Préparation des chantiers suivants, sans ouverture de nouveaux lots

**Stockage — P07, P08, P09 et P15 :** vérifier contractuellement le service réellement choisi, ses garanties CAS/ETag, le chiffrement effectif, l'accès aux clés et leur rotation, les sauvegardes, la restauration, la conservation, l'effacement coordonné des index/journaux et l'absence de résurrection des données effacées. Prévoir un protocole d'essai avec données fictives, injection de panne et procès-verbal contradictoire.

**Identité institutionnelle — P10, P11 et P13 :** confirmer chaque mandat et sa durée, l'identité d'un agent par un canal institutionnel indépendant, les droits par organisation et consultation, l'authentification forte adaptée, la révocation, la traçabilité et la séparation de la modération Diploval. Une invitation ou adresse en domaine institutionnel **n'accorde aucun droit** sans vérification.

**Ordre d'exécution :** 1) acte de qualification du responsable + tableau des finalités, 2) revue des données sensibles/tiers et notice, 3) registre/AIPD et sous-traitants, 4) tests fournisseur et identité institutionnelle, 5) pilote indépendant. Tout arbitrage se rattache aux P01–P16 existants.

### 9.7. Sources officielles consultées le 19 novembre 2026

- CNIL, qualification des rôles : https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role
- CNIL, bases légales par finalité : https://www.cnil.fr/fr/les-bases-legales/liceite-essentiel-sur-les-bases-legales
- RGPD, art. 6 et 9 : https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2
- CNIL, information des personnes : https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence
- CNIL, registre art. 30 : https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement
- CNIL, documentation de conformité : https://www.cnil.fr/fr/documenter-la-conformite
- CNIL, AIPD : https://www.cnil.fr/fr/ce-quil-faut-savoir-sur-lanalyse-dimpact-relative-la-protection-des-donnees-aipd
- CNIL, sous-traitants : https://www.cnil.fr/fr/responsable-de-traitement-et-sous-traitant-6-bonnes-pratiques-pour-respecter-les-donnees
- CNIL, obligation de DPO : https://www.cnil.fr/fr/le-delegue-la-protection-des-donnees-dpo/devenir-delegue-la-protection-des-donnees

**Conservation de l'invariant : NO GO — P01–P16 OPEN — aucune collecte réelle V0.3 — PR #20 brouillon — V0.2 inchangée.**

---

## 10. Contrôle des déclarations publiques et qualification du responsable — 19 novembre 2026

### 10.1. Éléments constatés dans les pages publiques

Source contrôlée : https://diploval.fr/ (rubriques « Mentions légales », « Données personnelles », « Publications, corrections et réutilisation » ; consultation du 19/11/2026).

| Élément du site en ligne | Constat vérifiable sur la page | Lecture pour V0.3 |
|---|---|---|
| Éditeur et porteur | Les mentions légales présentent **Franck Saubin**, nom public **Souix Nathorod**, comme fondateur et porteur de Diploval | Cela identifie une personne déclarée publiquement, mais **ne constitue pas une attestation de la forme juridique actuellement immatriculée** |
| Société annoncée | « Diploval — SASU en cours d'immatriculation ; procédure engagée » ; SIREN/RCS/RNE annoncés comme futurs | Ne pas désigner une SASU comme responsable juridiquement établie sans pièce du registre |
| Responsable indiqué sur la politique actuelle | « Franck Saubin, pour Diploval » ; adresse de contact général `contact@diploval.fr` | **Responsable publiquement indiqué pour les services existants** ; à confirmer et qualifier formellement pour V0.3, qui constitue un traitement différent |
| État actuel de l'espace personnel | Le site affirme ne comporter « aucun compte utilisateur » | Déclaration relative au site **actuel**, incompatible avec une présentation de la V0.3 comme déjà disponible ; la future notice devra préciser le changement avant activation |
| Hébergeur et formulaires actuels | Netlify est présenté comme hébergeur et Netlify Forms comme système des formulaires publics | **Piste d'inventaire fournisseur**, non preuve du lieu de traitement, des clauses art. 28, du chiffrement ou des prestataires de la future V0.3 |
| Contributions existantes | Le site annonce une non-publication de l'email et une conservation des coordonnées jusqu'à clôture/traitement | Durée non quantifiée : ne pas recycler cette phrase comme politique de conservation détaillée de V0.3 |
| Licences de publication | Les **textes originaux de Diploval** sont présentés sous CC BY 4.0, avec exceptions | Cela ne prouve **aucune licence automatiquement accordée par les contributeurs ou les institutions** sur leurs textes ; régime spécifique à décider |

La page publique contient une adresse professionnelle envisagée et des coordonnées de contact ; elles ne sont pas reproduites dans le registre de travail, car les décisions de conformité exigent surtout des preuves sur l'entité et les rôles, non la multiplication de données d'identification dans le dépôt.

**Vérification externe non concluante :** une recherche web dans l'Annuaire des Entreprises n'a pas fourni de correspondance officielle suffisamment fiable pour attester la situation RNE/RCS exacte du porteur. Cela **ne signifie pas qu'aucune immatriculation n'existe** ; la pièce officielle reste à obtenir et vérifier via https://annuaire-entreprises.data.gouv.fr/ ou les justificatifs remis par l'exploitant.

### 10.2. Qualification provisoire, sans transformer la déclaration en preuve juridique

**Hypothèse de travail P14 (NON VALIDÉE)** : la personne indiquée dans la politique actuelle, Franck Saubin, décide de l'organisation des consultations Diploval et pourrait être responsable des traitements V0.3, **sous réserve de déterminer s'il agit juridiquement en son nom ou pour le compte d'une personne morale effectivement constituée et de vérifier les finalités/moyens essentiels réellement décidés**.

La CNIL rappelle que les qualifications dépendent de la réalité des finalités et des moyens essentiels, non d'une simple appellation : https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role

| Intervenant envisagé | Qualification provisoire | Vérification indispensable |
|---|---|---|
| Exploitant juridique effectif de Diploval | Responsable probable des consultations conçues et administrées par Diploval | Justificatif officiel et décision sur les finalités/moyens essentiels |
| Institution destinataire de publications filtrées | Destinataire ; éventuellement responsable distinct de ses usages propres | Cartographie des flux et des réutilisations, sans présumer de responsabilité conjointe |
| Institution co-concevant une collecte précise | Responsabilité conjointe **possible uniquement si** finalités/moyens essentiels décidés ensemble | Documenter concrètement l'influence de chacun ; accord art. 26 si applicable |
| Hébergeur, stockage ou outil d'envoi | Sous-traitant potentiel ou responsable distinct selon la prestation et ses traitements propres | Contrat et finalités propres, sous-traitants ultérieurs, transferts, garanties |
| Agent institutionnel invité | Utilisateur habilité au nom de son organisme, non un responsable automatiquement autonome | Identification du mandat, habilitation individuelle et date de révocation |
| Modérateur Diploval | Personne habilitée agissant selon instructions, non responsable indépendant par sa seule fonction | Contrôle de session, règles de séparation, confidentialité et audit |

### 10.3. Déclencheurs de décision et texte public non diffusable

**Dossier P14 à obtenir avant signature :**
- preuve officielle de l'immatriculation et de la qualité de l'exploitant juridique au jour de la future collecte ;
- décision écrite identifiant le responsable V0.3 et l'interlocuteur de droits, avec lien entre nom public Diploval et identité légale ;
- tableau des institutions invitées et de leurs usages permis, notamment refus de toute réutilisation des dossiers privés ;
- preuve des contrats et des règles de conservation pour le stockage et les emails ;
- correction de la politique actuelle uniquement lorsque l'évolution de service, l'identité et la description technique sont arrêtées.

**Libellé de travail non publiable tant que P14 demeure OPEN :**
« Les consultations citoyennes Diploval V0.3 seront placées sous la responsabilité de [IDENTITÉ LÉGALE VÉRIFIÉE], qui déterminera leurs finalités et moyens essentiels. Les institutions invitées ne recevront pas les coordonnées privées des contributeurs du seul fait de leur participation. La nature de leurs propres traitements, leurs destinataires et les éventuelles responsabilités conjointes seront indiqués pour chaque consultation. Les droits pourront être exercés auprès de [CONTACT RGPD VALIDÉ]. »

Le texte entre crochets **ne doit pas être diffusé au public**. Aucun contenu du site existant n'est modifié à cette étape.

**Effet sur les statuts :** P14 demeure **OPEN**, comme P01–P06. Une constatation sur le site n'est pas une preuve d'immatriculation, de conformité ou de désignation signée.

### 10.4. Conséquence opérationnelle immédiate

L'ordre de clôture reste : **pièce officielle de la structure → qualification écrite du responsable V0.3 → finalités et bases art. 6/9 → notice et CGU → contrats et sécurité des prestataires → tests d'exploitation isolés → décision indépendante et datée**. Les travaux de stockage et d'identité institutionnelle peuvent avancer en parallèle, mais ne sont pas à mettre en ligne.

Sources principales : site https://diploval.fr/ ; CNIL https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role ; Annuaire national https://annuaire-entreprises.data.gouv.fr/ ; RGPD articles 26 et 28 https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4

---

## 11. Instruction des bases légales par finalité — P01 / P02 / P04
**19 novembre 2026 — état : À ARBITRER / NON VALIDÉ.** Cette section formalise des options **pour avis juridique**, et non des bases juridiques déjà retenues.

### 11.1. Règles préalables vérifiées

1. Une **base légale de l'article 6** doit être retenue **par finalité avant la collecte** ; ne pas additionner ou présenter plusieurs bases comme interchangeables pour un même traitement sans justification.
2. Les contributions peuvent contenir des données de l'article 9 (opinions politiques, convictions, santé, etc.), **y compris indirectement**. Une base de l'article 6 ne suffit pas : une **exception à l'interdiction de l'article 9** est également nécessaire. Le consentement explicite (art. 9.2.a), lorsqu'il est pertinent et libre, doit être spécifique et démontrable. Il ne s'obtient pas par acceptation globale des CGU.
3. Ne pas présumer que l'« intérêt public » ou la **mission d'intérêt public** (art. 6.1.e) est une base utilisable par Diploval du seul fait de la pertinence civique du projet : cette base suppose un fondement dans le droit applicable et des missions effectivement confiées.
4. L'**intérêt légitime** (art. 6.1.f) est une possibilité à examiner pour certaines finalités d'un responsable privé, mais requiert une analyse de nécessité et de mise en balance avec les droits des personnes ; il **ne dispense jamais de l'article 9**.
5. Les conditions de publication, les textes libres sur des tiers, la transmission à des institutions, les données des mineurs, le retrait du consentement et les demandes de droits doivent être étudiés avant que les formulaires puissent recevoir des contributions.
6. Les consentements sont **distincts** lorsque les finalités le demandent. Le refus d'une publication publique ne doit pas automatiquement interdire un dépôt privé si celui-ci peut être licite et techniquement maintenu, ni permettre une republication ultérieure sans fondement.
7. Il faut distinguer les textes **anonymes au sens juridique** (réidentification non raisonnablement possible), les textes pseudonymisés et les textes simplement publiés « sans nom affiché » : ce dernier affichage n'est **pas** de l'anonymisation.

### 11.2. Matrice d'arbitrage — usage exact des informations

| Code | Opération concrète | Art. 6 : hypothèse à étudier | Art. 9 : analyse spécifique | Point d'arrêt |
|---|---|---|---|---|
| F01 | Dépôt d'une contribution privée et conservation de son texte | Consentement art. 6.1.a si libre, spécifique et sans contrainte ; examiner alternatives justifiables | Si texte sensible identifiable : consentement explicite 9.2.a ou autre exception **réellement établie** | Pas de collecte si les deux examens ne sont pas conclus |
| F02 | Publication volontaire de la version modérée, avec nom/pseudonyme/absence de nom affiché | Consentement à la diffusion distinct à étudier | L'accord de publication n'est pas automatiquement un consentement **explicite** conforme à l'art. 9 ; revue de minimisation et des mentions de tiers | Pas de publication automatique ; choix distinct et preuve conservée |
| F03 | Espace personnel, email de suivi, historique des versions et sessions | Base appropriée à la fourniture du suivi et à la sécurité à déterminer ; tester la nécessité d'une adresse email | Écarter tout contenu sensible des logs et index ; si inévitable, documenter l'exception | Aucune session V0.3 réelle tant que la protection fournisseur n'est pas validée |
| F04 | Modération, traitement des signalements, contrôle de sécurité et recours | Intérêt légitime sous réserve de mise en balance, ou base propre à une obligation applicable, **à distinguer** | Les motifs peuvent révéler des données sensibles de l'auteur ou de tiers ; limitation stricte des accès | Pas d'accès généralisé aux dossiers pour l'administration |
| F05 | Exercice des droits d'accès, rectification, effacement, limitation et opposition | Obligation légale pertinente à analyser pour la gestion des demandes ; limiter les justificatifs | Éviter l'enregistrement de pièces sensibles inutiles | Pas d'effacement présumé réussi sans preuve inter-stockages |
| F06 | Réponses d'institutions et réutilisation par Diploval dans des rapports | Rôles, finalités et bases **séparés** pour réception d'une projection déjà publique, nouveau traitement et publication | Ne jamais transférer les textes privés/sensibles ou coordonnées à une institution par défaut | Transmission privée refusée tant que rôles, information et bases ne sont pas établis |
| F07 | Traces d'accès, journaux de sécurité, conservation résiduelle et incidents | Intérêt légitime ou obligation applicable à documenter selon la trace concernée | Aucune donnée sensible en clair dans les journaux par défaut | Durées et suppression, y compris sauvegardes, indispensables |

**Attention :** la base « consentement explicite art. 9 » ne remplace pas la base art. 6, et un simple retrait de permission de publication ne vaut pas toujours effacement de l'intégralité des données dans tous les traitements. Déterminer ce qui est effacé, conservé légalement ou anonymisé, avec durées et information préalable.

### 11.3. Analyse de la conception actuelle du formulaire

Dans `netlify/lib/dialogue-model.mjs`, les champs `processingAgreement===true` et `publicationAgreement` expriment deux choix distincts sur le plan technique. **Ils ne démontrent pas** encore la validité juridique d'un consentement libre, spécifique, éclairé et explicite pour la réception de données sensibles.

**Évolution à étudier avant développement ou ouverture, sans décider prématurément :**
- information initiale compréhensible, et second niveau complet accessible **avant** dépôt ;
- absence de cases précochées ; preuve de version de la notice, contenu de la déclaration et date du choix ;
- mécanisme de refus et de retrait clair, en explicitant la différence entre dépôt privé, publication, contact facultatif et réutilisation des textes ;
- avertissement contre les informations identifiantes concernant des tiers et traitement de signalement/masquage ;
- accès anonyme ou pseudonyme : distinguer absence de nom affiché, pseudonymisation et anonymat réel ;
- éventuels modes de participation alternatifs **sans collecte sensible** à étudier.

La présence d'un champ de consentement obligatoire pour tout dépôt doit être requalifiée juridiquement : un **accord de fonctionnement** ne doit pas être présenté comme une solution générale pour toutes les bases légales ni pour les données sensibles.

### 11.4. Questions réservées à une validation humaine juridique

| Référence | Question de décision | Justificatif de clôture | Résultat |
|---|---|---|---|
| JUR-08 / P01 | Pour F01–F07, quelles bases art. 6 sont applicables au responsable effectivement identifié ? | Matrice datée, décisions motivées, approbation | **NON ARBITRÉ** |
| JUR-09 / P01 | Si des opinions politiques ou données de santé apparaissent dans les champs libres, quelle exception art. 9 couvre leur réception et leur conservation ? | Analyse juridique par finalité, conditions de preuve et de retrait | **NON ARBITRÉ** |
| JUR-10 / P02 | Comment informer sur les éventuelles destinataires institutionnels et sur l'utilisation dans les rapports Diploval ? | Notice art. 13 détaillée validée | **NON ARBITRÉ** |
| JUR-11 / P04 | Quels dépôts de tiers et quelles modalités de participation des mineurs sont autorisés ? | Politique écrite, mesures de minimisation et procédure de recours | **NON ARBITRÉ** |
| JUR-12 / P01-P03 | La publication et la réutilisation des textes exigent-elles des accords distincts de la collecte privée ? | Analyse du droit des données et du droit d'auteur/licence, documents validés | **NON ARBITRÉ** |

### 11.5. Sources officielles de référence

- RGPD, articles 5 à 9 (notamment 6 et 9) : https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2
- CNIL, bases légales par finalité : https://www.cnil.fr/fr/les-bases-legales/liceite-essentiel-sur-les-bases-legales
- CNIL, modalités du consentement : https://www.cnil.fr/fr/les-bases-legales/consentement
- CNIL, intérêt légitime et mise en balance : https://www.cnil.fr/fr/les-bases-legales/interet-legitime
- CNIL, données sensibles : https://www.cnil.fr/fr/definition/donnee-sensible
- CNIL, prendre en compte les bases dans l'architecture technique : https://www.cnil.fr/fr/prendre-en-compte-les-bases-legales-dans-limplementation-technique

### 11.6. Effets sur la feuille de route

- **P01** : instruction documentée, mais statut **OPEN** tant que F01–F07 n'ont pas une analyse juridique et une décision approuvées.
- **P02/P03/P04** : demandes de décisions précises identifiées, **OPEN**.
- **P14** : pièce officielle et qualification du responsable toujours attendues, **OPEN**.
- **P05/P06** : registre/AIPD et sous-traitants à compléter à partir de cette matrice, **OPEN**.
- **P07–P16** : inchangés.

**Interdictions maintenues : aucune ouverture V0.3, aucune collecte réelle, aucune publication juridique, aucune fusion de la PR #20.**

---

## 12. Notice RGPD citoyenne — projet interne rédigé, validation non acquise

**Livrable daté du 19 novembre 2026 :** [Notice d'information à deux niveaux et choix de publication — PROJET INTERNE NON PUBLIABLE](./DIPLOVAL_V03_NOTICE_RGPD_CITOYEN_PROJET_INTERNE_NO_GO.md).

Ce projet contient :
- un premier niveau en langage simple à placer **avant le formulaire**, seulement après validation ;
- une notice complète art. 13 décrivant la réception privée, les versions, la modération, la publication éventuelle, le suivi personnel, les réponses institutionnelles, les droits, les incidents et les prestataires ;
- une maquette non activable de choix distincts : information, autorisation de publication, présentation du nom, examen spécifique des données sensibles et alertes facultatives ;
- une liste explicite de champs à confirmer par documents : identité légale du responsable, bases art. 6, exception art. 9 si nécessaire, durée par type d'objet, destinataires, transferts, régime des mineurs, conditions de recours et garanties fournisseurs.

**Décision documentaire :** la rédaction est suffisamment avancée pour une **revue juridique et produit**. Elle n'est **ni approuvée ni publiable** tant que les arbitrages restent ouverts. L'acceptation générale des CGU n'est pas une preuve de consentement explicite aux données sensibles. Le choix « sans nom affiché » ne représente pas une anonymisation juridique.

**Liens aux conditions :** P01, P02, P03, P04, P05, P06, P07, P08, P14 et P16. Toutes demeurent **OPEN**. Le projet ne change ni `DIPLOVAL_V03_B7_gate_NO_GO.json` ni `release=NO_GO`.

**Critères d'examen prioritaire :**
1. Confirmer l'entité juridiquement responsable, son contact RGPD et le statut de l'entreprise ;
2. arrêter les bases légales et le traitement des opinions/données sensibles par finalité ;
3. décider des durées exactes et du caractère facultatif des coordonnées de suivi ;
4. préciser le rôle réel des institutions, les destinataires, les traitements hors EEE et les prestataires ;
5. faire valider les règles de publication, de réutilisation des contributions, de recours, et des mineurs ;
6. vérifier ensuite le texte dans le parcours utilisateur et le rendre accessible au clavier, au mobile et aux lecteurs d'écran.

**Règle d'ouverture inchangée :** notice finalisée et approuvée + tous les points bloquants vérifiés + décision humaine datée. Aucun déploiement et aucune collecte réelle V0.3.

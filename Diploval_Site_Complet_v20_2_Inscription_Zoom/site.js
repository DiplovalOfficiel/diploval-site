(() => {
  'use strict';

  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const progress = document.querySelector('.progress span');
  const year = document.querySelector('#year');
  const workDialog = document.querySelector('#work-dialog');
  const legalDialog = document.querySelector('#legal-dialog');
  const publicationDialog = document.querySelector('#publication-dialog');
  const privacyDialog = document.querySelector('#privacy-dialog');
  const registrationDialog = document.querySelector('#registration-dialog');

  if (year) year.textContent = new Date().getFullYear();

  const toggleMenu = open => {
    if (!menuButton || !nav) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    nav.classList.toggle('open', open);
  };

  if (menuButton) menuButton.addEventListener('click', () => toggleMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  if (nav) nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') toggleMenu(false); });

  const updateScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 6);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -25px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }

  const workData = {
    depassement: {
      type: 'Note d’éclairage et de reliance', scope: 'International', status: 'Publié', version: 'Version 1.3', date: 'Publication : août 2026', format: 'PDF · 14 pages',
      title: 'Jour du dépassement 2026', pdf: 'assets/documents/jour-du-depassement-2026-v1.3.pdf',
      body: `<p class="dialog-summary-lead">Le 30 juillet 2026 rend visible un déséquilibre mondial : la demande humaine dépasse ce que les écosystèmes peuvent régénérer sur une année.</p><p>La note explique ce que cet indicateur mesure réellement, ce qu’il ne mesure pas et pourquoi la date ne doit pas être comprise comme un épuisement physique des ressources. Elle distingue aussi les évolutions réelles des révisions méthodologiques, puis relie ce constat aux choix collectifs et à la capacité de régénération du vivant.</p>`
    },
    charte: {
      type: 'Charte · socle doctrinal', scope: 'Multi-échelles', status: 'En consolidation', version: 'Version consolidée 0.2', date: '27 juillet 2026', format: 'PDF · 18 pages',
      title: 'Charte des fondamentaux du vivant', pdf: 'assets/documents/charte-fondamentaux-vivant-v0.2.pdf',
      body: `<p class="dialog-summary-lead">La Charte rassemble le socle de constats et de principes qui guide les travaux de Diploval.</p><p>Elle sert de base commune pour examiner les lois, politiques publiques, projets, activités et dérogations qui affectent le vivant. Le Codex Vitae est distinct de la Charte : il constitue le référentiel normatif du vivant et traduit progressivement ces principes en lois modèles, protocoles, mécanismes de protection, procédures et outils d’application. La Charte reste doctrinale, évolutive et sans force juridique obligatoire par elle-même.</p>`
    },
    agriculture: {
      type: 'Synthèse stratégique', scope: 'National', status: 'Publié', version: 'Version 1.3', date: '22 juillet 2026', format: 'PDF · 9 pages',
      title: 'Souveraineté agricole et alimentaire', pdf: 'assets/documents/souverainete-agricole-alimentaire-synthese-v1.3.pdf',
      body: `<p class="dialog-summary-lead">Produire en France ne suffit pas si ceux qui produisent ne peuvent pas vivre de leur travail ou si une partie de la population n’accède pas à cette production.</p><p>Cette synthèse relie capacité productive, revenu agricole, aides, commerce, accès à l’alimentation et conditions du vivant. Elle propose des décisions structurantes avec responsables, horizons, effort budgétaire probable et indicateurs permettant de vérifier les résultats.</p>`
    },
    territoires: {
      type: 'Note d’alerte et de cohérence publique', scope: 'National', status: 'Publié', version: 'Édition de juin 2026', date: 'Juin 2026', format: 'PDF · 3 pages',
      title: 'Protéger les territoires : une question de responsabilité et de priorités', pdf: 'assets/documents/proteger-territoires-coherence-publique.pdf',
      body: `<p class="dialog-summary-lead">Cette note part d’une question simple : les budgets publics suivent-ils réellement l’ampleur des risques auxquels les territoires doivent déjà s’adapter ?</p><p>À partir de l’évolution du Fonds vert et du débat sur les aides publiques aux entreprises, elle défend une prévention qui traite ensemble l’eau, les sols, l’ombre, la biodiversité, le bâti et la capacité publique. La responsabilité citoyenne y est reconnue, mais elle ne peut pas remplacer les choix d’infrastructure, d’aménagement ou de financement.</p>`
    },
    ecarts: {
      type: 'Document de cadrage méthodologique', scope: 'Multi-échelles', status: 'Publié', version: 'Première série · 12 thèmes', date: '2026', format: 'PDF · 18 pages',
      title: 'Les écarts du réel — grille Diploval d’évaluation de l’action publique', pdf: 'assets/documents/les-ecarts-du-reel-cadrage.pdf',
      body: `<p class="dialog-summary-lead">Une annonce, une loi, son application et ce qui change réellement sur le terrain ne sont pas la même chose.</p><p>Ce document présente la méthode des « Écarts du réel » : douze thèmes sont regardés selon quatre niveaux — décisions politiques, état des lois, concrétisation et réalité sur le terrain. La grille est critique, mais elle reste ouverte au contradictoire, aux données nouvelles et aux retours de terrain.</p>`
    },
    faune: {
      type: 'Note stratégique et juridique', scope: 'National', status: 'Document de travail', version: 'Version 1.0', date: '25 juin 2026', format: 'PDF · 35 pages',
      title: 'Faune libre et animaux sous garde humaine', pdf: 'assets/documents/faune-libre-garde-humaine-v1.0.pdf',
      body: `<p class="dialog-summary-lead">Le droit reconnaît la sensibilité animale, mais continue largement à organiser l’animal à partir des catégories de la propriété et des biens.</p><p>La note propose une trajectoire de réforme : faire de la garde une responsabilité, mieux reconnaître les intérêts propres des animaux, protéger la faune libre et ses conditions d’existence, organiser le secours et la réparation. Elle contient une loi modèle, dont chaque disposition doit encore être éprouvée par un audit juridique complet.</p>`
    },
    biosecurite: {
      type: 'Note stratégique', scope: 'Territorial', status: 'Publié', version: 'Édition de juin 2026', date: 'Juin 2026', format: 'PDF · 26 pages',
      title: 'Espèces exotiques envahissantes et biosécurité territoriale du vivant', pdf: 'assets/documents/biosecurite-territoriale-vivant.pdf',
      body: `<p class="dialog-summary-lead">Le problème n’est pas « le vivant venu d’ailleurs » en lui-même. Le risque apparaît lorsqu’un organisme déplacé rencontre un milieu fragilisé et que la vigilance arrive trop tard.</p><p>À partir de cas comme la fourmi électrique, le frelon asiatique ou le moustique tigre, la note explique les voies d’introduction et les impacts, puis organise une réponse territoriale fondée sur la prévention, la détection, la réaction rapide, la coordination et un droit appliqué avec discernement.</p>`
    },
    guerre: {
      type: 'Édito', scope: 'National', status: 'Publié', version: 'Édition de juin 2026', date: 'Juin 2026', format: 'PDF · 4 pages',
      title: 'Préparer la France sans programmer la guerre', pdf: 'assets/documents/preparer-france-sans-programmer-guerre.pdf',
      body: `<p class="dialog-summary-lead">Préparer un pays au risque n’oblige pas à installer la guerre comme horizon mental inévitable.</p><p>Cet édito défend une sécurité nationale plus large que la seule capacité militaire : défense crédible, résilience civile, agriculture, énergie, santé, infrastructures, cohésion démocratique et diplomatie. L’enjeu est de pouvoir tenir face aux crises tout en gardant ouverte la possibilité d’éviter l’engrenage.</p>`
    },
    referentiel: {
      type: 'Référentiel', scope: 'Multi-échelles', status: 'Version 1.0 structurée', version: 'Version 1.0', date: '29 juillet 2026', format: 'Document à intégrer',
      title: 'Référentiel Diploval',
      body: `<p class="dialog-summary-lead">Le Référentiel permet de passer des principes à l’examen d’une décision réelle.</p><p>Il regarde le besoin de départ, le territoire, les personnes concernées, les effets attendus, les alternatives et le suivi. Il sert notamment à vérifier si une réponse utile aujourd’hui ne rend pas le problème de demain plus difficile à résoudre.</p>`
    },
    incendies: {
      type: 'Rapport', scope: 'National', status: 'En consolidation', version: 'Bilan de juillet 2026', date: 'Actualisation en cours', format: 'Rapport',
      title: 'Incendies 2026',
      body: `<p class="dialog-summary-lead">Le rapport rassemble les données disponibles, la chronologie des feux, les moyens engagés et les conséquences humaines, matérielles et territoriales.</p><p>Il examine aussi la prévention, la capacité des secours, la vulnérabilité des territoires et la vitesse à laquelle le risque évolue.</p>`
    },
    programmes: {
      type: 'Analyse', scope: 'National', status: 'En cours', version: 'Chapitres climat et eau validés', date: '2 août 2026', format: 'Dossier évolutif',
      title: 'Les programmes politiques à l’épreuve du vivant',
      body: `<p class="dialog-summary-lead">Les principaux programmes sont soumis à la même grille, quelle que soit leur couleur politique.</p><p>L’analyse porte sur les mesures proposées, les moyens annoncés, les délais, la faisabilité et les conséquences déplacées.</p>`
    },
    schaerbeek: {
      type: 'Analyse', scope: 'Territorial', status: 'Dossier ouvert', version: 'Droit positif et Charte du vivant', date: '1 août 2026', format: 'Analyse territoriale',
      title: 'Schaerbeek — projet d’abattage de 108 arbres',
      body: `<p class="dialog-summary-lead">Ce dossier confronte la Charte, le Référentiel et le droit applicable à une décision locale précise.</p><p>L’analyse vérifie les motifs avancés, les alternatives, les conséquences pour le quartier, la participation du public et les voies juridiques qui peuvent être mobilisées.</p>`
    },
    hydrique: {
      type: 'Mémorandum', scope: 'National', status: 'Travail structuré', version: 'Version de travail', date: 'Juin 2026', format: 'Mémorandum et propositions',
      title: 'Sécurité hydrique de la France',
      body: `<p class="dialog-summary-lead">Le mémorandum distingue les prélèvements de la consommation réelle et replace les besoins des milieux dans la décision.</p><p>Il traite aussi de la gouvernance par bassin, de la transparence des données, de la qualité de l’eau et des responsabilités publiques et économiques.</p>`
    },
    elnino: {
      type: 'Note stratégique', scope: 'Territorial', status: 'Publié', version: 'Document d’éclairage stratégique actualisé', date: 'Juin 2026', format: 'PDF · 14 pages',
      title: 'El Niño, climat et adaptation des communes', pdf: 'assets/documents/el-nino-climat-adaptation-communes.pdf',
      body: `<p class="dialog-summary-lead">El Niño est un phénomène naturel du Pacifique équatorial. Pour une commune française, la bonne question n’est pas de savoir s’il « arrive » comme une tempête, mais ce qu’une alerte mondiale change dans la lecture de ses propres vulnérabilités.</p><p>La note explique le phénomène sans dramatiser ni le banaliser, distingue variabilité naturelle et changement climatique, puis traduit l’alerte en sujets concrets : eau, chaleur, sols, agriculture, santé, sécurité civile et réseaux essentiels.</p>`
    },
    usagevital: {
      type: 'Note stratégique', scope: 'International', status: 'Publié', version: 'Édition de mai 2026', date: 'Mai 2026', format: 'PDF · 22 pages',
      title: 'Terre, eau, faim et exil', pdf: 'assets/documents/terre-eau-faim-exil-droit-usage-vital.pdf',
      body: `<p class="dialog-summary-lead">La faim, l’eau, les terres, les migrations contraintes et le gaspillage alimentaire appartiennent à une même question : qui peut disposer d’une ressource vitale, jusqu’où et au détriment de qui ?</p><p>La note propose un « droit d’usage vital » destiné à fixer une limite aux droits de propriété, d’exploitation, de concession ou d’investissement lorsqu’ils compromettent la capacité d’une population à boire, se nourrir, cultiver et préserver les conditions d’existence de son territoire. Elle ouvre aussi des pistes de loi-modèle, de protocole régional et de convention internationale.</p>`
    },
    t1environnement: {
      type: 'Note stratégique', scope: 'International', status: 'Publié', version: 'Réf. DIP-NST-2026-0410-ENV', date: '10 avril 2026', format: 'PDF · 4 pages',
      title: 'Premier trimestre 2026 : état des lieux environnemental et climatique', pdf: 'assets/documents/t1-2026-environnement-climat.pdf',
      body: `<p class="dialog-summary-lead">Le premier trimestre 2026 ne montre pas une crise isolée, mais la confirmation d’un système sous tension : chaleur mondiale élevée, pluies extrêmes, incendies, banquise arctique fragile et retour du facteur géopolitique fossile.</p><p>Cette courte note remet les principaux signaux en ordre et relie environnement, sécurité, énergie, finances publiques et résilience. Elle souligne aussi que certaines catastrophes peuvent rester sous-exposées médiatiquement sans être moins importantes pour l’action publique.</p>`
    },
    egalite: {
      type: 'Note stratégique', scope: 'National', status: 'Publié', version: 'Réf. DIP-NST-2026-0409-EGL', date: 'Avril 2026', format: 'PDF · 4 pages',
      title: 'Égalité devant la loi, contrôle social et asymétrie de responsabilité', pdf: 'assets/documents/egalite-loi-controle-social-2026.pdf',
      body: `<p class="dialog-summary-lead">Une règle peut être générale dans son écriture et pourtant peser très différemment selon les personnes auxquelles elle s’applique.</p><p>La note rassemble des repères de droit constitutionnel français, européen et international pour examiner les différences de traitement, leur justification, leur proportionnalité et l’existence d’un recours effectif. Elle transforme une inquiétude politique sur l’asymétrie du contrôle ou de la responsabilité en grille juridique exploitable.</p>`
    },
    cadmium: {
      type: 'Note stratégique', scope: 'National', status: 'Publié', version: 'Édition de mai 2026', date: 'Mai 2026', format: 'PDF · 15 pages',
      title: 'Cadmium, alimentation et confiance publique', pdf: 'assets/documents/cadmium-alimentation-confiance-publique.pdf',
      body: `<p class="dialog-summary-lead">Le cadmium relie un même problème que l’on traite souvent par morceaux : intrants agricoles, sols, aliments, corps humains, santé publique et confiance dans la décision collective.</p><p>La note examine l’exposition en France, le rôle des engrais phosphatés, les seuils et calendriers réglementaires, puis propose une lecture fondée sur la protection des supports vitaux. Elle insiste aussi sur un point : réduire l’exposition sans désigner les agriculteurs comme responsables d’un cadre qu’ils ne fixent pas seuls.</p>`
    },
    procheorient: {
      type: 'Mémorandum', scope: 'International', status: 'Note diplomatique', version: 'Version de travail', date: 'Juin 2026', format: 'Mémorandum',
      title: 'Palestine, Israël et Liban',
      body: `<p class="dialog-summary-lead">Cette note travaille à partir du droit international, de la protection des populations civiles, de la sécurité durable et de la responsabilité des institutions.</p><p>Elle cherche les conditions minimales d’une désescalade, d’une protection effective et d’un cadre politique qui puisse tenir dans le temps.</p>`
    },
    datacenter: {
      type: 'Suivi', scope: 'Territorial', status: 'Veille en cours', version: 'Dossier de suivi', date: '2026', format: 'Veille CNDP',
      title: 'Projet de data center Google dans l’Indre',
      body: `<p class="dialog-summary-lead">Ce suivi rassemble les informations publiques sur le projet, le débat conduit par la CNDP et les questions territoriales qui en découlent.</p><p>Les principaux points de vigilance concernent l’eau, l’énergie, l’emploi, les infrastructures, les retombées locales et les engagements annoncés.</p>`
    }
  };


  const openDialog = dialog => {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    body.classList.add('modal-open');
  };
  const closeDialog = dialog => {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    body.classList.remove('modal-open');
    if (dialog === workDialog) {
      activeWorkKey = null;
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('publication');
        if (u.hash === '#travaux') u.hash = '';
        history.replaceState({}, '', u);
      } catch {}
    }
  };

  let activeWorkKey = null;

  const publicationUrl = key => {
    const url = new URL(window.location.href);
    url.searchParams.set('publication', key);
    url.hash = 'travaux';
    return url.toString();
  };

  const updateShareLinks = (key, item) => {
    const url = publicationUrl(key);
    const text = `${item.title} — Diploval`;
    const summaryText = document.createElement('div');
    summaryText.innerHTML = item.body || '';
    const excerpt = (summaryText.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240);
    const fb = document.querySelector('#share-facebook');
    const sky = document.querySelector('#share-bluesky');
    const li = document.querySelector('#share-linkedin');
    const mail = document.querySelector('#share-email');
    if (fb) fb.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (sky) sky.href = `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}`;
    if (li) li.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    if (mail) mail.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${excerpt}\n\n${url}`)}`;
    return { url, text, excerpt };
  };

  const showWork = (key, updateUrl = true) => {
    const item = workData[key];
    if (!item) return;
    activeWorkKey = key;
    document.querySelector('#dialog-type').textContent = item.type;
    document.querySelector('#dialog-title').textContent = item.title;
    document.querySelector('#dialog-body').innerHTML = item.body;
    document.querySelector('#dialog-meta').innerHTML = [item.status,item.version,item.date,item.scope ? `Échelle : ${item.scope}` : null,item.format].filter(Boolean).map(value => `<span>${value}</span>`).join('');
    const pdfButton = document.querySelector('#dialog-pdf');
    if (pdfButton) {
      if (item.pdf) {
        pdfButton.hidden = false;
        pdfButton.href = item.pdf;
        pdfButton.setAttribute('aria-label', `Consulter le PDF : ${item.title}`);
      } else {
        pdfButton.hidden = true;
        pdfButton.removeAttribute('href');
        pdfButton.removeAttribute('aria-label');
      }
    }
    const action = document.querySelector('#dialog-action');
    if (action) action.href = `mailto:contact@diploval.fr?subject=${encodeURIComponent('À propos du document — ' + item.title)}`;
    updateShareLinks(key, item);
    if (updateUrl) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.set('publication', key);
        u.hash = 'travaux';
        history.replaceState({}, '', u);
      } catch {}
    }
    openDialog(workDialog);
  };

  document.querySelectorAll('.work-open, .library-open').forEach(button => {
    button.addEventListener('click', () => showWork(button.dataset.work));
  });

  const shareNative = document.querySelector('#share-native');
  const shareCopy = document.querySelector('#share-copy');
  const shareStatus = document.querySelector('#share-status');
  if (shareNative) shareNative.addEventListener('click', async () => {
    if (!activeWorkKey || !workData[activeWorkKey]) return;
    const item = workData[activeWorkKey];
    const share = updateShareLinks(activeWorkKey, item);
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: share.excerpt, url: share.url });
      else {
        await navigator.clipboard.writeText(share.url);
        if (shareStatus) shareStatus.textContent = 'Lien copié. Vous pouvez le partager où vous voulez.';
      }
    } catch (error) {
      if (error && error.name !== 'AbortError' && shareStatus) shareStatus.textContent = 'Le partage direct n’est pas disponible ici. Utilisez l’un des boutons ci-dessous.';
    }
  });
  if (shareCopy) shareCopy.addEventListener('click', async () => {
    if (!activeWorkKey || !workData[activeWorkKey]) return;
    const url = publicationUrl(activeWorkKey);
    try {
      await navigator.clipboard.writeText(url);
      if (shareStatus) shareStatus.textContent = 'Lien de la publication copié.';
    } catch {
      if (shareStatus) shareStatus.textContent = url;
    }
    window.setTimeout(() => { if (shareStatus) shareStatus.textContent = ''; }, 3500);
  });


  const legalOpen = document.querySelector('.legal-open');
  if (legalOpen) legalOpen.addEventListener('click', () => openDialog(legalDialog));
  document.querySelectorAll('.privacy-open').forEach(button => button.addEventListener('click', () => {
    if (registrationDialog && registrationDialog.open) closeDialog(registrationDialog);
    openDialog(privacyDialog);
  }));
  document.querySelectorAll('.publication-open').forEach(button => button.addEventListener('click', () => openDialog(publicationDialog)));
  document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  [workDialog, legalDialog, privacyDialog, publicationDialog, registrationDialog].filter(Boolean).forEach(dialog => {
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      body.classList.remove('modal-open');
      if (dialog === workDialog && activeWorkKey) {
        activeWorkKey = null;
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete('publication');
          if (u.hash === '#travaux') u.hash = '';
          history.replaceState({}, '', u);
        } catch {}
      }
    });
  });

  // Ouvrir directement une fiche partagée, par exemple ?publication=charte
  try {
    const initialPublication = new URL(window.location.href).searchParams.get('publication');
    if (initialPublication && workData[initialPublication]) {
      window.setTimeout(() => showWork(initialPublication, false), 80);
    }
  } catch {}


  // Navigation du carrousel de travaux sur mobile
  const scroller = document.querySelector('.work-scroller');
  const cards = scroller ? Array.from(scroller.querySelectorAll('.work-card')) : [];
  const prev = document.querySelector('#work-prev');
  const next = document.querySelector('#work-next');
  const current = document.querySelector('#work-current');
  const total = document.querySelector('#work-total');
  const dots = document.querySelector('#work-dots');
  let activeIndex = 0;

  if (scroller && cards.length && prev && next && current && total && dots) {
    total.textContent = String(cards.length);
    cards.forEach((_, index) => {
      const dot = document.createElement('span');
      dot.classList.toggle('is-active', index === 0);
      dots.appendChild(dot);
    });
    const updateCarousel = () => {
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      activeIndex = cards.reduce((best, card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const bestCenter = cards[best].offsetLeft + cards[best].offsetWidth / 2;
        return Math.abs(cardCenter - center) < Math.abs(bestCenter - center) ? index : best;
      }, 0);
      current.textContent = String(activeIndex + 1);
      Array.from(dots.children).forEach((dot,index) => dot.classList.toggle('is-active', index === activeIndex));
      prev.disabled = activeIndex === 0;
      next.disabled = activeIndex === cards.length - 1;
    };
    const go = index => cards[Math.max(0, Math.min(cards.length - 1, index))].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    prev.addEventListener('click', () => go(activeIndex - 1));
    next.addEventListener('click', () => go(activeIndex + 1));
    scroller.addEventListener('scroll', () => requestAnimationFrame(updateCarousel), { passive:true });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();
  }

  // Lecteur de la signature sonore du podcast
  const podcastAudio = document.querySelector('#podcast-audio');
  const podcastPlay = document.querySelector('#podcast-play');
  const podcastPlayer = document.querySelector('.podcast-player');
  const podcastStatus = document.querySelector('#podcast-status');
  const podcastTime = document.querySelector('#podcast-time');
  const podcastProgress = document.querySelector('#podcast-progress');

  if (podcastAudio && podcastPlay && podcastPlayer && podcastStatus && podcastTime && podcastProgress) {
    const formatTime = seconds => {
      const safe = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 31;
      return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
    };
    const setPlayerState = playing => {
      podcastPlayer.dataset.playerState = playing ? 'playing' : 'paused';
      podcastPlay.setAttribute('aria-pressed', String(playing));
      podcastPlay.setAttribute('aria-label', playing ? 'Mettre la signature sonore en pause' : 'Écouter la signature sonore des Voix du Vivant');
      podcastStatus.textContent = playing ? 'Lecture du générique' : 'Écouter la signature sonore';
    };
    podcastPlay.addEventListener('click', async () => {
      if (podcastAudio.paused) { try { await podcastAudio.play(); } catch { setPlayerState(false); } }
      else podcastAudio.pause();
    });
    podcastAudio.addEventListener('play', () => setPlayerState(true));
    podcastAudio.addEventListener('pause', () => setPlayerState(false));
    podcastAudio.addEventListener('loadedmetadata', () => {
      podcastTime.textContent = formatTime(podcastAudio.duration);
      podcastTime.setAttribute('datetime', `PT${Math.ceil(podcastAudio.duration || 31)}S`);
    });
    podcastAudio.addEventListener('timeupdate', () => {
      const duration = podcastAudio.duration || 31;
      const remaining = Math.max(0, duration - podcastAudio.currentTime);
      podcastTime.textContent = formatTime(remaining);
      podcastProgress.style.width = `${Math.min(100, (podcastAudio.currentTime / duration) * 100)}%`;
    });
    podcastAudio.addEventListener('ended', () => {
      podcastAudio.currentTime = 0;
      podcastProgress.style.width = '0%';
      podcastTime.textContent = formatTime(podcastAudio.duration || 31);
      setPlayerState(false);
    });
  }


  // Recherche dans la bibliothèque des publications
  const publicationSearch = document.querySelector('#publication-search');
  const publicationType = document.querySelector('#publication-type');
  const publicationScopeButtons = Array.from(document.querySelectorAll('[data-publication-scope]'));
  const publicationItems = Array.from(document.querySelectorAll('.publication-result'));
  const publicationCount = document.querySelector('#publication-count');
  const publicationEmpty = document.querySelector('#publication-empty');
  const publicationReset = document.querySelector('#publication-reset');
  const publicationLoadMore = document.querySelector('#publication-load-more');
  const INITIAL_PUBLICATION_LIMIT = 6;
  const PUBLICATION_BATCH_SIZE = 6;
  let activePublicationScope = 'all';
  let publicationVisibleLimit = INITIAL_PUBLICATION_LIMIT;

  const normalizeSearch = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const updatePublicationResults = () => {
    const query = normalizeSearch(publicationSearch ? publicationSearch.value : '');
    const type = publicationType ? publicationType.value : 'all';
    const filtersActive = Boolean(query) || type !== 'all' || activePublicationScope !== 'all';
    let matches = 0;
    let displayed = 0;

    publicationItems.forEach(item => {
      const text = normalizeSearch(`${item.dataset.search || ''} ${item.textContent}`);
      const matchesQuery = !query || text.includes(query);
      const matchesType = type === 'all' || item.dataset.type === type;
      const matchesScope = activePublicationScope === 'all' || item.dataset.scope === activePublicationScope;
      const matchesFilters = matchesQuery && matchesType && matchesScope;
      if (matchesFilters) matches += 1;

      const withinLimit = filtersActive || matches <= publicationVisibleLimit;
      const show = matchesFilters && withinLimit;
      item.hidden = !show;
      if (show) displayed += 1;
    });

    if (publicationCount) {
      const matchedItems = publicationItems.filter(item => {
        const text = normalizeSearch(`${item.dataset.search || ''} ${item.textContent}`);
        const matchesQuery = !query || text.includes(query);
        const matchesType = type === 'all' || item.dataset.type === type;
        const matchesScope = activePublicationScope === 'all' || item.dataset.scope === activePublicationScope;
        return matchesQuery && matchesType && matchesScope;
      });
      const consultable = matchedItems.filter(item => Boolean(workData[item.dataset.work] && workData[item.dataset.work].pdf)).length;
      if (filtersActive) {
        publicationCount.textContent = `${matches} travail${matches > 1 ? 'aux' : ''} trouvé${matches > 1 ? 's' : ''} · ${consultable} publication${consultable > 1 ? 's' : ''} consultable${consultable > 1 ? 's' : ''}`;
      } else if (displayed < matches) {
        publicationCount.textContent = `${matches} travaux référencés · ${consultable} publications consultables · ${displayed} affichés`;
      } else {
        publicationCount.textContent = `${matches} travaux référencés · ${consultable} publications consultables`;
      }
    }

    if (publicationEmpty) publicationEmpty.hidden = matches !== 0;

    if (publicationLoadMore) {
      const remaining = Math.max(0, matches - displayed);
      publicationLoadMore.hidden = filtersActive || remaining === 0;
      if (!publicationLoadMore.hidden) {
        const nextCount = Math.min(PUBLICATION_BATCH_SIZE, remaining);
        publicationLoadMore.textContent = `Voir ${nextCount} publication${nextCount > 1 ? 's' : ''} de plus`;
      }
    }
  };

  if (publicationSearch) publicationSearch.addEventListener('input', updatePublicationResults);
  if (publicationType) publicationType.addEventListener('change', updatePublicationResults);
  publicationScopeButtons.forEach(button => button.addEventListener('click', () => {
    activePublicationScope = button.dataset.publicationScope;
    publicationScopeButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    updatePublicationResults();
  }));
  if (publicationLoadMore) publicationLoadMore.addEventListener('click', () => {
    publicationVisibleLimit += PUBLICATION_BATCH_SIZE;
    updatePublicationResults();
  });
  if (publicationReset) publicationReset.addEventListener('click', () => {
    if (publicationSearch) publicationSearch.value = '';
    if (publicationType) publicationType.value = 'all';
    activePublicationScope = 'all';
    publicationVisibleLimit = INITIAL_PUBLICATION_LIMIT;
    publicationScopeButtons.forEach(button => {
      const selected = button.dataset.publicationScope === 'all';
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    updatePublicationResults();
    if (publicationSearch) publicationSearch.focus();
  });
  updatePublicationResults();

  // Recherche et filtres de l’agenda
  const agendaSearch = document.querySelector('#agenda-search');
  const agendaButtons = Array.from(document.querySelectorAll('[data-agenda-filter]'));
  const agendaEvents = Array.from(document.querySelectorAll('.agenda-event'));
  const agendaEmpty = document.querySelector('#agenda-empty');
  let activeAgendaFilter = 'all';
  const updateAgenda = () => {
    const query = normalizeSearch(agendaSearch ? agendaSearch.value : '');
    let visible = 0;
    agendaEvents.forEach(event => {
      const text = normalizeSearch(`${event.dataset.search || ''} ${event.textContent}`);
      const matchesQuery = !query || text.includes(query);
      const matchesFilter = activeAgendaFilter === 'all' || event.dataset.month === activeAgendaFilter || (activeAgendaFilter === 'online' && event.dataset.mode === 'online');
      const show = matchesQuery && matchesFilter;
      event.hidden = !show;
      if (show) visible += 1;
    });
    if (agendaEmpty) agendaEmpty.hidden = visible !== 0;
  };
  if (agendaSearch) agendaSearch.addEventListener('input', updateAgenda);
  agendaButtons.forEach(button => button.addEventListener('click', () => {
    activeAgendaFilter = button.dataset.agendaFilter;
    agendaButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    updateAgenda();
  }));
  updateAgenda();

  // Inscription aux rendez-vous — Netlify Forms
  document.querySelectorAll('[data-open-registration]').forEach(button => {
    button.addEventListener('click', () => openDialog(registrationDialog));
  });
  const registrationForm = document.querySelector('#registration-form');
  const registrationStatus = document.querySelector('#registration-status');
  if (registrationForm && registrationStatus) {
    registrationForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!registrationForm.reportValidity()) return;
      if (window.location.protocol === 'file:') {
        registrationStatus.textContent = 'Le formulaire sera actif une fois le site publié sur Netlify.';
        registrationStatus.className = 'registration-status';
        return;
      }
      const submitButton = registrationForm.querySelector('[type="submit"]');
      const originalLabel = submitButton ? submitButton.textContent : '';
      if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Envoi en cours…'; }
      registrationStatus.textContent = '';
      registrationStatus.className = 'registration-status';
      try {
        const bodyData = new URLSearchParams(new FormData(registrationForm));
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: bodyData.toString()
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        registrationStatus.textContent = 'Votre demande d’inscription a bien été envoyée. Vous recevrez les informations du rendez-vous par e-mail.';
        registrationStatus.className = 'registration-status is-success';
        registrationForm.reset();
      } catch (error) {
        registrationStatus.textContent = 'L’envoi n’a pas abouti. Vous pouvez écrire directement à contact@diploval.fr.';
        registrationStatus.className = 'registration-status is-error';
      } finally {
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel; }
      }
    });
  }

  // Copie de l’adresse de contact
  const copyButton = document.querySelector('#copy-email');
  const copyStatus = document.querySelector('#copy-status');
  if (copyButton && copyStatus) {
    copyButton.addEventListener('click', async () => {
      const email = copyButton.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        copyStatus.textContent = 'Adresse copiée.';
      } catch {
        copyStatus.textContent = `Adresse : ${email}`;
      }
      window.setTimeout(() => { copyStatus.textContent = ''; }, 3200);
    });
  }
})();

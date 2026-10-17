const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const progressBar = document.querySelector('.scroll-progress span');
const hero = document.querySelector('.hero');
const heroCards = [...document.querySelectorAll('.hero-card')];
const parallaxItems = [...document.querySelectorAll('[data-parallax]')];
let ticking = false;

function updateMotion() {
  ticking = false;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  progressBar.style.width = `${Math.min(100, window.scrollY / maxScroll * 100)}%`;
  const mobile = window.innerWidth < 760;
  const progress = reducedMotion.matches ? 0 : Math.max(0, Math.min(1, window.scrollY / Math.max(300, hero.offsetHeight * .53)));
  const fan = (mobile ? .83 : .67) + progress * (mobile ? .17 : .33);
  const x = mobile ? [-127, -44, 45, 127] : [-335, -117, 111, 331];
  const y = mobile ? [36, 4, 7, 38] : [65, 10, 7, 66];
  const rotations = [-16, -8, 7, 16];
  heroCards.forEach((card, index) => {
    card.style.setProperty('--tx', `${Math.round(x[index] * fan)}px`);
    card.style.setProperty('--ty', `${Math.round(y[index] - progress * (index % 2 ? 17 : 28))}px`);
    card.style.setProperty('--rot', `${rotations[index] * (0.77 + progress * .23)}deg`);
    card.style.setProperty('--scale', index === 1 || index === 2 ? '1' : '.94');
  });
  if (!reducedMotion.matches) {
    parallaxItems.forEach(item => {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const distance = rect.top + rect.height / 2 - window.innerHeight / 2;
      const speed = Number(item.dataset.parallax) || 0;
      item.style.setProperty('--parallax', `${Math.round(distance * speed)}px`);
    });
  }
}

function queueMotion() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateMotion);
}
window.addEventListener('scroll', queueMotion, {passive:true});
window.addEventListener('resize', queueMotion, {passive:true});
reducedMotion.addEventListener?.('change', queueMotion);
updateMotion();

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  });
}, {threshold:.12, rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.reveal').forEach((element, index) => {
  element.style.setProperty('--delay', `${(index % 3) * 95}ms`);
  revealObserver.observe(element);
});

const spaces = {
  career: {index:'01', name:'Career', title:'Making a move, even if it’s messy.', caption:'Find people who understand the in-between of work and becoming.', image:'/landing/assets/space-career.jpg', alt:'Professional working at a laptop in an office', color:'#c9f36f'},
  relationships: {index:'02', name:'Relationships', title:'Finding your people again.', caption:'Make room for connection that feels honest and mutual.', image:'/landing/assets/space-relationships.jpg', alt:'Two friends sharing coffee and conversation', color:'#f6a6bb'},
  health: {index:'03', name:'Health', title:'Choosing a gentler way forward.', caption:'Be around people who know that progress has its own pace.', image:'/landing/assets/space-health.jpg', alt:'Woman practicing yoga outdoors', color:'#9fdad1'},
  creative: {index:'04', name:'Creative', title:'Making room for what lights you up.', caption:'Find people who care about making, trying and beginning again.', image:'/landing/assets/space-creative.jpg', alt:'Artist painting on a canvas in a studio', color:'#f3bc78'},
  learning: {index:'05', name:'Learning', title:'Beginning before you feel ready.', caption:'Meet curious people working through new skills and new ideas.', image:'/landing/assets/space-learning.jpg', alt:'Students studying together in a library', color:'#b5a3fa'},
  wealth: {index:'06', name:'Wealth', title:'Building a life that feels steadier.', caption:'Talk with people making practical changes in their own way.', image:'/landing/assets/space-wealth.jpg', alt:'Woman using a calculator and notebook to plan finances', color:'#e8d687'},
  spiritual: {index:'07', name:'Spiritual', title:'Looking for deeper ground.', caption:'Share questions and discoveries with people on a similar journey.', image:'/landing/assets/space-spiritual.jpg', alt:'Woman meditating quietly in nature', color:'#b7d6ed'},
  adventure: {index:'08', name:'Adventure', title:'Saying yes to somewhere new.', caption:'Find company for the places and experiences calling you forward.', image:'/landing/assets/space-adventure.jpg', alt:'Friends hiking together on a mountain trail', color:'#faa881'}
};
const tabs = [...document.querySelectorAll('.space-options [role="tab"]')];
const spaceImage = document.getElementById('space-image');
const spacePanel = document.getElementById('space-panel');
let spaceTimer;
function selectSpace(tab) {
  const data = spaces[tab.dataset.space];
  if (!data) return;
  tabs.forEach(item => {
    item.setAttribute('aria-selected', String(item === tab));
    item.tabIndex = item === tab ? 0 : -1;
  });
  spacePanel.setAttribute('aria-labelledby', tab.id);
  spaceImage.classList.add('is-changing');
  clearTimeout(spaceTimer);
  spaceTimer = setTimeout(() => {
    spaceImage.src = data.image;
    spaceImage.alt = data.alt;
    document.getElementById('space-counter').textContent = `SPACE ${data.index} / 08`;
    document.getElementById('space-chip').textContent = data.name;
    document.getElementById('space-chip').style.background = data.color;
    document.getElementById('space-title').textContent = data.title;
    document.getElementById('space-caption').textContent = data.caption;
    spaceImage.classList.remove('is-changing');
  }, reducedMotion.matches ? 0 : 180);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSpace(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else next = (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    selectSpace(tabs[next]);
  });
});
tabs.forEach(tab => {tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;});

const filmstrip = document.querySelector('.filmstrip');
document.getElementById('film-prev').addEventListener('click', () => filmstrip.scrollBy({left:-(filmstrip.querySelector('.memory-card').offsetWidth + 22), behavior: reducedMotion.matches ? 'instant' : 'smooth'}));
document.getElementById('film-next').addEventListener('click', () => filmstrip.scrollBy({left:filmstrip.querySelector('.memory-card').offsetWidth + 22, behavior: reducedMotion.matches ? 'instant' : 'smooth'}));

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
function closeMenu() {menuToggle.setAttribute('aria-expanded','false'); menuToggle.setAttribute('aria-label','Open menu'); mobileNav.hidden = true;}
menuToggle.addEventListener('click', () => {
  const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(opening));
  menuToggle.setAttribute('aria-label', opening ? 'Close menu' : 'Open menu');
  mobileNav.hidden = !opening;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {if (event.key === 'Escape') closeMenu();});

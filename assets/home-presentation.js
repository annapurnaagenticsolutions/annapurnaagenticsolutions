(()=>{
  'use strict';

  const style=document.createElement('link');style.rel='stylesheet';style.href='assets/home-presentation.css';document.head.appendChild(style);

  function addPortfolioLink(nav,href,label){
    if(!nav||[...nav.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')?.replace(/\/$/,'').endsWith(href.replace(/\/$/,''))))return;
    const link=document.createElement('a');link.href=`/${href}`;link.textContent=label;
    const anchor=[...nav.querySelectorAll('a[href]')].find(a=>a.classList.contains('pramana-flagship'));
    if(anchor)anchor.insertAdjacentElement('afterend',link);else nav.prepend(link);
  }

  function orderPortfolioLinks(nav){
    if(!nav)return;
    const products=[...nav.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')?.replace(/\/$/,'').endsWith('products.html'));
    const play=[...nav.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')?.replace(/\/$/,'').endsWith('play'));
    if(products&&play)nav.insertBefore(products,play);
  }

  function apply(){
    addPortfolioLink(document.querySelector('.nav-links'),'products.html','Products');
    addPortfolioLink(document.querySelector('.nav-links'),'play/','Play');
    addPortfolioLink(document.querySelector('.mobile-nav'),'products.html','Products');
    addPortfolioLink(document.querySelector('.mobile-nav'),'play/','Play');
    addPortfolioLink(document.querySelector('.footer-links'),'products.html','Products');
    addPortfolioLink(document.querySelector('.footer-links'),'play/','Play');
    orderPortfolioLinks(document.querySelector('.nav-links'));
    orderPortfolioLinks(document.querySelector('.mobile-nav'));
    orderPortfolioLinks(document.querySelector('.footer-links'));
    if(!document.body.classList.contains('v3-home'))return;
    const title='Annapurna Agentic Solutions — Governance, AI, Learning & Digital Experiences';
    const description='Explore Annapurna’s connected worlds: Pramana’s DPDP governance, AI systems, learning products, practical tools and interactive digital experiences.';
    document.title=title;
    document.querySelectorAll('meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]').forEach(m=>m.setAttribute('content',description));
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(m=>m.setAttribute('content',title));
    const moment=document.querySelector('#local-moment');
    if(moment){
      const hour=new Date().getHours();
      const label=hour>=5&&hour<11?'Good morning':hour>=11&&hour<17?'Good afternoon':hour>=17&&hour<21?'Good evening':'Welcome';
      moment.textContent=`${label} · Annapurna World`;
    }
  }

  addEventListener('load',apply,{once:true});
})();

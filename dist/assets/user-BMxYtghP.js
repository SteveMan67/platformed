import"./modulepreload-polyfill-EeOZK34R.js";/* empty css              *//* empty css             */var e=window.location.origin;async function t(t=1){try{return(await fetch(`${e}/api/myLevels`)).json()}catch(e){console.error(e)}}var n=document.querySelector(`.overlay`),r;function i(t=r){let n={};n.levelId=t,fetch(`${e}/api/delete`,{method:`DELETE`,credentials:`include`,body:JSON.stringify(n)}).then(e=>window.location.reload())}document.querySelector(`#confirm-button`).addEventListener(`click`,e=>{i()});var a=document.querySelector(`.levels`);t(1).then(e=>{a.innerHTML=``,e=[].concat(e),e.forEach(e=>{let t=document.createElement(`a`);t.href=`/editor/${e.id}`;let i=``;for(let t=0;t<e.tags.length||t<2;t++)i+=`<p class="tag">${e.tags[t]}</p>`;e.tags.length||(i=``),e.image_url==``||`${e.image_url}`;let o=`
      <div data-level="${e.id}" class="image">
      </div>
      <div class="name-and-rating">
        <h2 class="name my-levels">${e.name}</h2>
      </div>
      <div class="quick-actions">
        <a href="/editor/${e.id}" id="edit" class="quick-action">
          <div class="svg edit"></div>
        </a>
        <div class="divider"></div>
        <a href="/level/${e.id}" id="view" class="quick-action">
          <div class="svg view"></div>
        </a>
        <div class="divider"></div>
        <button data-level="${e.id}" class="quick-action">
          <div class="svg delete"></div>
        </button>
        <div class="divider"></div>
        <a href="/meta/${e.id}" id="settings" class="quick-action">
          <div class="svg settings"></div>
        </a>
      </div>
      
    `;t.classList.add(`level`),t.innerHTML=o,a.append(t),t.querySelector(`.quick-actions`),document.querySelector(`button.quick-action[data-level="${e.id}"]`).addEventListener(`click`,t=>{t.stopPropagation(),t.preventDefault(),r=e.id,n.style.display=`flex`});let s=document.querySelector(`.image[data-level="${e.id}"]`),c=document.createElement(`canvas`);s.appendChild(c),h(c,e)})});function o(e){return getComputedStyle(document.documentElement).getPropertyValue(e).trim()}var s={};function c(){s.bgPrimary=o(`--bg-primary`),s.bgAccent=o(`--bg-accent`),s.bgLevel=o(`--bg-level`),s.textOnPrimary=o(`--text-on-primary`),s.textOnAccent=o(`--text-on-accent`),s.action=o(`--action`),s.textOnAction=o(`--text-on-action`)}c();function l(e){let t=[];for(let n=0;n<e.length;n++){let r=e[n];if(Array.isArray(r)){let e=r[0],n=r[1];for(let r=0;r<n;r++)t.push(e)}else t.push(r)}return t}function u(e,t,n,r=editor.tileset){let i=[];for(let a=0;a<t*n;a++){let o=e[a];if(!o){i.push(0);continue}let s=o>>4;i.push(d(a,s,e,r,t,n))}return i}function d(e,t,n,r,i,a){let o=0;if(t=typeof t==`number`?t:n[e]>>4,t==0)return 0;if(r[t]&&r[t].type==`rotation`)return t<<4;let s=e=>{let t=n[e];return t?t>>4:0},c=e=>{let t=s(e);if(t===0)return!1;let n=r[t];return n&&n.triggerAdjacency};return e-i>=0?c(e-i)&&(o+=1):o+=1,e+1<n.length&&(e+1)%i!==0?c(e+1)&&(o+=2):o+=2,e+i<n.length?c(e+i)&&(o+=4):o+=4,e-1>=0&&e%i!==0?c(e-1)&&(o+=8):o+=8,t*16+o}var f=new Map,p=new Map;async function m(e){if(f.has(e))return f.get(e);let t=await(await fetch(e)).json(),n=t.tiles,r={},i=t.path,a=n.map(async e=>{let t=new Image;if(t.src=i+e.file,await new Promise(e=>{t.onload=e,t.onerror=e}),r[e.id]={...e,triggerAdjacency:e.triggerAdjacency,image:t,images:[]},e.type==`adjacency`||e.type==`rotation`){let n=t.naturalHeight;if(n>0){let i=Math.floor(t.naturalWidth/n);for(let a=0;a<i;a++){let i=document.createElement(`canvas`);i.width=n,i.height=n,i.getContext(`2d`).drawImage(t,a*n,0,n,n,0,0,n,n);let o=new Image;o.src=i.toDataURL(),r[e.id].images[a]=o}}}});return await Promise.all(a),f.set(e,r),r}async function h(e,t){let n=await m(t.data?t.data.tilesetPath:`/assets/medium.json`);if(n=Object.values(n),!e||!t)return;let r=e.getContext(`2d`);if(r.imageSmoothingEnabled=!1,r.fillStyle=s.bgLevel,r.fillRect(0,0,e.width,e.height),p.has(t.id)){r.drawImage(p.get(t.id),0,0);return}let i=l(t.data.layers[0].data),a=u(i.map(e=>e<<4),t.width,t.height,n),o=l(t.data.layers[1]?t.data.layers[1].data:[]),c=n.find(e=>e.mechanics&&e.mechanics.includes(`spawn`)).id,d=i.findIndex(e=>e==c),f=0,h=0;if(d!==-1){let e=d%t.width,n=Math.floor(d/t.width);f=e*25+25/2,h=n*25+25/2}let g=Math.floor(f-e.width/2),_=Math.floor(h-e.height/2),v=t.width*25-e.width,y=t.height*25-e.height;g=Math.max(0,Math.min(g,v>0?v:0)),_=Math.max(0,Math.min(_,y>0?y:0));let b=Math.floor(g/25),x=b+Math.ceil(e.width/25)+1,S=Math.floor(_/25),C=Math.ceil((_+e.height)/25);for(let e=S;e<C;e++)for(let i=b;i<x;i++){let s=e*t.width+i,c=a[s]+o[s];if(c){let t=c>>4,a=c&15,o=n[t];if(o){let t=Math.floor(i*25-g),n=Math.floor(e*25-_),s=o.images&&o.images[a]?o.images[a]:o.image;r.drawImage(s,t,n,25,25)}}}let w=await createImageBitmap(e);p.set(t.id,w)}
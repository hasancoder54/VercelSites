// Main JS for LocalStorage-based site
(function(){
  // Helpers
  const LS = {
    getUsers(){ return JSON.parse(localStorage.getItem('users')||'[]') },
    saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)) },
    getCurrent(){ return JSON.parse(localStorage.getItem('currentUser')||'null') },
    setCurrent(u){ localStorage.setItem('currentUser', JSON.stringify(u)) },
    logout(){ localStorage.removeItem('currentUser') },
    getCodes(){ return JSON.parse(localStorage.getItem('codes')||'[]') },
    saveCodes(c){ localStorage.setItem('codes', JSON.stringify(c)) }
  };

  // Ensure admin exists
  function ensureAdmin(){
    const users = LS.getUsers();
    if(!users.find(x=>x.username==='Hasan1234')){
      users.push({username:'Hasan1234', password:'12345', created:Date.now(), admin:true});
      LS.saveUsers(users);
    }
  }
  ensureAdmin();

  // UI helpers
  function showAdminNavIfNeeded(){
    const cur = LS.getCurrent();
    if(cur && cur.username === 'Hasan1234'){
      document.querySelectorAll('#nav-admin, #nav-admin-2').forEach(el=>el.style.display='inline');
    }
  }
  // Pages init
  document.addEventListener('DOMContentLoaded', ()=>{
    showAdminNavIfNeeded();
    const path = location.pathname.split('/').pop() || 'index.html';
    if(path==='login.html') initLogin();
    if(path==='register.html') initRegister();
    if(path==='codes.html') initCodes();
    if(path==='admin.html') initAdmin();
  });

  // Login
  function initLogin(){
    const f = document.getElementById('loginForm');
    const msg = document.getElementById('loginMsg');
    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      const u = document.getElementById('loginUser').value.trim();
      const p = document.getElementById('loginPass').value;
      const users = LS.getUsers();
      const found = users.find(x=>x.username===u && x.password===p);
      if(found){
        LS.setCurrent({username:found.username, admin:!!found.admin});
        msg.textContent = 'Giriş başarılı. Yönlendiriliyorsunuz...';
        setTimeout(()=> location.href='index.html', 800);
      } else {
        msg.textContent = 'Kullanıcı adı veya şifre yanlış.';
      }
    });
  }

  // Register
  function initRegister(){
    const f = document.getElementById('registerForm');
    const msg = document.getElementById('regMsg');
    f.addEventListener('submit',(e)=>{
      e.preventDefault();
      const u = document.getElementById('regUser').value.trim();
      const p = document.getElementById('regPass').value;
      if(!u || !p){ msg.textContent = 'Alanlar boş olamaz.'; return; }
      const users = LS.getUsers();
      if(users.find(x=>x.username===u)){ msg.textContent = 'Bu kullanıcı adı alınmış.'; return; }
      users.push({username:u, password:p, created:Date.now(), admin:false});
      LS.saveUsers(users);
      msg.textContent = 'Kayıt başarılı. Giriş sayfasına yönlendiriliyorsun.';
      setTimeout(()=> location.href='login.html',900);
    });
  }

  // Codes page
  function initCodes(){
    const addForm = document.getElementById('addCodeForm');
    const listWrap = document.getElementById('codesList');
    renderCodes();
    addForm.addEventListener('submit',(e)=>{
      e.preventDefault();
      const cur = LS.getCurrent();
      if(!cur){ alert('Kod eklemek için giriş yapmalısın.'); location.href='login.html'; return; }
      const title = document.getElementById('codeTitle').value.trim();
      const lang = document.getElementById('codeLang').value.trim();
      const content = document.getElementById('codeContent').value;
      const codes = LS.getCodes();
      codes.unshift({id:Date.now()+Math.random(), title, lang, content, owner:cur.username, created:Date.now()});
      LS.saveCodes(codes);
      addForm.reset();
      renderCodes();
    });

    function renderCodes(){
      const codes = LS.getCodes();
      if(!codes.length){ listWrap.innerHTML = '<p class="muted">Henüz kod yok.</p>'; return; }
      listWrap.innerHTML = codes.map(c=>{
        return `<div class="card small">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><strong>${escapeHtml(c.title)}</strong> <span class="small">[${c.lang||'—'}]</span></div>
            <div><span class="user-chip">${c.owner}</span> <button class="btn-small" data-id="${c.id}">Sil</button></div>
          </div>
          <pre class="code-block">${escapeHtml(c.content)}</pre>
        </div>`;
      }).join('');
      // attach delete handlers
      listWrap.querySelectorAll('button.btn-small').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const id = btn.getAttribute('data-id');
          const codes = LS.getCodes();
          const cur = LS.getCurrent();
          const c = codes.find(x=>''+x.id===id);
          if(!c) return;
          if(cur && (cur.username===c.owner || cur.username==='Hasan1234')){
            const remaining = codes.filter(x=>''+x.id!==id);
            LS.saveCodes(remaining);
            renderCodes();
          } else {
            alert('Bu kodu silmeye yetkin yok.');
          }
        });
      });
    }
  }

  // Admin page
  function initAdmin(){
    const cur = LS.getCurrent();
    if(!cur || cur.username!=='Hasan1234'){ alert('Admin erişimi için Hasan1234 ile giriş yapmalısın.'); location.href='login.html'; return; }
    const usersList = document.getElementById('usersList');
    const adminCodes = document.getElementById('adminCodes');
    renderUsers();
    renderAdminCodes();

    function renderUsers(){
      const users = LS.getUsers();
      usersList.innerHTML = users.map(u=>`<div class="card small"><strong>${u.username}</strong> <span class="small">${u.admin? 'Admin':''}</span>
        <div style="margin-top:8px"><button class="btn-small" data-user="${u.username}">Sil</button></div></div>`).join('');
      usersList.querySelectorAll('button.btn-small').forEach(b=>{
        b.addEventListener('click', ()=>{
          const uname = b.getAttribute('data-user');
          if(uname==='Hasan1234'){ alert('Admin silinemez.'); return; }
          let users = LS.getUsers();
          users = users.filter(x=>x.username!==uname);
          LS.saveUsers(users);
          // also remove their codes
          let codes = LS.getCodes();
          codes = codes.filter(c=>c.owner!==uname);
          LS.saveCodes(codes);
          renderUsers(); renderAdminCodes();
        });
      });
    }

    function renderAdminCodes(){
      const codes = LS.getCodes();
      if(!codes.length){ adminCodes.innerHTML = '<p class="muted">Kod yok.</p>'; return; }
      adminCodes.innerHTML = codes.map(c=>`<div class="card small"><div style="display:flex;justify-content:space-between"><div><strong>${escapeHtml(c.title)}</strong> <div class="small">${c.owner}</div></div><div><button class="btn-small" data-id="${c.id}">Sil</button></div></div><pre class="code-block">${escapeHtml(c.content)}</pre></div>`).join('');
      adminCodes.querySelectorAll('button.btn-small').forEach(b=>{
        b.addEventListener('click', ()=>{
          const id = b.getAttribute('data-id');
          let codes = LS.getCodes();
          codes = codes.filter(c=>''+c.id!==id);
          LS.saveCodes(codes);
          renderAdminCodes();
        });
      });
    }
  }

  // small util
  function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

})();
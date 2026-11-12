(function(){
  var parts=location.pathname.split("/").filter(Boolean);
  var locale=(parts.length?parts[0]:"en").toLowerCase();
  var labels={
    en:{menu:"Menu",close:"Close",products:"Products",oem:"OEM / ODM",factory:"Factory",home:"Home",resources:"Knowledge Center",contact:"Contact",email:"Email inquiry"},
    ja:{menu:"メニュー",close:"閉じる",products:"製品",oem:"OEM / ODM",factory:"工場",home:"ホーム",resources:"知識センター",contact:"お問い合わせ",email:"メールで問い合わせ"},
    ko:{menu:"메뉴",close:"닫기",products:"제품",oem:"OEM / ODM",factory:"공장",home:"홈",resources:"지식 센터",contact:"문의하기",email:"이메일 문의"},
    es:{menu:"Menú",close:"Cerrar",products:"Productos",oem:"OEM / ODM",factory:"Fábrica",home:"Inicio",resources:"Centro de conocimiento",contact:"Contacto",email:"Consulta por email"},
    pt:{menu:"Menu",close:"Fechar",products:"Produtos",oem:"OEM / ODM",factory:"Fábrica",home:"Início",resources:"Centro de conhecimento",contact:"Contacto",email:"Consulta por e-mail"},
    de:{menu:"Menü",close:"Schließen",products:"Produkte",oem:"OEM / ODM",factory:"Fabrik",home:"Startseite",resources:"Wissenszentrum",contact:"Kontakt",email:"E-Mail-Anfrage"},
    ru:{menu:"Меню",close:"Закрыть",products:"Продукты",oem:"OEM / ODM",factory:"Фабрика",home:"Главная",resources:"База знаний",contact:"Контакты",email:"Запрос по email"},
    ar:{menu:"القائمة",close:"إغلاق",products:"المنتجات",oem:"OEM / ODM",factory:"المصنع",home:"الرئيسية",resources:"مركز المعرفة",contact:"اتصل بنا",email:"استفسار بالبريد"},
    "zh-cn":{menu:"菜单",close:"关闭",products:"产品",oem:"OEM / ODM",factory:"工厂",home:"首页",resources:"知识中心",contact:"联系我们",email:"邮件咨询"},
    "zh-tw":{menu:"選單",close:"關閉",products:"產品",oem:"OEM / ODM",factory:"工廠",home:"首頁",resources:"知識中心",contact:"聯絡我們",email:"電子郵件諮詢"}
  };
  var t=labels[locale]||labels.en;
  var header=document.querySelector(".topbar");
  var old=document.querySelector(".mobile-menu-toggle");
  if(old)old.remove();
  var nav=header&&header.querySelector(".desktop-nav");
  if(header&&nav){
    var toggle=document.createElement("button");
    toggle.type="button";toggle.className="mobile-menu-toggle";
    toggle.setAttribute("aria-label",t.menu);toggle.setAttribute("aria-expanded","false");
    toggle.innerHTML='<span class="menu-lines" aria-hidden="true"><i></i><i></i><i></i></span>';
    var shade=document.createElement("div");shade.className="mobile-menu-shade";
    var drawer=document.createElement("nav");drawer.className="mobile-menu-drawer";drawer.setAttribute("aria-label",t.menu);
    var top=document.createElement("div");top.className="mobile-drawer-top";
    var heading=document.createElement("strong");heading.textContent=t.menu;
    var close=document.createElement("button");close.type="button";close.className="mobile-drawer-close";close.setAttribute("aria-label",t.close);close.textContent="×";
    top.append(heading,close);drawer.appendChild(top);
    var links=[
      [t.home,"/"+locale+"/"],
      [t.products,"/"+locale+"/products/"],
      [t.oem,"/"+locale+"/oem-odm/"],
      [t.factory,"/"+locale+"/factory/"],[t.resources,"/"+locale+"/resources/"],[t.contact,"/"+locale+"/#contact"]
    ];
    links.forEach(function(item){var a=document.createElement("a");a.href=item[1];a.textContent=item[0];drawer.appendChild(a);});
    function setOpen(open){drawer.classList.toggle("is-open",open);shade.classList.toggle("is-open",open);toggle.setAttribute("aria-expanded",String(open));document.body.classList.toggle("mobile-menu-active",open);}
    toggle.addEventListener("click",function(){setOpen(!drawer.classList.contains("is-open"));});
    close.addEventListener("click",function(){setOpen(false);});
    shade.addEventListener("click",function(){setOpen(false);});
    drawer.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){setOpen(false);});});
    header.appendChild(toggle);document.body.append(shade,drawer);
  }
  var email=document.createElement("a");
  email.className="floating-email";
  email.href=location.pathname==="/"+locale+"/"?"#contact":"/"+locale+"/#contact";
  email.setAttribute("aria-label",t.email);email.setAttribute("title",t.email);
  email.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9 8.1L3.4 7.2v9.7h17.2V7.2L12 13.1Zm0-2.4L19.5 7h-15L12 10.7Z"/></svg><span>'+t.email+'</span>';
  document.body.appendChild(email);
})();
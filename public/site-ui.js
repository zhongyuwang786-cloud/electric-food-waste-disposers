(function(){
  var path=location.pathname;
  var locale=(path.split("/")[1]||"en").toLowerCase();
  var labels={
    en:{menu:"Menu",close:"Close",inquiry:"Email inquiry"},
    ja:{menu:"メニュー",close:"閉じる",inquiry:"メールで問い合わせ"},
    ko:{menu:"메뉴",close:"닫기",inquiry:"이메일 문의"},
    es:{menu:"Menú",close:"Cerrar",inquiry:"Consulta por email"},
    pt:{menu:"Menu",close:"Fechar",inquiry:"Consulta por e-mail"},
    de:{menu:"Menü",close:"Schließen",inquiry:"E-Mail-Anfrage"},
    ru:{menu:"Меню",close:"Закрыть",inquiry:"Запрос по email"},
    ar:{menu:"القائمة",close:"إغلاق",inquiry:"استفسار بالبريد"},
    "zh-cn":{menu:"菜单",close:"关闭",inquiry:"邮件咨询"},
    "zh-tw":{menu:"選單",close:"關閉",inquiry:"電子郵件諮詢"}
  };
  var t=labels[locale]||labels.en;
  var header=document.querySelector(".topbar");
  var nav=header&&header.querySelector(".desktop-nav");
  if(header&&nav){
    var toggle=document.createElement("button");
    toggle.type="button";toggle.className="mobile-menu-toggle";
    toggle.setAttribute("aria-expanded","false");
    toggle.textContent=t.menu;
    toggle.addEventListener("click",function(){
      var open=nav.classList.toggle("mobile-nav-open");
      toggle.setAttribute("aria-expanded",String(open));
      toggle.textContent=open?t.close:t.menu;
    });
    header.insertBefore(toggle,nav);
    nav.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){
      nav.classList.remove("mobile-nav-open");toggle.setAttribute("aria-expanded","false");toggle.textContent=t.menu;
    });});
  }
  var cta=document.createElement("a");
  cta.className="mobile-email-cta";
  cta.href=path.match(/\/(products|factory|oem-odm)\//)?"/"+locale+"/#contact":"#contact";
  cta.textContent=t.inquiry;
  cta.setAttribute("aria-label",t.inquiry);
  document.body.appendChild(cta);
})();
const localePaths={"zh-CN":"zh-cn","zh-TW":"zh-tw","en":"en","ja":"ja","ko":"ko","es":"es","pt":"pt","de":"de","ru":"ru","ar":"ar"};
const languageSelect=document.getElementById('language');
if(languageSelect){languageSelect.addEventListener('change',e=>{const p=localePaths[e.target.value]||'en';window.location.href='/'+p+'/';});}
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
const form=document.getElementById('inquiryForm');
if(form){form.addEventListener('submit',async e=>{
  e.preventDefault();
  const submit=form.querySelector('button[type="submit"]');
  const data=Object.fromEntries(new FormData(form).entries());
  data.language=document.documentElement.lang;
  if(submit){submit.disabled=true;submit.setAttribute('aria-busy','true');}
  const zh=document.documentElement.lang.toLowerCase().startsWith('zh');
  try{
    const r=await fetch('/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const j=await r.json();
    if(!r.ok||!j.ok) throw new Error(j.error||'Submission failed');
    if(j.notification==='not_configured') alert(zh?'询盘已保存，但邮件通知尚未配置。请联系网站管理员完成邮件配置。':'Your inquiry was saved, but email notifications are not configured yet. Please contact the website administrator.');
    else if(j.notification==='failed') alert(zh?'询盘已保存，但邮件通知发送失败。请网站管理员检查邮件服务。':'Your inquiry was saved, but the email alert could not be sent. The site administrator should check the email provider.');
    else alert(zh?'询盘已提交，我们会尽快联系您。':'Thank you. Your inquiry has been submitted.');
    form.reset();
  }catch(err){alert(zh?'提交失败，请稍后重试，或联系网站管理员。':'Submission failed. Please try again later or contact the website administrator.');}
  finally{if(submit){submit.disabled=false;submit.removeAttribute('aria-busy');}}
});}

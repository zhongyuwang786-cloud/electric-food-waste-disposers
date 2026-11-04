const localePaths={"zh-CN":"zh-cn","zh-TW":"zh-tw","en":"en","ja":"ja","ko":"ko","es":"es","pt":"pt","de":"de","ru":"ru","ar":"ar"};
const languageSelect=document.getElementById('language');
if(languageSelect){languageSelect.addEventListener('change',e=>{const p=localePaths[e.target.value]||'en';window.location.href='/'+p+'/';});}
const year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();

const formMessages={
  en:{rateLimited:"A recent inquiry from this email was already received. Please wait before submitting again.",sending:"Sending your inquiry…",sent:"Your inquiry has been submitted. We will follow up using the business email you provided.",saved:"Your inquiry was saved, but the email notification could not be confirmed. Please contact us if you do not hear back.",error:"We could not submit your inquiry. Please check the fields and try again."},
  ja:{rateLimited:"このメールアドレスからの問い合わせは受信済みです。少し待ってから再送信してください。",sending:"お問い合わせを送信しています…",sent:"お問い合わせを送信しました。ご入力いただいたメールアドレスへご連絡します。",saved:"お問い合わせは保存されましたが、メール通知を確認できませんでした。返信がない場合は再度ご連絡ください。",error:"送信できませんでした。入力内容を確認して再度お試しください。"},
  ko:{rateLimited:"이 이메일 주소로 최근 문의가 접수되었습니다. 잠시 후 다시 제출해 주세요.",sending:"문의 내용을 전송하고 있습니다…",sent:"문의가 제출되었습니다. 입력하신 업무용 이메일로 연락드리겠습니다.",saved:"문의는 저장되었지만 이메일 알림 전송을 확인할 수 없습니다. 회신이 없으면 다시 문의해 주세요.",error:"문의 제출에 실패했습니다. 입력 내용을 확인하고 다시 시도해 주세요."},
  es:{rateLimited:"Ya recibimos una consulta reciente de este correo. Espere antes de enviarla de nuevo.",sending:"Enviando su consulta…",sent:"Su consulta se ha enviado. Nos pondremos en contacto mediante el correo electrónico comercial indicado.",saved:"La consulta se guardó, pero no se pudo confirmar la notificación por correo. Vuelva a contactarnos si no recibe respuesta.",error:"No se pudo enviar la consulta. Revise los campos e inténtelo de nuevo."},
  pt:{rateLimited:"Já recebemos uma consulta recente deste e-mail. Aguarde antes de enviar novamente.",sending:"Enviando sua consulta…",sent:"Sua consulta foi enviada. Entraremos em contato pelo e-mail comercial informado.",saved:"A consulta foi salva, mas não foi possível confirmar a notificação por e-mail. Entre em contato novamente se não receber uma resposta.",error:"Não foi possível enviar a consulta. Verifique os campos e tente novamente."},
  de:{rateLimited:"Von dieser E-Mail-Adresse ist bereits eine Anfrage eingegangen. Bitte warten Sie kurz.",sending:"Ihre Anfrage wird gesendet…",sent:"Ihre Anfrage wurde übermittelt. Wir melden uns über die angegebene geschäftliche E-Mail-Adresse.",saved:"Ihre Anfrage wurde gespeichert, aber die E-Mail-Benachrichtigung konnte nicht bestätigt werden. Kontaktieren Sie uns erneut, falls Sie keine Antwort erhalten.",error:"Ihre Anfrage konnte nicht gesendet werden. Bitte prüfen Sie die Angaben und versuchen Sie es erneut."},
  ru:{rateLimited:"Недавно мы уже получили запрос с этого адреса. Подождите немного.",sending:"Отправка запроса…",sent:"Ваш запрос отправлен. Мы свяжемся с вами по указанному рабочему адресу электронной почты.",saved:"Запрос сохранён, но отправка уведомления по электронной почте не подтверждена. Если ответа не будет, свяжитесь с нами повторно.",error:"Не удалось отправить запрос. Проверьте поля и попробуйте ещё раз."},
  ar:{rateLimited:"تلقينا استفسارًا مؤخرًا من هذا البريد الإلكتروني. يرجى الانتظار قليلًا.",sending:"جارٍ إرسال استفسارك…",sent:"تم إرسال استفسارك. سنتواصل معك عبر بريد العمل الذي قدمته.",saved:"تم حفظ الاستفسار، لكن تعذّر تأكيد إشعار البريد الإلكتروني. يرجى التواصل معنا مجددًا إذا لم تتلق ردًا.",error:"تعذّر إرسال الاستفسار. يرجى مراجعة الحقول والمحاولة مرة أخرى."},
  "zh-cn":{rateLimited:"我们刚刚收到过这个邮箱提交的询盘，请稍后再提交。",sending:"正在提交询盘…",sent:"询盘已提交，我们会通过您填写的商务邮箱与您联系。",saved:"询盘已保存，但邮件通知未能确认发送。如未收到回复，请再次联系我们。",error:"提交失败，请检查填写内容后重试。"},
  "zh-tw":{rateLimited:"我們剛收到過這個電子郵件提交的詢價，請稍後再提交。",sending:"正在提交詢價…",sent:"詢價已提交，我們會透過您填寫的商務電子郵件與您聯絡。",saved:"詢價已儲存，但無法確認郵件通知已送出。如未收到回覆，請再次聯絡我們。",error:"提交失敗，請檢查填寫內容後重試。"}
};
const form=document.getElementById('inquiryForm');
if(form){
  const locale=(document.documentElement.lang||"en").toLowerCase();
  const messages=formMessages[locale]||formMessages.en;
  const submit=form.querySelector('button[type="submit"]');
  const status=document.createElement('p');
  status.className='form-note full';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');
  status.hidden=true;
  if(submit) submit.insertAdjacentElement('afterend',status);
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity()) return;
    const data=Object.fromEntries(new FormData(form).entries());
    data.language=document.documentElement.lang||locale;
    if(submit){submit.disabled=true;submit.setAttribute('aria-busy','true');}
    status.hidden=false;
    status.textContent=messages.sending;
    status.dataset.state='pending';
    try{
      const r=await fetch('/api/inquiry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const j=await r.json();
      if(r.status===429){
        status.textContent=messages.rateLimited||messages.error;
        status.dataset.state='warning';
        return;
      }
      if(!r.ok||!j.ok) throw new Error(j.error||'Submission failed');
      if(j.notification==='sent'){
        status.textContent=messages.sent;
        status.dataset.state='success';
        form.reset();
      }else{
        status.textContent=messages.saved;
        status.dataset.state='warning';
      }
    }catch(err){
      status.textContent=messages.error;
      status.dataset.state='error';
    }finally{
      if(submit){submit.disabled=false;submit.removeAttribute('aria-busy');}
    }
  });
}

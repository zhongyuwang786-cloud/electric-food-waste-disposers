(() => {
  const $ = id => document.getElementById(id);
  const state = { page: 1, limit: 25, total: 0, loading: false };
  const labels = {new:"新询盘",contacted:"已联系",qualified:"有效客户",closed:"已完成",spam:"垃圾询盘"};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const params = () => {
    const p = new URLSearchParams({page:String(state.page),limit:String(state.limit)});
    if ($("status").value) p.set("status",$("status").value);
    if ($("q").value.trim()) p.set("q",$("q").value.trim());
    return p;
  };
  function notice(message, error=false){ $("notice").textContent=message; $("notice").className=error?"error":"muted"; }
  function render(items){
    const rows=$("rows");
    if(!items.length){rows.innerHTML='<tr><td colspan="7" class="empty">没有找到询盘记录</td></tr>';return;}
    rows.innerHTML=items.map(item=>{
      const options=Object.entries(labels).map(([value,label])=>'<option value="'+value+'" '+(item.status===value?'selected':'')+'>'+label+'</option>').join("");
      return '<tr><td>'+esc(item.created_at)+'</td><td><strong>'+esc(item.name)+'</strong><br>'+esc(item.company)+'</td><td><a href="mailto:'+esc(item.email)+'">'+esc(item.email)+'</a></td><td>'+esc(item.market)+'</td><td class="message">'+esc(item.message)+'</td><td>'+esc(item.language)+'</td><td><select class="status" data-id="'+Number(item.id)+'">'+options+'</select></td></tr>';
    }).join("");
    rows.querySelectorAll("select[data-id]").forEach(select=>select.addEventListener("change",()=>updateStatus(select)));
  }
  async function load(){
    if(state.loading)return; state.loading=true; $("refresh").disabled=true; $("search").disabled=true;
    notice("正在加载…");
    try{
      const response=await fetch("/api/admin/inquiries?"+params().toString(),{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"});
      if(response.status===401||response.status===403)throw new Error("访问未获授权。请先通过 Cloudflare Access 登录，并确认管理员策略已生效。");
      if(response.status===503)throw new Error("后台尚未完成 Access 环境变量配置。");
      const data=await response.json(); if(!response.ok||!data.ok)throw new Error(data.error||"加载失败");
      state.total=data.total||0; render(data.inquiries||[]);
      $("count").textContent="共 "+state.total+" 条询盘";
      $("page").textContent="第 "+state.page+" 页";
      $("prev").disabled=state.page<=1;
      $("next").disabled=state.page*state.limit>=state.total;
      notice("数据加载完成");
    }catch(error){$("rows").innerHTML='<tr><td colspan="7" class="empty">'+esc(error.message)+'</td></tr>';notice(error.message,true);}
    finally{state.loading=false;$("refresh").disabled=false;$("search").disabled=false;}
  }
  async function updateStatus(select){
    const id=Number(select.dataset.id), status=select.value; select.disabled=true;
    try{
      const response=await fetch("/api/admin/inquiries",{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({id,status})});
      const data=await response.json(); if(!response.ok||!data.ok)throw new Error(data.error||"状态更新失败");
      notice("询盘 #"+id+" 的状态已更新为："+labels[status]);
    }catch(error){notice(error.message,true);load();}
    finally{select.disabled=false;}
  }
  $("refresh").addEventListener("click",load);
  $("search").addEventListener("click",()=>{state.page=1;load();});
  $("q").addEventListener("keydown",e=>{if(e.key==="Enter"){state.page=1;load();}});
  $("status").addEventListener("change",()=>{state.page=1;load();});
  $("prev").addEventListener("click",()=>{if(state.page>1){state.page--;load();}});
  $("next").addEventListener("click",()=>{if(state.page*state.limit<state.total){state.page++;load();}});
  $("export").addEventListener("click",()=>{const p=params();p.set("format","csv");window.location.href="/api/admin/inquiries?"+p.toString();});
  $("translateButton").addEventListener("click",async()=>{
    const button=$("translateButton"), input=$("translateInput"), target=$("translateTarget");
    const text=input.value.trim();
    if(!text){$("translateNotice").textContent="请先输入英文内容。";$("translateNotice").className="error";return;}
    button.disabled=true;
    $("translateNotice").textContent="正在翻译，请稍候…";
    $("translateNotice").className="muted";
    $("translateResult").textContent="";
    try{
      const response=await fetch("/api/admin/translate",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify({text,source_lang:"english",target_lang:target.value})});
      const raw=await response.text();
      let data;
      try { data=JSON.parse(raw); } catch { throw new Error("服务器返回了非 JSON 响应（HTTP "+response.status+"）。请检查 Cloudflare Access 配置或部署日志。"); }
      if(!response.ok||!data.ok)throw new Error(data.error||"翻译失败");
      $("translateResult").textContent=data.translated_text;
      $("translateNotice").textContent="翻译完成。请人工检查产品术语和技术表述后再用于正式页面。";
    }catch(error){
      $("translateNotice").textContent=error.message;
      $("translateNotice").className="error";
    }finally{button.disabled=false;}
  });

  const productFields = ["productTitle","productSlug","productSummary","productDescription","productImage","productSeoTitle","productSeoDescription"];
  let productTranslations = {};
  let originalEnglish = null;
  const englishSnapshot = () => ({
    title_en:$("productTitle").value, summary_en:$("productSummary").value,
    description_en:$("productDescription").value, seo_title_en:$("productSeoTitle").value,
    seo_description_en:$("productSeoDescription").value
  });
  function translationNotice(message,error=false){$("translationNotice").textContent=message;$("translationNotice").className=error?"error":"muted";}
  function loadTranslationEditor(){
    const language=$("translationLanguage").value;
    const item=productTranslations[language]||{};
    $("translatedTitle").value=item.title||"";
    $("translatedSummary").value=item.summary||"";
    $("translatedDescription").value=item.description||"";
    $("translatedSeoTitle").value=item.seo_title||"";
    $("translatedSeoDescription").value=item.seo_description||"";
    translationNotice(item.title||item.summary||item.description?"已载入该语言译文，可检查并修改。":"该语言暂无已保存译文。");
  }
  function productNotice(message,error=false){ $("productNotice").textContent=message; $("productNotice").className=error?"error":"muted"; }
  function resetProduct(){ $("productId").value=""; productFields.forEach(id=>$(id).value=""); $("productSave").textContent="保存英文草稿"; $("productTranslate").disabled=true; $("productTranslateNotice").textContent="先保存英文草稿，再生成 8 种语言。AI 翻译需人工校对。"; productTranslations={}; originalEnglish=null; loadTranslationEditor(); translationNotice("请先从产品列表选择一条草稿。"); }
  function fillProduct(p){
    $("productId").value=p.id;
    productTranslations=p.translations||{};
    $("productTitle").value=p.title_en||"";
    $("productSlug").value=p.slug||"";
    $("productSummary").value=p.summary_en||"";
    $("productDescription").value=p.description_en||"";
    $("productImage").value=p.image_url||"";
    $("productSeoTitle").value=p.seo_title_en||"";
    $("productSeoDescription").value=p.seo_description_en||"";
    originalEnglish=JSON.stringify(englishSnapshot());
    $("productSave").textContent="保存修改";
    $("productTranslate").disabled=false;
    $("productTranslateNotice").textContent=Object.keys(productTranslations).length ? "已保存 "+Object.keys(productTranslations).length+" 种语言译文；重新生成会覆盖旧译文。" : "英文草稿已载入。点击“生成并保存多语言”生成 8 种语言。";
    loadTranslationEditor();
    $("productsPanel").scrollIntoView({behavior:"smooth",block:"start"});
    productNotice("正在编辑："+p.title_en);
  }
  async function loadProducts(){
    $("productRefresh").disabled=true;
    try{
      const response=await fetch("/api/admin/products",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||"产品列表加载失败");
      const rows=$("productRows");
      if(!data.products.length){rows.innerHTML='<tr><td colspan="5" class="empty">暂无产品草稿</td></tr>';productNotice("产品数据表已连接，当前没有草稿。");return;}
      rows.innerHTML=data.products.map(p=>'<tr><td>'+esc(p.title_en)+'</td><td>'+esc(p.slug)+'</td><td>'+ (p.status==="archived"?"已归档":"草稿") +'</td><td>'+esc(p.updated_at)+'</td><td><button type="button" data-edit="'+Number(p.id)+'" style="padding:6px 9px">编辑 / 校对</button> <button type="button" data-archive="'+Number(p.id)+'" style="padding:6px 9px">归档</button></td></tr>').join("");
      rows.querySelectorAll("[data-edit]").forEach(button=>button.addEventListener("click",()=>fillProduct(data.products.find(p=>p.id===Number(button.dataset.edit)))));
      rows.querySelectorAll("[data-archive]").forEach(button=>button.addEventListener("click",async()=>{
        const p=data.products.find(item=>item.id===Number(button.dataset.archive));
        if(!p||!confirm("将这条产品草稿归档？"))return;
        try{
          const response=await fetch("/api/admin/products",{method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({id:p.id,slug:p.slug,title_en:p.title_en,summary_en:p.summary_en,description_en:p.description_en,image_url:p.image_url,seo_title_en:p.seo_title_en,seo_description_en:p.seo_description_en,translations:p.translations||{},status:"archived"})});
          const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"归档失败");
          if(String($("productId").value)===String(p.id))resetProduct();
          productNotice("产品草稿已归档。");loadProducts();
        }catch(error){productNotice(error.message,true);}
      }));
      productNotice("已加载 "+data.products.length+" 条产品记录。");
    }catch(error){$("productRows").innerHTML='<tr><td colspan="5" class="empty">'+esc(error.message)+'</td></tr>';productNotice(error.message,true);}
    finally{$("productRefresh").disabled=false;}
  }
  $("productTitle").addEventListener("input",()=>{
    if(!$("productSlug").value.trim())$("productSlug").value=$("productTitle").value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  });
  $("productForm").addEventListener("submit",async event=>{
    event.preventDefault();
    const button=$("productSave"), id=$("productId").value;
    const payload={slug:$("productSlug").value,title_en:$("productTitle").value,summary_en:$("productSummary").value,description_en:$("productDescription").value,image_url:$("productImage").value,seo_title_en:$("productSeoTitle").value,seo_description_en:$("productSeoDescription").value};
    button.disabled=true;productNotice("正在保存产品草稿…");
    try{
      const response=await fetch("/api/admin/products",{method:id?"PATCH":"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},credentials:"same-origin",body:JSON.stringify(id?{...payload,id,translations:productTranslations}:payload)});
      const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"保存失败");
      if(id){ $("productId").value=id; $("productSave").textContent="保存修改"; $("productTranslate").disabled=false; }
      else { $("productId").value=data.id; $("productSave").textContent="保存修改"; $("productTranslate").disabled=false; }
      const currentEnglish=JSON.stringify(englishSnapshot());
      if(!id || (originalEnglish && currentEnglish!==originalEnglish)){ productTranslations={}; }
      originalEnglish=currentEnglish;
      productNotice(id?"产品草稿已更新。":"产品草稿已保存。");await loadProducts();
    }catch(error){productNotice(error.message,true);}
    finally{button.disabled=false;}
  });
  const translationLanguages = [
    ["japanese","日语"],["korean","韩语"],["spanish","西班牙语"],["portuguese","葡萄牙语"],
    ["german","德语"],["russian","俄语"],["arabic","阿拉伯语"],["chinese","简体中文"]
  ];
  function splitForTranslation(value, limit=4500){
    const chunks=[]; let rest=String(value||"");
    while(rest.length>limit){
      let cut=rest.lastIndexOf("\n",limit);
      if(cut<Math.floor(limit*0.55))cut=rest.lastIndexOf(" ",limit);
      if(cut<Math.floor(limit*0.55))cut=limit;
      chunks.push(rest.slice(0,cut)); rest=rest.slice(cut).trimStart();
    }
    if(rest)chunks.push(rest);
    return chunks;
  }
  async function translateProductField(value,target){
    const chunks=splitForTranslation(value);
    const translated=[];
    for(const chunk of chunks){
      const response=await fetch("/api/admin/translate",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify({text:chunk,source_lang:"english",target_lang:target})});
      const raw=await response.text(); let data;
      try{data=JSON.parse(raw);}catch{throw new Error("翻译接口返回异常（HTTP "+response.status+"）。");}
      if(!response.ok||!data.ok)throw new Error(data.error||"翻译失败");
      translated.push(data.translated_text||"");
    }
    return translated.join("\n\n");
  }
  $("productTranslate").addEventListener("click",async()=>{
    const id=Number($("productId").value);
    if(!id){$("productTranslateNotice").textContent="请先保存英文草稿。";return;}
    const button=$("productTranslate"); button.disabled=true; $("productSave").disabled=true;
    const fields={
      title:$("productTitle").value.trim(),summary:$("productSummary").value.trim(),
      description:$("productDescription").value.trim(),seo_title:$("productSeoTitle").value.trim(),
      seo_description:$("productSeoDescription").value.trim()
    };
    if(!fields.title){$("productTranslateNotice").textContent="请先填写英文产品名称。";button.disabled=false;$("productSave").disabled=false;return;}
    const translations={};
    try{
      for(let i=0;i<translationLanguages.length;i++){
        const [language,label]=translationLanguages[i];
        $("productTranslateNotice").textContent="正在生成 "+label+"（"+(i+1)+"/"+translationLanguages.length+"）…请勿关闭页面。";
        const translated={};
        for(const [key,value] of Object.entries(fields)){
          translated[key]=value?await translateProductField(value,language):"";
        }
        translations[language]=translated;
      }
      $("productTranslateNotice").textContent="正在保存 8 种语言译文…";
      const payload={id,slug:$("productSlug").value,title_en:fields.title,summary_en:fields.summary,description_en:fields.description,image_url:$("productImage").value,seo_title_en:fields.seo_title,seo_description_en:fields.seo_description,translations};
      const response=await fetch("/api/admin/products",{method:"PATCH",headers:{"Content-Type":"application/json",Accept:"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(payload)});
      const raw=await response.text();let data;
      try{data=JSON.parse(raw);}catch{throw new Error("保存译文时服务器返回异常（HTTP "+response.status+"）。");}
      if(!response.ok||!data.ok)throw new Error(data.error||"译文保存失败");
      productTranslations=translations;
      loadTranslationEditor();
      $("productTranslateNotice").textContent="已生成并保存 8 种语言译文。请人工检查产品术语、SEO 文案和技术表述；当前仍为后台草稿，未发布到前台。";
      productNotice("多语言译文已保存。");
      await loadProducts();
    }catch(error){
      $("productTranslateNotice").textContent="处理中断："+error.message+" 已生成的临时译文未保存；修正问题后可重新生成。";
      $("productTranslateNotice").className="error";
    }finally{button.disabled=false;$("productSave").disabled=false;}
  });
  $("translationLanguage").addEventListener("change",loadTranslationEditor);
  $("translationLoad").addEventListener("click",loadTranslationEditor);
  $("translationSave").addEventListener("click",async()=>{
    const id=Number($("productId").value);
    if(!id){translationNotice("请先从产品列表编辑一条已保存的产品草稿。",true);return;}
    const language=$("translationLanguage").value;
    productTranslations[language]={
      title:$("translatedTitle").value.trim(),
      summary:$("translatedSummary").value.trim(),
      description:$("translatedDescription").value.trim(),
      seo_title:$("translatedSeoTitle").value.trim(),
      seo_description:$("translatedSeoDescription").value.trim()
    };
    const button=$("translationSave");button.disabled=true;
    translationNotice("正在保存当前语言译文…");
    try{
      const english=englishSnapshot();
      const payload={id,slug:$("productSlug").value,title_en:english.title_en,summary_en:english.summary_en,description_en:english.description_en,image_url:$("productImage").value,seo_title_en:english.seo_title_en,seo_description_en:english.seo_description_en,translations:productTranslations};
      const response=await fetch("/api/admin/products",{method:"PATCH",headers:{"Content-Type":"application/json",Accept:"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(payload)});
      const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{throw new Error("服务器返回异常（HTTP "+response.status+"）。");}
      if(!response.ok||!data.ok)throw new Error(data.error||"译文保存失败");
      originalEnglish=JSON.stringify(englishSnapshot());
      translationNotice("当前语言译文已保存。仍为后台草稿，尚未发布到网站。");
      productNotice("已保存 "+language+" 译文。");
      await loadProducts();
    }catch(error){translationNotice(error.message,true);}
    finally{button.disabled=false;}
  });
  $("productReset").addEventListener("click",resetProduct);
  $("productRefresh").addEventListener("click",loadProducts);

  load();
  loadProducts();
})();
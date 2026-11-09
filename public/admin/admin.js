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
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||"翻译失败");
      $("translateResult").textContent=data.translated_text;
      $("translateNotice").textContent="翻译完成。请人工检查产品术语和技术表述后再用于正式页面。";
    }catch(error){
      $("translateNotice").textContent=error.message;
      $("translateNotice").className="error";
    }finally{button.disabled=false;}
  });
  load();
})();
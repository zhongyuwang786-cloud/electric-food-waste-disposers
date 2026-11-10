(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const number = value => Number(value || 0).toLocaleString("zh-CN");
  const pct = value => value == null ? "不可用" : (value * 100).toFixed(2) + "%";
  const delta = (current, previous) => {
    if (previous === 0) return current === 0 ? "较前周无变化" : "较前周新增";
    const value = (current - previous) / previous * 100;
    return (value > 0 ? "↑ " : value < 0 ? "↓ " : "") + Math.abs(value).toFixed(1) + "%（较前周）";
  };
  const sourceLabels = {search_engine:"搜索引擎",social_media:"社媒推荐",ai_recommendation:"AI 推荐",direct:"直接访问",other:"其他来源"};
  const eventLabels = {human_pageview:"真人页面访问",crawler_request:"爬虫页面请求",crawler_resource_request:"爬虫资源请求",asset_request:"静态资源请求",other_request:"其他请求"};
  function metric(label,value,detail="") {
    return '<div class="analytics-metric"><div class="muted">'+esc(label)+'</div><strong>'+esc(value)+'</strong><div class="small">'+esc(detail)+'</div></div>';
  }
  function table(headers, rows, empty) {
    if (!rows.length) return '<p class="empty">'+esc(empty)+'</p>';
    return '<div class="table-wrap"><table style="min-width:520px"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
  }
  function barRows(items,labelKey,valueKey,total) {
    if (!items.length) return '<p class="empty">暂无可用数据</p>';
    return items.map(item=>{
      const value=Number(item[valueKey]||0), width=total?Math.max(2,value/total*100):0;
      return '<div class="analytics-bar-row"><span>'+esc(item[labelKey]||"未知")+'</span><div class="analytics-bar-track"><i style="width:'+width.toFixed(1)+'%"></i></div><b>'+number(value)+'</b></div>';
    }).join("");
  }
  function render(data) {
    if (!data || !data.available) {
      $("analyticsUnavailable").textContent=data?.reason||"分析数据暂不可用。";
      $("analyticsUnavailable").hidden=false;
      return;
    }
    $("analyticsUnavailable").hidden=true;
    const t=data.totals;
    $("crawlerMetrics").innerHTML=[
      metric("近七天请求量",number(t.current_requests),delta(t.current_requests,t.previous_requests)),
      metric("真人页面访问",number(t.current_pageviews),delta(t.current_pageviews,t.previous_pageviews)),
      metric("独立访客（脱敏）",t.visitor_hash_configured?number(t.unique_visitors):"尚不可用",t.visitor_hash_configured?"按日哈希去重，不显示 IP":"需配置 ANALYTICS_HASH_SECRET"),
      metric("已验证爬虫请求",number(t.verified_crawler_requests),"Cloudflare verifiedBot 标记"),
      metric("未验证 UA 声明",number(t.unverified_claim_requests),"不作为已确认爬虫身份"),
      metric("HTTP 错误率",pct(t.error_rate),number(t.errors)+" / "+number(t.measured_requests)+" 条已记录请求")
    ].join("");
    const botRows=(data.bots||[]).map(x=>'<tr><td>'+esc(x.actor_label||"未知")+'</td><td>'+esc(({ai_claim_unverified:"AI 爬虫 UA 声明",search_claim_unverified:"搜索爬虫 UA 声明",ai_crawler:"AI 爬虫（已验证）",search_crawler:"搜索爬虫（已验证）"})[x.actor_category]||"其他")+'</td><td>'+esc(x.identity_verified?"已验证":"未验证")+'</td><td>'+number(x.total)+'</td></tr>');
    $("botTable").innerHTML=table(["UA 标识","类别","身份状态","请求量"],botRows,"近七天暂无已识别的爬虫请求");
    const trendRows=(data.trend||[]).map(x=>'<tr><td>'+esc(x.day)+'</td><td>'+number(x.pageviews)+'</td><td>'+number(x.verified_crawls)+'</td><td>'+number(x.unverified_claims)+'</td><td>'+number(x.requests)+'</td></tr>');
    $("crawlerTrend").innerHTML=table(["日期（UTC）","真人页面访问","已验证爬虫","未验证 UA 声明","总请求"],trendRows,"数据采集后将显示趋势");
    const statusRows=(data.statuses||[]).map(x=>'<tr><td>'+number(x.status)+'</td><td>'+number(x.total)+'</td></tr>');
    $("statusTable").innerHTML=table(["HTTP 状态码","请求数"],statusRows,"暂无状态码记录");
    const recentRows=(data.recent||[]).map(x=>'<tr><td>'+esc(x.event_at)+'</td><td>'+esc(x.path)+'</td><td>'+number(x.status)+'</td><td>'+esc(eventLabels[x.event_type]||x.event_type)+'</td><td>'+esc(x.actor_label||"—")+'</td><td>'+esc(x.country||"—")+'</td></tr>');
    $("recentEvents").innerHTML=table(["时间（UTC）","路径","状态","事件类型","爬虫标识","国家"],recentRows,"暂无事件记录");
    $("trafficMetrics").innerHTML=[
      metric("真人页面访问",number(t.current_pageviews),delta(t.current_pageviews,t.previous_pageviews)),
      metric("全部公开请求",number(t.current_requests),delta(t.current_requests,t.previous_requests)),
      metric("错误请求",number(t.errors),"HTTP 400 及以上"),
      metric("错误率",pct(t.error_rate),"按已记录公开请求计算")
    ].join("");
    const sourceTotal=(data.sources||[]).reduce((sum,x)=>sum+Number(x.total||0),0);
    $("sourceBars").innerHTML=barRows((data.sources||[]).map(x=>({...x,label:sourceLabels[x.category]||x.category})),"label","total",sourceTotal);
    $("topPages").innerHTML=table(["热门页面","真人页面访问"],(data.pages||[]).map(x=>'<tr><td>'+esc(x.path)+'</td><td>'+number(x.total)+'</td></tr>'),"暂无页面访问记录");
    $("countryTable").innerHTML=table(["国家/地区代码","真人页面访问"],(data.countries||[]).map(x=>'<tr><td>'+esc(x.country)+'</td><td>'+number(x.total)+'</td></tr>'),"暂无国家/地区数据");
    $("languageTable").innerHTML=table(["网站语言","真人页面访问"],(data.languages||[]).map(x=>'<tr><td>'+esc(x.language)+'</td><td>'+number(x.total)+'</td></tr>'),"暂无语言分布数据");
    $("inquirySummary").textContent=data.inquiries
      ? "近七天询盘 "+number(data.inquiries.current)+" 条；前七天 "+number(data.inquiries.previous)+" 条。"+data.inquiries.note
      : "询盘转化数据暂不可用：无法读取 D1 inquiries 表。";
    $("analyticsCoverage").textContent=data.coverage+" 数据窗口："+data.window+"；对比窗口："+data.comparison+"。";
    $("analyticsUpdated").textContent="数据刷新时间："+new Date().toLocaleString("zh-CN");
  }
  async function loadAnalytics() {
    const button=$("analyticsRefresh");
    if(button) button.disabled=true;
    $("analyticsUnavailable").hidden=false;
    $("analyticsUnavailable").textContent="正在读取网站分析数据…";
    try {
      const response=await fetch("/api/admin/analytics",{headers:{Accept:"application/json"},credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(!response.ok||!data.ok) throw new Error(data.reason||data.error||"分析数据读取失败（HTTP "+response.status+"）");
      render(data);
    } catch(error) {
      $("analyticsUnavailable").textContent=error.message;
      $("analyticsUnavailable").hidden=false;
    } finally { if(button) button.disabled=false; }
  }
  $("analyticsRefresh").addEventListener("click",loadAnalytics);
  document.querySelectorAll("[data-admin-jump]").forEach(button=>button.addEventListener("click",()=>{
    const target=$(button.dataset.adminJump);
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  loadAnalytics();
})();
/* Native DSH client module. No external assets, trackers or model credentials. */
window.__ModuleLoader__.load({
  id: 'dsh-domain-proxy',
  factory: require => {
    const React = require('react'), h = React.createElement;
    const en = {
      title:'Domain proxy', intro:'Send selected API domains through your existing local proxy.',
      domain:'API domains', proxy:'Local proxy address', advanced:'Advanced',
      subdomains:'Include subdomains', enabled:'Enable domain routing', check:'Check connection',
      save:'Save settings', refresh:'Refresh', pending:'Working…', original:'Other destinations keep their existing network route.',
      active:'Enabled for new requests', inactive:'Not enabled', conflict:'Another plugin changed the network route. Resolve the conflict before enabling.',
      draft:'Unsaved changes', saved:'Settings saved. New requests use this configuration.', failed:'Could not apply the change. Refresh and try again.',
      loading:'Loading plugin status…', route:'Routing attempts (current config)', model:'Model generation has not been tested. This check sends no credentials and uses no model quota.',
      reachable:'Proxy → target TLS/HTTP reached', unreachable:'Proxy → target could not be reached', export:'Download diagnostic report',
      note:'HTTP(S) loopback proxies only. API keys are not needed here.', env:'Existing proxy environment variables detected; other targets may already use a proxy.',
      unsupported:'This local-only page requires a supported DSH backend.', blank:'Enter at least one API hostname. Use one hostname per row.'
    };
    const zh = {
      title:'域名代理', intro:'让指定 API 域名使用已有的本机代理。',
      domain:'API 域名', proxy:'本机代理地址', advanced:'高级设置',
      subdomains:'包含子域名', enabled:'启用域名分流', check:'检查连接',
      save:'保存设置', refresh:'刷新', pending:'处理中…', original:'其他目标沿用原有网络路径。',
      active:'已对新请求启用', inactive:'尚未启用', conflict:'其他插件改变了网络分发器，请先处理冲突再启用。',
      draft:'有未保存的修改', saved:'设置已保存，新请求使用此配置。', failed:'修改未能完成，请刷新后重试。',
      loading:'正在读取插件状态…', route:'本次配置的代理分流尝试次数', model:'尚未测试模型生成。本次检查不发送密钥，也不消耗模型额度。',
      reachable:'已通过代理到达目标 TLS/HTTP', unreachable:'未能通过代理到达目标', export:'下载诊断报告',
      note:'支持 HTTP(S) 环回代理地址；这里无需填写 API Key。', env:'检测到已有代理环境变量，其他目标可能已使用代理。',
      unsupported:'此页面需要受支持的本机 DSH 后端。', blank:'至少填写一个 API 域名，每行填写一个主机名。'
    };
    const panel = {maxWidth:720,padding:'20px 8px',display:'grid',gap:20,color:'var(--dsw-alias-label-primary, inherit)'};
    const input = {width:'100%',boxSizing:'border-box',padding:'10px 12px',border:'1px solid #8995a455',borderRadius:8,fontSize:14,background:'transparent',color:'inherit'};
    const button = {padding:'9px 15px',border:'1px solid #8995a455',borderRadius:8,whiteSpace:'nowrap',flexShrink:0,cursor:'pointer',background:'transparent',color:'inherit',fontSize:14};
    async function request(body) {
      const response = await fetch('/domain-proxy/api',{method:body?'POST':'GET',headers:{'x-dsh-domain-proxy':'1',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      const value = await response.json();
      if (!response.ok) throw new Error(value.message || value.error || 'REQUEST_FAILED');
      return value;
    }
    function ObservationView({chinese,history,kind,refresh,busy,clear}) {
      const tr=(zh,en)=>chinese?zh:en, value=(x,suffix='')=>x===null||x===undefined?tr('未知','Unknown'):Number(x).toFixed(2)+suffix;
      const status={running:tr('进行中','Running'),completed:tr('完成','Completed'),aborted:tr('已取消','Aborted'),failed:tr('失败','Failed'),incomplete:tr('未完整结束','Incomplete')};
      return h('section',{style:{display:'grid',gap:12}},
        h('h3',null,kind==='routes'?tr('查看实际路径','Actual routes'):tr('查看最近表现','Recent performance')),
        h('p',null,tr('仅在开启记录后观察正常模型调用，不主动发送测速请求。最近 100 次元数据只保存在内存；关闭记录、清空或重启后删除。','Observes normal model calls only after recording is enabled. No benchmark requests. Last 100 metadata records stay in memory until disabled, cleared or restarted.')),
        h('p',{role:'status'},history?.enabled?tr('记录已开启','Recording enabled'):tr('记录未开启。请到配置中勾选“记录最近调用”并保存。','Recording is off. Enable “Record recent calls” in configuration and save.')),
        h('div',{style:{display:'flex',gap:8}},
          h('button',{style:button,disabled:busy,onClick:refresh},tr('刷新记录','Refresh records')),
          h('button',{style:button,disabled:busy||!history?.records?.length,onClick:clear},tr('清空记录','Clear records'))),
        h('small',null,kind==='routes'
          ?tr('“已交给代理”证明插件执行了分发，不证明出口节点或服务成功。“原有路径”不等于直连；未观察到不能推断直连。','Proxy dispatch proves this plugin selected its proxy, not the exit node or service success. Original route is not necessarily direct. Unobserved does not mean direct.')
          :tr('首内容包括文本、推理或工具参数。生成速度使用内容块起止跨度；总耗时为单次模型调用，不含工具执行。均为客户端观察，可能包含消费等待。HTTP 分发次数不是重试次数；重试暂显示未知。','First content includes text, reasoning or tool arguments. Generation speed uses block-start to block-end; total time covers one model call, excluding tools. Client-side timing may include consumer delays. Dispatch count is not retry count; retries remain unknown.')),
        !history?.records?.length?h('p',null,tr('还没有记录。开启后发送一条普通模型消息，再刷新此页。','No records. Enable recording, send a normal model message, then refresh.')):null,
        ...(history?.records??[]).map(row=>h('details',{key:row.id,style:{border:'1px solid #8995a455',borderRadius:8,padding:12}},
          h('summary',{style:{cursor:'pointer'}},new Date(row.startedAt).toLocaleTimeString()+' · '+row.provider+' / '+row.model+' · '+(status[row.status]??row.status)+' · '+tr('配置 #','Config #')+row.generation),
          kind==='routes'?h('div',null,
            h('p',null,tr('实际分发次数：','Observed dispatches: ')+row.dispatchCount),
            !row.routes.length?h('p',null,tr('未观察到覆盖范围内的网络分发。可能未启用分流、请求在发出前失败，或 SDK 使用其他传输接口。','No covered dispatch observed: routing may be off, the call may fail before dispatch, or the SDK may use another transport.')):null,
            ...row.routes.map((r,i)=>h('div',{key:i,style:{marginTop:8}},
              h('strong',null,r.host),
              h('p',null,tr('当时匹配规则：','Matched rule: ')+(r.matchedRule??tr('无','None'))+' · '+tr('配置 #','Config #')+r.generation),
              h('p',null,r.path==='proxy-dispatch'?tr('已交给代理：','Dispatched to proxy: ')+r.proxy:tr('已交回原有分发器；是否代理未知','Returned to original dispatcher; proxy usage unknown')))),
            row.routesTruncated?h('p',null,tr('仅保留前 16 条路径。','Only the first 16 dispatch paths are retained.')):null
          ):h('div',{style:{display:'grid',gap:6,marginTop:12}},
            ...[
              [tr('首内容等待','First content wait'),value(row.ttfcMs===null?null:row.ttfcMs/1000,' s')],
              [tr('生成速度','Generation speed'),value(row.streamTps,' tok/s')],
              [tr('单次调用总耗时','Call duration'),value(row.totalMs===null?null:row.totalMs/1000,' s')],
              [tr('调用端到端速度','Call end-to-end speed'),value(row.endToEndTps,' tok/s')],
              [tr('最长内容间隔','Longest content gap'),value(row.maxContentGapMs===null?null:row.maxContentGapMs/1000,' s')],
              [tr('输出 token','Output tokens'),row.outputTokens??tr('未知','Unknown')],
              [tr('未缓存输入 token','Uncached input tokens'),row.inputTokens??tr('未知','Unknown')],
              [tr('缓存读取 token','Cache read tokens'),row.cacheReadTokens??tr('未知','Unknown')],
              [tr('重试次数','Retries'),tr('未知','Unknown')],
            ].map(([k,v])=>h('div',{key:k},k+': '+v)),
            h('small',null,tr('用量来源：','Usage source: ')+row.usageSource)),
          row.finishReason==='max-tokens'?h('p',null,tr('达到输出上限，回答可能未完成。','Output limit reached; the answer may be incomplete.')):null,
          row.errorCode?h('p',null,tr('错误分类：','Error category: ')+row.errorCode):null)));
    }
    function Page() {
      const [chinese,setChinese]=React.useState(navigator.language.toLowerCase().startsWith('zh'));
      const t=chinese?zh:en;
      const instance=React.useRef({});
      const [providerHost,setProviderHost]=React.useState(''),[catalog,setCatalog]=React.useState(null);
      const [view,setView]=React.useState('config'),[history,setHistory]=React.useState(null);
      const [state,setState]=React.useState(null),[draft,setDraft]=React.useState(null),[hosts,setHosts]=React.useState([]);
      const [busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[report,setReport]=React.useState(null);
      const load=async()=>{setBusy(true);setMessage('');try{const s=await request();setState(s);setHistory(s.observation);setCatalog(s.providers);setDraft(s.config);setHosts(s.config.domains);}catch{setMessage(t.unsupported);}finally{setBusy(false);}};
      React.useEffect(()=>{void load();},[]);
      const prepared=()=>({...draft,domains:hosts.map(x=>x.trim()).filter(Boolean)});
      const dirty=state&&draft&&JSON.stringify(prepared())!==JSON.stringify(state.config);
      React.useEffect(()=>{
        const changed=event=>{
          if(event.detail===instance.current)return;
          if(dirty)setMessage(chinese?'另一入口更新了配置，请刷新后重新编辑。':'Configuration changed in another view. Refresh before editing.');
          else void load();
        };
        window.addEventListener('dsh-domain-proxy:saved',changed);
        return ()=>window.removeEventListener('dsh-domain-proxy:saved',changed);
      },[dirty,chinese]);
      const action=async(kind)=>{
        if(!prepared().domains.length&&(kind==='check'||draft.enabled)){setMessage(t.blank);return;}
        setBusy(true);setMessage('');
        try{
          if(kind==='check'){
            setReport([]);
            for (const host of [...new Set(prepared().domains)]) {
              const result=await request({action:'check',config:{...prepared(),domains:[host]}});
              setReport(previous=>[...(previous||[]),result.report]);
            }
          }
          else {const s=await request({action:'save',config:prepared(),revision:state.revision});setState(s);setHistory(s.observation);setCatalog(s.providers);setDraft(s.config);setHosts(s.config.domains);setMessage(t.saved);setReport(null);window.dispatchEvent(new CustomEvent('dsh-domain-proxy:saved',{detail:instance.current}));}
        }catch(e){setMessage(t.failed+' '+e.message);}finally{setBusy(false);}
      };
      const refreshHistory=async(clear=false)=>{
        setBusy(true);setMessage('');
        try{const s=await request(clear?{action:'clear-records'}:undefined);setHistory(s.observation);}
        catch{setMessage(chinese?'读取记录失败，请重试。':'Could not read records. Retry.');}
        finally{setBusy(false);}
      };
      const download=()=>{
        const blob=new Blob([JSON.stringify({runtime:{active:state.active,conflict:state.conflict,config:state.config,counts:state.counts},transport:report},null,2)],{type:'application/json'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dsh-domain-proxy-diagnostic.json';a.click();URL.revokeObjectURL(url);
      };
      return h('section',{style:panel},
        h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center'}},h('h2',{style:{margin:0}},t.title),h('button',{style:button,onClick:()=>setChinese(!chinese)},chinese?'English':'中文')),
        h('p',{style:{margin:0,opacity:.75}},t.intro),
        h('nav',{'aria-label':chinese?'插件功能':'Plugin views',style:{display:'flex',gap:8,flexWrap:'wrap'}},
          ...[['config',chinese?'配置':'Configuration'],['routes',chinese?'查看实际路径':'Actual routes'],['performance',chinese?'查看最近表现':'Recent performance']].map(([key,label])=>
            h('button',{key,style:{...button,background:view===key?'#2169bc':'transparent',color:view===key?'white':'inherit'},'aria-pressed':view===key,onClick:()=>{setView(key);if(key!=='config')void refreshHistory();}},label))),
        view!=='config'?h(React.Fragment,null,h(ObservationView,{chinese,history,kind:view,busy,refresh:()=>refreshHistory(),clear:()=>refreshHistory(true)}),h('p',{role:'status'},message)):
        !state?h('div',{role:'status'},message||t.loading):h(React.Fragment,null,
          h('div',{role:'status',style:{padding:12,borderRadius:8,background:state.conflict?'#b33a2718':'#287db818'}},state.conflict?t.conflict:state.active?t.active:t.inactive,
            h('div',{style:{fontSize:12,marginTop:6}},(state.observedAt ? (chinese?'状态更新于 ':'Status observed at ')+new Date(state.observedAt).toLocaleTimeString()+' · ' : '')+(chinese?'域名数：':'Hosts: ')+state.config.domains.length+' · '+(chinese?'代理：':'Proxy: ')+state.config.proxyUrl+' · '+t.route+': '+state.counts.proxyAttempts+' · '+t.original)),
          state.ambientProxyVariables.length?h('p',{style:{fontSize:13}},t.env+' '+state.ambientProxyVariables.join(', ')):null,
          h('fieldset',{style:{border:0,padding:0,margin:0,display:'grid',gap:8}},
            h('legend',null,chinese?'从已配置 provider 添加域名':'Add a domain from configured providers'),
            h('select',{'aria-label':chinese?'Provider 域名':'Provider domain',style:input,value:providerHost,disabled:busy,onChange:e=>setProviderHost(e.target.value)},
              h('option',{value:''},chinese?'选择 provider / API 域名':'Select provider / API hostname'),
              ...(catalog?.items??[]).flatMap(item=>item.hosts.length
                ?item.hosts.map(x=>h('option',{key:item.provider+'|'+x.host,value:JSON.stringify([item.provider,x.host])},item.label+' — '+x.host+(x.source==='catalog-default'?(chinese?'（目录默认值）':' (catalog default)'):'')))
                :[h('option',{key:item.provider,disabled:true,value:item.provider+'|'},item.label+(chinese?' — 无法提取域名，请手动添加':' — hostname unavailable; add manually'))])),
            h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              h('button',{style:button,disabled:busy||!providerHost,onClick:()=>{
                const host=JSON.parse(providerHost)[1];
                if(!host)return;
                if(!hosts.some(x=>x.trim().toLowerCase().replace(/\.$/,'')===host)){
                  if(hosts.filter(x=>x.trim()).length>=32){setMessage(chinese?'最多添加 32 个域名。':'Up to 32 domains.');return;}
                  setHosts([...hosts.filter(x=>x.trim()),host]);setReport(null);
                }
                setProviderHost('');
                setMessage(chinese?'已加入待保存列表。同一域名上的所有 provider 请求共用此规则；不会修改 provider 配置。':'Added to draft. All providers on the same hostname share this rule. Provider settings are unchanged.');
              }},chinese?'添加所选域名':'Add selected domain'),
              h('button',{style:button,disabled:busy,onClick:async()=>{
                setBusy(true);try{const s=await request();setCatalog(s.providers);setProviderHost('');}catch{setMessage(chinese?'读取 provider 失败。':'Could not read providers.');}finally{setBusy(false);}
              }},chinese?'刷新 provider 列表':'Refresh provider list')),
            h('small',null,chinese?'从当前配置提取主机名，不复制 API Key。选择后仍需保存；provider 地址变化不会自动改写已保存规则。':'Extracts hostnames without copying API keys. Save to apply; later provider endpoint changes do not rewrite saved rules.'),
            !catalog?.available?h('p',null,chinese?'当前宿主未提供可读取的 provider 目录，可手动添加域名。':'Provider directory is unavailable; add domains manually.'):!catalog.items.length?h('p',null,chinese?'尚未找到已配置的 provider，可先在 Models 中配置，或手动添加域名。':'No configured providers found. Configure Models first, or add a domain manually.'):null),
          h('fieldset',{style:{border:0,padding:0,margin:0,display:'grid',gap:8}},
            h('legend',null,t.domain),
            hosts.map((host,index)=>h('div',{key:index,style:{display:'flex',gap:8}},
              h('input',{'aria-label':t.domain+' '+(index+1),style:input,value:host,disabled:busy,placeholder:'api.example.com',onChange:e=>{setHosts(hosts.map((x,i)=>i===index?e.target.value:x));setReport(null);}}),
              h('button',{style:button,disabled:busy||hosts.length===1,'aria-label':(chinese?'删除域名 ':'Remove domain ')+(index+1),onClick:()=>{setHosts(hosts.filter((_,i)=>i!==index));setReport(null);}},chinese?'删除':'Remove'))),
            h('button',{style:{...button,justifySelf:'start'},disabled:busy||hosts.length>=32,onClick:()=>setHosts([...hosts,''])},chinese?'手动添加域名':'Add domain manually'),
            h('small',null,chinese?'每行一个域名，不带 https://、端口或路径。最多 32 个；所有域名共用下方代理地址。':'One hostname per row, without scheme, port or path. Up to 32 hosts share the proxy below.')),

          h('label',{htmlFor:'dp-proxy'},t.proxy,h('input',{id:'dp-proxy',style:{...input,marginTop:8},value:draft.proxyUrl,disabled:busy,onChange:e=>{setDraft({...draft,proxyUrl:e.target.value});setReport(null);}})),
          h('small',null,t.note),
          h('p',{style:{fontSize:13,margin:0}},chinese?'出口节点在 FlClash / Clash 等代理软件的规则与策略组中选择。这里的端口是本机入口，不代表香港或其他节点；未匹配域名沿用原有网络路径。':'Choose exit nodes in your proxy app’s rules and policy groups. This port is a local listener, not a region. Other hosts keep their existing network route.'),
          h('details',null,h('summary',null,t.advanced),h('label',{style:{display:'block',marginTop:12}},h('input',{type:'checkbox',checked:draft.includeSubdomains,disabled:busy,onChange:e=>{setDraft({...draft,includeSubdomains:e.target.checked});setReport(null);}}),' '+t.subdomains),h('small',{style:{display:'block',marginTop:8}},chinese?'此开关作用于所有域名；包含域名本身及其子域名，不匹配形似域名。':'Applies to every listed host and its subdomains, with dot-boundary matching.')),
          h('label',null,h('input',{type:'checkbox',checked:draft.enabled,disabled:busy,onChange:e=>setDraft({...draft,enabled:e.target.checked})}),' '+t.enabled),
          h('label',null,h('input',{type:'checkbox',checked:draft.recording??false,disabled:busy,onChange:e=>setDraft({...draft,recording:e.target.checked})}),chinese?' 记录最近调用（仅内存元数据）':' Record recent calls (in-memory metadata only)'),
          h('small',null,chinese?'不保存提示词、回答、密钥或 URL 路径。关闭后清空记录。观察开关不改变分流规则。':'No prompts, answers, keys or URL paths are stored. Disabling clears records without changing routing.'),
          h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
            h('button',{style:button,disabled:busy,onClick:()=>action('check')},busy?t.pending:t.check),
            h('button',{style:{...button,background:'#2169bc',color:'white'},disabled:busy||!dirty,onClick:()=>action('save')},t.save),
            h('button',{style:button,disabled:busy,onClick:load},t.refresh)),
          h('div',{'aria-live':'polite',role:'status'},message||(dirty?t.draft:'')),
          report?h('div',{style:{border:'1px solid #8995a455',borderRadius:8,padding:16}},
            h('p',null,t.model),
            report.map(item=>h('div',{key:item.target,style:{padding:'10px 0',borderBottom:'1px solid #8995a433'}},
              h('strong',null,item.target+' — '+(item.transport==='reachable'?t.reachable:t.unreachable)),
              h('p',null,item.elapsedMs+' ms · '+(item.httpStatus?'HTTP '+item.httpStatus:item.code)))),
            busy?h('p',{role:'status'},chinese?'正在逐项检查…':'Checking hosts in sequence…'):null,
            h('button',{style:button,disabled:busy,onClick:download},t.export)):null

        ));
    }
    return {name:'domain-proxy-client',inject:['slots'],apply(ctx) {
      ctx.slots.inject('plugins.bundle.config',()=>ctx.slots.register({name:'plugins.bundle.config',key:'dsh-domain-proxy'},()=>h(Page)));
      ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'domain-proxy',order:36,label:()=> 'Domain proxy / 域名代理'},()=>h(Page)));
    }};
  }
});

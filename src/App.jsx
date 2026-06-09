<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#1D9E75">
<title>CK発注システム - たくあんグループ</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --green:#1D9E75;--green-dark:#0F6E56;--green-light:#E1F5EE;--green-mid:#9FE1CB;
  --blue:#378ADD;--blue-light:#E6F1FB;--blue-dark:#042C53;
  --orange:#EF9F27;--orange-light:#FAEEDA;--orange-dark:#633806;
  --gray:#888780;--gray-light:#F1EFE8;--gray-dark:#444441;
  --text:#2C2C2A;--muted:#5F5E5A;--hint:#B4B2A9;
  --border:#D3D1C7;--surface:#F8F7F4;
  --r:12px;--rs:8px;
  --safe-bottom:env(safe-area-inset-bottom,0px);
}
html{height:100%;-webkit-text-size-adjust:100%}
body{font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic UI',
  'Noto Sans JP',sans-serif;background:#EDE9E3;color:var(--text);
  min-height:100vh;font-size:16px;line-height:1.5;
  -webkit-font-smoothing:antialiased}

/* ── SHELL ── */
.app{display:flex;flex-direction:column;min-height:100vh;
  max-width:520px;margin:0 auto;background:#fff;
  box-shadow:0 0 0 1px rgba(0,0,0,.06)}
.topbar{background:#fff;border-bottom:1px solid var(--border);
  padding:12px 16px;display:flex;align-items:center;gap:10px;
  position:sticky;top:0;z-index:100}
.topbar-title{font-size:17px;font-weight:600;flex:1;line-height:1.2}
.topbar-sub{font-size:12px;color:var(--muted);margin-top:1px}
.content{flex:1;padding-bottom:calc(72px + var(--safe-bottom))}
.bottom-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:520px;background:#fff;border-top:1px solid var(--border);
  display:flex;z-index:100;
  padding-bottom:var(--safe-bottom)}
.nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:10px 4px;cursor:pointer;color:var(--hint);font-size:11px;
  border:none;background:none;transition:color .15s;
  min-height:56px;justify-content:center}
.nav-btn.on{color:var(--green)}
.nav-btn i{font-size:24px}

/* ── LOGIN ── */
.login-page{display:flex;flex-direction:column;align-items:center;
  min-height:100vh;padding:48px 20px 32px;
  background:linear-gradient(160deg,var(--green-light) 0%,#EDE9E3 50%)}
.logo-box{width:80px;height:80px;background:var(--green);border-radius:22px;
  display:flex;align-items:center;justify-content:center;margin-bottom:20px}
.logo-box i{font-size:44px;color:#fff}
.login-h1{font-size:22px;font-weight:600;margin-bottom:4px;text-align:center}
.login-sub{font-size:14px;color:var(--muted);margin-bottom:32px;text-align:center}
.login-card{background:#fff;border-radius:var(--r);border:1px solid var(--border);
  padding:20px;width:100%;max-width:380px}
.slabel{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;
  letter-spacing:.6px;margin-bottom:10px;display:block}
.role-btn{width:100%;padding:14px;border:1.5px solid var(--border);border-radius:var(--rs);
  cursor:pointer;background:#fff;text-align:left;margin-bottom:10px;
  display:flex;align-items:center;gap:14px;transition:all .15s;
  -webkit-appearance:none}
.role-btn:active{transform:scale(.99)}
.role-btn.sel{border-color:var(--green);background:var(--green-light)}
.role-icon{width:44px;height:44px;border-radius:10px;display:flex;align-items:center;
  justify-content:center;font-size:22px;flex-shrink:0}
.role-name{font-size:15px;font-weight:600}
.role-desc{font-size:13px;color:var(--muted);margin-top:2px}
.form-sel{width:100%;padding:14px;border:1.5px solid var(--border);border-radius:var(--rs);
  font-size:16px;color:var(--text);background:#fff;outline:none;
  -webkit-appearance:none;appearance:none;margin-bottom:14px;cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888780' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 14px center;padding-right:40px}
.form-sel:focus{border-color:var(--green)}

/* ── BUTTONS ── */
.btn{display:flex;align-items:center;justify-content:center;gap:8px;
  padding:15px 20px;border-radius:var(--rs);font-size:16px;font-weight:600;
  cursor:pointer;border:none;width:100%;transition:all .15s;
  line-height:1;-webkit-appearance:none;user-select:none}
.btn:active{transform:scale(.98)}
.btn-green{background:var(--green);color:#fff}
.btn-green:active{background:var(--green-dark)}
.btn-green:disabled{opacity:.5;transform:none;cursor:not-allowed}
.btn-outline{background:#fff;color:var(--green);border:1.5px solid var(--green)}
.btn-outline:active{background:var(--green-light)}
.btn-gray{background:#fff;color:var(--muted);border:1.5px solid var(--border)}
.btn-gray:active{background:var(--surface)}
.btn-blue{background:#fff;color:var(--blue);border:1.5px solid var(--blue)}
.btn-blue:active{background:var(--blue-light)}
.btn-sm{padding:9px 13px;font-size:13px;width:auto;border-radius:6px;font-weight:500}

/* ── LOADING OVERLAY ── */
.loading-overlay{position:fixed;inset:0;background:rgba(255,255,255,.85);
  z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.spinner{width:36px;height:36px;border:3px solid var(--green-light);
  border-top-color:var(--green);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-text{font-size:14px;color:var(--muted)}

/* ── CARDS & SECTIONS ── */
.card{background:#fff;border-radius:var(--r);border:1px solid var(--border);
  margin:10px 12px;overflow:hidden}
.card-head{padding:14px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:10px}
.card-title{font-size:15px;font-weight:600;flex:1}
.section-label{font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;
  letter-spacing:.6px;padding:14px 16px 4px}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;gap:4px;border-radius:20px;
  padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap}
.b-ok{background:var(--green-light);color:var(--green-dark)}
.b-none{background:var(--blue-light);color:var(--blue-dark)}
.b-unconfirmed{background:var(--gray-light);color:var(--gray-dark)}
.b-late{background:var(--orange-light);color:var(--orange-dark)}
.b-shipped{background:#EAF3DE;color:#173404}

/* ── ALERTS ── */
.alert{border-radius:var(--rs);padding:12px 14px;display:flex;gap:9px;
  margin:8px 12px;font-size:14px;align-items:flex-start;border:1px solid}
.alert i{font-size:18px;flex-shrink:0;margin-top:1px}
.a-ok{background:var(--green-light);color:var(--green-dark);border-color:var(--green-mid)}
.a-warn{background:var(--orange-light);color:var(--orange-dark);border-color:#FAC775}
.a-info{background:var(--blue-light);color:var(--blue-dark);border-color:#B5D4F4}
.a-danger{background:#FCEBEB;color:#791F1F;border-color:#F7C1C1}
.a-gray{background:var(--gray-light);color:var(--gray-dark);border-color:var(--border)}

/* ── STATUS BAR ── */
.status-bar{margin:0 12px 12px;padding:16px;background:var(--surface);
  border-radius:var(--rs);display:flex;align-items:center;gap:12px;
  border:1px solid var(--border)}
.dot-lg{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.status-text{font-size:15px;font-weight:600;flex:1}
.status-time{font-size:12px;color:var(--muted);margin-top:2px}

/* ── STORE ROW ── */
.store-row{display:flex;align-items:center;gap:12px;padding:14px 16px;
  border-bottom:1px solid var(--border);cursor:pointer;
  transition:background .1s}
.store-row:last-child{border-bottom:none}
.store-row:active{background:var(--surface)}
.store-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.store-name{font-size:15px;font-weight:600}
.store-sub{font-size:12px;color:var(--muted);margin-top:2px}

/* ── PRODUCTS ── */
.cat-header{padding:10px 16px;background:var(--surface);display:flex;align-items:center;
  gap:8px;cursor:pointer;user-select:none;border-bottom:1px solid var(--border);
  min-height:48px}
.cat-name{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;
  letter-spacing:.5px;flex:1}
.cat-filled{font-size:12px;color:var(--green);font-weight:600}
.product-item{padding:13px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:10px;transition:background .1s}
.product-item:last-child{border-bottom:none}
.product-item.filled{background:#FAFFFD}
.prod-name{font-size:15px;font-weight:500}
.prod-unit{font-size:12px;color:var(--hint);margin-top:3px}

/* ── QTY CONTROL ── */
.qty-ctrl{display:flex;align-items:center;border:1.5px solid var(--border);
  border-radius:var(--rs);overflow:hidden;flex-shrink:0}
.qty-btn{width:48px;height:48px;border:none;background:var(--surface);font-size:22px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--muted);font-weight:400;transition:background .1s;
  -webkit-appearance:none;flex-shrink:0}
.qty-btn:active{background:var(--border)}
.qty-btn.p{color:var(--green);background:var(--green-light)}
.qty-btn.p:active{background:var(--green-mid)}
.qty-inp{border:none;text-align:center;font-size:17px;font-weight:600;width:56px;
  padding:0;background:#fff;color:var(--text);outline:none;
  -moz-appearance:textfield}
.qty-inp::-webkit-inner-spin-button,.qty-inp::-webkit-outer-spin-button{-webkit-appearance:none}

/* ── TABS ── */
.tabs{display:flex;border-bottom:1px solid var(--border);background:#fff;
  position:sticky;top:64px;z-index:50}
.tab{flex:1;padding:12px 4px;text-align:center;font-size:13px;font-weight:600;
  color:var(--hint);cursor:pointer;border-bottom:2.5px solid transparent;
  transition:all .15s}
.tab.on{color:var(--green);border-bottom-color:var(--green)}

/* ── FORM ── */
.form-group{padding:0 12px;margin-bottom:12px}
.form-label{font-size:13px;font-weight:600;color:var(--muted);margin-bottom:7px;display:block}
.form-input{width:100%;padding:13px 14px;border:1.5px solid var(--border);border-radius:var(--rs);
  font-size:16px;color:var(--text);background:#fff;outline:none;transition:border-color .15s;
  -webkit-appearance:none}
.form-input:focus{border-color:var(--green)}
textarea.form-input{resize:none;font-family:inherit}

/* ── CHECK ROW ── */
.check-row{display:flex;align-items:center;gap:12px;padding:13px 16px;
  border-bottom:1px solid var(--border)}
.check-row:last-child{border-bottom:none}
.checkbox{width:30px;height:30px;border-radius:6px;border:2px solid var(--border);
  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.checkbox.on{background:var(--green);border-color:var(--green);color:#fff}
.check-label{flex:1;font-size:14px}

/* ── SUMMARY ── */
.sum-row{display:flex;align-items:center;padding:11px 16px;
  border-bottom:1px solid var(--border);gap:10px}
.sum-row:last-child{border-bottom:none}
.sum-name{flex:1;font-size:15px}
.sum-qty{font-size:15px;font-weight:600;color:var(--green);white-space:nowrap}

/* ── STATS ── */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px 12px 4px}
.stat-c{background:var(--surface);border-radius:var(--rs);padding:13px 14px;
  border:1px solid var(--border)}
.stat-lbl{font-size:12px;color:var(--muted);margin-bottom:4px;font-weight:500}
.stat-val{font-size:24px;font-weight:700}

/* ── SHEET OVERLAY ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;
  display:flex;align-items:flex-end}
.sheet{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:520px;
  margin:0 auto;max-height:90vh;overflow-y:auto;
  padding-bottom:calc(24px + var(--safe-bottom));animation:su .22s ease}
@keyframes su{from{transform:translateY(100%)}to{transform:translateY(0)}}
.sheet-head{padding:16px;display:flex;align-items:center;border-bottom:1px solid var(--border);
  position:sticky;top:0;background:#fff;z-index:10}
.sheet-title{font-size:18px;font-weight:600;flex:1}
.close-btn{border:none;background:none;font-size:26px;color:var(--hint);cursor:pointer;
  width:40px;height:40px;display:flex;align-items:center;justify-content:center;
  border-radius:50%;transition:background .1s}
.close-btn:active{background:var(--surface)}

/* ── SUCCESS ── */
.success-wrap{display:flex;flex-direction:column;align-items:center;
  padding:48px 24px 32px;text-align:center}
.success-icon{width:88px;height:88px;border-radius:50%;display:flex;
  align-items:center;justify-content:center;margin-bottom:20px}
.success-h{font-size:24px;font-weight:700;margin-bottom:8px}

/* ── HISTORY ITEM ── */
.hist-item{display:flex;align-items:center;padding:14px 16px;
  border-bottom:1px solid var(--border);gap:12px}
.hist-item:last-child{border-bottom:none}

/* ── TOAST ── */
.toast{position:fixed;bottom:calc(80px + var(--safe-bottom));left:50%;
  transform:translateX(-50%);background:#2C2C2A;color:#fff;
  padding:10px 20px;border-radius:20px;font-size:14px;font-weight:500;
  z-index:300;pointer-events:none;opacity:0;transition:opacity .3s;white-space:nowrap}
.toast.show{opacity:1}

/* ── UTILS ── */
.divider{height:8px;background:var(--surface)}
.mt8{margin-top:8px}.mt12{margin-top:12px}.mt16{margin-top:16px}
.px12{padding:0 12px}
.flex-col{display:flex;flex-direction:column}
.gap8{gap:8px}.gap10{gap:10px}

/* ── DESKTOP LAYOUT (520px+) ── */
@media(min-width:560px){
  body{background:#d8d4ce}
  .app{margin:24px auto;border-radius:16px;min-height:calc(100vh - 48px)}
  .bottom-nav{border-radius:0 0 16px 16px;left:auto;transform:none;
    position:sticky;bottom:0}
  .content{max-height:calc(100vh - 160px);overflow-y:auto}
  .tabs{top:66px}
}
</style>
</head>
<body>
<div id="root"></div>
<div class="toast" id="toast"></div>

<script>
'use strict';

/* ════════════════════════════════════════
   MASTER DATA
════════════════════════════════════════ */
const STORES=[
  {id:1,name:'うどん屋たくあん',  short:'うどん屋',  manager:'店長A',deadline:'10:00'},
  {id:2,name:'お弁当たくあん',    short:'お弁当',    manager:'店長B',deadline:'10:00'},
  {id:3,name:'幸せや坂戸店',      short:'幸せや坂戸',manager:'店長C',deadline:'09:30'},
  {id:4,name:'幸せや今渡店',      short:'幸せや今渡',manager:'店長D',deadline:'09:30'},
  {id:5,name:'幸せや則武店',      short:'幸せや則武',manager:'店長E',deadline:'10:00'},
  {id:6,name:'アーラ店',          short:'アーラ',    manager:'店長F',deadline:'10:00'},
];
const CATS=[
  {id:'meat',  name:'肉類',      icon:'ti-meat'},
  {id:'veg',   name:'野菜・果物',icon:'ti-plant'},
  {id:'rice',  name:'米・ご飯類',icon:'ti-bowl-spoon'},
  {id:'frozen',name:'冷凍品',    icon:'ti-snowflake'},
  {id:'sauce', name:'調味料',    icon:'ti-bottle'},
  {id:'supply',name:'備品・消耗品',icon:'ti-tool'},
];
const PRODUCTS=[
  {id:1, name:'ヒレカツ肉',           cat:'meat',  unit:'kg', min:0.5,freq:true },
  {id:2, name:'ロースカツ肉',         cat:'meat',  unit:'kg', min:0.5,freq:true },
  {id:3, name:'鶏もも肉',             cat:'meat',  unit:'kg', min:1,  freq:true },
  {id:4, name:'豚バラ肉',             cat:'meat',  unit:'kg', min:0.5,freq:false},
  {id:5, name:'キャベツ',             cat:'veg',   unit:'玉', min:1,  freq:true },
  {id:6, name:'レタス',               cat:'veg',   unit:'玉', min:1,  freq:true },
  {id:7, name:'玉ねぎ',               cat:'veg',   unit:'個', min:5,  freq:true },
  {id:8, name:'トマト',               cat:'veg',   unit:'個', min:5,  freq:false},
  {id:9, name:'白米',                 cat:'rice',  unit:'kg', min:1,  freq:true },
  {id:10,name:'パン粉',               cat:'rice',  unit:'袋', min:1,  freq:true },
  {id:11,name:'エビフライ（冷凍）',   cat:'frozen',unit:'袋', min:1,  freq:true },
  {id:12,name:'コーンフライ（冷凍）', cat:'frozen',unit:'袋', min:1,  freq:false},
  {id:13,name:'醤油',                 cat:'sauce', unit:'本', min:1,  freq:true },
  {id:14,name:'ソース',               cat:'sauce', unit:'本', min:1,  freq:true },
  {id:15,name:'油',                   cat:'sauce', unit:'缶', min:1,  freq:true },
  {id:16,name:'割り箸',               cat:'supply',unit:'袋', min:1,  freq:true },
  {id:17,name:'テイクアウト容器（M）',cat:'supply',unit:'個', min:10, freq:true },
  {id:18,name:'手袋（S）',            cat:'supply',unit:'箱', min:1,  freq:false},
];

/* ── デモ用サンプル発注データ ── */
const SAMPLE_ORDERS=[
  {store:1,product:'ヒレカツ肉',unit:'kg',qty:3,cat:'meat'},
  {store:1,product:'キャベツ',unit:'玉',qty:5,cat:'veg'},
  {store:1,product:'白米',unit:'kg',qty:10,cat:'rice'},
  {store:1,product:'醤油',unit:'本',qty:2,cat:'sauce'},
  {store:1,product:'割り箸',unit:'袋',qty:3,cat:'supply'},
  {store:1,product:'エビフライ（冷凍）',unit:'袋',qty:2,cat:'frozen'},
  {store:3,product:'ヒレカツ肉',unit:'kg',qty:2,cat:'meat'},
  {store:3,product:'鶏もも肉',unit:'kg',qty:3,cat:'meat'},
  {store:3,product:'玉ねぎ',unit:'個',qty:10,cat:'veg'},
  {store:3,product:'白米',unit:'kg',qty:8,cat:'rice'},
  {store:4,product:'ロースカツ肉',unit:'kg',qty:4,cat:'meat'},
  {store:4,product:'エビフライ（冷凍）',unit:'袋',qty:2,cat:'frozen'},
  {store:4,product:'キャベツ',unit:'玉',qty:6,cat:'veg'},
  {store:4,product:'テイクアウト容器（M）',unit:'個',qty:30,cat:'supply'},
  {store:4,product:'醤油',unit:'本',qty:1,cat:'sauce'},
  {store:4,product:'ソース',unit:'本',qty:2,cat:'sauce'},
  {store:4,product:'白米',unit:'kg',qty:12,cat:'rice'},
];

/* ── 前回発注テンプレート ── */
const LAST_ORDER_TEMPLATE={1:2,2:1.5,3:3,5:5,6:3,9:10,10:2,11:2,13:1,14:1,16:1,17:20};

/* ════════════════════════════════════════
   STORAGE LAYER
   localStorage + sessionStorage の二重保存で消えにくく
════════════════════════════════════════ */
const LS_KEY='takuan_ck_v3';

function saveState(){
  try{
    const payload=JSON.stringify({
      storeStatus:S.storeStatus,
      qty:S.qty,
      memo:S.memo,
      ckChecked:S.ckChecked,
      savedAt:Date.now()
    });
    localStorage.setItem(LS_KEY,payload);
    sessionStorage.setItem(LS_KEY,payload);
  }catch(e){/* quota超過時は無視 */}
}

function loadStoredState(){
  try{
    const raw=localStorage.getItem(LS_KEY)||sessionStorage.getItem(LS_KEY);
    if(!raw)return null;
    const d=JSON.parse(raw);
    // 24時間以上古いデータは破棄（翌日は新鮮なstate）
    if(Date.now()-d.savedAt > 24*60*60*1000)return null;
    return d;
  }catch(e){return null;}
}

/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
function initStoreStatus(){
  return STORES.map(s=>({
    id:s.id,
    status: s.id===1?'ordered':s.id===2?'no_order':s.id===3?'late':
            s.id===4?'ordered':'unconfirmed',
    time:s.id===1?'08:32':s.id===2?'08:10':s.id===3?'10:23':s.id===4?'08:55':null,
    items:s.id===1?6:s.id===3?4:s.id===4?7:0,
    ckReady:s.id===1,
    shipped:false,
  }));
}

let S={
  view:'login',
  role:null,
  storeId:null,
  phase:'home',
  qty:{},
  memo:'',
  ckTab:0,
  catOpen:{meat:true,veg:true,rice:true,frozen:false,sauce:false,supply:false},
  ckChecked:{},
  detail:null,
  storeStatus:initStoreStatus(),
  submitting:false,
};

/* セッション復元（同じセッション中に戻った場合） */
(function restoreSession(){
  const d=loadStoredState();
  if(d){
    if(d.storeStatus)S.storeStatus=d.storeStatus;
    if(d.ckChecked)S.ckChecked=d.ckChecked;
  }
})();

const now=new Date();
const todayStr=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日（${'日月火水木金土'[now.getDay()]}）`;

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function $id(id){return document.getElementById(id);}
function store(){return STORES.find(s=>s.id===S.storeId);}
function mySt(){return S.storeStatus.find(s=>s.id===S.storeId);}
function fmtTime(){return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;}
function isLate(){
  const st=store();if(!st)return false;
  const[h,m]=st.deadline.split(':').map(Number);
  return now.getHours()*60+now.getMinutes() >= h*60+m;
}

function statusMeta(st){
  if(st==='ordered')  return{label:'本日発注あり',    badge:'b-ok',         dot:'#1D9E75'};
  if(st==='no_order') return{label:'発注なし（連絡済）',badge:'b-none',       dot:'#378ADD'};
  if(st==='late')     return{label:'締切後発注',       badge:'b-late',       dot:'#EF9F27'};
  return                     {label:'未確認',          badge:'b-unconfirmed',dot:'#B4B2A9'};
}
function badge(st){const m=statusMeta(st);return`<span class="badge ${m.badge}">${m.label}</span>`;}

function showToast(msg){
  const t=$id('toast');
  t.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2200);
}

function showLoading(show){
  let el=$id('loading');
  if(show){
    if(!el){
      el=document.createElement('div');
      el.id='loading';el.className='loading-overlay';
      el.innerHTML='<div class="spinner"></div><div class="loading-text">送信中…</div>';
      document.body.appendChild(el);
    }
  }else{
    if(el)el.remove();
  }
}

/* ════════════════════════════════════════
   RENDER ENGINE
════════════════════════════════════════ */
function render(){
  const root=$id('root');
  root.innerHTML=
    S.view==='login'  ?loginPage()
    :S.view==='manager'?managerApp()
    :S.view==='ck'     ?ckApp()
    :adminApp();
}

/* ════════════════════════════════════════
   LOGIN PAGE
════════════════════════════════════════ */
function loginPage(){return`
<div class="login-page">
  <div class="logo-box"><i class="ti ti-truck-delivery"></i></div>
  <div class="login-h1">CK発注システム</div>
  <div class="login-sub">たくあんグループ 6店舗</div>
  <div class="login-card">
    <span class="slabel">役割を選択してください</span>
    ${roleBtn('mgr','ti-building-store','#E1F5EE','var(--green)','店長','発注・履歴確認')}
    ${roleBtn('ck', 'ti-package',      '#E6F1FB','var(--blue)', 'CK担当','発注確認・出荷管理')}
    ${roleBtn('admin','ti-settings',   '#FAEEDA','var(--orange)','管理者','店舗・商品設定')}
    ${S.role==='mgr'?`
      <div style="margin-top:14px">
        <span class="slabel">店舗を選択してください</span>
        <select class="form-sel" onchange="S.storeId=parseInt(this.value)||null;render()">
          <option value="">— 店舗を選んでください —</option>
          ${STORES.map(s=>`<option value="${s.id}"${S.storeId===s.id?' selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>`:''}
    <button class="btn btn-green"
      onclick="doLogin()"
      ${(!S.role||(S.role==='mgr'&&!S.storeId))?'disabled':''}>
      <i class="ti ti-login"></i>ログイン
    </button>
  </div>
</div>`;}

function roleBtn(r,icon,bg,color,name,desc){return`
  <button class="role-btn${S.role===r?' sel':''}"
    onclick="S.role='${r}';S.storeId=null;render()">
    <div class="role-icon" style="background:${bg};color:${color}">
      <i class="ti ${icon}"></i></div>
    <div>
      <div class="role-name">${name}</div>
      <div class="role-desc">${desc}</div>
    </div>
  </button>`;}

function doLogin(){
  if(!S.role||(S.role==='mgr'&&!S.storeId))return;
  S.view=S.role==='mgr'?'manager':S.role==='ck'?'ck':'admin';
  S.phase='home';
  render();
}

/* ════════════════════════════════════════
   MANAGER APP
════════════════════════════════════════ */
function managerApp(){
  const st=store();
  return`<div class="app">
    <div class="topbar">
      <i class="ti ti-truck-delivery" style="font-size:22px;color:var(--green)"></i>
      <div style="flex:1">
        <div class="topbar-title">${st.name}</div>
        <div class="topbar-sub">締切：${st.deadline} ｜ ${todayStr}</div>
      </div>
      ${logoutBtn()}
    </div>
    <div class="content">
      ${S.phase==='home'           ?mgrHome()
       :S.phase==='order'          ?mgrOrder()
       :S.phase==='confirm'        ?mgrConfirm()
       :S.phase==='success'        ?mgrSuccess()
       :S.phase==='noorder_confirm'?mgrNoOrderConfirm()
       :S.phase==='noorder_done'   ?mgrNoOrderDone()
       :mgrHome()}
    </div>
    <nav class="bottom-nav">
      <button class="nav-btn${S.phase==='home'?'  on':''}"  onclick="go('home')">
        <i class="ti ti-home"></i>ホーム
      </button>
      <button class="nav-btn${S.phase==='order'?' on':''}" onclick="go('order')">
        <i class="ti ti-shopping-cart"></i>発注する
      </button>
      <button class="nav-btn${S.phase==='history'?' on':''}" onclick="go('history')">
        <i class="ti ti-history"></i>履歴
      </button>
    </nav>
    ${S.phase==='history'?histOverlay():''}
  </div>`;}

/* ── MANAGER HOME ── */
function mgrHome(){
  const ms=mySt();
  const m=statusMeta(ms.status);
  const done=ms.status==='ordered'||ms.status==='late';
  const noOrderSent=ms.status==='no_order';
  return`
  <div style="padding:20px 12px 12px">
    <div style="font-size:13px;color:var(--muted);margin-bottom:4px">${todayStr}</div>
    <div style="font-size:22px;font-weight:700;margin-bottom:16px">今日の状況</div>
    <div class="status-bar">
      <div class="dot-lg" style="background:${m.dot}"></div>
      <div style="flex:1">
        <div class="status-text">${m.label}</div>
        <div class="status-time">${ms.time?ms.time+' に送信済み':'まだ送信していません'}</div>
      </div>
      ${badge(ms.status)}
    </div>
  </div>
  <div class="flex-col gap10 px12">
    ${done?`
      <button class="btn btn-outline" onclick="go('order')">
        <i class="ti ti-edit"></i>発注内容を修正する
      </button>
      <button class="btn btn-gray" onclick="go('order')">
        <i class="ti ti-eye"></i>発注内容を確認する
      </button>`:`
      <button class="btn btn-green" onclick="go('order')"
        style="font-size:18px;padding:18px">
        <i class="ti ti-shopping-cart"></i>今日の発注をする
      </button>
      <button class="btn btn-outline" onclick="copyLastAndOrder()">
        <i class="ti ti-copy"></i>前回発注をコピーして発注
      </button>
      ${!noOrderSent?`
      <button class="btn btn-blue" onclick="go('noorder_confirm')">
        <i class="ti ti-ban"></i>本日は発注なし
      </button>`:`
      <div class="alert a-info mt8">
        <i class="ti ti-circle-check"></i>
        <span>「本日は発注なし」をCKに連絡済みです。</span>
      </div>`}
    `}
  </div>
  <div class="mt16">
    <div class="section-label">直近の発注</div>
    <div class="card" style="margin-top:4px">
      ${histItems(4)}
      <div style="padding:12px">
        <button class="btn btn-gray" onclick="go('history')"
          style="font-size:13px;padding:11px">
          <i class="ti ti-history"></i>すべての履歴を見る
        </button>
      </div>
    </div>
  </div>`;}

function histItems(limit){
  const HISTORY=loadHistory(S.storeId);
  if(!HISTORY.length)return`<div style="padding:20px;text-align:center;color:var(--muted);font-size:14px">まだ履歴がありません</div>`;
  return HISTORY.slice(0,limit).map(h=>`
    <div class="hist-item">
      <div style="flex:1">
        <div style="font-size:15px;font-weight:500">${h.date}</div>
        <div style="font-size:12px;color:var(--muted)">${h.items?h.items+'品目':'—'}</div>
      </div>
      ${badge(h.status)}
    </div>`).join('');}

/* ── ORDER FORM ── */
function mgrOrder(){
  const late=isLate();
  let h=late
    ?`<div class="alert a-warn"><i class="ti ti-clock"></i>
       <span>締切（${store().deadline}）を過ぎています。<br>締切後発注として記録されます。</span></div>`
    :`<div class="alert a-ok"><i class="ti ti-clock"></i>
       <span>発注締切：本日 <strong>${store().deadline}</strong> まで</span></div>`;

  h+=`<div style="padding:8px 12px 4px">
    <button class="btn btn-gray btn-sm" onclick="copyLast()">
      <i class="ti ti-copy"></i>前回発注をコピー
    </button>
  </div>`;

  CATS.forEach(cat=>{
    const prods=PRODUCTS.filter(p=>p.cat===cat.id);
    const open=S.catOpen[cat.id];
    const filled=prods.some(p=>(S.qty[p.id]||0)>0);
    h+=`<div style="border-bottom:1px solid var(--border)">
      <div class="cat-header"
        onclick="S.catOpen['${cat.id}']=!S.catOpen['${cat.id}'];render()">
        <i class="ti ${cat.icon}" style="font-size:18px;color:var(--green)"></i>
        <span class="cat-name">${cat.name}</span>
        ${filled?'<span class="cat-filled">✓ 入力あり</span>':''}
        <i class="ti ti-chevron-${open?'up':'down'}"
          style="font-size:16px;color:var(--hint)"></i>
      </div>
      ${open?prods.map(p=>{const q=S.qty[p.id]||0;return`
        <div class="product-item${q>0?' filled':''}">
          <div style="flex:1;min-width:0">
            <div class="prod-name">${p.freq?'⭐ ':''}${p.name}</div>
            <div class="prod-unit">単位：${p.unit}　最小：${p.min}${p.unit}</div>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" onclick="dec(${p.id},${p.min})"
              aria-label="${p.name}を減らす">−</button>
            <input class="qty-inp" type="number" value="${q}"
              inputmode="decimal" step="${p.min}"
              onchange="setQ(${p.id},this.value,${p.min})"
              aria-label="${p.name}の数量">
            <button class="qty-btn p" onclick="inc(${p.id},${p.min})"
              aria-label="${p.name}を増やす">＋</button>
          </div>
        </div>`}).join(''):''}
    </div>`;
  });

  /* 発注漏れチェック */
  const checkCats=[{id:'meat',n:'肉類'},{id:'rice',n:'米・ご飯類'},{id:'supply',n:'備品・消耗品'}];
  h+=`<div class="card mt12">
    <div class="card-head">
      <i class="ti ti-checklist" style="color:var(--green);font-size:22px"></i>
      <div class="card-title">発注漏れチェック</div>
    </div>
    ${checkCats.map(c=>{
      const ok=PRODUCTS.filter(p=>p.cat===c.id).some(p=>(S.qty[p.id]||0)>0);
      return`<div class="check-row">
        <div class="checkbox${ok?' on':''}">
          ${ok?'<i class="ti ti-check" style="font-size:16px"></i>':''}
        </div>
        <span class="check-label">${c.n}の発注を確認しましたか？</span>
        <span class="badge ${ok?'b-ok':'b-unconfirmed'}">${ok?'OK':'未確認'}</span>
      </div>`;}).join('')}
  </div>`;

  h+=`<div class="form-group mt12">
    <label class="form-label" for="memo-inp">発注メモ（任意・CKへの連絡事項）</label>
    <textarea class="form-input" id="memo-inp" rows="3"
      placeholder="特記事項があれば記入">${esc(S.memo)}</textarea>
  </div>`;

  const total=Object.values(S.qty).filter(v=>v>0).length;
  h+=`<div class="flex-col gap8 px12" style="margin-bottom:16px">
    <button class="btn btn-green" onclick="goConfirm()"
      style="font-size:18px;padding:18px" ${total===0?'disabled':''}>
      <i class="ti ti-check"></i>${total}件を確認して発注する
    </button>
    <button class="btn btn-gray" onclick="go('home')">
      <i class="ti ti-arrow-left"></i>ホームに戻る
    </button>
  </div>`;
  return h;}

/* ── CONFIRM ── */
function mgrConfirm(){
  const late=isLate();
  const items=PRODUCTS.filter(p=>(S.qty[p.id]||0)>0);
  return`
  <div style="padding:16px 12px 8px">
    <div style="font-size:20px;font-weight:700;margin-bottom:4px">発注内容の確認</div>
    <div style="font-size:13px;color:var(--muted)">${todayStr}${late?' 【締切後発注】':''}</div>
  </div>
  ${late?`<div class="alert a-warn"><i class="ti ti-alert-triangle"></i>
    <span>締切後発注として記録されます。CKと管理者に通知されます。</span></div>`:''}
  <div class="card mt8">
    ${items.map(p=>`<div class="sum-row">
      <span class="sum-name">${esc(p.name)}</span>
      <span class="sum-qty">${S.qty[p.id]} ${p.unit}</span>
    </div>`).join('')}
    ${S.memo?`<div class="sum-row">
      <span class="sum-name" style="color:var(--muted)">メモ</span>
      <span style="font-size:14px;color:var(--muted);text-align:right;max-width:60%">${esc(S.memo)}</span>
    </div>`:''}
  </div>
  <div class="flex-col gap8 px12" style="margin-bottom:16px">
    <button class="btn btn-green" onclick="submitOrder()"
      style="font-size:18px;padding:18px" id="submit-btn">
      <i class="ti ti-send"></i>この内容で発注する
    </button>
    <button class="btn btn-gray" onclick="go('order')">
      <i class="ti ti-arrow-left"></i>修正する
    </button>
  </div>`;}

/* ── SUCCESS ── */
function mgrSuccess(){
  const items=PRODUCTS.filter(p=>(S.qty[p.id]||0)>0);
  return`
  <div class="success-wrap">
    <div class="success-icon" style="background:var(--green-light)">
      <i class="ti ti-circle-check" style="font-size:52px;color:var(--green)"></i>
    </div>
    <div class="success-h" style="color:var(--green)">発注完了しました！</div>
    <div style="font-size:14px;color:var(--muted);line-height:1.7">
      ${todayStr}<br>CKに送信しました
    </div>
  </div>
  <div class="card">
    <div class="card-head"><div class="card-title">発注内容</div></div>
    ${items.map(p=>`<div class="sum-row">
      <span class="sum-name">${esc(p.name)}</span>
      <span class="sum-qty">${S.qty[p.id]} ${p.unit}</span>
    </div>`).join('')}
  </div>
  <div class="px12 mt12" style="margin-bottom:16px">
    <button class="btn btn-gray" onclick="go('home')">
      <i class="ti ti-home"></i>ホームに戻る
    </button>
  </div>`;}

/* ── NO ORDER CONFIRM ── */
function mgrNoOrderConfirm(){return`
  <div style="padding:48px 24px;text-align:center">
    <div style="width:80px;height:80px;background:var(--blue-light);border-radius:50%;
      display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
      <i class="ti ti-ban" style="font-size:42px;color:var(--blue)"></i>
    </div>
    <div style="font-size:20px;font-weight:700;margin-bottom:8px;line-height:1.4">
      本日は発注なし<br>でよいですか？
    </div>
    <div style="font-size:14px;color:var(--muted);margin-bottom:32px;line-height:1.7">
      CK担当者に「本日は発注なし」と<br>連絡されます。<br>
      必要なときはいつでも発注できます。
    </div>
    <div class="flex-col gap10">
      <button class="btn btn-blue" onclick="submitNoOrder()"
        style="font-size:17px;padding:17px">
        <i class="ti ti-send"></i>発注なしを送信する
      </button>
      <button class="btn btn-gray" onclick="go('home')">
        <i class="ti ti-arrow-left"></i>戻る
      </button>
    </div>
  </div>`;}

/* ── NO ORDER DONE ── */
function mgrNoOrderDone(){return`
  <div class="success-wrap">
    <div class="success-icon" style="background:var(--blue-light)">
      <i class="ti ti-circle-check" style="font-size:52px;color:var(--blue)"></i>
    </div>
    <div class="success-h" style="color:var(--blue)">連絡しました</div>
    <div style="font-size:14px;color:var(--muted);line-height:1.7">
      「本日は発注なし」をCKに送信しました。<br>
      必要なときはいつでも発注できます。
    </div>
  </div>
  <div class="px12 mt12" style="margin-bottom:16px">
    <button class="btn btn-gray" onclick="go('home')">
      <i class="ti ti-home"></i>ホームに戻る
    </button>
  </div>`;}

/* ── HISTORY OVERLAY ── */
function histOverlay(){
  const HISTORY=loadHistory(S.storeId);
  return`
  <div class="overlay" onclick="go('home')">
    <div class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-head">
        <div class="sheet-title">発注履歴</div>
        <button class="close-btn" onclick="go('home')" aria-label="閉じる">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="stat-grid">
        <div class="stat-c">
          <div class="stat-lbl">今月の発注回数</div>
          <div class="stat-val" style="color:var(--green)">
            ${HISTORY.filter(h=>h.status==='ordered'||h.status==='late').length}
          </div>
        </div>
        <div class="stat-c">
          <div class="stat-lbl">発注なし連絡</div>
          <div class="stat-val" style="color:var(--blue)">
            ${HISTORY.filter(h=>h.status==='no_order').length}
          </div>
        </div>
      </div>
      <div style="padding:4px 16px 8px;font-size:12px;color:var(--muted)">
        発注なし連絡は正しい運用です
      </div>
      ${HISTORY.length?HISTORY.map(h=>`
        <div class="hist-item">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:500">${h.date}</div>
            <div style="font-size:12px;color:var(--muted)">${h.items?h.items+'品目':'—'}</div>
          </div>
          ${badge(h.status)}
        </div>`).join('')
      :`<div style="padding:24px;text-align:center;color:var(--muted);font-size:14px">まだ履歴がありません</div>`}
    </div>
  </div>`;}

/* ════════════════════════════════════════
   CK APP
════════════════════════════════════════ */
function ckApp(){
  const unconf=S.storeStatus.filter(s=>s.status==='unconfirmed');
  return`<div class="app">
    <div class="topbar">
      <i class="ti ti-package" style="font-size:22px;color:var(--blue)"></i>
      <div style="flex:1">
        <div class="topbar-title">CK管理</div>
        <div class="topbar-sub">${todayStr}</div>
      </div>
      ${logoutBtn()}
    </div>
    <div class="content">
      <div class="tabs">
        ${['店舗状況','商品合計','出荷管理'].map((t,i)=>
          `<div class="tab${S.ckTab===i?' on':''}"
            onclick="S.ckTab=${i};render()">${t}</div>`).join('')}
      </div>
      ${unconf.length?`
      <div class="alert a-warn">
        <i class="ti ti-alert-triangle"></i>
        <span>未確認：${unconf.map(s=>STORES.find(x=>x.id===s.id).short).join('、')}
          （${unconf.length}店舗）</span>
      </div>`:''}
      ${S.ckTab===0?ckStoreList()
       :S.ckTab===1?ckTotals()
       :ckShipping()}
    </div>
    <nav class="bottom-nav">
      <button class="nav-btn${S.ckTab===0?' on':''}" onclick="S.ckTab=0;render()">
        <i class="ti ti-layout-list"></i>店舗状況
      </button>
      <button class="nav-btn${S.ckTab===1?' on':''}" onclick="S.ckTab=1;render()">
        <i class="ti ti-chart-bar"></i>商品合計
      </button>
      <button class="nav-btn${S.ckTab===2?' on':''}" onclick="S.ckTab=2;render()">
        <i class="ti ti-package-export"></i>出荷管理
      </button>
    </nav>
    ${S.detail!=null?ckDetailSheet():''}
  </div>`;}

function ckStoreList(){
  const stats=[
    {lbl:'発注あり',    n:S.storeStatus.filter(s=>s.status==='ordered'||s.status==='late').length, c:'var(--green)'},
    {lbl:'発注なし連絡',n:S.storeStatus.filter(s=>s.status==='no_order').length,                   c:'var(--blue)'},
    {lbl:'未確認',      n:S.storeStatus.filter(s=>s.status==='unconfirmed').length,                 c:'var(--gray)'},
    {lbl:'締切後',      n:S.storeStatus.filter(s=>s.status==='late').length,                        c:'var(--orange)'},
  ];
  let h=`<div class="stat-grid">
    ${stats.map(s=>`<div class="stat-c">
      <div class="stat-lbl">${s.lbl}</div>
      <div class="stat-val" style="color:${s.c}">${s.n}</div>
    </div>`).join('')}
  </div>`;

  const groups=[
    {keys:['ordered','late'], label:'発注あり',         color:'var(--green)'},
    {keys:['no_order'],       label:'発注なし（連絡済）',color:'var(--blue)'},
    {keys:['unconfirmed'],    label:'未確認',            color:'var(--gray)'},
  ];
  groups.forEach(g=>{
    const list=S.storeStatus.filter(s=>g.keys.includes(s.status));
    if(!list.length)return;
    h+=`<div class="section-label" style="color:${g.color}">${g.label}</div>
    <div class="card" style="margin-top:0">
      ${list.map(s=>{
        const st=STORES.find(x=>x.id===s.id);
        const m=statusMeta(s.status);
        return`<div class="store-row" onclick="S.detail=${s.id};render()">
          <div class="store-dot" style="background:${m.dot}"></div>
          <div style="flex:1;min-width:0">
            <div class="store-name">${st.name}</div>
            <div class="store-sub">${s.time?s.time+' 送信':'—'}${s.items?' · '+s.items+'品目':''}</div>
          </div>
          ${badge(s.status)}
          <i class="ti ti-chevron-right" style="font-size:16px;color:var(--hint);flex-shrink:0"></i>
        </div>`;}).join('')}
    </div>`;
  });
  return h;}

function ckTotals(){
  const totals={};
  SAMPLE_ORDERS.forEach(o=>{
    const k=`${o.product}||${o.unit}||${o.cat}`;
    totals[k]=(totals[k]||0)+o.qty;
  });
  const ordered=S.storeStatus.filter(s=>s.status==='ordered'||s.status==='late');
  let h=`<div style="padding:10px 12px 4px;font-size:13px;color:var(--muted)">
    発注店舗の合計（本日 ${ordered.length}店舗）
  </div>`;
  CATS.forEach(cat=>{
    const items=Object.entries(totals)
      .filter(([k])=>k.split('||')[2]===cat.id)
      .map(([k,v])=>({name:k.split('||')[0],unit:k.split('||')[1],qty:v}));
    if(!items.length)return;
    h+=`<div class="section-label" style="display:flex;align-items:center;gap:6px">
      <i class="ti ${cat.icon}" style="font-size:15px;color:var(--green)"></i>${cat.name}
    </div>
    <div class="card" style="margin-top:0">
      ${items.map(i=>`<div class="sum-row">
        <span class="sum-name">${i.name}</span>
        <span class="sum-qty">${i.qty} ${i.unit}</span>
      </div>`).join('')}
    </div>`;
  });
  return h;}

function ckShipping(){
  const ids=S.storeStatus.filter(s=>s.status==='ordered'||s.status==='late').map(s=>s.id);
  if(!ids.length)return`<div style="padding:48px;text-align:center;color:var(--muted)">
    本日発注のある店舗はありません</div>`;
  let h='';
  ids.forEach(sid=>{
    const st=STORES.find(s=>s.id===sid);
    const ss=S.storeStatus.find(s=>s.id===sid);
    const items=SAMPLE_ORDERS.filter(o=>o.store===sid);
    h+=`<div class="card">
      <div class="card-head" style="background:var(--surface)">
        <i class="ti ti-building-store" style="color:var(--green);font-size:20px"></i>
        <div class="card-title">${st.name}</div>
        ${ss.status==='late'?`<span class="badge b-late" style="margin-right:4px">締切後</span>`:''}
        <span class="badge ${ss.shipped?'b-shipped':ss.ckReady?'b-none':'b-unconfirmed'}">
          ${ss.shipped?'出荷済':ss.ckReady?'準備済':'未チェック'}
        </span>
      </div>
      ${items.map((o,i)=>{
        const key=`${sid}-${i}`;const on=S.ckChecked[key]||false;
        return`<div class="check-row" onclick="toggleCK('${key}')">
          <div class="checkbox${on?' on':''}">
            ${on?'<i class="ti ti-check" style="font-size:16px"></i>':''}
          </div>
          <span class="check-label">${o.product}</span>
          <span class="sum-qty" style="flex-shrink:0">${o.qty} ${o.unit}</span>
        </div>`;}).join('')}
      <div style="display:flex;gap:8px;padding:12px">
        <button class="btn btn-sm${ss.ckReady?' btn-green':' btn-outline'}"
          style="flex:1" onclick="ckReady(${sid})">
          ${ss.ckReady?'✓ 準備済み':'出荷準備済にする'}
        </button>
        <button class="btn btn-sm${ss.shipped?' btn-green':' btn-gray'}"
          style="flex:1" onclick="ckShip(${sid})">
          ${ss.shipped?'✓ 出荷済み':'出荷済みにする'}
        </button>
      </div>
    </div>`;
  });
  return h;}

function ckDetailSheet(){
  const sid=S.detail;
  const st=STORES.find(x=>x.id===sid);
  const ss=S.storeStatus.find(x=>x.id===sid);
  const m=statusMeta(ss.status);
  const items=SAMPLE_ORDERS.filter(o=>o.store===sid);
  return`
  <div class="overlay" onclick="S.detail=null;render()">
    <div class="sheet" onclick="event.stopPropagation()">
      <div class="sheet-head">
        <div>
          <div class="sheet-title">${st.name}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${st.manager}</div>
        </div>
        ${badge(ss.status)}
        <button class="close-btn" onclick="S.detail=null;render()" aria-label="閉じる">
          <i class="ti ti-x"></i>
        </button>
      </div>
      ${ss.status==='unconfirmed'?`
      <div class="alert a-warn">
        <i class="ti ti-alert-triangle"></i>
        <span>発注も「発注なし」連絡も届いていません。<br>
          必要に応じて確認してください。</span>
      </div>`:''}
      ${ss.status==='no_order'?`
      <div class="alert a-info">
        <i class="ti ti-info-circle"></i>
        <span>店長より「本日は発注なし」の連絡がありました${ss.time?'（'+ss.time+'）':''}。<br>
          出荷物はありません。</span>
      </div>`:''}
      ${items.length?`
      <div class="section-label">発注内容</div>
      <div class="card" style="margin-top:0">
        ${items.map(o=>`<div class="sum-row">
          <span class="sum-name">${o.product}</span>
          <span class="sum-qty">${o.qty} ${o.unit}</span>
        </div>`).join('')}
      </div>`:''}
      ${ss.status!=='unconfirmed'&&ss.status!=='no_order'?`
      <div class="flex-col gap8 px12 mt8">
        <button class="btn${ss.ckReady?' btn-green':' btn-outline'}"
          onclick="ckReady(${sid});S.detail=null;render()">
          <i class="ti ti-package"></i>
          ${ss.ckReady?'✓ 出荷準備済み':'出荷準備済みにする'}
        </button>
        <button class="btn${ss.shipped?' btn-green':' btn-gray'}"
          onclick="ckShip(${sid});S.detail=null;render()">
          <i class="ti ti-truck"></i>
          ${ss.shipped?'✓ 出荷済み':'出荷済みにする'}
        </button>
      </div>`:''}
      <div class="px12 mt8" style="margin-bottom:8px">
        <button class="btn btn-gray" onclick="S.detail=null;render()">
          <i class="ti ti-arrow-left"></i>閉じる
        </button>
      </div>
    </div>
  </div>`;}

/* ════════════════════════════════════════
   ADMIN APP
════════════════════════════════════════ */
function adminApp(){return`
  <div class="app">
    <div class="topbar">
      <i class="ti ti-settings" style="font-size:22px;color:var(--orange)"></i>
      <div class="topbar-title" style="flex:1">管理者</div>
      ${logoutBtn()}
    </div>
    <div class="content">
      <div class="stat-grid">
        <div class="stat-c"><div class="stat-lbl">登録店舗</div>
          <div class="stat-val">${STORES.length}</div></div>
        <div class="stat-c"><div class="stat-lbl">登録商品</div>
          <div class="stat-val">${PRODUCTS.length}</div></div>
      </div>

      <div class="section-label">店舗設定</div>
      <div class="card" style="margin-top:4px">
        ${STORES.map(s=>`
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;margin-bottom:6px">
            <div style="font-size:15px;font-weight:600;flex:1">${s.name}</div>
            <button class="btn btn-outline btn-sm"
              onclick="showToast('${s.name} の設定編集（本番実装後に有効になります）')">
              <i class="ti ti-edit" style="font-size:13px"></i>編集
            </button>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <div style="font-size:13px;color:var(--muted)">
              <i class="ti ti-clock" style="font-size:13px"></i> 締切 ${s.deadline}
            </div>
            <div style="font-size:13px;color:var(--muted)">
              <i class="ti ti-user" style="font-size:13px"></i> ${s.manager}
            </div>
          </div>
          <div style="margin-top:8px">
            <span class="badge b-unconfirmed" style="font-size:11px">
              発注頻度：店舗判断（固定なし）
            </span>
          </div>
        </div>`).join('')}
      </div>

      <div class="section-label">商品管理</div>
      <div class="card" style="margin-top:4px">
        <div class="card-head">
          <div class="card-title">登録商品（${PRODUCTS.length}件）</div>
          <button class="btn btn-green btn-sm"
            onclick="showToast('商品追加（本番実装後に有効になります）')" style="width:auto">
            <i class="ti ti-plus"></i>追加
          </button>
        </div>
        ${PRODUCTS.map(p=>`
        <div class="product-item">
          <div style="flex:1;min-width:0">
            <div class="prod-name">${p.name}</div>
            <div class="prod-unit">${CATS.find(c=>c.id===p.cat)?.name} / ${p.unit}</div>
          </div>
          <button class="btn btn-outline btn-sm"
            onclick="showToast('${esc(p.name)} 編集（本番実装後に有効になります）')"
            style="width:auto">
            <i class="ti ti-edit" style="font-size:13px"></i>
          </button>
        </div>`).join('')}
      </div>

      <div class="section-label">発注締切時間の設定</div>
      <div class="card" style="margin-top:4px">
        <div style="padding:16px">
          <div class="form-label">デフォルト締切時間</div>
          <input type="time" class="form-input" value="10:00"
            style="font-size:18px;text-align:center">
          <div style="font-size:12px;color:var(--muted);margin-top:8px">
            ※ 店舗ごとに個別設定も可能です
          </div>
          <button class="btn btn-green mt12"
            onclick="showToast('保存しました')">
            <i class="ti ti-device-floppy"></i>保存する
          </button>
        </div>
      </div>

      <div class="section-label">データ出力</div>
      <div class="card" style="margin-top:4px">
        <div class="flex-col gap8" style="padding:12px">
          <button class="btn btn-gray" onclick="exportCSV()">
            <i class="ti ti-file-spreadsheet"></i>発注履歴 CSV出力
          </button>
          <button class="btn btn-gray"
            onclick="showToast('商品別使用量レポートを出力します')">
            <i class="ti ti-chart-bar"></i>商品別使用量レポート
          </button>
        </div>
      </div>
      <div style="height:20px"></div>
    </div>
    <nav class="bottom-nav">
      <button class="nav-btn on"><i class="ti ti-settings"></i>管理</button>
    </nav>
  </div>`;}

/* ════════════════════════════════════════
   SHARED UI
════════════════════════════════════════ */
function logoutBtn(){return`
  <button onclick="logout()"
    style="border:1px solid var(--border);border-radius:8px;padding:8px 12px;
    background:#fff;color:var(--muted);font-size:13px;cursor:pointer;
    display:flex;align-items:center;gap:5px;font-weight:500"
    aria-label="ログアウト">
    <i class="ti ti-logout" style="font-size:16px"></i>ログアウト
  </button>`;}

/* ════════════════════════════════════════
   HISTORY STORAGE
════════════════════════════════════════ */
const DEMO_HISTORY=[
  {date:'6/8（日）',status:'ordered', items:6},
  {date:'6/7（土）',status:'no_order',items:0},
  {date:'6/6（金）',status:'ordered', items:8},
  {date:'6/5（木）',status:'late',    items:5},
  {date:'6/4（水）',status:'ordered', items:7},
  {date:'6/3（火）',status:'no_order',items:0},
];

function loadHistory(storeId){
  try{
    const raw=localStorage.getItem(`takuan_hist_${storeId}`);
    if(raw){const d=JSON.parse(raw);if(Array.isArray(d)&&d.length)return d;}
  }catch(e){}
  return storeId?DEMO_HISTORY:[];
}

function saveHistory(storeId,entry){
  try{
    const h=loadHistory(storeId);
    h.unshift(entry);
    localStorage.setItem(`takuan_hist_${storeId}`,JSON.stringify(h.slice(0,60)));
  }catch(e){}
}

/* ════════════════════════════════════════
   ACTIONS
════════════════════════════════════════ */
function logout(){
  S={view:'login',role:null,storeId:null,phase:'home',
    qty:{},memo:'',ckTab:0,
    catOpen:{meat:true,veg:true,rice:true,frozen:false,sauce:false,supply:false},
    ckChecked:S.ckChecked,  /* CKチェック状態は保持 */
    detail:null,
    storeStatus:S.storeStatus, /* 送信済み状態は保持 */
    submitting:false};
  render();
}

function go(phase){S.phase=phase;render();}

function inc(id,min){
  S.qty[id]=Math.round(((S.qty[id]||0)+min)*1000)/1000;
  const el=document.querySelector(`input[aria-label*="${PRODUCTS.find(p=>p.id===id)?.name}"]`);
  if(el)el.value=S.qty[id];
  // DOM再描画なしでカウント更新
  updateOrderCount();
}

function dec(id,min){
  S.qty[id]=Math.max(0,Math.round(((S.qty[id]||0)-min)*1000)/1000);
  const el=document.querySelector(`input[aria-label*="${PRODUCTS.find(p=>p.id===id)?.name}"]`);
  if(el)el.value=S.qty[id];
  updateOrderCount();
}

function setQ(id,v,min){
  const n=parseFloat(v)||0;
  S.qty[id]=Math.max(0,Math.round(n/min)*min);
  updateOrderCount();
}

function updateOrderCount(){
  const total=Object.values(S.qty).filter(v=>v>0).length;
  const btn=document.querySelector('#order-count-btn');
  if(btn){
    btn.textContent=`${total}件を確認して発注する`;
    btn.disabled=total===0;
  }
  // カテゴリーのバッジ更新
  CATS.forEach(cat=>{
    const filled=PRODUCTS.filter(p=>p.cat===cat.id).some(p=>(S.qty[p.id]||0)>0);
    const badge=document.querySelector(`[data-cat-badge="${cat.id}"]`);
    if(badge)badge.style.display=filled?'':'none';
  });
}

function copyLast(){
  S.qty={...LAST_ORDER_TEMPLATE};
  showToast('前回発注をコピーしました');
  render();
}

function copyLastAndOrder(){
  S.qty={...LAST_ORDER_TEMPLATE};
  S.phase='order';
  render();
}

function goConfirm(){
  const m=$id('memo-inp');
  if(m)S.memo=m.value.trim();
  S.phase='confirm';
  render();
}

function submitOrder(){
  if(S.submitting)return; // 二重送信防止
  S.submitting=true;
  const btn=$id('submit-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:22px;height:22px;margin:0 auto"></div>';}
  showLoading(true);

  // 実際のAPIコール場所（将来のバックエンド接続ポイント）
  setTimeout(()=>{
    const ms=mySt();
    ms.status=isLate()?'late':'ordered';
    ms.time=fmtTime();
    ms.items=Object.values(S.qty).filter(v=>v>0).length;

    // 履歴に追記
    saveHistory(S.storeId,{
      date:todayStr.replace(/\d{4}年/,''),
      status:ms.status,
      items:ms.items
    });

    saveState();
    showLoading(false);
    S.submitting=false;
    S.phase='success';
    render();
  },800);
}

function submitNoOrder(){
  if(S.submitting)return;
  S.submitting=true;
  showLoading(true);

  setTimeout(()=>{
    const ms=mySt();
    ms.status='no_order';
    ms.time=fmtTime();

    saveHistory(S.storeId,{
      date:todayStr.replace(/\d{4}年/,''),
      status:'no_order',
      items:0
    });

    saveState();
    showLoading(false);
    S.submitting=false;
    S.phase='noorder_done';
    render();
  },600);
}

function toggleCK(key){
  S.ckChecked[key]=!S.ckChecked[key];
  saveState();
  render();
}

function ckReady(id){
  const s=S.storeStatus.find(x=>x.id===id);
  if(s){s.ckReady=true;saveState();}
  render();
}

function ckShip(id){
  const s=S.storeStatus.find(x=>x.id===id);
  if(s){s.shipped=true;saveState();}
  render();
}

/* ── CSV出力（管理者用） ── */
function exportCSV(){
  const rows=[['発注日','店舗名','商品名','数量','単位','状態']];
  SAMPLE_ORDERS.forEach(o=>{
    const st=STORES.find(s=>s.id===o.store);
    const ss=S.storeStatus.find(s=>s.id===o.store);
    rows.push([
      todayStr,
      st?st.name:'',
      o.product,
      o.qty,
      o.unit,
      ss?statusMeta(ss.status).label:''
    ]);
  });
  const bom='\uFEFF';
  const csv=bom+rows.map(r=>r.join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`発注履歴_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();URL.revokeObjectURL(url);
  showToast('CSVをダウンロードしました');
}

/* ── XSS対策 ── */
function esc(s){
  return String(s||'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

/* ════════════════════════════════════════
   BOOT
════════════════════════════════════════ */
render();
</script>
</body>
</html>

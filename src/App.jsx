import { useState, useCallback, useMemo, useEffect } from "react";

// ============================================================
// localStorage ユーティリティ
// ============================================================
const STORAGE_KEYS = {
  orders:           "ck_orders",
  weeklyOrders:     "ck_weekly_orders",
  allItems:         "ck_all_items",
  storeVisIds:      "ck_store_visible_ids",
  storeGoals:       "ck_store_goals",
  yearlyGoals:      "ck_yearly_goals",
  monthlyResults:   "ck_monthly_results",
  weeklyReflects:   "ck_weekly_reflects",
  monthlyReflects:  "ck_monthly_reflects",
  adminComments:    "ck_admin_comments",
};
function loadStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch(e) {
    console.error("loadStorage error:", key, e);
    return fallback;
  }
}
function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch(e) {
    console.error("saveStorage error:", key, e);
  }
}
function resetAllData() {
  const ok = window.confirm("すべての保存データを削除して初期状態に戻します。\nこの操作は元に戻せません。よろしいですか？");
  if (!ok) return;
  Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  window.location.reload();
}

// ============================================================
// CSV出力ユーティリティ
// ============================================================
function downloadCSV(filename, rows) {
  const csv = rows.map(row =>
    row.map(cell => '"' + String(cell ?? "").replaceAll('"', '""') + '"').join(",")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const STORES_INIT = [
  { id:1, name:"うどん屋",     type:"daily",  routeOrder:1, deliveryTime:"15:50" },
  { id:2, name:"幸せや坂戸店", type:"daily",  routeOrder:2, deliveryTime:"16:20", isCabbageBase:true },
  { id:3, name:"アーラ",     type:"daily",  routeOrder:3, deliveryTime:"16:40" },
  { id:4, name:"今渡店",       type:"daily",  routeOrder:4, deliveryTime:"16:50" },
  { id:5, name:"則武店",       type:"weekly", weeklyDeadline:"月曜 12:00", deliveryNote:"不定期配送（CK都合）" },
];

const USERS = [
  { id:1, name:"田中 一郎", storeId:1, role:"manager", password:"1234" },
  { id:2, name:"佐藤 花子", storeId:2, role:"manager", password:"1234" },
  { id:3, name:"鈴木 次郎", storeId:3, role:"manager", password:"1234" },
  { id:4, name:"山田 三郎", storeId:4, role:"manager", password:"1234" },
  { id:5, name:"中村 五郎", storeId:5, role:"manager", password:"1234" },
  { id:6, name:"CK担当",    storeId:null, role:"ck",    password:"ck00" },
  { id:7, name:"管理者",    storeId:null, role:"admin", password:"admin" },
];

const LATE_REASONS = ["発注漏れ","急な売上増加","在庫確認ミス","店舗判断ミス","その他"];

const WEEKLY_STATUSES = [
  { key:"ordered",    label:"発注済み",     color:"#374151", bg:"#F3F4F6" },
  { key:"reviewing",  label:"内容確認中",   color:"#1E3A8A", bg:"#EFF6FF" },
  { key:"prepping",   label:"仕込み中",     color:"#92400E", bg:"#FEF3C7" },
  { key:"waiting",    label:"配送待ち",     color:"#5B21B6", bg:"#EDE9FE" },
  { key:"scheduled",  label:"配送予定決定", color:"#065F46", bg:"#D1FAE5" },
  { key:"delivering", label:"配送中",       color:"#B45309", bg:"#FEF9C3" },
  { key:"completed",  label:"納品完了",     color:"#065F46", bg:"#BBF7D0" },
  { key:"cancelled",  label:"キャンセル",   color:"#991B1B", bg:"#FEE2E2" },
];

const FOOD_CATS = ["食材","セット商品","ソース・たれ・調味料","揚げ物資材・油"];
const ALL_CATS = [...FOOD_CATS,"備品"];

const NORTTAKE_NAMES = [
  "お米","ヒレ","ロース","牛バラ肉","豚しゃぶ肉","鶏もも肉","ささみ","海老","伸ばしエビ",
  "海老カツ","コロッケ","生卵","MS卵","だし巻き","キャベツ","ネギ","大葉","漬物",
  "すき焼き煮","チキン","パン粉","油",
  "味噌だれ","甘口ソース","辛口ソース","塩だれ","タルタルソース","TOタルタルソース",
  "ごまだれ","和風ドレッシング","胡麻ドレッシング","ポン酢","白だし","昆布","昆布茶",
  "練り辛子","ギャバン ブラックホワイトペッパー",
  "豚汁セット","塩だれセット","濾過セット","ラップ","濾過シート","お漬物シール",
];

const ITEMS_INIT = [
  {id:101,cat:"食材",name:"お米",unit:"袋",price:2000,minQty:1,maxQty:20,orderUnit:1,priority:1,visible:"all",active:true,caution:"",note:""},
  {id:102,cat:"食材",name:"巻き寿司",unit:"本",price:300,minQty:1,maxQty:50,orderUnit:1,priority:2,visible:"all",active:true,caution:"",note:""},
  {id:103,cat:"食材",name:"ロール",unit:"本",price:350,minQty:1,maxQty:50,orderUnit:1,priority:3,visible:"all",active:true,caution:"",note:""},
  {id:104,cat:"食材",name:"ボーノ",unit:"個",price:200,minQty:1,maxQty:50,orderUnit:1,priority:4,visible:"all",active:true,caution:"",note:""},
  {id:105,cat:"食材",name:"ヒレ",unit:"枚",price:500,minQty:1,maxQty:200,orderUnit:1,priority:5,visible:[2,4,5],active:true,caution:"冷蔵管理必須",note:""},
  {id:106,cat:"食材",name:"ロース",unit:"枚",price:400,minQty:1,maxQty:200,orderUnit:1,priority:6,visible:[2,4,5],active:true,caution:"",note:""},
  {id:107,cat:"食材",name:"梅ロール",unit:"本",price:350,minQty:1,maxQty:50,orderUnit:1,priority:7,visible:"all",active:true,caution:"",note:""},
  {id:108,cat:"食材",name:"チーズロール",unit:"本",price:380,minQty:1,maxQty:50,orderUnit:1,priority:8,visible:"all",active:true,caution:"",note:""},
  {id:109,cat:"食材",name:"牛バラ肉",unit:"kg",price:1200,minQty:1,maxQty:30,orderUnit:1,priority:9,visible:"all",active:true,caution:"",note:""},
  {id:110,cat:"食材",name:"豚しゃぶ肉",unit:"kg",price:800,minQty:1,maxQty:30,orderUnit:1,priority:10,visible:"all",active:true,caution:"",note:""},
  {id:111,cat:"食材",name:"鶏もも肉",unit:"kg",price:600,minQty:1,maxQty:30,orderUnit:1,priority:11,visible:"all",active:true,caution:"",note:""},
  {id:112,cat:"食材",name:"ささみ",unit:"kg",price:550,minQty:1,maxQty:20,orderUnit:1,priority:12,visible:"all",active:true,caution:"",note:""},
  {id:113,cat:"食材",name:"バラスライス",unit:"kg",price:700,minQty:1,maxQty:20,orderUnit:1,priority:13,visible:"all",active:true,caution:"",note:""},
  {id:114,cat:"食材",name:"せいろの肉",unit:"g",price:900,minQty:100,maxQty:5000,orderUnit:100,priority:14,visible:[1,3],active:true,caution:"",note:""},
  {id:115,cat:"食材",name:"豚汁用肉",unit:"袋",price:500,minQty:1,maxQty:20,orderUnit:1,priority:15,visible:"all",active:true,caution:"",note:""},
  {id:116,cat:"食材",name:"海老",unit:"kg",price:1500,minQty:1,maxQty:20,orderUnit:1,priority:16,visible:"all",active:true,caution:"要冷凍",note:""},
  {id:117,cat:"食材",name:"伸ばしエビ",unit:"本",price:120,minQty:10,maxQty:300,orderUnit:10,priority:17,visible:"all",active:true,caution:"",note:""},
  {id:118,cat:"食材",name:"海老カツ",unit:"枚",price:200,minQty:1,maxQty:100,orderUnit:1,priority:18,visible:"all",active:true,caution:"",note:""},
  {id:119,cat:"食材",name:"牡蠣",unit:"kg",price:1800,minQty:1,maxQty:10,orderUnit:1,priority:19,visible:"all",active:true,caution:"要冷蔵・当日使用",note:""},
  {id:120,cat:"食材",name:"コロッケ",unit:"個",price:80,minQty:5,maxQty:200,orderUnit:5,priority:20,visible:"all",active:true,caution:"",note:""},
  {id:121,cat:"食材",name:"ピリ辛ウィンナー",unit:"本",price:60,minQty:10,maxQty:200,orderUnit:10,priority:21,visible:"all",active:true,caution:"",note:""},
  {id:122,cat:"食材",name:"しのだ巻き",unit:"本",price:150,minQty:5,maxQty:100,orderUnit:5,priority:22,visible:"all",active:true,caution:"",note:""},
  {id:123,cat:"食材",name:"つきこんにゃく",unit:"袋",price:200,minQty:1,maxQty:30,orderUnit:1,priority:23,visible:"all",active:true,caution:"",note:""},
  {id:124,cat:"食材",name:"生卵",unit:"個",price:20,minQty:10,maxQty:500,orderUnit:10,priority:24,visible:"all",active:true,caution:"",note:""},
  {id:125,cat:"食材",name:"MS卵",unit:"個",price:25,minQty:10,maxQty:500,orderUnit:10,priority:25,visible:"all",active:true,caution:"",note:""},
  {id:126,cat:"食材",name:"だし巻き",unit:"本",price:180,minQty:1,maxQty:100,orderUnit:1,priority:26,visible:"all",active:true,caution:"",note:""},
  {id:127,cat:"食材",name:"卵サラダ",unit:"g",price:300,minQty:100,maxQty:2000,orderUnit:100,priority:27,visible:"all",active:true,caution:"",note:""},
  {id:128,cat:"食材",name:"キャベツ",unit:"kg",price:150,minQty:1,maxQty:50,orderUnit:1,priority:1,visible:"all",active:true,caution:"前日22時まで発注必須",note:"坂戸店でカット"},
  {id:129,cat:"食材",name:"ネギ",unit:"kg",price:200,minQty:1,maxQty:10,orderUnit:1,priority:29,visible:"all",active:true,caution:"",note:""},
  {id:130,cat:"食材",name:"大葉",unit:"枚",price:5,minQty:10,maxQty:500,orderUnit:10,priority:30,visible:"all",active:true,caution:"",note:""},
  {id:131,cat:"食材",name:"枝豆",unit:"g",price:400,minQty:100,maxQty:2000,orderUnit:100,priority:31,visible:"all",active:true,caution:"",note:""},
  {id:132,cat:"食材",name:"おろし",unit:"g",price:100,minQty:100,maxQty:2000,orderUnit:100,priority:32,visible:"all",active:true,caution:"",note:""},
  {id:133,cat:"食材",name:"人参",unit:"袋",price:200,minQty:1,maxQty:20,orderUnit:1,priority:33,visible:"all",active:true,caution:"",note:""},
  {id:134,cat:"食材",name:"大根",unit:"袋",price:250,minQty:1,maxQty:20,orderUnit:1,priority:34,visible:"all",active:true,caution:"",note:""},
  {id:135,cat:"食材",name:"漬物",unit:"袋",price:300,minQty:1,maxQty:20,orderUnit:1,priority:35,visible:"all",active:true,caution:"",note:""},
  {id:136,cat:"食材",name:"すき焼き煮",unit:"g",price:500,minQty:100,maxQty:3000,orderUnit:100,priority:36,visible:"all",active:true,caution:"",note:""},
  {id:137,cat:"食材",name:"チキン",unit:"個",price:300,minQty:1,maxQty:100,orderUnit:1,priority:37,visible:"all",active:true,caution:"",note:""},
  {id:138,cat:"食材",name:"干し芋",unit:"袋",price:400,minQty:1,maxQty:20,orderUnit:1,priority:38,visible:"all",active:true,caution:"",note:""},
  {id:139,cat:"食材",name:"オレンジジュース",unit:"本",price:150,minQty:1,maxQty:50,orderUnit:1,priority:39,visible:"all",active:true,caution:"",note:""},
  {id:201,cat:"セット商品",name:"豚汁セット",unit:"セット",price:900,minQty:1,maxQty:20,orderUnit:1,priority:1,visible:"all",active:true,caution:"",note:"人参1袋・大根1袋・豚汁用肉2袋"},
  {id:202,cat:"セット商品",name:"塩だれセット",unit:"セット",price:1200,minQty:1,maxQty:10,orderUnit:1,priority:2,visible:"all",active:true,caution:"",note:"イゾマン1本・食研2本"},
  {id:203,cat:"セット商品",name:"濾過セット",unit:"セット",price:500,minQty:1,maxQty:10,orderUnit:1,priority:3,visible:"all",active:true,caution:"",note:"濾過シート3種入り"},
  {id:301,cat:"ソース・たれ・調味料",name:"味噌だれ",unit:"本",price:600,minQty:1,maxQty:20,orderUnit:1,priority:1,visible:"all",active:true,caution:"",note:""},
  {id:302,cat:"ソース・たれ・調味料",name:"甘口ソース",unit:"本",price:500,minQty:1,maxQty:20,orderUnit:1,priority:2,visible:"all",active:true,caution:"",note:""},
  {id:303,cat:"ソース・たれ・調味料",name:"辛口ソース",unit:"本",price:500,minQty:1,maxQty:20,orderUnit:1,priority:3,visible:"all",active:true,caution:"",note:""},
  {id:304,cat:"ソース・たれ・調味料",name:"塩だれ",unit:"本",price:700,minQty:1,maxQty:20,orderUnit:1,priority:4,visible:"all",active:true,caution:"",note:""},
  {id:305,cat:"ソース・たれ・調味料",name:"タルタルソース",unit:"kg",price:800,minQty:1,maxQty:10,orderUnit:1,priority:5,visible:"all",active:true,caution:"",note:""},
  {id:306,cat:"ソース・たれ・調味料",name:"TOタルタルソース",unit:"kg",price:850,minQty:1,maxQty:10,orderUnit:1,priority:6,visible:"all",active:true,caution:"",note:""},
  {id:307,cat:"ソース・たれ・調味料",name:"ごまだれ",unit:"本",price:600,minQty:1,maxQty:20,orderUnit:1,priority:7,visible:"all",active:true,caution:"",note:""},
  {id:308,cat:"ソース・たれ・調味料",name:"胡麻ドレッシング",unit:"本",price:500,minQty:1,maxQty:20,orderUnit:1,priority:8,visible:"all",active:true,caution:"",note:""},
  {id:309,cat:"ソース・たれ・調味料",name:"和風ドレッシング",unit:"本",price:500,minQty:1,maxQty:20,orderUnit:1,priority:9,visible:"all",active:true,caution:"",note:""},
  {id:310,cat:"ソース・たれ・調味料",name:"ポン酢",unit:"本",price:450,minQty:1,maxQty:20,orderUnit:1,priority:10,visible:"all",active:true,caution:"",note:""},
  {id:311,cat:"ソース・たれ・調味料",name:"カレー",unit:"袋",price:900,minQty:1,maxQty:20,orderUnit:1,priority:11,visible:"all",active:true,caution:"",note:""},
  {id:312,cat:"ソース・たれ・調味料",name:"白だし",unit:"本",price:600,minQty:1,maxQty:20,orderUnit:1,priority:12,visible:"all",active:true,caution:"",note:""},
  {id:313,cat:"ソース・たれ・調味料",name:"昆布",unit:"袋",price:400,minQty:1,maxQty:10,orderUnit:1,priority:13,visible:"all",active:true,caution:"",note:""},
  {id:314,cat:"ソース・たれ・調味料",name:"昆布茶",unit:"袋",price:350,minQty:1,maxQty:10,orderUnit:1,priority:14,visible:"all",active:true,caution:"",note:""},
  {id:315,cat:"ソース・たれ・調味料",name:"練り辛子",unit:"本",price:300,minQty:1,maxQty:10,orderUnit:1,priority:15,visible:"all",active:true,caution:"",note:""},
  {id:316,cat:"ソース・たれ・調味料",name:"ギャバン ブラックホワイトペッパー",unit:"本",price:500,minQty:1,maxQty:10,orderUnit:1,priority:16,visible:"all",active:true,caution:"",note:""},
  {id:317,cat:"ソース・たれ・調味料",name:"丸徳",unit:"本",price:400,minQty:1,maxQty:10,orderUnit:1,priority:17,visible:"all",active:true,caution:"",note:""},
  {id:401,cat:"揚げ物資材・油",name:"油",unit:"L",price:400,minQty:1,maxQty:30,orderUnit:1,priority:1,visible:"all",active:true,caution:"",note:""},
  {id:402,cat:"揚げ物資材・油",name:"パン粉",unit:"kg",price:250,minQty:1,maxQty:20,orderUnit:1,priority:2,visible:"all",active:true,caution:"",note:""},
  {id:501,cat:"備品",name:"faxインク",unit:"本",price:2000,minQty:1,maxQty:10,orderUnit:1,priority:1,visible:"all",active:true,caution:"",note:""},
  {id:502,cat:"備品",name:"コピー機インク",unit:"本",price:3000,minQty:1,maxQty:10,orderUnit:1,priority:2,visible:"all",active:true,caution:"",note:""},
  {id:503,cat:"備品",name:"コピー用紙",unit:"冊",price:500,minQty:1,maxQty:10,orderUnit:1,priority:3,visible:"all",active:true,caution:"",note:""},
  {id:504,cat:"備品",name:"輪ゴム",unit:"袋",price:200,minQty:1,maxQty:10,orderUnit:1,priority:4,visible:"all",active:true,caution:"",note:""},
  {id:505,cat:"備品",name:"セロハンテープ",unit:"個",price:150,minQty:1,maxQty:20,orderUnit:1,priority:5,visible:"all",active:true,caution:"",note:""},
  {id:506,cat:"備品",name:"おもちゃ",unit:"個",price:300,minQty:1,maxQty:30,orderUnit:1,priority:6,visible:"all",active:true,caution:"",note:""},
  {id:507,cat:"備品",name:"トイレクリーナー",unit:"本",price:400,minQty:1,maxQty:10,orderUnit:1,priority:7,visible:"all",active:true,caution:"",note:""},
  {id:508,cat:"備品",name:"トイレの芳香剤",unit:"個",price:500,minQty:1,maxQty:10,orderUnit:1,priority:8,visible:"all",active:true,caution:"",note:""},
  {id:509,cat:"備品",name:"フローリングシート",unit:"袋",price:600,minQty:1,maxQty:10,orderUnit:1,priority:9,visible:"all",active:true,caution:"",note:""},
  {id:510,cat:"備品",name:"クイックルシート",unit:"袋",price:500,minQty:1,maxQty:10,orderUnit:1,priority:10,visible:"all",active:true,caution:"",note:""},
  {id:511,cat:"備品",name:"掃除用ゴミ袋",unit:"袋",price:300,minQty:1,maxQty:20,orderUnit:1,priority:11,visible:"all",active:true,caution:"",note:""},
  {id:512,cat:"備品",name:"弁当箱",unit:"枚",price:80,minQty:10,maxQty:500,orderUnit:10,priority:12,visible:"all",active:true,caution:"10枚単位",note:""},
  {id:513,cat:"備品",name:"弁当中敷",unit:"枚",price:30,minQty:10,maxQty:500,orderUnit:10,priority:13,visible:"all",active:true,caution:"",note:""},
  {id:514,cat:"備品",name:"紅白の弁当紐",unit:"本",price:20,minQty:10,maxQty:200,orderUnit:10,priority:14,visible:"all",active:true,caution:"",note:""},
  {id:515,cat:"備品",name:"風呂敷",unit:"枚",price:200,minQty:1,maxQty:50,orderUnit:1,priority:15,visible:"all",active:true,caution:"",note:""},
  {id:516,cat:"備品",name:"漬物パック上下セット",unit:"セット",price:100,minQty:10,maxQty:200,orderUnit:10,priority:16,visible:"all",active:true,caution:"",note:""},
  {id:517,cat:"備品",name:"ふせん",unit:"冊",price:150,minQty:1,maxQty:10,orderUnit:1,priority:17,visible:"all",active:true,caution:"",note:""},
  {id:518,cat:"備品",name:"冷酒",unit:"本",price:800,minQty:1,maxQty:30,orderUnit:1,priority:18,visible:"all",active:true,caution:"",note:""},
  {id:519,cat:"備品",name:"日本酒",unit:"本",price:900,minQty:1,maxQty:30,orderUnit:1,priority:19,visible:"all",active:true,caution:"",note:""},
  {id:520,cat:"備品",name:"焼酎",unit:"本",price:1000,minQty:1,maxQty:30,orderUnit:1,priority:20,visible:"all",active:true,caution:"",note:""},
  {id:521,cat:"備品",name:"お待ち紙",unit:"冊",price:200,minQty:1,maxQty:20,orderUnit:1,priority:21,visible:"all",active:true,caution:"",note:""},
  {id:522,cat:"備品",name:"勤怠表",unit:"冊",price:300,minQty:1,maxQty:10,orderUnit:1,priority:22,visible:"all",active:true,caution:"",note:""},
  {id:523,cat:"備品",name:"スポンジ",unit:"個",price:100,minQty:1,maxQty:20,orderUnit:1,priority:23,visible:"all",active:true,caution:"",note:""},
  {id:524,cat:"備品",name:"濾過セット",unit:"セット",price:500,minQty:1,maxQty:10,orderUnit:1,priority:24,visible:"all",active:true,caution:"",note:"濾過シート3種入り"},
  {id:525,cat:"備品",name:"濾過シート",unit:"枚",price:150,minQty:1,maxQty:50,orderUnit:1,priority:25,visible:"all",active:true,caution:"",note:""},
  {id:526,cat:"備品",name:"ラップ",unit:"本",price:300,minQty:1,maxQty:20,orderUnit:1,priority:26,visible:"all",active:true,caution:"",note:""},
  {id:527,cat:"備品",name:"お漬物シール",unit:"枚",price:10,minQty:10,maxQty:500,orderUnit:10,priority:0,visible:"all",active:true,caution:"",note:"備品・消耗品"},
];

const buildStoreVisible = (items) => {
  const r = {};
  STORES_INIT.forEach(store => {
    if (store.type === "weekly") {
      r[store.id] = items.filter(i => NORTTAKE_NAMES.includes(i.name) && i.active).map(i => i.id);
    } else {
      r[store.id] = items.filter(i => {
        if (!i.active) return false;
        if (i.visible === "all") return true;
        return Array.isArray(i.visible) && i.visible.includes(store.id);
      }).map(i => i.id);
    }
  });
  return r;
};

const TODAY = new Date().toISOString().split("T")[0];
const TOMORROW = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split("T")[0]; })();
const WEEK_END = (() => { const d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split("T")[0]; })();

const MOCK_ORDERS = [
  {id:1,storeId:1,orderDate:TODAY,useDate:TOMORROW,orderedBy:"田中 一郎",status:"submitted",isLate:false,lateReason:null,lines:[{itemId:128,qty:5,note:""},{itemId:101,qty:2,note:""}],supplies:[{itemId:527,qty:100,stock:20,note:""},{itemId:512,qty:50,stock:10,note:""}],confirmedAt:null},
  {id:2,storeId:2,orderDate:TODAY,useDate:TOMORROW,orderedBy:"佐藤 花子",status:"submitted",isLate:true,lateReason:"急な売上増加",lines:[{itemId:128,qty:15,note:""},{itemId:105,qty:50,note:""}],supplies:[{itemId:527,qty:200,stock:50,note:""}],confirmedAt:null},
  {id:3,storeId:3,orderDate:TODAY,useDate:TOMORROW,orderedBy:"鈴木 次郎",status:"draft",isLate:false,lateReason:null,lines:[{itemId:128,qty:8,note:""}],supplies:[{itemId:527,qty:50,stock:5,note:""}],confirmedAt:null},
];

const MOCK_WEEKLY = [
  {id:101,storeId:5,orderDate:TODAY,useWeek:TODAY+"〜"+WEEK_END,hopeWeek:"今週中",orderedBy:"中村 五郎",status:"reviewing",scheduledDate:"",scheduledTime:"",deliveryStaff:"",completedAt:"",
   lines:[{itemId:128,qty:30,weeklyNeed:30,stock:2,note:"",urgency:"通常",priority:"高"},{itemId:105,qty:100,weeklyNeed:100,stock:10,note:"",urgency:"通常",priority:"高"},{itemId:527,qty:300,weeklyNeed:300,stock:20,note:"",urgency:"通常",priority:"通常"}]},
];

const MONTH_DATA = STORES_INIT.map((s, idx) => ({
  storeId: s.id,
  sales:      [1800000,2100000,1650000,1950000,1500000][idx] || 1700000,
  laborCost:  [520000,610000,480000,570000,430000][idx] || 500000,
  itemCost:   [420000,510000,380000,460000,340000][idx] || 400000,
  supplyCost: [75000,90000,68000,82000,60000][idx] || 70000,
  lossCost:   [18000,22000,15000,20000,12000][idx] || 16000,
  lateOrders: [0,1,2,0,1][idx] || 0,
  orderErrors:[0,1,0,1,0][idx] || 0,
}));

// ============================================================
// 店舗目標データ（旧：月次用・後方互換のため残す）
// ============================================================
const STORE_GOALS_INIT = STORES_INIT.map((s, idx) => {
  const m = MONTH_DATA[idx];
  const salesTarget = [2000000, 2300000, 1800000, 2100000, 1700000][idx] || 2000000;
  return {
    storeId: s.id,
    month: "2025-06",
    salesTarget,
    laborRateTarget: 30,
    foodRateTarget:  30,
    supplyRateTarget: 5,
    lossRateTarget:   1,
    lateOrderTarget:  0,
    managerMessage: "",
    actionItems: ["","",""],
    status: "公開中",
  };
});

// ============================================================
// 年間目標データ構造
// ============================================================
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().toISOString().slice(0,7); // "2026-05"

function buildMonthlySalesTargets(year, annual) {
  const base = Math.floor(annual / 12);
  const extra = annual - base * 12;
  const targets = {};
  for (let m = 1; m <= 12; m++) {
    const key = year + "-" + String(m).padStart(2,"0");
    targets[key] = base + (m === 12 ? extra : 0);
  }
  return targets;
}

const YEARLY_GOALS_INIT = STORES_INIT.map((s, idx) => {
  const annual = [24000000, 27600000, 21600000, 25200000, 20400000][idx] || 24000000;
  return {
    storeId: s.id,
    year: THIS_YEAR,
    annualSalesTarget: annual,
    monthlySalesTargets: buildMonthlySalesTargets(THIS_YEAR, annual),
    laborRateTarget: 30,
    foodRateTarget: 30,
    supplyRateTarget: 5,
    deadlineRateTarget: 95,
    managerMessage: "",
    status: "公開中",
  };
});

const MONTHLY_RESULTS_INIT = STORES_INIT.map((s, idx) => ({
  storeId: s.id,
  month: THIS_MONTH,
  sales: [1800000,2100000,1650000,1950000,1500000][idx] || 1700000,
  laborCost: [520000,610000,480000,570000,430000][idx] || 500000,
  foodOrderCost: [420000,510000,380000,460000,340000][idx] || 400000,
  supplyOrderCost: [75000,90000,68000,82000,60000][idx] || 70000,
  totalOrders: [28,30,25,27,4][idx] || 25,
  onTimeOrders: [28,29,23,27,4][idx] || 24,
  lateOrders: [0,1,2,0,0][idx] || 0,
  adminMemo: "",
}));

// ============================================================
// 発注履歴から月別食材費・備品費を自動集計
// ============================================================
const FOOD_COST_CATS = ["食材","セット商品","ソース・たれ・調味料","揚げ物資材・油"];

function calcOrderCostByMonth(orders, weeklyOrders, allItems, storeId, month) {
  // month = "2026-05"
  const dailyOrds = orders.filter(o =>
    o.storeId === storeId && o.orderDate && o.orderDate.startsWith(month) && o.status === "submitted"
  );
  const weeklyOrds = weeklyOrders.filter(o =>
    o.storeId === storeId && o.orderDate && o.orderDate.startsWith(month)
  );

  let foodCost = 0, supplyCost = 0, totalOrders = 0, lateOrders = 0;

  const calcLines = (lines, isSupplies = false) => {
    (lines || []).forEach(l => {
      const item = allItems.find(i => i.id === l.itemId);
      if (!item) return;
      const cost = (item.price || 0) * (l.qty || 0);
      if (isSupplies || item.cat === "備品") supplyCost += cost;
      else if (FOOD_COST_CATS.includes(item.cat)) foodCost += cost;
    });
  };

  dailyOrds.forEach(o => {
    totalOrders++;
    if (o.isLate) lateOrders++;
    calcLines(o.lines);
    calcLines(o.supplies, true);
  });

  weeklyOrds.forEach(o => {
    totalOrders++;
    calcLines(o.lines);
  });

  return { foodCost, supplyCost, totalOrders, lateOrders };
}

// ============================================================
// 年間アドバイス生成
// ============================================================
function generateYearlyAdvice(yearlyGoal, lastResult, currentResult) {
  const goods = [], issues = [], actions = [];

  const lr = lastResult;
  const goal = yearlyGoal;

  if (!lr) return {
    summaryMessage: "先月の実績データがまだありません。今月の発注を続けてください。",
    goodPoints: [],
    issues: [],
    actionItems: ["毎日21:30に在庫確認をしてから発注する","発注前に在庫を必ず確認する","売上目標を意識しながら営業する"],
    priority: "sales",
  };

  const deadlineRate = lr.totalOrders > 0 ? Math.round((lr.onTimeOrders||lr.totalOrders) / lr.totalOrders * 100) : 100;
  const salesAchieve = goal.monthlySalesTargets ? (() => {
    const lastMonth = new Date(lr.month+"-01");
    lastMonth.setMonth(lastMonth.getMonth());
    const lmKey = lr.month;
    const target = goal.monthlySalesTargets[lmKey] || goal.annualSalesTarget/12;
    return Math.round(lr.sales / target * 100);
  })() : 90;

  const laborRate  = lr.sales > 0 ? pct(lr.laborCost,    lr.sales) : 0;
  const foodRate   = lr.sales > 0 ? pct(lr.foodOrderCost, lr.sales) : 0;
  const supplyRate = lr.sales > 0 ? pct(lr.supplyOrderCost,lr.sales) : 0;

  if (salesAchieve >= 100) goods.push("先月の売上は目標を達成しています");
  else if (salesAchieve >= 90) goods.push("先月の売上は目標に近い状態です");
  else issues.push("先月の売上が目標に届いていません");

  if (laborRate <= goal.laborRateTarget) goods.push("人件費は目標内に収まっています");
  else { issues.push("人件費が少し高めです"); actions.push("暇な時間帯のシフト人数を1人分見直す"); }

  if (foodRate <= goal.foodRateTarget) goods.push("食材費は目標内です");
  else { issues.push("食材費が少し高めです"); actions.push("発注前に必ず在庫を確認する"); }

  if (supplyRate <= goal.supplyRateTarget) goods.push("備品費は目標内です");
  else { issues.push("備品の使用量が多めです"); actions.push("お漬物シール・袋類の使いすぎを確認する"); }

  if (deadlineRate >= (goal.deadlineRateTarget || 95)) goods.push("発注締切をよく守れています");
  else { issues.push("発注締切の遵守率を上げましょう"); actions.push("毎日21:30に在庫確認をしてから発注する"); }

  if (salesAchieve < 95) actions.push("おすすめ商品の声かけを増やし客単価アップを意識する");

  const topActions = actions.slice(0,3);
  if (topActions.length < 3) topActions.push(...["このペースを維持する","今週も発注締切を守る"].slice(0, 3-topActions.length));

  let priority = "sales";
  if (laborRate > goal.laborRateTarget) priority = "labor";
  else if (foodRate > goal.foodRateTarget) priority = "food";
  else if (supplyRate > goal.supplyRateTarget) priority = "supply";
  else if (deadlineRate < (goal.deadlineRateTarget||95)) priority = "deadline";

  const baseMsg = issues.length === 0
    ? "先月はすべての項目が目標内でした。このペースを維持してください。"
    : (goods.length > 0
        ? goods[0] + "。" + (issues[0] ? "一方で" + issues[0] + "ので少し意識してみてください。" : "")
        : issues[0] + "。今月は" + (topActions[0]||"やることを絞って") + "ことを優先しましょう。");

  const salesMsg = salesAchieve < 100
    ? "おすすめ商品の声かけを増やし、売上アップを意識しましょう。"
    : "売上は好調です。費用管理も継続してください。";

  return {
    summaryMessage: baseMsg + " " + salesMsg,
    goodPoints: goods,
    issues,
    actionItems: topActions,
    priority,
  };
}


// 目標メッセージ・やること自動生成
// ============================================================
// 店長育成スコア計算
// ============================================================
function calcManagerScore(result, yearlyGoal, weeklyReflects, monthlyReflects, storeId, month) {
  if (!result || !yearlyGoal) return { score: 0, breakdown: {}, rank: "D" };

  const target = yearlyGoal.monthlySalesTargets?.[month] || yearlyGoal.annualSalesTarget / 12;
  const salesRate = target > 0 ? result.sales / target * 100 : 0;

  // ① 売上達成率 25点
  const salesScore = Math.min(25, Math.round(salesRate / 100 * 25));

  // ② 利益達成率（食材費+備品費+人件費の費率で代替）20点
  const totalCostRate = result.sales > 0
    ? pct(result.laborCost + result.foodOrderCost + result.supplyOrderCost, result.sales) : 100;
  const profitScore = totalCostRate <= 65 ? 20 : totalCostRate <= 70 ? 15 : totalCostRate <= 75 ? 10 : 5;

  // ③ 人件費管理 15点
  const laborRate = result.sales > 0 ? pct(result.laborCost, result.sales) : 100;
  const target_lr = yearlyGoal.laborRateTarget || 30;
  const laborScore = laborRate <= target_lr ? 15 : laborRate <= target_lr + 2 ? 10 : laborRate <= target_lr + 5 ? 5 : 0;

  // ④ 食材費管理 15点
  const foodRate = result.sales > 0 ? pct(result.foodOrderCost, result.sales) : 100;
  const target_fr = yearlyGoal.foodRateTarget || 30;
  const foodScore = foodRate <= target_fr ? 15 : foodRate <= target_fr + 2 ? 10 : foodRate <= target_fr + 5 ? 5 : 0;

  // ⑤ 備品費管理 5点
  const supplyRate = result.sales > 0 ? pct(result.supplyOrderCost, result.sales) : 100;
  const target_sr = yearlyGoal.supplyRateTarget || 5;
  const supplyScore = supplyRate <= target_sr ? 5 : supplyRate <= target_sr + 1 ? 3 : 0;

  // ⑥ 発注ルール遵守 5点
  const dlRate = result.totalOrders > 0 ? result.onTimeOrders / result.totalOrders * 100 : 100;
  const dlScore = dlRate >= 95 ? 5 : dlRate >= 85 ? 3 : dlRate >= 70 ? 1 : 0;

  // ⑦ 週次振り返り提出 5点
  const thisMonthWeekly = (weeklyReflects || []).filter(r => r.storeId === storeId && r.month === month);
  const weeklyScore = thisMonthWeekly.length >= 4 ? 5 : thisMonthWeekly.length >= 2 ? 3 : thisMonthWeekly.length >= 1 ? 1 : 0;

  // ⑧ 改善行動の実行 5点（週次振り返りの改善行動チェック）
  const actionDone = thisMonthWeekly.filter(r => r.actionItems && r.actionItems.length > 0).length;
  const actionScore = actionDone >= 3 ? 5 : actionDone >= 2 ? 3 : actionDone >= 1 ? 2 : 0;

  // ⑨ 月次振り返り提出 5点
  const monthlyReflect = (monthlyReflects || []).find(r => r.storeId === storeId && r.month === month);
  const monthlyScore = monthlyReflect ? 5 : 0;

  const total = salesScore + profitScore + laborScore + foodScore + supplyScore + dlScore + weeklyScore + actionScore + monthlyScore;
  const rank = total >= 90 ? "A" : total >= 80 ? "B" : total >= 70 ? "C" : "D";

  return {
    score: total,
    rank,
    breakdown: { salesScore, profitScore, laborScore, foodScore, supplyScore, dlScore, weeklyScore, actionScore, monthlyScore },
    rates: { salesRate, laborRate, foodRate, supplyRate, dlRate },
  };
}

// ============================================================
// 店長向け自動アドバイス（強化版）
// ============================================================
function generateAdviceMessages(result, yearlyGoal, monthTarget) {
  if (!result || !yearlyGoal) return { messages: [], actions: [] };

  const salesRate = monthTarget > 0 ? result.sales / monthTarget * 100 : 0;
  const laborRate  = result.sales > 0 ? pct(result.laborCost, result.sales) : 0;
  const foodRate   = result.sales > 0 ? pct(result.foodOrderCost, result.sales) : 0;
  const supplyRate = result.sales > 0 ? pct(result.supplyOrderCost, result.sales) : 0;
  const dlRate     = result.totalOrders > 0 ? result.onTimeOrders / result.totalOrders * 100 : 100;

  const messages = [], actions = [];

  if (salesRate < 90) {
    messages.push("売上が目標に届いていません。客数・客単価を意識した声かけが大切です。");
    actions.push("おすすめ商品の声かけを1日3回以上意識する");
    actions.push("店頭POPを最新情報に更新する");
  } else if (salesRate < 100) {
    messages.push("売上は目標に近い状態です。もう少しでクリアできます。");
    actions.push("セット提案を増やして客単価を上げる");
  } else {
    messages.push("売上目標をクリアしています。このペースを維持しましょう。");
  }

  if (laborRate > (yearlyGoal.laborRateTarget || 30) + 2) {
    messages.push("人件費率が目標より高めです。売上に合わせたシフト調整が効果的です。");
    actions.push("暇な時間帯の人員を1人分見直す");
    actions.push("売上予測をもとにシフトを組み直す");
  } else if (laborRate <= yearlyGoal.laborRateTarget) {
    messages.push("人件費は目標内に収まっています。");
  }

  if (foodRate > (yearlyGoal.foodRateTarget || 30) + 2) {
    messages.push("食材費率が高めです。発注前の在庫確認と仕込み量の見直しが重要です。");
    actions.push("発注前に必ず在庫を確認してから数量を決める");
    actions.push("前週の売上をもとに仕込み量を調整する");
  } else if (foodRate <= yearlyGoal.foodRateTarget) {
    messages.push("食材費は目標内です。");
  }

  if (supplyRate > (yearlyGoal.supplyRateTarget || 5) + 1) {
    messages.push("備品の使用量が多めです。月間予算を確認してください。");
    actions.push("備品発注時に在庫を確認してから発注する");
  }

  if (dlRate < 90) {
    messages.push("発注締切の遵守率を上げることで評価が大きく改善します。");
    actions.push("毎日21:30に在庫確認をしてから発注する");
  }

  return { messages, actions: actions.slice(0, 3) };
}

// ============================================================
// 週次診断（人件費を使わない）
// ============================================================
function diagnoseWeek(storeId, orders, weeklyOrders, allItems, monthTarget) {
  // 今週（直近7日）の発注を取得
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const todayOrds = orders.filter(o => o.storeId===storeId && o.orderDate >= weekAgoStr);
  const wOrds     = weeklyOrders.filter(o => o.storeId===storeId && o.orderDate >= weekAgoStr);

  let foodCost=0, supplyCost=0, lateCount=0, totalOrds=0;
  const calcL = (lines, isSupply=false) => {
    (lines||[]).forEach(l => {
      const item=allItems.find(i=>i.id===l.itemId);
      if(!item)return;
      const c=(item.price||0)*(l.qty||0);
      if(isSupply||item.cat==="備品") supplyCost+=c;
      else if(FOOD_COST_CATS.includes(item.cat)) foodCost+=c;
    });
  };
  todayOrds.forEach(o => { totalOrds++; if(o.isLate)lateCount++; calcL(o.lines); calcL(o.supplies,true); });
  wOrds.forEach(o => { totalOrds++; calcL(o.lines); });

  // 今月実績から今週分を推定（今月の発注履歴から）
  const monthOrds = orders.filter(o => o.storeId===storeId && o.orderDate.startsWith(THIS_MONTH));
  let monthFoodCost=0, monthSupplyCost=0;
  monthOrds.forEach(o => { calcL(o.lines); calcL(o.supplies,true); });

  // 今週売上（月次実績の今月÷週数で近似）
  const result = null; // 週次売上は現在取れないので食材費率で比較
  const foodRateApprox = monthTarget > 0 ? Math.round(foodCost / (monthTarget/4.3) * 100) : 0;
  const supplyRateApprox = monthTarget > 0 ? Math.round(supplyCost / (monthTarget/4.3) * 100) : 0;

  // 課題判定（週次では人件費除外）
  const issues = [];
  if (lateCount > 0) issues.push({ key:"deadline", label:"発注締切が守れていない", reason:"今週"+lateCount+"回の締切後発注がありました。", action:["毎日21:30に在庫確認をする","締切前に発注を完了する","発注担当者と確認時間を決める"] });
  if (foodRateApprox > 32) issues.push({ key:"food", label:"食材発注が多い", reason:"売上に対して食材発注額が高めです。", action:["発注前に在庫確認をする","仕込み量を見直す","廃棄・ロスを記録する","前週の売上を見て発注量を決める"] });
  if (supplyRateApprox > 6) issues.push({ key:"supply", label:"備品発注が多い", reason:"今週の備品発注が多めです。", action:["備品発注前に在庫確認をする","袋・シール・消耗品の使いすぎを確認する","備品の月間予算を確認する"] });

  const topIssue = issues[0] || null;
  return { issues, topIssue, foodCost, supplyCost, lateCount, totalOrds };
}

// 来週の挽回プランを生成
function buildRecoveryPlan(weekDiag, managerActions, scoreData) {
  const priority = weekDiag?.topIssue?.action?.[0] || "発注前に在庫確認をする";
  const sub = [];
  if(weekDiag?.topIssue?.action?.[1]) sub.push(weekDiag.topIssue.action[1]);
  if(managerActions && managerActions !== priority) sub.push(managerActions);
  if(sub.length===0) sub.push("おすすめ商品の声かけを増やす");
  const goals = [];
  if(weekDiag?.topIssue?.key==="food") goals.push("食材発注額を適正に近づける");
  if(weekDiag?.topIssue?.key==="deadline") goals.push("発注締切を100%守る");
  if(scoreData && scoreData.score < 80) goals.push("先週より"+Math.min(3, 80-scoreData.score)+"点スコアを上げる");
  goals.push("今週の売上を維持・改善する");
  return { priority, sub: sub.slice(0,2), goals: goals.slice(0,2) };
}

// ズレ判定
function checkReflectAlignment(weekDiag, managerSelectedCauses) {
  if(!weekDiag?.topIssue || !managerSelectedCauses?.length) return null;
  const issueKey = weekDiag.topIssue.key;
  const causeMap = { food:["食材費が高かった","発注が多かった","追加発注が多かった"], supply:["備品を使いすぎた"], deadline:["発注締切が守れなかった"] };
  const relatedCauses = causeMap[issueKey]||[];
  const matched = managerSelectedCauses.some(c=>relatedCauses.includes(c));
  if(matched) return { level:"一致", msg:"" };
  const msg = "数字を見ると、今週の一番の課題は「"+weekDiag.topIssue.label+"」でした。来週は"+weekDiag.topIssue.action[0]+"も意識してみましょう。";
  return { level:"少しズレ", msg };
}

// 管理者コメント候補を生成
function buildAdminCommentCandidate(storeId, weekDiag, latestReflect) {
  const issue = weekDiag?.topIssue;
  const storeName = STORES_INIT.find(s=>s.id===storeId)?.name||"";
  if(!issue) return "今週もお疲れさまでした。引き続き発注締切と在庫管理を意識してください。";
  const commentMap = {
    deadline:"発注締切が守れていない状況が続いています。毎日21:30に在庫確認を行い、締切前に発注を完了しましょう。発注担当者と確認時間を決めてください。",
    food:"数字を見ると、今週は食材発注が多い状態です。来週は発注前に在庫を確認し、仕込み量を見直しましょう。追加発注が増えないよう、前日までに必要数を確認してください。",
    supply:"今週は備品発注が多めです。袋・シール・消耗品の使い方を確認しましょう。発注前に在庫確認をしてから必要数を決めてください。",
    sales:"今週は売上が目標に届いていません。来週はセット提案を増やして客単価アップを狙いましょう。おすすめ商品の声かけを意識してください。",
  };
  const align = latestReflect ? checkReflectAlignment(weekDiag, latestReflect.causes) : null;
  let base = commentMap[issue.key] || "";
  if(align?.level==="少しズレ") base += " 振り返りの視点は良いですが、"+align.msg;
  return base;
}

function generateGoalAdvice(goal, m) {
  const salesRate = m.sales > 0 ? Math.round(m.sales / goal.salesTarget * 100) : 0;
  const remaining = Math.max(0, goal.salesTarget - m.sales);
  const laborRate  = pct(m.laborCost,  m.sales);
  const foodRate   = pct(m.itemCost,   m.sales);
  const supplyRate = pct(m.supplyCost, m.sales);
  const lossRate   = pct(m.lossCost,   m.sales);
  const late = m.lateOrders || 0;

  const goods = [];
  const issues = [];
  const actions = [];

  if (salesRate >= 95)  goods.push("売上は良い状態です");
  else if (salesRate >= 90) issues.push("売上があと少し足りていません");
  else { issues.push("売上が少し足りていません"); actions.push("おすすめ商品の声かけを増やす"); }

  if (laborRate <= goal.laborRateTarget) goods.push("人件費は目標内です");
  else { issues.push("人件費が少し高めです"); actions.push("暇な時間帯のシフト人数を1人分見直す"); }

  if (foodRate <= goal.foodRateTarget) goods.push("食材費は目標内です");
  else { issues.push("食材費が少し高めです"); actions.push("発注前に在庫を確認する"); }

  if (supplyRate <= goal.supplyRateTarget) goods.push("備品費は目標内です");
  else { issues.push("備品の使用量が多めです"); actions.push("袋・おしぼり・お漬物シールの使い方を確認する"); }

  if (lossRate <= goal.lossRateTarget) goods.push("ロスは少ない状態です");
  else { issues.push("ロスが少し多めです"); actions.push("廃棄した商品を毎日記録する"); }

  if (late > 0) { issues.push("発注締切を守るだけで評価が上がります"); actions.push("毎日21:30に在庫を確認して発注する"); }

  const topActions = actions.slice(0, 3);
  if (topActions.length === 0) topActions.push("このペースを維持する", "今週も発注締切を守る", "在庫チェックを習慣にする");

  let incentiveMsg = "";
  const score = (salesRate>=95?20:salesRate>=90?10:0) + (laborRate<=30?15:0) + (foodRate<=30?15:0) + (supplyRate<=5?10:0) + (lossRate<=1?15:0) + (late===0?15:0) + 10;
  if (score >= 80) incentiveMsg = "🏆 A評価ペースです！このまま続ければインセンティブ満額が狙えます。";
  else if (score >= 60) incentiveMsg = "もう少しでA評価です。" + (issues[0]||"この調子で頑張りましょう") + "と改善できればA評価が狙えます。";
  else incentiveMsg = "今月の注力ポイントを絞って取り組みましょう。" + (issues[0]||"") + "を改善することが大切です。";

  let managerMessage = "";
  if (goods.length > 0 && issues.length === 0) {
    managerMessage = "すべての項目が目標内です。このペースを維持してください。";
  } else if (goods.length > issues.length) {
    managerMessage = goods[0] + "。" + (issues[0] ? issues[0] + "ので、少し意識してみてください。" : "このままいきましょう。");
  } else {
    managerMessage = (issues[0]||"") + "。" + (issues[1] ? issues[1] + "。" : "") + "やることを絞って取り組みましょう。";
  }

  return { salesRate, remaining, laborRate, foodRate, supplyRate, lossRate, goods, issues, topActions, incentiveMsg, managerMessage, score };
}

const fmt = n => (n||0).toLocaleString("ja-JP");
const pct = (a,b) => b>0 ? Math.round(a/b*1000)/10 : 0;
const statusInfo = key => WEEKLY_STATUSES.find(s => s.key===key) || WEEKLY_STATUSES[0];
const getDeadline = () => {
  const now = new Date();
  const diff = 22*60 - (now.getHours()*60 + now.getMinutes());
  if (diff < 0)   return {label:"締切超過", color:"danger", isLate:true};
  if (diff < 60)  return {label:"あと"+diff+"分", color:"danger", isLate:false};
  const h = Math.floor(diff/60), m = diff%60;
  if (diff < 180) return {label:"あと"+h+"時間"+m+"分", color:"warn", isLate:false};
  return {label:"あと"+h+"時間"+m+"分", color:"safe", isLate:false};
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=M+PLUS+Rounded+1c:wght@700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#FDF6EE;--sf:#fff;--sf2:#FFF9F3;
  --pr:#D4500A;--prd:#A83D07;--prl:#F97316;
  --ac:#2D6A4F;--ac2:#52B788;--dg:#E63946;
  --tx:#1A1208;--tx2:#5C4A35;--tx3:#8B7355;--bd:#E8D5BC;
  --wk:#7C3AED;--wk2:#A78BFA;--wkbg:#F5F3FF;--wkbd:#DDD6FE;
}
body{font-family:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;word-break:normal;overflow-wrap:break-word;}
.app{max-width:480px;margin:0 auto;min-height:100vh;}
.hdr{background:linear-gradient(135deg,var(--pr),var(--prd));color:#fff;padding:13px 15px 11px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 14px rgba(180,60,10,.25);}
.hdr.wh{background:linear-gradient(135deg,var(--wk),#4C1D95);}
.hdr-t{font-family:'M PLUS Rounded 1c',sans-serif;font-size:16px;font-weight:800;}
.hdr-s{font-size:10px;opacity:.8;margin-top:1px;}
.rb{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;}
.lb{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;}
.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid var(--bd);display:flex;padding:5px 0 9px;box-shadow:0 -3px 16px rgba(180,100,30,.10);z-index:100;}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:4px 0;border:none;background:none;font-family:'Noto Sans JP',sans-serif;}
.ni-i{font-size:22px;} .ni-l{font-size:11px;color:var(--tx3);font-weight:500;}
.ni.on .ni-l{color:var(--pr);font-weight:700;} .ni.wk.on .ni-l{color:var(--wk);} .ni.on .ni-i{transform:scale(1.12);}
.content{padding:15px 14px 100px;}
.card{background:var(--sf);border-radius:14px;border:1px solid var(--bd);box-shadow:0 2px 10px rgba(180,100,30,.08);padding:13px;margin-bottom:11px;}
.card.wc{border-color:var(--wkbd);background:var(--wkbg);}
.ct{font-family:'M PLUS Rounded 1c',sans-serif;font-size:13px;font-weight:700;margin-bottom:9px;display:flex;align-items:center;gap:5px;}
.btn{width:100%;padding:14px;border-radius:9px;border:none;font-family:'M PLUS Rounded 1c',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;}
.bpr{background:linear-gradient(135deg,var(--prl),var(--pr));color:#fff;}
.bpr:hover{transform:translateY(-1px);}
.bpr:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.bsec{background:var(--sf2);color:var(--tx2);border:1px solid var(--bd);font-size:12px;}
.bac{background:linear-gradient(135deg,var(--ac2),var(--ac));color:#fff;}
.bwk{background:linear-gradient(135deg,var(--wk2),var(--wk));color:#fff;}
.bsm{padding:6px 13px;font-size:11px;width:auto;border-radius:7px;}
.bxs{padding:3px 9px;font-size:10px;width:auto;border-radius:5px;}
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;word-break:keep-all;}
.bok{background:#D1FAE5;color:#065F46;} .bdr{background:#FEF3C7;color:#92400E;}
.blt{background:#FEE2E2;color:#991B1B;} .bpd{background:#F3F4F6;color:#6B7280;}
.fg{margin-bottom:11px;}
.fl{display:block;font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:5px;}
.fi,.fsel{width:100%;padding:10px 12px;border:1.5px solid var(--bd);border-radius:9px;font-family:'Noto Sans JP',sans-serif;font-size:13px;background:var(--sf2);color:var(--tx);outline:none;}
.fta{width:100%;padding:10px 12px;border:1.5px solid var(--bd);border-radius:9px;font-family:'Noto Sans JP',sans-serif;font-size:13px;background:var(--sf2);color:var(--tx);outline:none;min-height:72px;resize:vertical;}
.fi:focus,.fsel:focus{border-color:var(--pr);}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.qc{display:flex;align-items:center;gap:7px;}
.qb{width:40px;height:40px;border-radius:50%;border:2px solid var(--pr);background:#fff;color:var(--pr);font-size:20px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.qb:active{transform:scale(.9);}
.qi{width:64px;text-align:center;padding:8px;border:1.5px solid var(--bd);border-radius:7px;font-size:15px;font-weight:700;font-family:'Noto Sans JP',sans-serif;}
.login{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;background:linear-gradient(160deg,#FDF0E0,#FFECD2 50%,#FFD8B0);}
.llogo{font-family:'M PLUS Rounded 1c',sans-serif;font-size:28px;font-weight:800;color:var(--pr);margin-bottom:3px;}
.lsub{font-size:11px;color:var(--tx2);margin-bottom:28px;}
.lcard{background:#fff;border-radius:20px;padding:22px 18px;box-shadow:0 12px 48px rgba(180,80,10,.18);width:100%;max-width:360px;}
.cdc{border-radius:13px;padding:16px;color:#fff;margin-bottom:11px;overflow:hidden;}
.cd-safe{background:linear-gradient(135deg,var(--ac),#1B4332);}
.cd-warn{background:linear-gradient(135deg,#D97706,#92400E);}
.cd-danger{background:linear-gradient(135deg,#DC2626,#7F1D1D);}
.cd-wk{background:linear-gradient(135deg,var(--wk),#4C1D95);}
.cdtime{font-family:'M PLUS Rounded 1c',sans-serif;font-size:34px;font-weight:800;line-height:1.1;white-space:nowrap;overflow:visible;word-break:keep-all;}
.cdlbl{font-size:10px;opacity:.85;margin-bottom:1px;white-space:nowrap;} .cdsub{font-size:10px;opacity:.8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.srow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bd);}
.srow:last-child{border-bottom:none;}
.sname{font-weight:700;font-size:13px;} .sdet{font-size:11px;color:var(--tx3);margin-top:2px;}
.irow{background:var(--sf2);border-radius:9px;border:1px solid var(--bd);padding:11px;margin-bottom:7px;}
.irow.ic{border-color:#EF4444;background:#FFF5F5;}
.inm{font-weight:700;font-size:13px;margin-bottom:2px;}
.imt{font-size:10px;color:var(--tx3);margin-bottom:5px;}
.caut{font-size:10px;color:#DC2626;font-weight:700;background:#FEE2E2;border-radius:5px;padding:2px 7px;display:inline-block;margin-bottom:5px;}
.wirow{background:#fff;border-radius:9px;border:1.5px solid var(--wkbd);padding:11px;margin-bottom:7px;}
.wname{font-weight:800;font-size:13px;color:var(--wk);margin-bottom:3px;}
.wg2{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px;}
.wf label{font-size:9px;color:var(--tx3);font-weight:700;display:block;margin-bottom:2px;}
.cats{display:flex;gap:5px;overflow-x:auto;padding-bottom:3px;margin-bottom:11px;scrollbar-width:none;}
.cats::-webkit-scrollbar{display:none;}
.ctab{padding:5px 11px;border-radius:20px;font-size:10px;font-weight:700;border:1.5px solid var(--bd);cursor:pointer;white-space:nowrap;background:#fff;color:var(--tx2);font-family:'Noto Sans JP',sans-serif;}
.ctab.on{background:var(--pr);color:#fff;border-color:var(--pr);}
.ctab.won{background:var(--wk);color:#fff;border-color:var(--wk);}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.sc{background:var(--sf2);border-radius:9px;border:1px solid var(--bd);padding:9px;text-align:center;}
.sv{font-family:'M PLUS Rounded 1c',sans-serif;font-size:19px;font-weight:800;color:var(--pr);}
.sl{font-size:9px;color:var(--tx3);margin-top:2px;}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;z-index:200;}
.sheet{background:#fff;width:100%;max-width:480px;margin:0 auto;border-radius:20px 20px 0 0;padding:20px 15px 34px;max-height:90vh;overflow-y:auto;}
.cabt{background:linear-gradient(135deg,#34D399,#059669);color:#fff;border-radius:13px;padding:16px;margin-bottom:11px;text-align:center;}
.cabkg{font-family:'M PLUS Rounded 1c',sans-serif;font-size:40px;font-weight:800;line-height:1;}
.al{border-radius:9px;padding:9px 11px;margin-bottom:9px;font-size:11px;display:flex;align-items:flex-start;gap:6px;}
.aw{background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;}
.ai{background:#EFF6FF;border:1px solid #3B82F6;color:#1E3A8A;}
.ad{background:#FEE2E2;border:1px solid #EF4444;color:#991B1B;}
.ao{background:#ECFDF5;border:1px solid #10B981;color:#065F46;}
.awk{background:#EDE9FE;border:1px solid #7C3AED;color:#4C1D95;}
.tabs{display:flex;margin-bottom:13px;border-radius:9px;overflow:hidden;border:1.5px solid var(--bd);}
.tab{flex:1;padding:8px;text-align:center;font-size:11px;font-weight:700;cursor:pointer;background:#fff;color:var(--tx2);border:none;font-family:'Noto Sans JP',sans-serif;}
.tab.on{background:var(--pr);color:#fff;}
.ci{display:flex;align-items:center;gap:9px;padding:9px;background:var(--sf2);border-radius:9px;border:1.5px solid var(--bd);margin-bottom:5px;cursor:pointer;}
.ci.ck{background:#ECFDF5;border-color:var(--ac2);}
.cbox{width:22px;height:22px;border-radius:5px;border:2px solid var(--bd);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;}
.ci.ck .cbox{background:var(--ac2);border-color:var(--ac2);color:#fff;}
.rst{display:flex;align-items:flex-start;gap:9px;padding:9px 0;position:relative;}
.rst::before{content:'';position:absolute;left:12px;top:31px;width:2px;height:calc(100% - 10px);background:var(--bd);}
.rst:last-child::before{display:none;}
.rdt{width:26px;height:26px;border-radius:50%;background:var(--pr);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;z-index:1;}
.rdt.dn{background:var(--ac2);}
.pb{height:6px;background:var(--bd);border-radius:4px;overflow:hidden;margin:3px 0;}
.pf{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--ac2),var(--ac));}
.spl{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap;word-break:keep-all;flex-shrink:0;}
.sect{font-family:'M PLUS Rounded 1c',sans-serif;font-size:16px;font-weight:800;color:var(--tx);margin-bottom:13px;display:flex;align-items:center;gap:6px;}
.sect.wkt{color:var(--wk);}
.dv{height:1px;background:var(--bd);margin:11px 0;}
.fb{display:flex;justify-content:space-between;align-items:center;}
.fw7{font-weight:700;} .fs11{font-size:12px;} .fs10{font-size:11px;}
.txm{color:var(--tx3);} .txr{color:var(--dg);} .txa{color:var(--ac);} .txa2{color:var(--wk);}
.empty{text-align:center;padding:32px 14px;color:var(--tx3);}
.ddv{background:linear-gradient(90deg,var(--pr),var(--prl));color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:9px;}
.wdv{background:linear-gradient(90deg,var(--wk),var(--wk2));color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;margin-bottom:9px;}
.goal-card{border-radius:14px;padding:15px;margin-bottom:11px;border:2px solid #10B981;background:linear-gradient(135deg,#F0FDF4,#DCFCE7);}
.goal-card.warn{border-color:#F59E0B;background:linear-gradient(135deg,#FFFBEB,#FEF3C7);}
.goal-card.alert{border-color:#EF4444;background:linear-gradient(135deg,#FFF5F5,#FEE2E2);}
.goal-title{font-family:'M PLUS Rounded 1c',sans-serif;font-size:14px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:6px;}
.goal-big{font-family:'M PLUS Rounded 1c',sans-serif;font-size:28px;font-weight:800;line-height:1;color:var(--ac);}
.goal-big.warn{color:#D97706;} .goal-big.alert{color:var(--dg);}
.goal-bar-wrap{margin:8px 0;}
.goal-bar-bg{height:10px;background:rgba(0,0,0,.08);border-radius:6px;overflow:hidden;}
.goal-bar-fill{height:100%;border-radius:6px;transition:width .6s;}
.rate-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06);}
.rate-row:last-child{border-bottom:none;}
.rate-label{font-size:11px;color:var(--tx2);font-weight:700;}
.rate-val{font-size:13px;font-weight:800;}
.rate-val.ok{color:var(--ac);}  .rate-val.ng{color:var(--dg);}  .rate-val.warn{color:#D97706;}
.action-list{list-style:none;padding:0;}
.action-list li{display:flex;align-items:flex-start;gap:7px;padding:5px 0;font-size:12px;font-weight:700;color:var(--tx2);}
.action-num{width:20px;height:20px;border-radius:50%;background:var(--pr);color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;}
.inc-banner{border-radius:10px;padding:10px 12px;font-size:11px;font-weight:700;margin-bottom:10px;line-height:1.5;}
.inc-banner.a{background:#D1FAE5;color:#065F46;border:1px solid #10B981;}
.inc-banner.b{background:#FEF3C7;color:#92400E;border:1px solid #F59E0B;}
.inc-banner.c{background:#FEE2E2;color:#991B1B;border:1px solid #EF4444;}
.chip{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;margin:2px;}
.chip-ok{background:#D1FAE5;color:#065F46;} .chip-ng{background:#FEE2E2;color:#991B1B;} .chip-warn{background:#FEF3C7;color:#92400E;}
`;

// ============================================================
// 店長向け 目標カードコンポーネント
// ============================================================
// ============================================================
// 店長向け：年間売上目標カード
// ============================================================
function YearlyGoalCard({storeId, yearlyGoals, monthlyResults, isWeekly}) {
  const goal = yearlyGoals.find(g => g.storeId === storeId && g.year === THIS_YEAR);
  if (!goal || goal.status !== "公開中") return null;

  const now = new Date();
  const curMonthKey = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
  const prevMonthKey = (() => { const d = new Date(now); d.setMonth(d.getMonth()-1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); })();

  // 今年の月別実績を集計
  const yearResults = monthlyResults.filter(r => r.storeId === storeId && r.month.startsWith(String(THIS_YEAR)));
  const cumulativeSales = yearResults.reduce((s,r) => s+r.sales, 0);
  const annualRate = goal.annualSalesTarget > 0 ? Math.round(cumulativeSales / goal.annualSalesTarget * 100) : 0;
  const remaining = Math.max(0, goal.annualSalesTarget - cumulativeSales);

  const curMonthTarget = goal.monthlySalesTargets?.[curMonthKey] || Math.floor(goal.annualSalesTarget/12);
  const curResult = monthlyResults.find(r => r.storeId===storeId && r.month===curMonthKey);
  const curSales = curResult?.sales || 0;
  const curRate = curMonthTarget > 0 ? Math.round(curSales / curMonthTarget * 100) : 0;
  const curRemaining = Math.max(0, curMonthTarget - curSales);

  const lastResult = monthlyResults.find(r => r.storeId===storeId && r.month===prevMonthKey);
  const lastTarget = goal.monthlySalesTargets?.[prevMonthKey] || Math.floor(goal.annualSalesTarget/12);
  const lastRate = lastResult && lastTarget > 0 ? Math.round(lastResult.sales / lastTarget * 100) : null;
  const lastLaborRate  = lastResult?.sales > 0 ? pct(lastResult.laborCost,    lastResult.sales) : null;
  const lastFoodRate   = lastResult?.sales > 0 ? pct(lastResult.foodOrderCost, lastResult.sales) : null;
  const lastSupplyRate = lastResult?.sales > 0 ? pct(lastResult.supplyOrderCost,lastResult.sales) : null;
  const lastDeadlineRate = lastResult?.totalOrders > 0 ? Math.round(lastResult.onTimeOrders/lastResult.totalOrders*100) : null;

  const advice = generateYearlyAdvice(goal, lastResult, curResult);

  const rateColor = r => r >= 100 ? "var(--ac)" : r >= 90 ? "#D97706" : "var(--dg)";
  const rateClass = r => r >= 100 ? "" : r >= 90 ? "warn" : "alert";

  return (
    <div style={{marginBottom:11}}>
      {/* 年間売上目標カード */}
      <div className="goal-card" style={{marginBottom:9}}>
        <div className="goal-title">🎯 {THIS_YEAR}年 年間売上目標</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:6}}>
          <div>
            <div className="fs10 txm" style={{fontWeight:700,marginBottom:2}}>年間目標</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:13,fontWeight:800}}>¥{fmt(goal.annualSalesTarget)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="fs10 txm">年間累計</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:22,fontWeight:800,color:rateColor(annualRate)}}>{annualRate}%</div>
          </div>
        </div>
        <div className="goal-bar-bg"><div className="goal-bar-fill" style={{width:Math.min(100,annualRate)+"%",background:rateColor(annualRate)}}/></div>
        <div style={{fontSize:12,color:"var(--tx2)",marginTop:5,fontWeight:700}}>
          {remaining > 0 ? "年間目標まであと ¥"+fmt(remaining) : "🎉 年間目標達成！"}
        </div>
        <div style={{fontSize:11,color:"var(--tx3)",marginTop:2}}>累計売上: ¥{fmt(cumulativeSales)}</div>
      </div>

      {/* 今月の進捗 */}
      <div className={"goal-card "+(curRate>=100?"":curRate>=85?"warn":"alert")} style={{marginBottom:9}}>
        <div className="goal-title">📅 今月の売上進捗</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:4}}>
          <div className="fs10 txm" style={{fontWeight:700}}>月間目標 ¥{fmt(curMonthTarget)}</div>
          <div className={"goal-big "+(rateClass(curRate))}>{curRate}%</div>
        </div>
        <div className="goal-bar-bg"><div className="goal-bar-fill" style={{width:Math.min(100,curRate)+"%",background:rateColor(curRate)}}/></div>
        <div style={{fontSize:12,color:"var(--tx2)",marginTop:5,fontWeight:700}}>
          {curRemaining > 0 ? "あと ¥"+fmt(curRemaining)+" で今月目標達成" : "🎉 今月の目標達成！"}
        </div>
        <div style={{fontSize:11,color:"var(--tx3)",marginTop:2}}>現在売上: ¥{fmt(curSales)}</div>
      </div>

      {/* 先月の実績 */}
      {lastResult && (
        <div className="card" style={{marginBottom:9}}>
          <div className="ct">📊 先月の実績（{prevMonthKey}）</div>
          <div className="rate-row">
            <div className="rate-label">売上達成率</div>
            <div className={"rate-val "+(lastRate>=100?"ok":lastRate>=90?"warn":"ng")}>{lastRate}%</div>
          </div>
          {lastLaborRate !== null && (
            <div className="rate-row">
              <div className="rate-label">人件費率</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div className="fs10 txm">目標{goal.laborRateTarget}%</div>
                <div className={"rate-val "+(lastLaborRate<=goal.laborRateTarget?"ok":lastLaborRate<=goal.laborRateTarget*1.1?"warn":"ng")}>{lastLaborRate}% {lastLaborRate<=goal.laborRateTarget?"✅":"⚠️"}</div>
              </div>
            </div>
          )}
          {lastFoodRate !== null && (
            <div className="rate-row">
              <div className="rate-label">食材費率</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div className="fs10 txm">目標{goal.foodRateTarget}%</div>
                <div className={"rate-val "+(lastFoodRate<=goal.foodRateTarget?"ok":lastFoodRate<=goal.foodRateTarget*1.1?"warn":"ng")}>{lastFoodRate}% {lastFoodRate<=goal.foodRateTarget?"✅":"⚠️"}</div>
              </div>
            </div>
          )}
          {lastSupplyRate !== null && (
            <div className="rate-row">
              <div className="rate-label">備品費率</div>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <div className="fs10 txm">目標{goal.supplyRateTarget}%</div>
                <div className={"rate-val "+(lastSupplyRate<=goal.supplyRateTarget?"ok":lastSupplyRate<=goal.supplyRateTarget*1.2?"warn":"ng")}>{lastSupplyRate}% {lastSupplyRate<=goal.supplyRateTarget?"✅":"⚠️"}</div>
              </div>
            </div>
          )}
          {lastDeadlineRate !== null && (
            <div className="rate-row">
              <div className="rate-label">締切遵守率</div>
              <div className={"rate-val "+(lastDeadlineRate>=(goal.deadlineRateTarget||95)?"ok":"warn")}>{lastDeadlineRate}% ｜ 締切後{lastResult.lateOrders}回</div>
            </div>
          )}
        </div>
      )}

      {/* AIアドバイス */}
      <div className={"inc-banner "+(advice.goodPoints.length>=advice.issues.length?"a":"b")} style={{marginBottom:9}}>
        💬 {advice.summaryMessage}
      </div>
      {advice.goodPoints.length > 0 && (
        <div style={{marginBottom:7}}>
          {advice.goodPoints.map(g => <span key={g} className="chip chip-ok">✓ {g}</span>)}
        </div>
      )}

      {/* 今月やること */}
      <div className="goal-title" style={{fontSize:13,marginBottom:6}}>📝 今月やること</div>
      <ul className="action-list">
        {advice.actionItems.map((a,i) => (
          <li key={i}><span className="action-num">{i+1}</span><span>{a}</span></li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 管理者：年間目標管理画面（タブ付き）
// ============================================================
function YearlyGoalAdmin({yearlyGoals, setYearlyGoals, monthlyResults, setMonthlyResults, orders, weeklyOrders, allItems}) {
  const [tab, setTab] = useState("yearly");
  const [selStore, setSelStore] = useState(STORES_INIT[0].id);
  const [selMonth, setSelMonth] = useState(THIS_MONTH);
  const [form, setForm] = useState(null);
  const [resultForm, setResultForm] = useState(null);
  const [autoCalc, setAutoCalc] = useState(null);

  const goal = yearlyGoals.find(g => g.storeId===selStore && g.year===THIS_YEAR);
  const result = monthlyResults.find(r => r.storeId===selStore && r.month===selMonth);

  const setF = (k,v) => setForm(p => ({...p,[k]:v}));
  const setM = (k,v) => setResultForm(p => ({...p,[k]:v}));
  const setMonthTarget = (mKey,v) => setForm(p => ({...p, monthlySalesTargets:{...p.monthlySalesTargets,[mKey]:+v}}));

  const startGoalEdit = () => setForm(goal ? {...goal, monthlySalesTargets:{...goal.monthlySalesTargets}} : {
    storeId:selStore, year:THIS_YEAR, annualSalesTarget:24000000,
    monthlySalesTargets:buildMonthlySalesTargets(THIS_YEAR,24000000),
    laborRateTarget:30, foodRateTarget:30, supplyRateTarget:5, deadlineRateTarget:95,
    managerMessage:"", status:"公開中",
  });

  const autoSplit = () => {
    if (!form) return;
    setForm(p => ({...p, monthlySalesTargets:buildMonthlySalesTargets(THIS_YEAR, p.annualSalesTarget)}));
  };

  const saveGoal = () => {
    setYearlyGoals(p => {
      const exists = p.some(g => g.storeId===selStore && g.year===THIS_YEAR);
      return exists ? p.map(g => g.storeId===selStore && g.year===THIS_YEAR ? {...form} : g) : [...p, {...form}];
    });
    setForm(null);
  };

  const startResultEdit = () => {
    const r = result || {storeId:selStore,month:selMonth,sales:0,laborCost:0,foodOrderCost:0,supplyOrderCost:0,totalOrders:0,onTimeOrders:0,lateOrders:0,adminMemo:""};
    setResultForm({...r});
  };

  const calcAuto = () => {
    const c = calcOrderCostByMonth(orders, weeklyOrders, allItems, selStore, selMonth);
    setAutoCalc(c);
    setResultForm(p => p ? {...p, foodOrderCost:c.foodCost, supplyOrderCost:c.supplyCost, totalOrders:c.totalOrders, lateOrders:c.lateOrders, onTimeOrders:c.totalOrders-c.lateOrders} : p);
  };

  const saveResult = () => {
    setMonthlyResults(p => {
      const exists = p.some(r => r.storeId===selStore && r.month===selMonth);
      return exists ? p.map(r => r.storeId===selStore && r.month===selMonth ? {...resultForm} : r) : [...p, {...resultForm}];
    });
    setResultForm(null);
    setAutoCalc(null);
  };

  const togglePublish = () => setYearlyGoals(p => p.map(g => g.storeId===selStore && g.year===THIS_YEAR ? {...g,status:g.status==="公開中"?"非公開":"公開中"} : g));

  // 月キー一覧
  const monthKeys = [];
  for (let m=1; m<=12; m++) monthKeys.push(THIS_YEAR+"-"+String(m).padStart(2,"0"));

  // 発注集計サマリー
  const storeName = STORES_INIT.find(s=>s.id===selStore)?.name||"";
  const labelRow = (lbl,val,tgt,unit="%") => {
    const ok = tgt ? val <= tgt : null;
    const col = ok===null?"var(--tx)":ok?"var(--ac)":"var(--dg)";
    return (<div className="rate-row" key={lbl}><div className="rate-label">{lbl}</div><div style={{fontWeight:700,color:col}}>{val}{unit}{tgt?<span className="fs10 txm"> 目標{tgt}{unit}</span>:""}</div></div>);
  };

  return (
    <div>
      <div className="sect wkt">📈 年間目標・月次実績管理</div>

      {/* 店舗選択 */}
      <div className="fg">
        <label className="fl">店舗を選択</label>
        <select className="fsel" value={selStore} onChange={e=>{setSelStore(+e.target.value);setForm(null);setResultForm(null);setAutoCalc(null);}}>
          {STORES_INIT.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* タブ */}
      <div className="tabs">
        {[["yearly","🎯 年間目標設定"],["result","📊 月次実績入力"],["calc","🔍 発注履歴集計"],["preview","👀 店長プレビュー"]].map(([k,l])=>(
          <button key={k} className={"tab "+(tab===k?"on":"")} onClick={()=>{setTab(k);setForm(null);setResultForm(null);setAutoCalc(null);}}>{l}</button>
        ))}
      </div>

      {/* ── 年間目標設定 ── */}
      {tab==="yearly" && (<>
        <div className="card" style={{background:"linear-gradient(135deg,#F0F9FF,#E0F2FE)"}}>
          <div className="ct">🎯 {storeName} ｜ {THIS_YEAR}年 年間目標</div>
          {goal ? (<>
            <div className="fb" style={{marginBottom:7}}>
              <div><div className="fw7 fs11">年間売上目標: ¥{fmt(goal.annualSalesTarget)}</div><div className="fs10 txm">人件費率目標: {goal.laborRateTarget}% ｜ 食材費率目標: {goal.foodRateTarget}%</div></div>
              <span className={"badge "+(goal.status==="公開中"?"bok":"bpd")}>{goal.status==="公開中"?"📢 公開中":"🔒 非公開"}</span>
            </div>
            <div className="fs10 txm" style={{marginBottom:6}}>月別目標（上半期）:</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,fontSize:10}}>
              {monthKeys.slice(0,6).map(k=><div key={k} style={{background:"var(--sf2)",padding:"4px 6px",borderRadius:6}}>{k.slice(5)}月 ¥{fmt(goal.monthlySalesTargets?.[k])}</div>)}
            </div>
            <div className="fs10 txm" style={{margin:"6px 0 4px"}}>月別目標（下半期）:</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,fontSize:10}}>
              {monthKeys.slice(6).map(k=><div key={k} style={{background:"var(--sf2)",padding:"4px 6px",borderRadius:6}}>{k.slice(5)}月 ¥{fmt(goal.monthlySalesTargets?.[k])}</div>)}
            </div>
          </>) : <div className="txm fs11">まだ設定されていません</div>}
          <div style={{display:"flex",gap:7,marginTop:10}}>
            <button className="btn bpr bsm" onClick={startGoalEdit}>{goal?"✏️ 編集":"➕ 目標を設定"}</button>
            {goal && <button className="btn bsec bsm" onClick={togglePublish}>{goal.status==="公開中"?"非公開":"店長へ公開"}</button>}
          </div>
        </div>

        {form && (
          <div className="card">
            <div className="ct">✏️ 年間目標を編集</div>
            <div className="fg"><label className="fl">年間売上目標（円）</label><input type="number" className="fi" value={form.annualSalesTarget} onChange={e=>setF("annualSalesTarget",+e.target.value)}/></div>
            <button className="btn bac bsm" style={{marginBottom:11}} onClick={autoSplit}>🔄 月別を均等割りで自動計算</button>
            <div className="fs11 fw7" style={{marginBottom:6}}>月別売上目標（手動修正可）:</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {monthKeys.map(k=>(
                <div key={k} className="fg" style={{marginBottom:5}}>
                  <label className="fl">{k.slice(5)}月（円）</label>
                  <input type="number" className="fi" style={{padding:"6px 9px",fontSize:12}} value={form.monthlySalesTargets?.[k]||0} onChange={e=>setMonthTarget(k,e.target.value)}/>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:4}}>
              {[["人件費率目標(%)","laborRateTarget"],["食材費率目標(%)","foodRateTarget"],["備品費率目標(%)","supplyRateTarget"],["締切遵守率目標(%)","deadlineRateTarget"]].map(([l,k])=>(
                <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fi" style={{padding:"7px 9px",fontSize:12}} value={form[k]} onChange={e=>setF(k,+e.target.value)}/></div>
              ))}
            </div>
            <div className="fg"><label className="fl">店長への年間方針メッセージ</label><textarea className="fta" style={{fontSize:12}} value={form.managerMessage} onChange={e=>setF("managerMessage",e.target.value)} placeholder="例：今年は客単価アップと食材費の削減を目指しましょう。"/></div>
            <div style={{display:"flex",gap:7}}>
              <button className="btn bpr bsm" onClick={saveGoal}>保存する</button>
              <button className="btn bsec bsm" onClick={()=>setForm(null)}>キャンセル</button>
            </div>
          </div>
        )}
      </>)}

      {/* ── 月次実績入力 ── */}
      {tab==="result" && (<>
        <div className="fg">
          <label className="fl">対象月を選択</label>
          <select className="fsel" value={selMonth} onChange={e=>{setSelMonth(e.target.value);setResultForm(null);}}>
            {monthKeys.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="card">
          <div className="ct">📊 {storeName} ｜ {selMonth} の実績</div>
          {result ? (<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,fontSize:11}}>
              <div>売上: <b>¥{fmt(result.sales)}</b></div>
              <div>人件費: <b>¥{fmt(result.laborCost)}</b></div>
              <div>食材費: <b>¥{fmt(result.foodOrderCost)}</b></div>
              <div>備品費: <b>¥{fmt(result.supplyOrderCost)}</b></div>
              <div>発注回数: <b>{result.totalOrders}回</b></div>
              <div>締切後: <b style={{color:result.lateOrders>0?"var(--dg)":"var(--ac)"}}>{result.lateOrders}回</b></div>
            </div>
            {result.adminMemo && <div className="al ai" style={{marginTop:7}}><span>📝</span>{result.adminMemo}</div>}
          </>) : <div className="txm fs11">実績データがありません</div>}
          <button className="btn bpr bsm" style={{marginTop:9}} onClick={startResultEdit}>{result?"✏️ 実績を編集":"➕ 実績を入力"}</button>
        </div>

        {resultForm && (
          <div className="card">
            <div className="ct">✏️ {selMonth} の実績を入力</div>
            <div className="al ai" style={{marginBottom:9}}><span>💡</span>「発注履歴集計」タブで自動計算した後、ここに反映できます</div>
            {[["月間売上（円）","sales"],["人件費（円）","laborCost"]].map(([l,k])=>(
              <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fi" value={resultForm[k]} onChange={e=>setM(k,+e.target.value)}/></div>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {[["食材発注額（円）","foodOrderCost"],["備品発注額（円）","supplyOrderCost"],["発注総回数","totalOrders"],["締切を守れた回数","onTimeOrders"],["締切後発注回数","lateOrders"]].map(([l,k])=>(
                <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fi" style={{padding:"7px 9px",fontSize:12}} value={resultForm[k]} onChange={e=>setM(k,+e.target.value)}/></div>
              ))}
            </div>
            <div className="fg"><label className="fl">管理者メモ</label><textarea className="fta" style={{fontSize:12,minHeight:52}} value={resultForm.adminMemo} onChange={e=>setM("adminMemo",e.target.value)} placeholder="備考など"/></div>
            {/* 費率プレビュー */}
            {resultForm.sales > 0 && (
              <div className="card" style={{padding:"9px 11px",marginBottom:9}}>
                <div className="fs10 txm fw7" style={{marginBottom:5}}>費率プレビュー</div>
                {[["人件費率",pct(resultForm.laborCost,resultForm.sales),goal?.laborRateTarget],["食材費率",pct(resultForm.foodOrderCost,resultForm.sales),goal?.foodRateTarget],["備品費率",pct(resultForm.supplyOrderCost,resultForm.sales),goal?.supplyRateTarget],["締切遵守率",resultForm.totalOrders>0?Math.round(resultForm.onTimeOrders/resultForm.totalOrders*100):100,goal?.deadlineRateTarget]].map(([l,v,t])=>labelRow(l,v,t))}
              </div>
            )}
            <div style={{display:"flex",gap:7}}>
              <button className="btn bpr bsm" onClick={saveResult}>保存する</button>
              <button className="btn bsec bsm" onClick={()=>setResultForm(null)}>キャンセル</button>
            </div>
          </div>
        )}
      </>)}

      {/* ── 発注履歴集計 ── */}
      {tab==="calc" && (<>
        <div className="fg">
          <label className="fl">集計する月を選択</label>
          <select className="fsel" value={selMonth} onChange={e=>setSelMonth(e.target.value)}>
            {monthKeys.map(k=><option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="card">
          <div className="ct">🔍 {storeName} ｜ {selMonth} 発注履歴集計</div>
          <div className="al ai"><span>ℹ️</span>発注履歴（orders/weeklyOrders）から食材費・備品費を自動計算します。</div>
          <button className="btn bac bsm" style={{marginBottom:9}} onClick={calcAuto}>🔄 今すぐ集計する</button>
          {autoCalc && (<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:9}}>
              {[["食材費合計","¥"+fmt(autoCalc.foodCost)],["備品費合計","¥"+fmt(autoCalc.supplyCost)],["発注回数",autoCalc.totalOrders+"回"],["締切後発注",autoCalc.lateOrders+"回"]].map(([l,v])=>(
                <div key={l} className="sc"><div className="sv" style={{fontSize:14}}>{v}</div><div className="sl">{l}</div></div>
              ))}
            </div>
            <div className="al ao"><span>✅</span>上記の金額を月次実績に反映できます。</div>
            <button className="btn bpr bsm" onClick={()=>{setTab("result");startResultEdit();}}>月次実績入力に移動して反映する →</button>
          </>)}
        </div>
        {/* 年間累計サマリー */}
        {goal && (<div className="card">
          <div className="ct">📊 {THIS_YEAR}年 月別実績サマリー</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",fontSize:10,borderCollapse:"collapse"}}>
              <thead><tr style={{background:"var(--sf2)"}}>
                {["月","売上","食材費率","備品費率","締切遵守率"].map(h=><th key={h} style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {monthKeys.map(k=>{
                  const r = monthlyResults.find(r=>r.storeId===selStore&&r.month===k);
                  const fr = r?.sales>0?pct(r.foodOrderCost,r.sales):"-";
                  const sr = r?.sales>0?pct(r.supplyOrderCost,r.sales):"-";
                  const dr = r?.totalOrders>0?Math.round(r.onTimeOrders/r.totalOrders*100)+"%":"-";
                  return(<tr key={k}>
                    <td style={{padding:"4px",border:"1px solid var(--bd)",textAlign:"center"}}>{k.slice(5)}月</td>
                    <td style={{padding:"4px",border:"1px solid var(--bd)",textAlign:"right"}}>{r?"¥"+fmt(r.sales):"-"}</td>
                    <td style={{padding:"4px",border:"1px solid var(--bd)",textAlign:"center",color:typeof fr==="number"&&fr>goal.foodRateTarget?"var(--dg)":"inherit"}}>{typeof fr==="number"?fr+"%":fr}</td>
                    <td style={{padding:"4px",border:"1px solid var(--bd)",textAlign:"center"}}>{typeof sr==="number"?sr+"%":sr}</td>
                    <td style={{padding:"4px",border:"1px solid var(--bd)",textAlign:"center"}}>{dr}</td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>)}
      </>)}

      {/* ── 店長プレビュー ── */}
      {tab==="preview" && (<>
        <div className="al ai"><span>👀</span>店長ページに表示されるカードのプレビューです</div>
        <YearlyGoalCard storeId={selStore} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} isWeekly={STORES_INIT.find(s=>s.id===selStore)?.type==="weekly"}/>
      </>)}
    </div>
  );
}

function GoalCard({storeId, storeGoals, isWeekly}) {
  const goal = storeGoals.find(g => g.storeId === storeId);
  const m    = MONTH_DATA.find(d => d.storeId === storeId);
  if (!goal || !m || goal.status !== "公開中") return null;

  const adv = generateGoalAdvice(goal, m);
  const cardClass = adv.salesRate >= 90 && adv.issues.length <= 1 ? "goal-card" : adv.issues.length <= 2 ? "goal-card warn" : "goal-card alert";
  const barColor  = adv.salesRate >= 95 ? "#10B981" : adv.salesRate >= 85 ? "#F59E0B" : "#EF4444";
  const incClass  = adv.score >= 80 ? "a" : adv.score >= 60 ? "b" : "c";

  if (isWeekly) {
    return (
      <div className={cardClass} style={{marginBottom:11}}>
        <div className="goal-title">🎯 今月の店舗目標</div>
        <div className="inc-banner" style={{background:"var(--wkbg)",border:"1px solid var(--wkbd)",color:"var(--wk)",marginBottom:8}}>
          📦 則武店は週まとめ発注店舗です。週初めに1週間分をまとめて発注することが評価のポイントです。
        </div>
        <div style={{fontSize:12,fontWeight:700,color:"var(--tx2)",marginBottom:8}}>{adv.incentiveMsg}</div>
        <div style={{marginBottom:10}}>
          {adv.goods.map(g => <span key={g} className="chip chip-ok">✓ {g}</span>)}
          {adv.issues.map(i => <span key={i} className="chip chip-warn">△ {i}</span>)}
        </div>
        <div className="goal-title" style={{fontSize:12,marginBottom:6}}>📝 今週やること</div>
        <ul className="action-list">
          {["週初めに1週間分をまとめて発注する","現在庫を確認してから発注する","お漬物シールとラップの使用数を確認する"].map((a,i) => (
            <li key={i}><span className="action-num">{i+1}</span><span>{a}</span></li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={cardClass} style={{marginBottom:11}}>
      <div className="goal-title">🎯 今月の店舗目標</div>

      {/* 売上達成率 */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:4}}>
          <div className="fs10 txm" style={{fontWeight:700}}>売上達成率</div>
          <div className={"goal-big "+(adv.salesRate>=95?"":adv.salesRate>=85?"warn":"alert")}>{adv.salesRate}%</div>
        </div>
        <div className="goal-bar-bg">
          <div className="goal-bar-fill" style={{width:Math.min(100,adv.salesRate)+"%",background:barColor}}/>
        </div>
        <div style={{fontSize:11,color:"var(--tx2)",marginTop:4,fontWeight:700}}>
          {adv.remaining > 0 ? "あと ¥"+fmt(adv.remaining)+" で今月の売上目標達成" : "🎉 売上目標達成！"}
        </div>
      </div>

      {/* インセンティブバナー */}
      <div className={"inc-banner "+incClass}>{adv.incentiveMsg}</div>

      {/* 各費率 */}
      <div className="card" style={{padding:"10px 12px",marginBottom:10}}>
        <div className="fs10 txm" style={{fontWeight:700,marginBottom:6}}>今月の状態</div>
        {[
          ["人件費率", adv.laborRate,  goal.laborRateTarget,  "%"],
          ["食材費率", adv.foodRate,   goal.foodRateTarget,   "%"],
          ["備品費率", adv.supplyRate, goal.supplyRateTarget, "%"],
          ["ロス率",   adv.lossRate,   goal.lossRateTarget,   "%"],
        ].map(([label, val, target, unit]) => {
          const ok = val <= target;
          const cls = ok ? "rate-val ok" : val <= target*1.1 ? "rate-val warn" : "rate-val ng";
          return (
            <div key={label} className="rate-row">
              <div className="rate-label">{label}</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div className="fs10 txm">目標{target}{unit}</div>
                <div className={cls}>{val}{unit} {ok?"✅":"⚠️"}</div>
              </div>
            </div>
          );
        })}
        {m.lateOrders > 0 && (
          <div className="rate-row">
            <div className="rate-label">締切後発注</div>
            <div className="rate-val ng">{m.lateOrders}回 ⚠️</div>
          </div>
        )}
      </div>

      {/* 良い点 */}
      {adv.goods.length > 0 && (
        <div style={{marginBottom:8}}>
          {adv.goods.map(g => <span key={g} className="chip chip-ok">✓ {g}</span>)}
        </div>
      )}

      {/* やること */}
      <div className="goal-title" style={{fontSize:12,marginBottom:6}}>📝 今月やること</div>
      <ul className="action-list">
        {adv.topActions.map((a, i) => (
          <li key={i}><span className="action-num">{i+1}</span><span>{a}</span></li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// 管理者 目標設定画面
// ============================================================
function GoalSettingAdmin({storeGoals, setStoreGoals}) {
  const [selStore, setSelStore] = useState(STORES_INIT[0].id);
  const [editMode, setEditMode] = useState(false);

  const goal = storeGoals.find(g => g.storeId === selStore);
  const m    = MONTH_DATA.find(d => d.storeId === selStore);
  const adv  = goal && m ? generateGoalAdvice(goal, m) : null;

  const [form, setForm] = useState(null);
  const setF = (k, v) => setForm(p => ({...p, [k]:v}));
  const setAction = (i, v) => setForm(p => { const a=[...p.actionItems]; a[i]=v; return {...p,actionItems:a}; });

  const startEdit = () => { setForm({...goal, actionItems:[...(goal.actionItems||["","",""])]  }); setEditMode(true); };
  const autoFill  = () => {
    if (!adv) return;
    setForm(p => ({...p, managerMessage:adv.managerMessage, actionItems:[...adv.topActions.slice(0,3).concat(["","",""])].slice(0,3) }));
  };
  const save = () => { setStoreGoals(p => p.map(g => g.storeId===selStore ? {...form} : g)); setEditMode(false); };
  const togglePublish = () => setStoreGoals(p => p.map(g => g.storeId===selStore ? {...g,status:g.status==="公開中"?"非公開":"公開中"} : g));

  return (
    <div>
      <div className="sect">🎯 店舗目標設定</div>
      <div className="fg">
        <label className="fl">店舗を選択</label>
        <select className="fsel" value={selStore} onChange={e => { setSelStore(+e.target.value); setEditMode(false); }}>
          {STORES_INIT.map(s => <option key={s.id} value={s.id}>{s.name}{s.type==="weekly"?" 📦":""}</option>)}
        </select>
      </div>

      {goal && m && adv && (
        <>
          {/* 現状サマリー */}
          <div className="card" style={{background:"linear-gradient(135deg,#F0F9FF,#E0F2FE)"}}>
            <div className="ct">📊 {STORES_INIT.find(s=>s.id===selStore)?.name} の今月の現状</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:11}}>
              <div>売上達成率: <b style={{color:adv.salesRate>=95?"var(--ac)":"var(--dg)"}}>{adv.salesRate}%</b></div>
              <div>残り: <b>¥{fmt(adv.remaining)}</b></div>
              <div>食材費率: <b style={{color:adv.foodRate<=30?"var(--ac)":"var(--dg)"}}>{adv.foodRate}%</b></div>
              <div>人件費率: <b style={{color:adv.laborRate<=30?"var(--ac)":"var(--dg)"}}>{adv.laborRate}%</b></div>
              <div>備品費率: <b style={{color:adv.supplyRate<=5?"var(--ac)":"var(--dg)"}}>{adv.supplyRate}%</b></div>
              <div>ロス率: <b style={{color:adv.lossRate<=1?"var(--ac)":"var(--dg)"}}>{adv.lossRate}%</b></div>
              <div>締切後発注: <b style={{color:m.lateOrders>0?"var(--dg)":"var(--ac)"}}>{m.lateOrders}回</b></div>
              <div>推定スコア: <b>{adv.score}点（{adv.score>=80?"A":adv.score>=60?"B":"C"}評価）</b></div>
            </div>
          </div>

          {/* 公開状態 */}
          <div className="fb" style={{marginBottom:11}}>
            <span className={"badge "+(goal.status==="公開中"?"bok":"bpd")}>{goal.status==="公開中"?"📢 公開中":"🔒 非公開"}</span>
            <div style={{display:"flex",gap:7}}>
              <button className="btn bsec bsm" onClick={togglePublish}>{goal.status==="公開中"?"非公開にする":"店長へ公開する"}</button>
              <button className="btn bpr bsm" onClick={startEdit}>✏️ 目標を編集</button>
            </div>
          </div>

          {/* 店長への表示プレビュー */}
          {!editMode && (
            <div className="card">
              <div className="ct">👀 店長への表示プレビュー</div>
              <div style={{fontSize:12,background:"var(--sf2)",padding:10,borderRadius:8,marginBottom:8}}>
                <b>メッセージ：</b>{goal.managerMessage||adv.managerMessage}
              </div>
              <div className="fs10 txm" style={{fontWeight:700,marginBottom:5}}>やること：</div>
              {(goal.actionItems?.filter(a=>a)||adv.topActions).map((a,i) => a ? (
                <div key={i} style={{fontSize:11,padding:"3px 0"}}>　{i+1}. {a}</div>
              ) : null)}
              <button className="btn bac bsm" style={{marginTop:9}} onClick={autoFill}>🤖 AIで自動生成</button>
            </div>
          )}

          {/* 編集フォーム */}
          {editMode && form && (
            <div className="card">
              <div className="ct">✏️ 目標を編集</div>
              <div className="fg"><label className="fl">売上目標（円）</label><input type="number" className="fi" value={form.salesTarget} onChange={e=>setF("salesTarget",+e.target.value)}/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["人件費率目標(%)","laborRateTarget"],["食材費率目標(%)","foodRateTarget"],["備品費率目標(%)","supplyRateTarget"],["ロス率目標(%)","lossRateTarget"]].map(([l,k])=>(
                  <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fi" style={{padding:"8px 10px",fontSize:12}} value={form[k]} onChange={e=>setF(k,+e.target.value)}/></div>
                ))}
              </div>
              <div className="fg">
                <label className="fl">店長へのメッセージ</label>
                <textarea className="fi fta" style={{minHeight:64,fontSize:12}} value={form.managerMessage} onChange={e=>setF("managerMessage",e.target.value)}/>
              </div>
              {[0,1,2].map(i=>(
                <div key={i} className="fg"><label className="fl">やること {i+1}</label><input className="fi" style={{fontSize:12}} value={form.actionItems[i]||""} onChange={e=>setAction(i,e.target.value)} placeholder="例：発注前に在庫を確認する"/></div>
              ))}
              <div style={{display:"flex",gap:8}}>
                <button className="btn bac bsm" onClick={autoFill}>🤖 AIで自動生成</button>
                <button className="btn bpr bsm" onClick={save}>保存する</button>
                <button className="btn bsec bsm" onClick={()=>setEditMode(false)}>キャンセル</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// 店長スコア表示カード
// ============================================================
function ManagerScoreCard({storeId, yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects, onNav}) {
  const goal = yearlyGoals.find(g => g.storeId===storeId && g.year===THIS_YEAR);
  const result = monthlyResults.find(r => r.storeId===storeId && r.month===THIS_MONTH);
  if (!goal || !result) return (
    <div className="card"><div className="ct">🏆 今月の店長スコア</div><div className="txm fs11">実績データが入力されるとスコアが表示されます。</div></div>
  );
  const { score, rank, breakdown, rates } = calcManagerScore(result, goal, weeklyReflects, monthlyReflects, storeId, THIS_MONTH);
  const target = goal.monthlySalesTargets?.[THIS_MONTH] || goal.annualSalesTarget/12;
  const rankInfo = { A:["🏆","A評価","インセンティブ満額対象","var(--ac)","#D1FAE5"], B:["⭐","B評価","インセンティブ一部対象","#D97706","#FEF3C7"], C:["📈","C評価","改善チャレンジ中","#7C3AED","#EDE9FE"], D:["💪","D評価","面談でサポートします","var(--dg)","#FEE2E2"] };
  const [ri, rl, rm, rc, rbg] = rankInfo[rank] || rankInfo.D;

  const improvements = [];
  if (breakdown.salesScore < 25) improvements.push("売上達成率をあと"+Math.round((1-rates.salesRate/100)*target/10000)+"万円改善する");
  if (breakdown.laborScore < 15) improvements.push("人件費率を目標の"+(goal.laborRateTarget||30)+"%以下にする（現在"+rates.laborRate+"%）");
  if (breakdown.foodScore < 15) improvements.push("食材費率を目標の"+(goal.foodRateTarget||30)+"%以下にする（現在"+rates.foodRate+"%）");
  if (breakdown.weeklyScore < 5) improvements.push("週次振り返りを毎週提出する（今月あと"+(4-(weeklyReflects||[]).filter(r=>r.storeId===storeId&&r.month===THIS_MONTH).length)+"回）");
  if (breakdown.monthlyScore < 5) improvements.push("月次振り返りを月末に提出する");

  return (
    <div className="card" style={{background:rbg,borderColor:rc,border:"2px solid "+rc,marginBottom:11}}>
      <div className="fb" style={{marginBottom:10}}>
        <div className="ct" style={{marginBottom:0}}>🏆 今月の店長スコア</div>
        <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:32,fontWeight:800,color:rc}}>{score}<span style={{fontSize:14}}>点</span></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
        <div style={{fontSize:24}}>{ri}</div>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:rc}}>{rl}</div>
          <div style={{fontSize:11,color:"var(--tx2)"}}>{rm}</div>
        </div>
      </div>
      {/* 点数内訳 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:10}}>
        {[["売上達成",breakdown.salesScore,25],["利益管理",breakdown.profitScore,20],["人件費",breakdown.laborScore,15],["食材費",breakdown.foodScore,15],["備品費",breakdown.supplyScore,5],["発注遵守",breakdown.dlScore,5],["週次提出",breakdown.weeklyScore,5],["改善実行",breakdown.actionScore,5],["月次提出",breakdown.monthlyScore,5]].map(([l,v,max])=>(
          <div key={l} style={{background:"rgba(255,255,255,.6)",borderRadius:7,padding:"5px 7px"}}>
            <div style={{fontSize:9,color:"var(--tx3)",fontWeight:700}}>{l}</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:15,fontWeight:800,color:v>=max?"var(--ac)":v>=max*0.6?"#D97706":"var(--dg)"}}>{v}<span style={{fontSize:9,color:"var(--tx3)"}}>/{max}</span></div>
          </div>
        ))}
      </div>
      {/* 改善ポイント */}
      {improvements.length > 0 && (
        <div style={{background:"rgba(255,255,255,.7)",borderRadius:9,padding:"9px 11px",marginBottom:9}}>
          <div style={{fontSize:11,fontWeight:700,marginBottom:5}}>📌 あと{Math.max(0,90-score)}点でA評価になるために：</div>
          {improvements.slice(0,3).map((imp,i)=><div key={i} style={{fontSize:11,color:"var(--tx2)",padding:"2px 0"}}>• {imp}</div>)}
        </div>
      )}
      <button className="btn bsm" style={{background:"rgba(255,255,255,.7)",color:rc,border:"1px solid "+rc,fontFamily:"'M PLUS Rounded 1c',sans-serif"}} onClick={()=>onNav("incentiveCheck")}>
        📊 インセンティブ詳細を見る →
      </button>
    </div>
  );
}

// ============================================================
// 店長：週次振り返り
// ============================================================
function WeeklyReflectScreen({user, weeklyReflects, setWeeklyReflects, adminComments, orders, weeklyOrders, allItems, yearlyGoals, monthlyResults}) {
  const myReflects = (weeklyReflects||[]).filter(r=>r.storeId===user.storeId).sort((a,b)=>b.createdAt-a.createdAt);
  const [mode, setMode] = useState("list"); // "list"|"form"|"result"
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({storeId:user.storeId,month:THIS_MONTH,weekLabel:"",feeling:"",causes:[],nextAction:"",comment:"",createdAt:Date.now()});
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));
  const toggleCause=v=>setForm(p=>({...p,causes:p.causes.includes(v)?p.causes.filter(x=>x!==v):[...p.causes,v]}));

  const goal = yearlyGoals?.find(g=>g.storeId===user.storeId&&g.year===THIS_YEAR);
  const monthTarget = goal?.monthlySalesTargets?.[THIS_MONTH]||(goal?.annualSalesTarget||0)/12;
  const weekDiag = diagnoseWeek(user.storeId, orders||[], weeklyOrders||[], allItems||[], monthTarget);

  const feelings=[{v:"良かった",c:"var(--ac)",bg:"#D1FAE5",e:"😊"},{v:"普通",c:"#D97706",bg:"#FEF3C7",e:"😐"},{v:"悪かった",c:"var(--dg)",bg:"#FEE2E2",e:"😔"}];
  const causes=["客数が少なかった","客単価が低かった","食材費が高かった","備品を使いすぎた","発注が多かった","追加発注が多かった","発注締切が守れなかった","声かけが足りなかった","シフトが重かったかもしれない","その他"];
  const nextActions=["おすすめ商品の声かけを増やす","セット提案を増やす","発注前に在庫確認をする","仕込み量を見直す","備品の使い方を確認する","発注締切前に必ず完了する","店頭POPを見直す","シフト人数を確認する"];

  const weekNum = Math.ceil(new Date().getDate()/7);
  const defaultLabel = new Date().getMonth()+1+"月第"+weekNum+"週";

  const submit = () => {
    const entry = {...form, weekLabel:form.weekLabel||defaultLabel, createdAt:Date.now()};
    setWeeklyReflects(p=>[...(p||[]),entry]);
    setSaved(entry);
    setMode("result");
  };

  const alignment = saved ? checkReflectAlignment(weekDiag, saved.causes) : null;
  const recovery  = saved ? buildRecoveryPlan(weekDiag, saved.nextAction, null) : null;

  if(mode==="result" && saved) return (
    <div>
      <div style={{background:"linear-gradient(135deg,var(--ac),#1B4332)",borderRadius:14,padding:16,marginBottom:13,color:"#fff"}}>
        <div style={{fontSize:15,fontWeight:800,marginBottom:3}}>✅ 振り返りを提出しました</div>
        <div style={{fontSize:12,opacity:.85}}>{saved.weekLabel}</div>
      </div>

      {alignment && (
        <div className="card" style={{marginBottom:13}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:9}}>🔍 振り返りチェック</div>
          <div style={{fontSize:13,color:"var(--tx2)",marginBottom:5}}>あなたが選んだ原因：<b>{saved.causes.join("・")||"なし"}</b></div>
          {weekDiag.topIssue && <div style={{fontSize:13,color:"var(--tx2)",marginBottom:9}}>数字から見た主な課題：<b>{weekDiag.topIssue.label}</b></div>}
          <div style={{fontWeight:800,fontSize:14,color:alignment.level==="一致"?"var(--ac)":"#D97706",marginBottom:alignment.msg?7:0}}>{alignment.level==="一致"?"✅ 一致しています":"⚠️ "+alignment.level}</div>
          {alignment.msg && <div style={{fontSize:13,color:"var(--tx2)"}}>{alignment.msg}</div>}
        </div>
      )}

      {recovery && (
        <div className="card" style={{marginBottom:13}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:11}}>💪 来週の挽回プラン</div>
          <div style={{marginBottom:9}}>
            <div style={{fontSize:12,color:"var(--tx3)",fontWeight:700,marginBottom:4}}>最優先</div>
            <div style={{fontSize:14,fontWeight:800,color:"var(--pr)"}}>{recovery.priority}</div>
          </div>
          {recovery.sub.length>0&&(
            <div style={{marginBottom:9}}>
              <div style={{fontSize:12,color:"var(--tx3)",fontWeight:700,marginBottom:4}}>一緒にやること</div>
              {recovery.sub.map((s,i)=><div key={i} style={{fontSize:13,color:"var(--tx2)",fontWeight:700,padding:"3px 0"}}>• {s}</div>)}
            </div>
          )}
          <div>
            <div style={{fontSize:12,color:"var(--tx3)",fontWeight:700,marginBottom:4}}>来週の目標</div>
            {recovery.goals.map((g,i)=><div key={i} style={{fontSize:13,color:"var(--tx2)",fontWeight:700,padding:"3px 0"}}>• {g}</div>)}
          </div>
        </div>
      )}

      <button className="btn bpr" onClick={()=>setMode("list")}>振り返り一覧に戻る</button>
    </div>
  );

  if(mode==="form") return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:13}}>
        <button className="btn bsec bxs" onClick={()=>setMode("list")}>← 戻る</button>
        <div style={{fontSize:17,fontWeight:800}}>今週の振り返り</div>
      </div>

      {weekDiag.topIssue && (
        <div style={{background:"#FFF3E0",border:"1.5px solid #FB8C00",borderRadius:13,padding:"14px 15px",marginBottom:13}}>
          <div style={{fontSize:13,fontWeight:800,color:"#E65100",marginBottom:8}}>📊 数字から見た今週の課題</div>
          <div style={{fontSize:15,fontWeight:800,color:"var(--tx)",marginBottom:5}}>今週の一番の課題：{weekDiag.topIssue.label}</div>
          <div style={{fontSize:13,color:"var(--tx2)",marginBottom:7}}>{weekDiag.topIssue.reason}</div>
          <div style={{fontSize:12,color:"#E65100",fontWeight:700,marginBottom:4}}>会社としての正解行動：</div>
          {weekDiag.topIssue.action.slice(0,2).map((a,i)=><div key={i} style={{fontSize:13,color:"var(--tx2)",fontWeight:700}}>→ {a}</div>)}
        </div>
      )}

      {weekDiag.issues.length===0 && (
        <div className="al ao" style={{marginBottom:13}}><span>✅</span>今週は数字上の大きな課題はありません。この調子を続けましょう。</div>
      )}

      {/* シフト確認（週次は人件費断定しない） */}
      <div style={{background:"#F3F4F6",border:"1px solid #D1D5DB",borderRadius:12,padding:"12px 14px",marginBottom:13}}>
        <div style={{fontSize:13,fontWeight:800,color:"var(--tx)",marginBottom:5}}>📋 シフトの確認</div>
        <div style={{fontSize:12,color:"var(--tx3)",marginBottom:5}}>人件費は月末に確定します。今週は売上に対してシフトが重くなっていなかったか確認しましょう。</div>
        {["暇な時間帯に人数が多すぎなかったか","早上がり判断ができたか","売上予測を見てシフトを組めたか"].map((s,i)=><div key={i} style={{fontSize:12,color:"var(--tx2)",padding:"2px 0"}}>• {s}</div>)}
      </div>

      <div className="card" style={{marginBottom:11}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:12}}>今週はどうでしたか？</div>
        <div style={{display:"flex",gap:9}}>
          {feelings.map(f=>(
            <button key={f.v} onClick={()=>setF("feeling",f.v)} style={{flex:1,padding:"14px 4px",borderRadius:12,border:"2px solid "+(form.feeling===f.v?f.c:"var(--bd)"),background:form.feeling===f.v?f.bg:"#fff",color:form.feeling===f.v?f.c:"var(--tx3)",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"Noto Sans JP"}}>
              <div style={{fontSize:22,marginBottom:3}}>{f.e}</div>{f.v}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{marginBottom:11}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:10}}>原因は何だと思いますか？<span style={{fontSize:12,color:"var(--tx3)",fontWeight:400,marginLeft:5}}>複数選択可</span></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {causes.map(v=>{const s=form.causes.includes(v);return(
            <button key={v} onClick={()=>toggleCause(v)} style={{padding:"9px 13px",borderRadius:20,border:"1.5px solid "+(s?"var(--wk)":"var(--bd)"),background:s?"var(--wkbg)":"#fff",color:s?"var(--wk)":"var(--tx2)",fontWeight:s?700:400,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"Noto Sans JP"}}>{s?"☑ ":"☐ "}{v}</button>
          );})}
        </div>
      </div>

      <div className="card" style={{marginBottom:11}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:10}}>来週やることを1つ選んでください</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {nextActions.map(v=>{const s=form.nextAction===v;return(
            <button key={v} onClick={()=>setF("nextAction",v)} style={{padding:"12px 14px",borderRadius:10,border:"1.5px solid "+(s?"var(--ac)":"var(--bd)"),background:s?"#ECFDF5":"#fff",color:s?"var(--ac)":"var(--tx2)",fontWeight:s?800:400,fontSize:14,cursor:"pointer",textAlign:"left",fontFamily:"Noto Sans JP",display:"flex",alignItems:"center",gap:9}}>
              <span style={{fontSize:18}}>{s?"✅":"☐"}</span>{v}
            </button>
          );})}
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:15,marginBottom:8}}>一言コメント<span style={{fontSize:12,color:"var(--tx3)",fontWeight:400,marginLeft:5}}>任意</span></div>
        <textarea className="fta" style={{fontSize:14,minHeight:80}} value={form.comment} onChange={e=>setF("comment",e.target.value)} placeholder="今週気づいたことを自由に書いてください"/>
      </div>

      <button className="btn bpr" onClick={submit} disabled={!form.feeling} style={{marginBottom:9,fontSize:16,padding:"16px"}}>提出する ✓</button>
      <button className="btn bsec" onClick={()=>setMode("list")}>キャンセル</button>
    </div>
  );

  return (
    <div>
      <div style={{fontSize:17,fontWeight:800,marginBottom:13}}>📝 振り返り</div>
      <button className="btn bpr" style={{marginBottom:13,fontSize:15,padding:"15px"}} onClick={()=>setMode("form")}>➕ 今週の振り返りを入力する</button>
      <div className="al ai" style={{marginBottom:13}}><span>💡</span>毎週の提出が店長スコアに反映されます（月4回で+5点）</div>
      {myReflects.length===0&&<div className="empty"><div style={{fontSize:40}}>📝</div><div style={{marginTop:8,fontSize:14}}>振り返りはまだありません</div></div>}
      {myReflects.slice(0,5).map((r,i)=>{
        const comments=(adminComments||[]).filter(c=>c.targetType==="weekly"&&c.targetId===r.createdAt);
        const feel=feelings.find(f=>f.v===r.feeling)||feelings[1];
        return(
          <div key={i} className="card" style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{fontWeight:700,fontSize:14}}>{r.weekLabel||r.month}</div>
              <span style={{padding:"3px 12px",borderRadius:20,fontSize:12,fontWeight:700,background:feel.bg,color:feel.c,whiteSpace:"nowrap"}}>{feel.e} {r.feeling}</span>
            </div>
            {r.causes.length>0&&<div style={{fontSize:12,color:"var(--tx3)",marginBottom:4}}>原因: {r.causes.join("・")}</div>}
            {r.nextAction&&<div style={{fontSize:13,color:"var(--ac)",fontWeight:700,marginBottom:4}}>来週やること: {r.nextAction}</div>}
            {r.comment&&<div style={{fontSize:13,color:"var(--tx2)",fontStyle:"italic",marginBottom:4}}>「{r.comment}」</div>}
            {comments.map((c,ci)=><div key={ci} className="al ao" style={{marginTop:5,marginBottom:0}}><span>👤</span><div><b>管理者：</b>{c.text}</div></div>)}
          </div>
        );
      })}
    </div>
  );
}


// ============================================================
// 店長：月次振り返り
// ============================================================
function MonthlyReflectScreen({user, monthlyReflects, setMonthlyReflects, adminComments}) {
  const myReflects=(monthlyReflects||[]).filter(r=>r.storeId===user.storeId).sort((a,b)=>b.createdAt-a.createdAt);
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({storeId:user.storeId,month:THIS_MONTH,result:"",goodPoints:"",badPoints:"",causes:"",improvements:"",consultation:"",createdAt:Date.now()});
  const setF=(k,v)=>setForm(p=>({...p,[k]:v}));

  const submit=()=>{
    setMonthlyReflects(p=>[...(p||[]),{...form,createdAt:Date.now()}]);
    setShowForm(false);
  };

  return(
    <div>
      <div className="sect">📋 月次振り返り</div>
      <div className="al ai"><span>💡</span>月次振り返りの提出で店長スコアに+5点加算されます。</div>
      <button className="btn bpr bsm" style={{marginBottom:11}} onClick={()=>setShowForm(true)}>➕ 今月の振り返りを入力</button>

      {showForm&&(
        <div className="card">
          <div className="ct">📋 {THIS_MONTH} 月次振り返り</div>
          {[["今月の結果（一言で）","result","text"],["良かったこと","goodPoints","ta"],["悪かったこと","badPoints","ta"],["達成または未達の原因","causes","ta"],["来月改善すること","improvements","ta"],["管理者への相談・連絡事項","consultation","ta"]].map(([l,k,t])=>(
            <div key={k} className="fg">
              <label className="fl">{l}</label>
              {t==="ta"?<textarea className="fta" style={{fontSize:12}} value={form[k]} onChange={e=>setF(k,e.target.value)} placeholder="自由に記入してください"/>:<input className="fi" value={form[k]} onChange={e=>setF(k,e.target.value)} placeholder="例：売上目標達成"/>}
            </div>
          ))}
          <div style={{display:"flex",gap:7}}>
            <button className="btn bpr bsm" onClick={submit} disabled={!form.result}>提出する</button>
            <button className="btn bsec bsm" onClick={()=>setShowForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {myReflects.map((r,i)=>{
        const comments=(adminComments||[]).filter(c=>c.targetType==="monthly"&&c.targetId===r.createdAt);
        return(
          <div key={i} className="card" style={{marginBottom:9}}>
            <div className="fw7 fs11" style={{marginBottom:6}}>{r.month} 月次振り返り</div>
            {r.result&&<div className="al ai" style={{marginBottom:5}}><span>📌</span><b>{r.result}</b></div>}
            {r.goodPoints&&<div style={{fontSize:11,marginBottom:4}}><span className="chip chip-ok">良</span> {r.goodPoints}</div>}
            {r.improvements&&<div style={{fontSize:11,marginBottom:4}}><span className="chip chip-warn">改</span> {r.improvements}</div>}
            {r.consultation&&<div style={{fontSize:11,marginBottom:4}}><span className="chip chip-ng">相談</span> {r.consultation}</div>}
            {comments.map((c,ci)=>(
              <div key={ci} className="al ao" style={{marginTop:5}}><span>👤</span><div><b>管理者：</b>{c.text}</div></div>
            ))}
          </div>
        );
      })}
      {myReflects.length===0&&<div className="empty"><div style={{fontSize:32}}>📋</div>月次振り返りはまだありません</div>}
    </div>
  );
}

// ============================================================
// 店長：インセンティブ確認画面
// ============================================================
function IncentiveCheckScreen({user, yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects}) {
  const [showDetail, setShowDetail] = useState(false);
  const goal=yearlyGoals.find(g=>g.storeId===user.storeId&&g.year===THIS_YEAR);
  const result=monthlyResults.find(r=>r.storeId===user.storeId&&r.month===THIS_MONTH);

  if(!goal||!result) return(
    <div>
      <div className="sect">🏆 評価</div>
      <div style={{borderRadius:14,padding:24,background:"var(--sf2)",textAlign:"center",border:"1px solid var(--bd)"}}>
        <div style={{fontSize:36,marginBottom:10}}>📊</div>
        <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>まだ実績データがありません</div>
        <div style={{fontSize:11,color:"var(--tx3)"}}>管理者が今月の実績を入力すると評価が表示されます</div>
      </div>
    </div>
  );

  const {score,rank,breakdown,rates}=calcManagerScore(result,goal,weeklyReflects,monthlyReflects,user.storeId,THIS_MONTH);
  const target=goal.monthlySalesTargets?.[THIS_MONTH]||goal.annualSalesTarget/12;
  const rankCfg={
    A:{emoji:"🏆",label:"A評価",inc:"インセンティブ満額対象",color:"var(--ac)",bg:"#D1FAE5",bdr:"#10B981"},
    B:{emoji:"⭐",label:"B評価",inc:"インセンティブ一部対象",color:"#D97706",bg:"#FEF3C7",bdr:"#F59E0B"},
    C:{emoji:"📈",label:"C評価",inc:"対象外（改善チャレンジ中）",color:"#7C3AED",bg:"#EDE9FE",bdr:"#7C3AED"},
    D:{emoji:"💪",label:"D評価",inc:"対象外",color:"var(--dg)",bg:"#FEE2E2",bdr:"#EF4444"},
  };
  const rc=rankCfg[rank]||rankCfg.D;
  const toA=Math.max(0,90-score);
  const salesRate=target>0?Math.round(result.sales/target*100):0;

  const goodPoints=[];
  if(rates.dlRate>=(goal.deadlineRateTarget||95))goodPoints.push("発注締切をよく守れています");
  if(rates.foodRate<=(goal.foodRateTarget||30))goodPoints.push("食材費は目標内です");
  if(rates.laborRate<=(goal.laborRateTarget||30))goodPoints.push("人件費は目標内です");
  if(salesRate>=100)goodPoints.push("売上目標を達成しています");
  else if(salesRate>=90)goodPoints.push("売上は目標に近い状態です");

  const improvements=[];
  if(breakdown.laborScore<15)improvements.push({label:"人件費を少し抑える",pts:15-breakdown.laborScore});
  if(breakdown.foodScore<15)improvements.push({label:"食材費率を目標内にする",pts:15-breakdown.foodScore});
  if(breakdown.salesScore<25)improvements.push({label:"売上をあと¥"+fmt(Math.max(0,target-result.sales))+"伸ばす",pts:25-breakdown.salesScore});
  if(breakdown.weeklyScore<5)improvements.push({label:"週次振り返りを提出する",pts:5-breakdown.weeklyScore});
  if(breakdown.monthlyScore<5)improvements.push({label:"月次振り返りを提出する",pts:5});
  if(breakdown.dlScore<5)improvements.push({label:"発注締切の遵守率を上げる",pts:5-breakdown.dlScore});
  improvements.sort((a,b)=>b.pts-a.pts);

  return(
    <div>
      <div className="sect">🏆 評価</div>
      <div style={{borderRadius:16,padding:20,background:rc.bg,border:"2px solid "+rc.bdr,marginBottom:11}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div>
            <div style={{fontSize:32,marginBottom:2}}>{rc.emoji}</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:22,fontWeight:800,color:rc.color}}>{rc.label}</div>
            <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>{rc.inc}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:"var(--tx3)",marginBottom:2}}>今月のスコア</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:44,fontWeight:800,color:rc.color,lineHeight:1}}>{score}</div>
            <div style={{fontSize:11,color:"var(--tx3)"}}>/ 100点</div>
          </div>
        </div>
        <div style={{height:8,background:"rgba(0,0,0,.1)",borderRadius:5,overflow:"hidden",marginBottom:9}}>
          <div style={{width:Math.min(100,score)+"%",height:"100%",borderRadius:5,background:rc.color}}/>
        </div>
        {toA>0&&<div style={{fontSize:12,color:rc.color,fontWeight:700}}>A評価まであと{toA}点です</div>}
        {toA===0&&<div style={{fontSize:12,color:"var(--ac)",fontWeight:700}}>🎉 A評価ペースです！</div>}
      </div>

      {goodPoints.length>0&&(
        <div className="card" style={{marginBottom:11}}>
          <div className="ct">👏 良いところ</div>
          {goodPoints.slice(0,2).map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<Math.min(goodPoints.length,2)-1?"1px solid var(--bd)":"none"}}>
              <span style={{fontSize:16}}>✅</span>
              <div style={{fontSize:13,fontWeight:700,color:"var(--ac)"}}>{g}</div>
            </div>
          ))}
        </div>
      )}

      {improvements.length>0&&(
        <div className="card" style={{marginBottom:11}}>
          <div className="ct">{rank==="A"?"維持するために":"評価を上げるために"}</div>
          {improvements.slice(0,3).map((imp,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:i<Math.min(improvements.length,3)-1?"1px solid var(--bd)":"none"}}>
              <span style={{fontSize:14,flexShrink:0}}>📌</span>
              <div style={{flex:1,fontSize:13,fontWeight:700,color:"var(--tx2)"}}>{imp.label}</div>
              <div style={{fontSize:10,color:"var(--pr)",fontWeight:800,flexShrink:0}}>+{imp.pts}点</div>
            </div>
          ))}
        </div>
      )}

      <button className="btn bsec" onClick={()=>setShowDetail(!showDetail)} style={{marginBottom:11}}>
        {showDetail?"▲ 詳しい内訳を閉じる":"▼ 詳しい内訳を見る"}
      </button>

      {showDetail&&(
        <div className="card">
          <div className="ct">📊 点数の内訳</div>
          {[["売上達成",breakdown.salesScore,25],["利益管理",breakdown.profitScore,20],["人件費",breakdown.laborScore,15],["食材費",breakdown.foodScore,15],["備品費",breakdown.supplyScore,5],["発注遵守",breakdown.dlScore,5],["週次提出",breakdown.weeklyScore,5],["改善実行",breakdown.actionScore,5],["月次提出",breakdown.monthlyScore,5]].map(([l,v,max])=>(
            <div key={l} className="rate-row">
              <div className="rate-label">{l}</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:56,height:5,background:"var(--bd)",borderRadius:4,overflow:"hidden"}}><div style={{width:Math.round(v/max*100)+"%",height:"100%",background:v>=max?"var(--ac)":v>=max*0.6?"#F59E0B":"var(--dg)",borderRadius:4}}/></div>
                <div className={"rate-val "+(v>=max?"ok":v>=max*0.6?"warn":"ng")} style={{fontSize:11}}>{v}/{max}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 管理者：全店舗インセンティブ一覧
// ============================================================
function AllStoreIncentiveScreen({yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects, adminComments, setAdminComments}) {
  const [selStore,setSelStore]=useState(null);
  const [commentText,setCommentText]=useState("");
  const [commentTarget,setCommentTarget]=useState(null);

  const addComment=()=>{
    if(!commentText||!commentTarget)return;
    setAdminComments(p=>[...(p||[]),{targetType:commentTarget.type,targetId:commentTarget.id,storeId:commentTarget.storeId,text:commentText,createdAt:Date.now()}]);
    setCommentText(""); setCommentTarget(null);
  };

  return(
    <div>
      <div className="sect">🏆 全店舗インセンティブ一覧</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",fontSize:10,borderCollapse:"collapse",minWidth:500}}>
          <thead><tr style={{background:"var(--sf2)"}}>
            {["店舗","売上率","人件費率","食材費率","スコア","評価","課題"].map(h=><th key={h} style={{padding:"6px 5px",border:"1px solid var(--bd)",textAlign:"center",whiteSpace:"nowrap"}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {STORES_INIT.map(store=>{
              const goal=yearlyGoals.find(g=>g.storeId===store.id&&g.year===THIS_YEAR);
              const result=monthlyResults.find(r=>r.storeId===store.id&&r.month===THIS_MONTH);
              if(!goal||!result){
                return(<tr key={store.id}><td style={{padding:"5px",border:"1px solid var(--bd)",fontWeight:700}}>{store.name}</td><td colSpan={6} style={{padding:"5px",border:"1px solid var(--bd)",color:"var(--tx3)",textAlign:"center"}}>データなし</td></tr>);
              }
              const {score,rank,breakdown,rates}=calcManagerScore(result,goal,weeklyReflects,monthlyReflects,store.id,THIS_MONTH);
              const target=goal.monthlySalesTargets?.[THIS_MONTH]||goal.annualSalesTarget/12;
              const salesRate=target>0?Math.round(result.sales/target*100):0;
              const rankColor={A:"var(--ac)",B:"#D97706",C:"#7C3AED",D:"var(--dg)"};
              const issues=[];
              if(salesRate<90)issues.push("売上");
              if(rates.laborRate>(goal.laborRateTarget||30)+2)issues.push("人件費");
              if(rates.foodRate>(goal.foodRateTarget||30)+2)issues.push("食材費");
              if(breakdown.weeklyScore<3)issues.push("週次未提出");
              return(
                <tr key={store.id} style={{cursor:"pointer",background:selStore===store.id?"var(--sf2)":"#fff"}} onClick={()=>setSelStore(selStore===store.id?null:store.id)}>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",fontWeight:700,whiteSpace:"nowrap"}}>{store.name}</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center",color:salesRate>=100?"var(--ac)":salesRate>=90?"#D97706":"var(--dg)"}}>{salesRate}%</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center",color:rates.laborRate<=(goal.laborRateTarget||30)?"var(--ac)":"var(--dg)"}}>{rates.laborRate}%</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center",color:rates.foodRate<=(goal.foodRateTarget||30)?"var(--ac)":"var(--dg)"}}>{rates.foodRate}%</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center",fontWeight:800,color:rankColor[rank]}}>{score}</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",textAlign:"center",fontWeight:700,color:rankColor[rank]}}>{rank}</td>
                  <td style={{padding:"5px 4px",border:"1px solid var(--bd)",fontSize:9,color:"var(--dg)"}}>{issues.join("・")||"良好"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 店舗別詳細 */}
      {selStore&&(()=>{
        const store=STORES_INIT.find(s=>s.id===selStore);
        const goal=yearlyGoals.find(g=>g.storeId===selStore&&g.year===THIS_YEAR);
        const result=monthlyResults.find(r=>r.storeId===selStore&&r.month===THIS_MONTH);
        const wr=(weeklyReflects||[]).filter(r=>r.storeId===selStore).sort((a,b)=>b.createdAt-a.createdAt).slice(0,3);
        const mr=(monthlyReflects||[]).find(r=>r.storeId===selStore&&r.month===THIS_MONTH);
        const sc=goal&&result?calcManagerScore(result,goal,weeklyReflects,monthlyReflects,selStore,THIS_MONTH):null;
        return(
          <div className="card" style={{marginTop:11}}>
            <div className="ct">📋 {store?.name} の詳細</div>
            {sc&&<div className="al ao"><span>スコア</span><b>{sc.score}点 ({sc.rank}評価)</b></div>}
            {/* 週次振り返り一覧 */}
            {wr.length>0&&(<>
              <div className="fs11 fw7" style={{marginBottom:5}}>週次振り返り（最新3件）:</div>
              {wr.map((r,i)=>(
                <div key={i} style={{background:"var(--sf2)",borderRadius:7,padding:"8px 10px",marginBottom:5}}>
                  <div className="fb"><div className="fw7 fs10">{r.weekLabel||r.month}</div><span className={`badge ${r.achievement==="達成"?"bok":"bdr"}`}>{r.achievement}</span></div>
                  {r.comment&&<div style={{fontSize:10,color:"var(--tx2)",marginTop:3}}>{r.comment}</div>}
                  <div style={{marginTop:5}}>
                    <input className="fi" style={{fontSize:11,padding:"5px 8px"}} placeholder="管理者コメントを入力" value={commentTarget?.id===r.createdAt?commentText:""} onChange={e=>{setCommentText(e.target.value);setCommentTarget({type:"weekly",id:r.createdAt,storeId:selStore});}}/>
                    {commentTarget?.id===r.createdAt&&<button className="btn bac bxs" style={{marginTop:4}} onClick={addComment}>送信</button>}
                  </div>
                </div>
              ))}
            </>)}
            {/* 月次振り返り */}
            {mr&&(<>
              <div className="fs11 fw7" style={{margin:"9px 0 5px"}}>月次振り返り（{mr.month}）:</div>
              <div style={{background:"var(--sf2)",borderRadius:7,padding:"8px 10px",marginBottom:5}}>
                {mr.result&&<div className="fw7 fs11">{mr.result}</div>}
                {mr.goodPoints&&<div style={{fontSize:10,marginTop:3}}>良: {mr.goodPoints}</div>}
                {mr.improvements&&<div style={{fontSize:10}}>改善: {mr.improvements}</div>}
                {mr.consultation&&<div style={{fontSize:10,color:"var(--dg)"}}>相談: {mr.consultation}</div>}
                <div style={{marginTop:5}}>
                  <input className="fi" style={{fontSize:11,padding:"5px 8px"}} placeholder="管理者コメントを入力" value={commentTarget?.id===mr.createdAt?commentText:""} onChange={e=>{setCommentText(e.target.value);setCommentTarget({type:"monthly",id:mr.createdAt,storeId:selStore});}}/>
                  {commentTarget?.id===mr.createdAt&&<button className="btn bac bxs" style={{marginTop:4}} onClick={addComment}>送信</button>}
                </div>
              </div>
            </>)}
            {!mr&&!wr.length&&<div className="txm fs11">振り返りの記録がまだありません</div>}
          </div>
        );
      })()}
    </div>
  );
}

// ============================================================
// 店長：発注ハブ画面（通常店舗・則武店共通）
// ============================================================
function OrderHubScreen({user, orders, isWeekly, onNav}) {
  const dl = getDeadline();
  const myO = orders.find(o => o.storeId===user.storeId && o.orderDate===TODAY && o.status==="submitted");
  const recentOrders = orders.filter(o => o.storeId===user.storeId).slice(0,4);

  return (
    <div>
      <div className="sect">📋 発注</div>

      {/* 締切カウントダウン */}
      <div className={"cdc cd-"+dl.color} style={{marginBottom:11}}>
        <div className="cdlbl">📋 発注締切まで</div>
        <div className="cdtime">{dl.isLate ? "締切超過" : dl.label}</div>
        <div className="cdsub">本日22:00締切</div>
      </div>
      {dl.isLate && !myO && <div className="al ad" style={{marginBottom:9}}><span>🚨</span>締切を過ぎています。発注すると「締切後発注」として記録されます。</div>}

      {/* 発注ボタン */}
      {isWeekly ? (
        <button className="btn bwk" style={{marginBottom:9}} onClick={() => onNav("weeklyOrder")}>
          📦 今週の週まとめ発注をする →
        </button>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:11}}>
          <button className="btn bpr" onClick={() => onNav("foodOrder")}>🥩 食材を発注する →</button>
          <button className="btn bac" onClick={() => onNav("supplyOrder")}>📦 備品を発注する →</button>
          <button className="btn bsec" onClick={() => onNav("deliveryConfirm")}>✅ 納品確認をする →</button>
        </div>
      )}

      {/* 今日の発注状況 */}
      <div className="card" style={{marginBottom:11}}>
        <div className="fb">
          <div className="ct" style={{marginBottom:0}}>今日の発注状況</div>
          <span className={"badge "+(myO?"bok":"bdr")}>{myO?"✅ 発注済み":"⏳ 未発注"}</span>
        </div>
        {myO?.isLate && <div className="al aw" style={{marginTop:7,marginBottom:0}}><span>⚠️</span>締切後発注：{myO.lateReason}</div>}
      </div>

      {/* 発注履歴 */}
      <div className="card">
        <div className="ct">📋 発注履歴</div>
        {recentOrders.map(o => (
          <div key={o.id} className="srow">
            <div><div className="sname">{o.useDate} 使用分</div><div className="sdet">{o.orderDate} ｜ {o.orderedBy}</div></div>
            <span className={"badge "+(o.isLate?"blt":o.status==="submitted"?"bok":"bdr")}>{o.isLate?"締切後":o.status==="submitted"?"送信済":"下書き"}</span>
          </div>
        ))}
        {!recentOrders.length && <div className="txm fs10">履歴なし</div>}
      </div>
    </div>
  );
}

function Login({onLogin}) {
  const [sel, setSel] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    const opts = [
      ...STORES_INIT.map(s => ({label:s.name, uid:USERS.find(u=>u.storeId===s.id)?.id})),
      {label:"セントラルキッチン", uid:6},
      {label:"管理者", uid:7},
    ];
    const o = opts.find(x => x.label === sel);
    if (!o) { setErr("選択してください"); return; }
    const u = USERS.find(x => x.id === o.uid);
    if (!u || u.password !== pw) { setErr("パスワードが違います"); return; }
    onLogin(u);
  };
  return (
    <div className="login">
      <div className="llogo">🍜 CK発注</div>
      <div className="lsub">セントラルキッチン発注管理システム</div>
      <div className="lcard">
        <div className="fg">
          <label className="fl">店舗 / 役職</label>
          <select className="fsel" value={sel} onChange={e => { setSel(e.target.value); setErr(""); }}>
            <option value="">-- 選択してください --</option>
            <optgroup label="通常配送店舗">
              {STORES_INIT.filter(s => s.type === "daily").map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </optgroup>
            <optgroup label="週まとめ発注店舗">
              {STORES_INIT.filter(s => s.type === "weekly").map(s => <option key={s.id} value={s.name}>{s.name} 📦</option>)}
            </optgroup>
            <optgroup label="管理">
              <option value="セントラルキッチン">セントラルキッチン</option>
              <option value="管理者">管理者</option>
            </optgroup>
          </select>
        </div>
        <div className="fg">
          <label className="fl">パスワード</label>
          <input className="fi" type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} onKeyDown={e => e.key === "Enter" && go()} />
        </div>
        {err && <div className="al ad"><span>⚠️</span>{err}</div>}
        <div style={{fontSize:10,color:"#aaa",marginBottom:10}}>※PW：店長「1234」 CK「ck00」 管理者「admin」</div>
        <button className="btn bpr" onClick={go}>ログイン →</button>
      </div>
    </div>
  );
}

function ManagerDB({user, orders, onNav, storeGoals, yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects}) {
  const store = STORES_INIT.find(s => s.id === user.storeId);
  const goal  = yearlyGoals.find(g => g.storeId===user.storeId && g.year===THIS_YEAR);
  const result= monthlyResults.find(r => r.storeId===user.storeId && r.month===THIS_MONTH);
  const myO   = orders.find(o => o.storeId===user.storeId && o.orderDate===TODAY && o.status==="submitted");
  const dl    = getDeadline();

  const scoreData = goal && result ? calcManagerScore(result, goal, weeklyReflects, monthlyReflects, user.storeId, THIS_MONTH) : null;
  const monthTarget = goal?.monthlySalesTargets?.[THIS_MONTH] || (goal?.annualSalesTarget||0)/12;
  const salesRate = result && monthTarget>0 ? Math.round(result.sales/monthTarget*100) : null;

  const now = new Date();
  const dayOfYear = Math.ceil((now-(new Date(now.getFullYear(),0,1)))/86400000);
  const expectedPacePct = Math.round(dayOfYear/365*100);
  const yearResults = monthlyResults.filter(r=>r.storeId===user.storeId && r.month.startsWith(String(THIS_YEAR)));
  const cumSales = yearResults.reduce((s,r)=>s+r.sales,0);
  const annualRate = goal ? Math.round(cumSales/goal.annualSalesTarget*100) : null;
  const paceDiff = annualRate !== null ? annualRate - expectedPacePct : null;
  const paceLabel = paceDiff===null?null:paceDiff>=0?"順調":paceDiff>=-5?"少し遅れ":"大きく遅れ";
  const paceColor = paceDiff===null?null:paceDiff>=0?"var(--ac)":paceDiff>=-5?"#D97706":"var(--dg)";
  const monthAdd = goal && monthTarget>0 ? Math.round(monthTarget*(Math.abs(paceDiff||0)/100)) : 0;

  const stateInfo = scoreData
    ? scoreData.score>=80?{l:"良好 ✅",c:"var(--ac)",bg:"#D1FAE5"}:scoreData.score>=60?{l:"注意 ⚠️",c:"#D97706",bg:"#FEF3C7"}:{l:"要改善 🔴",c:"var(--dg)",bg:"#FEE2E2"}
    : null;

  const {actions:advActions} = result&&goal ? generateAdviceMessages(result,goal,monthTarget) : {actions:[]};
  const todayTasks = [...advActions].slice(0,3);
  if(todayTasks.length===0 && dl.color==="danger") todayTasks.push("本日22:00までに発注を完了する");
  if(todayTasks.length<3) todayTasks.push("発注前に在庫を確認してから数量を決める");
  if(todayTasks.length<3) todayTasks.push("売上目標を意識した声かけをする");

  const adminMsg = goal?.managerMessage;

  return (
    <div>
      <div style={{background:"linear-gradient(135deg,var(--pr),var(--prd))",borderRadius:16,padding:"18px 18px 16px",marginBottom:13,color:"#fff"}}>
        <div style={{fontSize:13,opacity:.8,marginBottom:2}}>{store?.name}</div>
        <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:24,fontWeight:800,marginBottom:10}}>{user.name} さん</div>
        <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
          {stateInfo && <div style={{background:stateInfo.bg,borderRadius:20,padding:"5px 14px",fontWeight:800,fontSize:14,color:stateInfo.c,whiteSpace:"nowrap"}}>{stateInfo.l}</div>}
          {salesRate!==null && <div style={{fontSize:13,opacity:.9}}>今月の売上 <b>{salesRate}%</b></div>}
        </div>
        {!stateInfo && <div style={{fontSize:12,opacity:.8,marginTop:4}}>管理者が実績を入力すると状態が表示されます</div>}
      </div>

      {result && goal && (
        <div className="card" style={{marginBottom:13,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:7}}>
            <div style={{fontSize:13,color:"var(--tx3)",fontWeight:700}}>今月の売上達成率</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:36,fontWeight:800,color:salesRate>=100?"var(--ac)":salesRate>=90?"#D97706":"var(--dg)",lineHeight:1}}>{salesRate}%</div>
          </div>
          <div style={{height:10,background:"var(--bd)",borderRadius:6,overflow:"hidden",marginBottom:7}}>
            <div style={{width:Math.min(100,salesRate)+"%",height:"100%",borderRadius:6,background:salesRate>=100?"var(--ac)":salesRate>=90?"#F59E0B":"var(--dg)"}}/>
          </div>
          <div style={{fontSize:13,color:"var(--tx2)",fontWeight:700}}>
            {salesRate<100 ? "あと ¥"+fmt(Math.max(0,monthTarget-result.sales))+" で今月目標達成" : "🎉 今月の目標達成！"}
          </div>
        </div>
      )}

      {goal && annualRate!==null && (
        <div style={{borderRadius:14,padding:"14px 16px",marginBottom:13,background:paceDiff>=0?"#F0FDF4":paceDiff>=-5?"#FFFBEB":"#FFF5F5",border:"1.5px solid "+(paceDiff>=0?"#10B981":paceDiff>=-5?"#F59E0B":"#EF4444")}}>
          <div style={{fontSize:14,fontWeight:800,color:"var(--tx)",marginBottom:8}}>📅 年間目標の現在地</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:13,color:"var(--tx2)"}}>年間達成率</div>
            <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:28,fontWeight:800,color:paceColor}}>{annualRate}%</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:paceColor,marginBottom:5}}>{paceLabel} ｜ 予定ペース{expectedPacePct}%に対して{Math.abs(paceDiff||0)}%{(paceDiff||0)>=0?"上回っています":"遅れています"}</div>
          {(paceDiff||0)<0 && monthAdd>0 && <div style={{fontSize:12,color:"var(--tx2)"}}>今月あと <b>¥{fmt(monthAdd)}</b> 上積みできると年間ペースに近づきます。</div>}
          {(paceDiff||0)>=0 && <div style={{fontSize:12,color:"var(--ac)"}}>このペースを維持してください。</div>}
        </div>
      )}

      {scoreData && (
        <div className="card" style={{marginBottom:13,padding:"14px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <div>
              <div style={{fontSize:13,color:"var(--tx3)",fontWeight:700,marginBottom:3}}>今月のスコア・評価</div>
              <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:34,fontWeight:800,color:{A:"var(--ac)",B:"#D97706",C:"#7C3AED",D:"var(--dg)"}[scoreData.rank],lineHeight:1}}>{scoreData.score}<span style={{fontSize:14,color:"var(--tx3)"}}>点</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:28,fontWeight:800,color:{A:"var(--ac)",B:"#D97706",C:"#7C3AED",D:"var(--dg)"}[scoreData.rank]}}>{scoreData.rank}評価</div>
              {scoreData.score<90 && <div style={{fontSize:13,color:"var(--tx3)",marginTop:2}}>A評価まであと<b style={{color:"var(--pr)"}}>{90-scoreData.score}点</b></div>}
              {scoreData.score>=90 && <div style={{fontSize:13,color:"var(--ac)"}}>🏆 A評価ペース！</div>}
            </div>
          </div>
          <div style={{height:8,background:"var(--bd)",borderRadius:5,overflow:"hidden"}}>
            <div style={{width:Math.min(100,scoreData.score)+"%",height:"100%",borderRadius:5,background:scoreData.score>=80?"var(--ac)":scoreData.score>=60?"#F59E0B":"var(--dg)"}}/>
          </div>
        </div>
      )}

      <div className="card" style={{marginBottom:13,padding:"14px 16px"}}>
        <div style={{fontSize:15,fontWeight:800,marginBottom:11}}>📌 今日やること</div>
        {todayTasks.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<todayTasks.length-1?"1px solid var(--bd)":"none"}}>
            <div style={{width:24,height:24,borderRadius:6,border:"2px solid var(--bd)",flexShrink:0}}/>
            <div style={{fontSize:14,fontWeight:700,color:"var(--tx2)"}}>{a}</div>
          </div>
        ))}
      </div>

      {adminMsg && (
        <div style={{background:"#F0F9FF",border:"1.5px solid #BAE6FD",borderRadius:12,padding:"12px 15px",marginBottom:13}}>
          <div style={{fontSize:12,color:"#0369A1",fontWeight:700,marginBottom:5}}>👤 管理者からのメッセージ</div>
          <div style={{fontSize:14,color:"var(--tx2)",fontWeight:700}}>{adminMsg}</div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <button className="card" style={{border:"2px solid var(--pr)",cursor:"pointer",textAlign:"center",padding:"16px 10px"}} onClick={()=>onNav("foodOrder")}>
          <div style={{fontSize:30,marginBottom:4}}>🥩</div><div style={{fontWeight:800,fontSize:14,color:"var(--pr)"}}>食材を発注</div>
        </button>
        <button className="card" style={{border:"2px solid var(--ac)",cursor:"pointer",textAlign:"center",padding:"16px 10px"}} onClick={()=>onNav("supplyOrder")}>
          <div style={{fontSize:30,marginBottom:4}}>📦</div><div style={{fontWeight:800,fontSize:14,color:"var(--ac)"}}>備品を発注</div>
        </button>
      </div>

      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700}}>本日の発注状況</div>
          <span className={"badge "+(myO?"bok":"bdr")} style={{fontSize:12,padding:"3px 10px"}}>{myO?"✅ 発注済み":"⏳ 未発注"}</span>
        </div>
        {dl.color==="danger"&&!myO&&<div className="al ad" style={{marginTop:9,marginBottom:0}}><span>🚨</span><b>締切まで{dl.label}です。早めに発注してください。</b></div>}
        {myO?.isLate&&<div className="al aw" style={{marginTop:7,marginBottom:0}}><span>⚠️</span>締切後発注：{myO.lateReason}</div>}
      </div>
    </div>
  );
}


function WeeklyDB({user, weeklyOrders, onNav, storeGoals, yearlyGoals, monthlyResults}) {
  const store = STORES_INIT.find(s => s.id === user.storeId);
  const myOrds = weeklyOrders.filter(o => o.storeId === user.storeId);
  const latest = myOrds[myOrds.length-1];
  const si = latest ? statusInfo(latest.status) : null;
  return (
    <div>
      <div className="cdc cd-wk">
        <div className="cdlbl">📦 週まとめ発注店舗</div>
        <div className="cdtime" style={{fontSize:20,marginTop:3}}>{store?.name}</div>
        <div className="cdsub">締切：{store?.weeklyDeadline} ｜ {store?.deliveryNote}</div>
      </div>
      <div className="al awk"><span>📅</span>毎週月曜12:00までに1週間分をまとめて発注してください。</div>
      <YearlyGoalCard storeId={user.storeId} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} isWeekly={true} />
      <GoalCard storeId={user.storeId} storeGoals={storeGoals} isWeekly={true} />
      {latest && (
        <div className="card wc">
          <div className="ct">最新の発注状況</div>
          <div className="fb">
            <div>
              <div className="fw7 fs11">発注日: {latest.orderDate}</div>
              <div className="fs10 txm">期間: {latest.useWeek}</div>
              {latest.scheduledDate && <div className="fs10" style={{color:"var(--wk)"}}>配送予定: {latest.scheduledDate} {latest.scheduledTime}</div>}
            </div>
            {si && <span className="spl" style={{background:si.bg,color:si.color}}>{si.label}</span>}
          </div>
        </div>
      )}
      <button className="btn bwk" style={{marginBottom:9}} onClick={() => onNav("weeklyOrder")}>📦 次回まとめ配送分の発注をする →</button>
      <div className="card">
        <div className="ct">発注履歴</div>
        {myOrds.map(o => {
          const s2 = statusInfo(o.status);
          return (
            <div key={o.id} className="srow">
              <div><div className="sname">{o.useWeek}</div><div className="sdet">{o.orderDate}</div></div>
              <span className="spl" style={{background:s2.bg,color:s2.color,fontSize:9}}>{s2.label}</span>
            </div>
          );
        })}
        {!myOrds.length && <div className="txm fs10">発注履歴なし</div>}
      </div>
    </div>
  );
}

function WeeklyOrder({user, allItems, storeVisIds, weeklyOrders, setWeeklyOrders, onNav}) {
  const [cat, setCat] = useState("全て");
  const [cart, setCart] = useState({});
  const [stocks, setStocks] = useState({});
  const [wn, setWn] = useState({});
  const [useWeek, setUseWeek] = useState(TODAY+"〜"+WEEK_END);
  const [hopeWeek, setHopeWeek] = useState("今週中");
  const [orderedBy, setOrderedBy] = useState(user.name);
  const [showConf, setShowConf] = useState(false);
  const visIds = storeVisIds[user.storeId] || [];
  const visItems = useMemo(() =>
    allItems.filter(i => i.active && visIds.includes(i.id)).sort((a,b) => a.priority-b.priority || a.name.localeCompare(b.name,"ja"))
  , [allItems, visIds]);
  const cats = ["全て", ...new Set(visItems.map(i => i.cat))];
  const filtered = cat === "全て" ? visItems : visItems.filter(i => i.cat === cat);
  const cartItems = Object.entries(cart).filter(([,q]) => q > 0);
  const submit = () => {
    setWeeklyOrders(p => [...p, {
      id:Date.now(), storeId:user.storeId, orderDate:TODAY, useWeek, hopeWeek, orderedBy,
      status:"ordered", scheduledDate:"", scheduledTime:"", deliveryStaff:"", completedAt:"",
      lines: cartItems.map(([id,qty]) => ({itemId:+id, qty, weeklyNeed:wn[id]||qty, stock:stocks[id]||0, note:"", urgency:"通常", priority:"通常"}))
    }]);
    setCart({}); setShowConf(false); onNav("dashboard");
  };
  return (
    <div>
      <div className="sect wkt">📦 則武店｜次回まとめ配送分の発注</div>
      <div className="al awk"><span>📅</span>週まとめ発注 ｜ 締切：毎週月曜 12:00</div>
      <div className="card">
        <div className="fg"><label className="fl">発注者名</label><input className="fi" value={orderedBy} onChange={e => setOrderedBy(e.target.value)} /></div>
        <div className="fg"><label className="fl">使用予定期間</label><input className="fi" value={useWeek} onChange={e => setUseWeek(e.target.value)} /></div>
        <div className="fg" style={{marginBottom:0}}>
          <label className="fl">希望納品週</label>
          <select className="fsel" value={hopeWeek} onChange={e => setHopeWeek(e.target.value)}>
            {["今週中","来週月〜水","来週木〜金","CKにお任せ"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
      </div>
      {cartItems.length > 0 && <div className="al ai"><span>🛒</span><b>{cartItems.length}種類</b>追加中</div>}
      <div className="cats">{cats.map(c => <button key={c} className={"ctab "+(cat===c?"won":"")} onClick={() => setCat(c)}>{c}</button>)}</div>
      {filtered.map(item => {
        const qty = cart[item.id] || 0;
        const isSp = item.name === "お漬物シール";
        return (
          <div key={item.id} className="wirow" style={isSp ? {borderColor:"var(--wk)",borderWidth:2} : {}}>
            <div className="wname">{isSp ? "🏷️ " : ""}{item.name}</div>
            <div className="fs10 txm">{item.cat} ｜ 単位:{item.unit}</div>
            {item.caution && <div className="caut">⚠️ {item.caution}</div>}
            <div className="wg2">
              <div className="wf"><label>現在庫</label><input type="number" className="fi" style={{padding:"5px 7px",fontSize:12}} min="0" value={stocks[item.id]||""} placeholder="0" onChange={e => setStocks(p => ({...p,[item.id]:+e.target.value}))} /></div>
              <div className="wf"><label>1週間の必要数</label><input type="number" className="fi" style={{padding:"5px 7px",fontSize:12}} min="0" value={wn[item.id]||""} placeholder="0" onChange={e => setWn(p => ({...p,[item.id]:+e.target.value}))} /></div>
            </div>
            <div style={{marginTop:7}}>
              <div className="fs10 txm" style={{marginBottom:3}}>発注数</div>
              <div className="qc">
                <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:Math.max(0,(p[item.id]||0)-item.orderUnit)}))}>−</button>
                <input className="qi" type="number" min="0" value={qty} onChange={e => setCart(p => ({...p,[item.id]:Math.max(0,+e.target.value)}))} />
                <span className="fs10 txm">{item.unit}</span>
                <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:(p[item.id]||0)+item.orderUnit}))}>＋</button>
              </div>
            </div>
            {qty > 0 && <div className="fs10 txa2" style={{marginTop:3}}>✓ {qty}{item.unit}</div>}
          </div>
        );
      })}
      {cartItems.length > 0 && <button className="btn bwk" style={{marginTop:3}} onClick={() => setShowConf(true)}>発注内容を確認する ({cartItems.length}種類) →</button>}
      {showConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowConf(false)}>
          <div className="sheet">
            <div style={{fontSize:15,fontWeight:800,marginBottom:13}}>📦 週まとめ発注確認</div>
            <div className="al awk"><span>📅</span>希望納品週：{hopeWeek} ｜ 期間：{useWeek}</div>
            {cartItems.map(([id,qty]) => {
              const item = allItems.find(i => i.id === +id);
              return (
                <div key={id} className="srow">
                  <div><div className="fw7 fs11">{item?.name}</div><div className="fs10 txm">在庫:{stocks[id]||0} 週必要:{wn[id]||0}</div></div>
                  <div className="fw7">{qty} {item?.unit}</div>
                </div>
              );
            })}
            <div className="dv"/>
            <button className="btn bwk" style={{marginBottom:7}} onClick={submit}>週まとめ発注を送信する →</button>
            <button className="btn bsec" onClick={() => setShowConf(false)}>修正する</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FoodOrder({user, orders, setOrders, allItems, storeVisIds, onNav}) {
  const dl = getDeadline();
  const [cat, setCat] = useState("全て");
  const [cart, setCart] = useState({});
  const [showConf, setShowConf] = useState(false);
  const [lr, setLr] = useState("");
  const [useDate, setUseDate] = useState(TOMORROW);
  const [ob, setOb] = useState(user.name);
  const [errs, setErrs] = useState({});
  const visIds = storeVisIds[user.storeId] || [];
  const vis = useMemo(() =>
    allItems.filter(i => FOOD_CATS.includes(i.cat) && i.active && visIds.includes(i.id)).sort((a,b) => a.priority-b.priority||a.name.localeCompare(b.name,"ja"))
  , [allItems, visIds]);
  const cats = ["全て", ...new Set(vis.map(i => i.cat))];
  const filtered = cat === "全て" ? vis : vis.filter(i => i.cat === cat);
  const cartItems = Object.entries(cart).filter(([,q]) => q > 0);
  const setQty = (id, val, item) => {
    const n = Math.max(0, +val);
    setCart(p => ({...p, [id]:n}));
    if (item.orderUnit > 1 && n > 0 && n % item.orderUnit !== 0) setErrs(p => ({...p,[id]:item.orderUnit+"単位で発注"}));
    else setErrs(p => ({...p,[id]:""}));
  };
  const hasErr = Object.values(errs).some(e => e);
  const canSub = cartItems.length > 0 && !hasErr && (!dl.isLate || lr);
  const submit = () => {
    setOrders(p => [...p, {
      id:Date.now(), storeId:user.storeId, orderDate:TODAY, useDate, orderedBy:ob,
      status:"submitted", isLate:dl.isLate, lateReason:dl.isLate?lr:null,
      lines:cartItems.map(([id,qty]) => ({itemId:+id,qty,note:""})), supplies:[], confirmedAt:null
    }]);
    setCart({}); setShowConf(false); onNav("dashboard");
  };
  return (
    <div>
      <div className="sect">🥩 食材発注</div>
      <div className="card">
        <div className="fg"><label className="fl">使用予定日</label><input type="date" className="fi" value={useDate} onChange={e => setUseDate(e.target.value)} min={TODAY} /></div>
        <div className="fg" style={{marginBottom:0}}><label className="fl">発注者名</label><input className="fi" value={ob} onChange={e => setOb(e.target.value)} /></div>
      </div>
      {cartItems.length > 0 && <div className="al ai"><span>🛒</span><b>{cartItems.length}種類</b>追加中</div>}
      <div className="cats">{cats.map(c => <button key={c} className={"ctab "+(cat===c?"on":"")} onClick={() => setCat(c)}>{c}</button>)}</div>
      {filtered.map(item => {
        const qty = cart[item.id] || 0;
        const err = errs[item.id] || "";
        return (
          <div key={item.id} className={"irow "+(item.caution?"ic":"")}>
            <div className="inm">{item.name}</div>
            <div className="imt">{item.cat} ｜ {item.unit}</div>
            {item.caution && <div className="caut">⚠️ {item.caution}</div>}
            {item.note && <div style={{fontSize:10,color:"var(--tx3)",fontStyle:"italic"}}>{item.note}</div>}
            <div className="qc" style={{marginTop:5}}>
              <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:Math.max(0,(p[item.id]||0)-item.orderUnit)}))}>−</button>
              <input className="qi" type="number" min="0" value={qty} onChange={e => setQty(item.id, e.target.value, item)} />
              <span className="fs10 txm">{item.unit}</span>
              <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:(p[item.id]||0)+item.orderUnit}))}>＋</button>
            </div>
            {err && <div className="fs10 txr" style={{marginTop:3}}>⚠️ {err}</div>}
            {qty > 0 && !err && <div className="fs10 txa" style={{marginTop:3}}>✓ {qty}{item.unit}</div>}
          </div>
        );
      })}
      {cartItems.length > 0 && <button className="btn bpr" style={{marginTop:3}} onClick={() => setShowConf(true)} disabled={hasErr}>発注内容を確認する ({cartItems.length}種類) →</button>}
      {showConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowConf(false)}>
          <div className="sheet">
            <div style={{fontSize:15,fontWeight:800,marginBottom:13}}>📋 発注確認</div>
            {dl.isLate && (
              <div className="al ad"><span>🚨</span>
                <div><b>締切後発注。</b>
                  <select className="fsel" style={{marginTop:5}} value={lr} onChange={e => setLr(e.target.value)}>
                    <option value="">理由を選択 *必須</option>
                    {LATE_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="fw7 fs11" style={{marginBottom:7}}>使用予定日：{useDate}</div>
            {cartItems.map(([id,qty]) => {
              const item = allItems.find(i => i.id === +id);
              const lineTotal = (item?.price||0) * qty;
              return (
                <div key={id} className="srow">
                  <div><div className="fw7 fs11">{item?.name}</div>{item?.caution && <div style={{fontSize:10,color:"#DC2626"}}>⚠️ {item.caution}</div>}<div style={{fontSize:11,color:"var(--tx3)"}}>{qty}{item?.unit} × ¥{fmt(item?.price||0)}</div></div>
                  <div style={{textAlign:"right"}}><div className="fw7">¥{fmt(lineTotal)}</div></div>
                </div>
              );
            })}
            <div className="dv"/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",marginBottom:5}}>
              <div style={{fontWeight:800,fontSize:14}}>食材発注合計</div>
              <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:20,fontWeight:800,color:"var(--pr)"}}>¥{fmt(cartItems.reduce((s,[id,qty])=>{const item=allItems.find(i=>i.id===+id);return s+(item?.price||0)*qty;},0))}</div>
            </div>
            <button className="btn bpr" style={{marginBottom:7}} onClick={submit} disabled={!canSub}>{dl.isLate ? "締切後発注として送信" : "発注を送信する ✓"}</button>
            <button className="btn bsec" onClick={() => setShowConf(false)}>修正する</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplyOrder({user, orders, setOrders, allItems, storeVisIds, onNav}) {
  const dl = getDeadline();
  const [cart, setCart] = useState({});
  const [stocks, setStocks] = useState({});
  const [showConf, setShowConf] = useState(false);
  const [lr, setLr] = useState("");
  const [errs, setErrs] = useState({});
  const visIds = storeVisIds[user.storeId] || [];
  const vis = useMemo(() =>
    allItems.filter(i => i.cat === "備品" && i.active && visIds.includes(i.id)).sort((a,b) => a.priority-b.priority||a.name.localeCompare(b.name,"ja"))
  , [allItems, visIds]);
  const cartItems = Object.entries(cart).filter(([,q]) => q > 0);
  const setQty = (id, val, item) => {
    const n = Math.max(0, +val);
    setCart(p => ({...p,[id]:n}));
    if (item.orderUnit > 1 && n > 0 && n % item.orderUnit !== 0) setErrs(p => ({...p,[id]:item.orderUnit+"単位で発注"}));
    else setErrs(p => ({...p,[id]:""}));
  };
  const canSub = cartItems.length > 0 && !Object.values(errs).some(e => e) && (!dl.isLate || lr);
  const submit = () => {
    setOrders(p => [...p, {
      id:Date.now(), storeId:user.storeId, orderDate:TODAY, useDate:TOMORROW,
      orderedBy:user.name, status:"submitted", isLate:dl.isLate, lateReason:dl.isLate?lr:null,
      lines:[], supplies:cartItems.map(([id,qty]) => ({itemId:+id,qty,stock:stocks[id]||0,note:""})), confirmedAt:null
    }]);
    setCart({}); setShowConf(false); onNav("dashboard");
  };
  return (
    <div>
      <div className="sect">📦 備品発注</div>
      <div className="al ai"><span>🏷️</span>「お漬物シール」含む備品を発注できます</div>
      {cartItems.length > 0 && <div className="al ai"><span>🛒</span><b>{cartItems.length}種類</b>追加中</div>}
      {vis.map(item => {
        const qty = cart[item.id] || 0;
        const err = errs[item.id] || "";
        const isSp = item.name === "お漬物シール";
        return (
          <div key={item.id} className="irow" style={isSp ? {borderColor:"var(--wk)",borderWidth:2} : {}}>
            <div className="inm">{isSp ? "🏷️ " : ""}{item.name}</div>
            <div className="imt">単位:{item.unit} ｜ 発注単位:{item.orderUnit}{item.unit}</div>
            {item.caution && <div className="caut">⚠️ {item.caution}</div>}
            <div className="qc" style={{marginTop:5}}>
              <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:Math.max(0,(p[item.id]||0)-item.orderUnit)}))}>−</button>
              <input className="qi" type="number" min="0" value={qty} onChange={e => setQty(item.id, e.target.value, item)} />
              <span className="fs10 txm">{item.unit}</span>
              <button className="qb" onClick={() => setCart(p => ({...p,[item.id]:(p[item.id]||0)+item.orderUnit}))}>＋</button>
            </div>
            {err && <div className="fs10 txr" style={{marginTop:3}}>⚠️ {err}</div>}
            {qty > 0 && (
              <div style={{marginTop:7}}>
                <label className="fl" style={{marginBottom:2}}>現在の在庫数</label>
                <input type="number" className="fi" style={{padding:"7px 9px",fontSize:12}} min="0" value={stocks[item.id]||""} placeholder={"在庫（"+item.unit+"）"} onChange={e => setStocks(p => ({...p,[item.id]:+e.target.value}))} />
              </div>
            )}
          </div>
        );
      })}
      {cartItems.length > 0 && <button className="btn bpr" onClick={() => setShowConf(true)}>発注内容を確認する ({cartItems.length}種類) →</button>}
      {showConf && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setShowConf(false)}>
          <div className="sheet">
            <div style={{fontSize:15,fontWeight:800,marginBottom:13}}>📦 備品発注確認</div>
            {dl.isLate && (
              <div className="al ad"><span>🚨</span>
                <div><b>締切後発注。</b>
                  <select className="fsel" style={{marginTop:5}} value={lr} onChange={e => setLr(e.target.value)}>
                    <option value="">理由を選択 *必須</option>
                    {LATE_REASONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            )}
            {cartItems.map(([id,qty]) => {
              const item = allItems.find(i => i.id === +id);
              const lineTotal = (item?.price||0) * qty;
              return (<div key={id} className="srow"><div><div className="fw7 fs11">{item?.name}</div><div style={{fontSize:11,color:"var(--tx3)"}}>{qty}{item?.unit} × ¥{fmt(item?.price||0)}</div></div><div className="fw7">¥{fmt(lineTotal)}</div></div>);
            })}
            <div className="dv"/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",marginBottom:5}}>
              <div style={{fontWeight:800,fontSize:14}}>備品発注合計</div>
              <div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:20,fontWeight:800,color:"var(--ac)"}}>¥{fmt(cartItems.reduce((s,[id,qty])=>{const item=allItems.find(i=>i.id===+id);return s+(item?.price||0)*qty;},0))}</div>
            </div>
            <button className="btn bpr" style={{marginBottom:7}} onClick={submit} disabled={!canSub}>{dl.isLate ? "締切後発注として送信" : "備品発注を送信 ✓"}</button>
            <button className="btn bsec" onClick={() => setShowConf(false)}>修正する</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DelivConf({user, orders, setOrders, allItems}) {
  const stOrd = orders.filter(o => o.storeId===user.storeId && o.status==="submitted" && !o.confirmedAt);
  const [ck, setCk] = useState({});
  const tog = (oid, k) => setCk(p => ({...p,[oid+"-"+k]:!p[oid+"-"+k]}));
  if (!stOrd.length) return (
    <div><div className="sect">✅ 納品確認</div><div className="empty"><div style={{fontSize:36}}>📭</div>確認待ちの納品はありません</div></div>
  );
  return (
    <div>
      <div className="sect">✅ 納品確認</div>
      {stOrd.map(order => (
        <div key={order.id} className="card">
          <div className="ct">📅 {order.useDate} 使用分</div>
          {[...order.lines.map(l => ({k:"i"+l.itemId,id:l.itemId,qty:l.qty})), ...order.supplies.map(s => ({k:"s"+s.itemId,id:s.itemId,qty:s.qty}))].map(({k,id,qty}) => {
            const item = allItems.find(i => i.id === id);
            const c = ck[order.id+"-"+k];
            return (
              <div key={k} className={"ci "+(c?"ck":"")} onClick={() => tog(order.id, k)}>
                <div className="cbox">{c?"✓":""}</div>
                <div style={{flex:1}}><div className="fw7 fs11">{item?.name}</div><div className="fs10 txm">{qty} {item?.unit}</div></div>
              </div>
            );
          })}
          <div className="dv"/>
          <button className="btn bac" onClick={() => setOrders(p => p.map(o => o.id===order.id ? {...o,confirmedAt:new Date().toISOString()} : o))}>✅ 納品確認済みにする</button>
        </div>
      ))}
    </div>
  );
}

function CKDB({orders, weeklyOrders, onNav}) {
  const tod = orders.filter(o => o.orderDate === TODAY);
  const sub = [...new Set(tod.filter(o => o.status==="submitted").map(o => o.storeId))];
  const daily = STORES_INIT.filter(s => s.type === "daily");
  const unsub = daily.filter(s => !sub.includes(s.id));
  const late = tod.filter(o => o.isLate);
  return (
    <div>
      <div className="sect">🏭 CKダッシュボード</div>
      <div className="sg" style={{marginBottom:11}}>
        <div className="sc"><div className="sv" style={{color:"var(--ac)"}}>{sub.length}/{daily.length}</div><div className="sl">通常発注済み</div></div>
        <div className="sc"><div className="sv" style={{color:"var(--dg)"}}>{unsub.length}</div><div className="sl">通常未発注</div></div>
        <div className="sc"><div className="sv" style={{color:"#F59E0B"}}>{late.length}</div><div className="sl">締切後発注</div></div>
        <div className="sc"><div className="sv" style={{color:"var(--wk)"}}>{weeklyOrders.length}</div><div className="sl">週まとめ発注</div></div>
      </div>
      {unsub.length > 0 && <div className="al ad"><span>🚨</span><div><b>未発注：</b>{unsub.map(s => s.name).join("、")}</div></div>}
      <div className="ddv">🚚 通常配送店舗（毎日）</div>
      <div className="card">
        {daily.map(s => {
          const s2 = sub.includes(s.id);
          const l = late.some(o => o.storeId === s.id);
          return (
            <div key={s.id} className="srow">
              <div><div className="sname">{s.name}{s.isCabbageBase?" 🥦":""}</div><div className="sdet">{s.deliveryTime}</div></div>
              <span className={"badge "+(l?"blt":s2?"bok":"bpd")}>{l?"⚠️締切後":s2?"✅発注済":"❌未発注"}</span>
            </div>
          );
        })}
      </div>
      <div className="wdv">📦 週まとめ・不定期配送店舗</div>
      {STORES_INIT.filter(s => s.type === "weekly").map(store => {
        const lo = weeklyOrders.filter(o => o.storeId===store.id).slice(-1)[0];
        const si = lo ? statusInfo(lo.status) : null;
        return (
          <div key={store.id} className="card wc">
            <div className="fb">
              <div><div className="sname">{store.name}</div><div className="sdet">{store.weeklyDeadline} ｜ {store.deliveryNote}</div></div>
              {si ? <span className="spl" style={{background:si.bg,color:si.color,fontSize:9}}>{si.label}</span> : <span className="badge bpd">未発注</span>}
            </div>
            {lo && <div style={{marginTop:5,fontSize:10,color:"var(--wk)"}}>発注日:{lo.orderDate} ｜ 希望:{lo.hopeWeek}</div>}
          </div>
        );
      })}
      <div className="g2" style={{marginTop:9}}>
        {[["🥬 仕込みリスト","prepList"],["🚚 配送リスト","deliveryList"],["🥦 キャベツ管理","cabbage"],["📋 全発注一覧","allOrders"],["📦 則武店管理","weeklyManage"]].map(([l,n]) => (
          <button key={n} className="card" style={{cursor:"pointer",textAlign:"center",padding:12}} onClick={() => onNav(n)}>
            <div style={{fontSize:12,fontWeight:700,color:n==="weeklyManage"?"var(--wk)":"var(--pr)"}}>{l}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WeeklyManage({weeklyOrders, setWeeklyOrders, allItems}) {
  const [sel, setSel] = useState(null);
  const [sd, setSd] = useState("");
  const [st, setSt] = useState("");
  const [stf, setStf] = useState("");
  const open = o => { setSel(o); setSd(o.scheduledDate||""); setSt(o.scheduledTime||""); setStf(o.deliveryStaff||""); };
  const save = () => { setWeeklyOrders(p => p.map(o => o.id===sel.id ? {...o,scheduledDate:sd,scheduledTime:st,deliveryStaff:stf} : o)); setSel(null); };
  const chg = (id, status) => setWeeklyOrders(p => p.map(o => o.id===id ? {...o,status,completedAt:status==="completed"?new Date().toISOString():o.completedAt} : o));
  return (
    <div>
      <div className="sect wkt">📦 週まとめ発注管理（則武店）</div>
      {STORES_INIT.filter(s => s.type === "weekly").map(store => {
        const ords = weeklyOrders.filter(o => o.storeId === store.id);
        return (
          <div key={store.id}>
            <div className="wdv">{store.name}</div>
            {!ords.length && <div className="card"><div className="txm fs10">発注なし</div></div>}
            {ords.map(order => {
              const si = statusInfo(order.status);
              return (
                <div key={order.id} className="card wc">
                  <div className="fb" style={{marginBottom:7}}>
                    <div>
                      <div className="fw7 fs11">発注日: {order.orderDate}</div>
                      <div className="fs10 txm">期間: {order.useWeek}</div>
                      <div className="fs10 txm">希望: {order.hopeWeek}</div>
                    </div>
                    <span className="spl" style={{background:si.bg,color:si.color}}>{si.label}</span>
                  </div>
                  <div style={{marginBottom:7}}>
                    <div className="fs10 txm" style={{marginBottom:3}}>ステータス変更:</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                      {WEEKLY_STATUSES.map(s => (
                        <button key={s.key} className="btn bxs" style={{background:s.bg,color:s.color,border:"1px solid "+s.color,fontFamily:"Noto Sans JP",fontWeight:order.status===s.key?800:500}} onClick={() => chg(order.id, s.key)}>{s.label}</button>
                      ))}
                    </div>
                  </div>
                  {order.scheduledDate && <div className="al ao"><span>📅</span>配送予定: {order.scheduledDate} {order.scheduledTime} ｜ 担当: {order.deliveryStaff||"未定"}</div>}
                  <div style={{marginBottom:7}}>
                    <div className="fs10 txm" style={{marginBottom:3}}>発注内容:</div>
                    {order.lines.map(l => {
                      const item = allItems.find(i => i.id === l.itemId);
                      return (<div key={l.itemId} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0"}}><span>{item?.name}</span><span className="fw7">{l.qty} {item?.unit}</span></div>);
                    })}
                  </div>
                  <button className="btn bsec bsm" onClick={() => open(order)}>📅 配送予定を設定</button>
                </div>
              );
            })}
          </div>
        );
      })}
      {sel && (
        <div className="overlay" onClick={e => e.target===e.currentTarget && setSel(null)}>
          <div className="sheet">
            <div style={{fontSize:15,fontWeight:800,marginBottom:13}}>📅 配送予定を設定</div>
            <div className="fg"><label className="fl">配送予定日</label><input type="date" className="fi" value={sd} onChange={e => setSd(e.target.value)} /></div>
            <div className="fg"><label className="fl">配送予定時間</label><input type="time" className="fi" value={st} onChange={e => setSt(e.target.value)} /></div>
            <div className="fg"><label className="fl">配送担当者</label><input className="fi" value={stf} onChange={e => setStf(e.target.value)} placeholder="担当者名" /></div>
            <div className="dv"/>
            <button className="btn bwk" style={{marginBottom:7}} onClick={save}>保存する</button>
            <button className="btn bsec" onClick={() => setSel(null)}>キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrepList({orders, allItems}) {
  const tod = orders.filter(o => o.orderDate===TODAY && o.status==="submitted");
  const tots = {};
  tod.forEach(o => o.lines.forEach(l => { if(!tots[l.itemId]) tots[l.itemId]=0; tots[l.itemId]+=l.qty; }));
  return (
    <div>
      <div className="sect">🥬 仕込みリスト</div>
      <div className="al ai"><span>📅</span>翌日使用分（{TOMORROW}）の仕込み量</div>
      {FOOD_CATS.map(cat => {
        const items = allItems.filter(i => i.cat===cat && tots[i.id]);
        if (!items.length) return null;
        return (
          <div key={cat} className="card">
            <div className="ct">{cat}</div>
            {items.map(item => (
              <div key={item.id} className="srow">
                <div>
                  <div className="fw7 fs11">{item.name}</div>
                  <div style={{fontSize:9,color:"var(--tx3)"}}>{tod.filter(o=>o.lines.some(l=>l.itemId===item.id)).map(o=>STORES_INIT.find(s=>s.id===o.storeId)?.name).join("、")}</div>
                </div>
                <div style={{fontWeight:800,fontSize:16,color:"var(--pr)"}}>{tots[item.id]} {item.unit}</div>
              </div>
            ))}
          </div>
        );
      })}
      {!Object.keys(tots).length && <div className="empty"><div style={{fontSize:36}}>📭</div>データなし</div>}
    </div>
  );
}

function DelivList({orders, setOrders, allItems}) {
  const tod = orders.filter(o => o.orderDate===TODAY && o.status==="submitted");
  const daily = STORES_INIT.filter(s => s.type==="daily").sort((a,b) => a.routeOrder-b.routeOrder);
  return (
    <div>
      <div className="sect">🚚 配送リスト</div>
      <div className="al ai"><span>🕒</span>15:30 CK出発 → 通常配送ルート（則武店は別途）</div>
      {daily.map((store, idx) => {
        const order = tod.find(o => o.storeId===store.id);
        const done = order?.confirmedAt;
        return (
          <div key={store.id} className="rst">
            <div className={"rdt "+(done?"dn":"")}>{idx+1}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,color:"var(--tx3)",fontWeight:700}}>🕒 {store.deliveryTime}</div>
              <div style={{fontWeight:700,fontSize:13,margin:"2px 0 5px"}}>{store.name}{store.isCabbageBase?" 🥦":""}</div>
              {order ? (
                <>
                  {[...order.lines.map(l => ({id:l.itemId,qty:l.qty})), ...order.supplies.map(s => ({id:s.itemId,qty:s.qty}))].map(({id,qty}) => {
                    const item = allItems.find(i => i.id===id);
                    return <div key={id} style={{fontSize:11,color:"var(--tx2)",padding:"1px 0"}}>• {item?.name} {qty}{item?.unit}</div>;
                  })}
                  {!done
                    ? <button className="btn bac bxs" style={{marginTop:5}} onClick={() => setOrders(p => p.map(o => o.id===order.id ? {...o,confirmedAt:new Date().toISOString()} : o))}>✅ 納品完了</button>
                    : <div style={{fontSize:10,color:"var(--ac)",fontWeight:700,marginTop:3}}>✅ 納品確認済み</div>
                  }
                </>
              ) : <div style={{fontSize:11,color:"var(--dg)",fontWeight:700}}>❌ 発注なし</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cabbage({orders, weeklyOrders, allItems}) {
  const [losses, setLosses] = useState({});
  const cabId = allItems.find(i => i.name==="キャベツ")?.id;
  const tod = orders.filter(o => o.orderDate===TODAY && o.status==="submitted");
  const dailyData = STORES_INIT.filter(s => s.type==="daily").map(s => ({store:s, qty:tod.find(o=>o.storeId===s.id)?.lines.find(l=>l.itemId===cabId)?.qty||0}));
  const weeklyData = STORES_INIT.filter(s => s.type==="weekly").map(s => ({store:s, qty:weeklyOrders.filter(o=>o.storeId===s.id).slice(-1)[0]?.lines.find(l=>l.itemId===cabId)?.qty||0}));
  const totalD = dailyData.reduce((s,d) => s+d.qty, 0);
  const totalW = weeklyData.reduce((s,d) => s+d.qty, 0);
  const mm = STORES_INIT.map((s,i) => ({store:s, total:[145,198,132,176,88][i]||120}));
  return (
    <div>
      <div className="sect">🥦 キャベツ専用管理</div>
      <div className="cabt">
        <div style={{fontSize:11,opacity:.85,marginBottom:2}}>本日カット必要量（坂戸店）</div>
        <div className="cabkg">{totalD} <span style={{fontSize:24}}>kg</span></div>
        <div style={{fontSize:10,opacity:.8,marginTop:2}}>通常配送分合計</div>
      </div>
      {totalW > 0 && (
        <div className="card wc">
          <div style={{fontWeight:700,fontSize:12,color:"var(--wk)"}}>📦 則武店（週まとめ分）</div>
          <div style={{fontFamily:"'M PLUS Rounded 1c'",fontSize:30,fontWeight:800,color:"var(--wk)"}}>{totalW} kg</div>
          <div className="fs10 txm">今週の発注分</div>
        </div>
      )}
      <div className="card">
        <div className="ct">📊 店舗別キャベツ発注量</div>
        <div className="ddv" style={{fontSize:10,padding:"4px 9px",marginBottom:7}}>🚚 通常配送店舗</div>
        {dailyData.map(({store,qty}) => (
          <div key={store.id} className="srow">
            <div><div className="fw7 fs11">{store.name}{store.isCabbageBase?" 🥦（カット担当）":""}</div></div>
            <div style={{fontWeight:800,fontSize:16,color:"var(--pr)"}}>{qty} kg</div>
          </div>
        ))}
        {weeklyData.length > 0 && (
          <>
            <div className="wdv" style={{fontSize:10,padding:"4px 9px",margin:"7px 0"}}>📦 週まとめ店舗</div>
            {weeklyData.map(({store,qty}) => (
              <div key={store.id} className="srow">
                <div><div className="fw7 fs11">{store.name}</div><div className="fs10 txm">週まとめ分</div></div>
                <div style={{fontWeight:800,fontSize:16,color:"var(--wk)"}}>{qty} kg/週</div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="card">
        <div className="ct">📉 ロス記録</div>
        {[...dailyData,...weeklyData].filter(d => d.qty > 0).map(({store}) => (
          <div key={store.id} className="fg">
            <label className="fl">{store.name} ロス量{store.type==="weekly"?" (週)":""}</label>
            <div style={{display:"flex",gap:7,alignItems:"center"}}>
              <input type="number" min="0" step="0.1" className="fi" style={{padding:"8px 9px",fontSize:12}} value={losses[store.id]||""} placeholder="0.0" onChange={e => setLosses(p => ({...p,[store.id]:+e.target.value}))} />
              <span className="fs10 txm">kg</span>
            </div>
          </div>
        ))}
        <button className="btn bsec">ロスを記録する</button>
      </div>
      <div className="card">
        <div className="ct">📅 今月のキャベツ使用量</div>
        {mm.map(({store,total}) => (
          <div key={store.id} className="srow">
            <div><div className="fw7 fs11">{store.name}</div>{store.type==="weekly"&&<div className="fs10" style={{color:"var(--wk)"}}>週まとめ店舗</div>}</div>
            <div style={{fontWeight:800,color:store.type==="weekly"?"var(--wk)":"var(--ac)"}}>{total} kg</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AllOrders({orders, weeklyOrders, allItems}) {
  const tod = orders.filter(o => o.orderDate === TODAY);
  return (
    <div>
      <div className="sect">📋 全店舗発注一覧</div>
      <div className="ddv">🚚 通常配送店舗</div>
      {STORES_INIT.filter(s => s.type==="daily").map(store => {
        const ords = tod.filter(o => o.storeId===store.id);
        return (
          <div key={store.id} className="card">
            <div className="fb" style={{marginBottom:7}}>
              <div className="ct" style={{marginBottom:0}}>{store.name}</div>
              {ords.length > 0
                ? <span className={"badge "+(ords.some(o=>o.isLate)?"blt":"bok")}>{ords.some(o=>o.isLate)?"⚠️締切後":"✅発注済"}</span>
                : <span className="badge bpd">❌未発注</span>}
            </div>
            {ords.flatMap(o => o.lines).map(l => { const item=allItems.find(i=>i.id===l.itemId); return <div key={l.itemId} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:11}}><span>{item?.name}</span><span className="fw7">{l.qty} {item?.unit}</span></div>; })}
            {ords.flatMap(o => o.supplies).map(s => { const item=allItems.find(i=>i.id===s.itemId); return <div key={s.itemId} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:11}}><span>📦 {item?.name}</span><span className="fw7">{s.qty} {item?.unit}</span></div>; })}
            {!ords.length && <div style={{color:"var(--dg)",fontSize:11}}>本日の発注なし</div>}
          </div>
        );
      })}
      <div className="wdv">📦 週まとめ・不定期配送店舗</div>
      {STORES_INIT.filter(s => s.type==="weekly").map(store => {
        const lo = weeklyOrders.filter(o => o.storeId===store.id).slice(-1)[0];
        const si = lo ? statusInfo(lo.status) : null;
        return (
          <div key={store.id} className="card wc">
            <div className="fb" style={{marginBottom:7}}>
              <div className="ct" style={{marginBottom:0,color:"var(--wk)"}}>{store.name}</div>
              {si ? <span className="spl" style={{background:si.bg,color:si.color,fontSize:9}}>{si.label}</span> : <span className="badge bpd">未発注</span>}
            </div>
            {lo && <><div className="fs10 txm" style={{marginBottom:5}}>発注日:{lo.orderDate} ｜ 期間:{lo.useWeek}</div>{lo.lines.map(l => { const item=allItems.find(i=>i.id===l.itemId); return <div key={l.itemId} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:11}}><span>{item?.name}</span><span className="fw7">{l.qty} {item?.unit}</span></div>; })}</>}
            {!lo && <div style={{color:"var(--dg)",fontSize:11}}>発注なし</div>}
          </div>
        );
      })}
    </div>
  );
}

function AdminDB({orders, weeklyOrders, allItems, yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects, adminComments, setAdminComments, onNav}) {
  const [selStore, setSelStore] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState(null);

  const getStoreData = (storeId) => {
    const goal = yearlyGoals.find(g=>g.storeId===storeId&&g.year===THIS_YEAR);
    const result = monthlyResults.find(r=>r.storeId===storeId&&r.month===THIS_MONTH);
    const scoreData = goal&&result ? calcManagerScore(result,goal,weeklyReflects,monthlyReflects,storeId,THIS_MONTH) : null;
    const monthTarget = goal?.monthlySalesTargets?.[THIS_MONTH]||(goal?.annualSalesTarget||0)/12;
    const salesRate = result&&monthTarget>0?Math.round(result.sales/monthTarget*100):null;
    const weekDiag = diagnoseWeek(storeId,orders,weeklyOrders,allItems||[],monthTarget);
    const now=new Date();const dayOfYear=Math.ceil((now-(new Date(now.getFullYear(),0,1)))/86400000);
    const expectedPacePct=Math.round(dayOfYear/365*100);
    const yearResults=monthlyResults.filter(r=>r.storeId===storeId&&r.month.startsWith(String(THIS_YEAR)));
    const cumSales=yearResults.reduce((s,r)=>s+r.sales,0);
    const annualRate=goal?Math.round(cumSales/goal.annualSalesTarget*100):null;
    const paceDiff=annualRate!==null?annualRate-expectedPacePct:null;
    const latestReflect=(weeklyReflects||[]).filter(r=>r.storeId===storeId).sort((a,b)=>b.createdAt-a.createdAt)[0];
    const align=latestReflect?checkReflectAlignment(weekDiag,latestReflect.causes):null;
    const commentSent=(adminComments||[]).some(c=>c.storeId===storeId&&c.createdAt>Date.now()-7*86400000);
    const stateInfo=scoreData?scoreData.score>=80?{l:"良好",c:"var(--ac)",bg:"#D1FAE5"}:scoreData.score>=60?{l:"注意",c:"#D97706",bg:"#FEF3C7"}:{l:"危険",c:"var(--dg)",bg:"#FEE2E2"}:null;
    return {goal,result,scoreData,salesRate,weekDiag,annualRate,paceDiff,latestReflect,align,commentSent,stateInfo};
  };

  const sendComment=(storeId,text)=>{
    setAdminComments(p=>[...(p||[]),{targetType:"weekly",targetId:Date.now(),storeId,text,createdAt:Date.now()}]);
    setCommentText(""); setCommentTarget(null);
  };

  const rankColor={A:"var(--ac)",B:"#D97706",C:"#7C3AED",D:"var(--dg)"};

  return (
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:13}}>🏪 全店舗の状態</div>
      {STORES_INIT.map(store=>{
        const d=getStoreData(store.id);
        const isOpen=selStore===store.id;
        const commentCandidate=buildAdminCommentCandidate(store.id,d.weekDiag,d.latestReflect);
        return(
          <div key={store.id} style={{marginBottom:11}}>
            <div className="card" style={{cursor:"pointer",borderLeft:"4px solid "+(d.stateInfo?.c||"var(--bd)")}}>
              {/* 店舗サマリー行 */}
              <div onClick={()=>setSelStore(isOpen?null:store.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:16}}>{store.name}</div>
                    {d.stateInfo&&<div style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:20,background:d.stateInfo.bg,color:d.stateInfo.c,fontWeight:800,fontSize:12,marginTop:3,whiteSpace:"nowrap"}}>{d.stateInfo.l}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    {d.scoreData&&<div style={{fontFamily:"'M PLUS Rounded 1c',sans-serif",fontSize:22,fontWeight:800,color:rankColor[d.scoreData.rank],lineHeight:1}}>{d.scoreData.rank}<span style={{fontSize:13,color:"var(--tx3)"}}>評価</span></div>}
                    {d.scoreData&&<div style={{fontSize:12,color:"var(--tx3)"}}>{d.scoreData.score}点</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:12}}>
                  {d.salesRate!==null&&<div>今月達成率 <b style={{color:d.salesRate>=100?"var(--ac)":d.salesRate>=90?"#D97706":"var(--dg)"}}>{d.salesRate}%</b></div>}
                  {d.paceDiff!==null&&<div>年間 <b style={{color:d.paceDiff>=0?"var(--ac)":d.paceDiff>=-5?"#D97706":"var(--dg)"}}>{d.paceDiff>=0?"順調":d.paceDiff>=-5?"少し遅れ":"大きく遅れ"}</b></div>}
                  {d.weekDiag.topIssue&&<div style={{color:"#E65100"}}>⚠️ {d.weekDiag.topIssue.label}</div>}
                </div>
                <div style={{display:"flex",gap:8,marginTop:6}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:d.latestReflect?"#ECFDF5":"#FEE2E2",color:d.latestReflect?"var(--ac)":"var(--dg)",fontWeight:700}}>{d.latestReflect?"📝 振り返り提出済":"📝 振り返り未提出"}</span>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:d.commentSent?"#F3F4F6":"#FEF3C7",color:d.commentSent?"var(--tx3)":"#92400E",fontWeight:700}}>{d.commentSent?"💬 コメント送信済":"💬 コメント未送信"}</span>
                </div>
              </div>

              {/* 詳細（開いた時） */}
              {isOpen&&(
                <div style={{marginTop:13,borderTop:"1px solid var(--bd)",paddingTop:13}}>
                  {/* ズレ判定 */}
                  {d.align&&d.latestReflect&&(
                    <div style={{background:d.align.level==="一致"?"#ECFDF5":"#FFFBEB",borderRadius:10,padding:"10px 12px",marginBottom:11}}>
                      <div style={{fontSize:13,fontWeight:800,color:d.align.level==="一致"?"var(--ac)":"#D97706",marginBottom:4}}>🔍 振り返りと数字の一致：{d.align.level}</div>
                      <div style={{fontSize:12,color:"var(--tx2)",marginBottom:3}}>本人の選んだ原因：{d.latestReflect.causes?.join("・")||"なし"}</div>
                      {d.weekDiag.topIssue&&<div style={{fontSize:12,color:"var(--tx2)"}}>数字上の課題：{d.weekDiag.topIssue.label}</div>}
                      {d.align.msg&&<div style={{fontSize:12,color:"#D97706",fontWeight:700,marginTop:5}}>{d.align.msg}</div>}
                    </div>
                  )}

                  {/* コメント送信 */}
                  <div style={{fontSize:13,fontWeight:700,color:"var(--tx2)",marginBottom:6}}>💬 管理者コメントを送る</div>
                  <div style={{background:"#F9FAFB",borderRadius:9,padding:"10px 12px",marginBottom:7,fontSize:12,color:"var(--tx3)"}}>
                    <div style={{fontWeight:700,marginBottom:4}}>コメント候補：</div>
                    <div>{commentCandidate}</div>
                    <button className="btn bsec bxs" style={{marginTop:7}} onClick={()=>setCommentText(commentCandidate)}>この文を使う</button>
                  </div>
                  <textarea className="fta" style={{fontSize:13,minHeight:72}} value={commentTarget===store.id?commentText:""} onChange={e=>{setCommentText(e.target.value);setCommentTarget(store.id);}} placeholder="コメントを入力または上の候補を編集してください"/>
                  <button className="btn bac bsm" style={{marginTop:7}} onClick={()=>sendComment(store.id,commentTarget===store.id?commentText:commentCandidate)} disabled={!commentText&&commentTarget!==store.id}>送信する</button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 管理者：要対応画面
// ============================================================
function AdminUrgentScreen({orders, weeklyOrders, allItems, yearlyGoals, monthlyResults, weeklyReflects, monthlyReflects, adminComments, setAdminComments}) {
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState(null);

  const urgentStores = STORES_INIT.map(store=>{
    const goal=yearlyGoals.find(g=>g.storeId===store.id&&g.year===THIS_YEAR);
    const result=monthlyResults.find(r=>r.storeId===store.id&&r.month===THIS_MONTH);
    const scoreData=goal&&result?calcManagerScore(result,goal,weeklyReflects,monthlyReflects,store.id,THIS_MONTH):null;
    const monthTarget=goal?.monthlySalesTargets?.[THIS_MONTH]||(goal?.annualSalesTarget||0)/12;
    const salesRate=result&&monthTarget>0?Math.round(result.sales/monthTarget*100):null;
    const weekDiag=diagnoseWeek(store.id,orders,weeklyOrders,allItems||[],monthTarget);
    const latestReflect=(weeklyReflects||[]).filter(r=>r.storeId===store.id).sort((a,b)=>b.createdAt-a.createdAt)[0];
    const align=latestReflect?checkReflectAlignment(weekDiag,latestReflect.causes):null;
    const commentSent=(adminComments||[]).some(c=>c.storeId===store.id&&c.createdAt>Date.now()-7*86400000);
    const now=new Date();const dayOfYear=Math.ceil((now-(new Date(now.getFullYear(),0,1)))/86400000);
    const expectedPacePct=Math.round(dayOfYear/365*100);
    const yearResults=monthlyResults.filter(r=>r.storeId===store.id&&r.month.startsWith(String(THIS_YEAR)));
    const cumSales=yearResults.reduce((s,r)=>s+r.sales,0);
    const annualRate=goal?Math.round(cumSales/goal.annualSalesTarget*100):null;
    const paceDiff=annualRate!==null?annualRate-expectedPacePct:null;

    const reasons=[];
    if(!latestReflect)reasons.push("週次振り返りが未提出");
    if(!commentSent)reasons.push("管理者コメントが未送信");
    if(salesRate!==null&&salesRate<90)reasons.push("今月の売上達成率が低い（"+salesRate+"%）");
    if(scoreData&&scoreData.rank==="C")reasons.push("店長評価がC評価");
    if(scoreData&&scoreData.rank==="D")reasons.push("店長評価がD評価（面談対象）");
    if(paceDiff!==null&&paceDiff<-5)reasons.push("年間ペースが大きく遅れています");
    if(align&&align.level==="少しズレ")reasons.push("振り返りと数字にズレがあります");
    if(weekDiag.topIssue)reasons.push("今週の課題："+weekDiag.topIssue.label);
    if(weekDiag.lateCount>0)reasons.push("発注締切が守れていない（"+weekDiag.lateCount+"回）");

    return {store,reasons,weekDiag,latestReflect,align,scoreData,salesRate,commentSent,commentCandidate:buildAdminCommentCandidate(store.id,weekDiag,latestReflect)};
  }).filter(d=>d.reasons.length>0).sort((a,b)=>b.reasons.length-a.reasons.length);

  if(urgentStores.length===0) return(
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:13}}>⚠️ 要対応</div>
      <div style={{borderRadius:14,padding:24,background:"var(--sf2)",textAlign:"center",border:"1px solid var(--bd)"}}>
        <div style={{fontSize:36,marginBottom:8}}>✅</div>
        <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>現在、要対応の店舗はありません</div>
        <div style={{fontSize:13,color:"var(--tx3)"}}>全店舗の状態は良好です</div>
      </div>
    </div>
  );

  return(
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:5}}>⚠️ 要対応</div>
      <div style={{fontSize:13,color:"var(--tx3)",marginBottom:13}}>今日見るべき店舗：{urgentStores.length}件</div>
      {urgentStores.map(({store,reasons,weekDiag,latestReflect,align,scoreData,salesRate,commentSent,commentCandidate})=>{
        const isTarget=commentTarget===store.id;
        return(
          <div key={store.id} className="card" style={{marginBottom:11,borderLeft:"4px solid var(--dg)"}}>
            <div style={{fontWeight:800,fontSize:16,marginBottom:6}}>{store.name}</div>
            <div style={{marginBottom:8}}>
              {reasons.map((r,i)=><div key={i} style={{fontSize:13,color:"var(--dg)",fontWeight:700,padding:"2px 0"}}>• {r}</div>)}
            </div>

            {weekDiag.topIssue&&(
              <div style={{background:"#FFF3E0",borderRadius:9,padding:"9px 12px",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700,color:"#E65100",marginBottom:3}}>数字上の課題：{weekDiag.topIssue.label}</div>
                <div style={{fontSize:12,color:"var(--tx2)"}}>必要対応：{weekDiag.topIssue.action[0]}</div>
              </div>
            )}

            {latestReflect&&align&&align.level!=="一致"&&(
              <div style={{background:"#FFFBEB",borderRadius:9,padding:"9px 12px",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:700,color:"#D97706"}}>振り返りと数字のズレ</div>
                <div style={{fontSize:12,color:"var(--tx2)"}}>本人の認識：{latestReflect.causes?.join("・")||"なし"}</div>
                <div style={{fontSize:12,color:"var(--tx2)"}}>数字上の課題：{weekDiag.topIssue?.label||"なし"}</div>
              </div>
            )}

            <div style={{background:"#F9FAFB",borderRadius:9,padding:"10px 12px",marginBottom:8,fontSize:12,color:"var(--tx3)"}}>
              <div style={{fontWeight:700,marginBottom:3}}>コメント候補：</div>
              <div>{commentCandidate}</div>
            </div>

            {isTarget&&<textarea className="fta" style={{fontSize:13,minHeight:64,marginBottom:7}} value={commentText} onChange={e=>setCommentText(e.target.value)}/>}

            <div style={{display:"flex",gap:8}}>
              {!isTarget&&<button className="btn bac bsm" onClick={()=>{setCommentTarget(store.id);setCommentText(commentCandidate);}}>✏️ コメントを送る</button>}
              {isTarget&&<button className="btn bac bsm" onClick={()=>{setAdminComments(p=>[...(p||[]),{targetType:"weekly",targetId:Date.now(),storeId:store.id,text:commentText,createdAt:Date.now()}]);setCommentTarget(null);setCommentText("");}}>送信する</button>}
              {isTarget&&<button className="btn bsec bxs" onClick={()=>setCommentTarget(null)}>キャンセル</button>}
              {!isTarget&&commentSent&&<span style={{fontSize:11,padding:"4px 8px",borderRadius:10,background:"#F3F4F6",color:"var(--tx3)",fontWeight:700}}>送信済み</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 管理者：振り返り確認画面
// ============================================================
function AdminReflectScreen({yearlyGoals, monthlyResults, weeklyReflects, adminComments, setAdminComments, orders, weeklyOrders, allItems}) {
  const [selStore, setSelStore] = useState("all");
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState(null);

  const targetReflects = (weeklyReflects||[]).filter(r=>selStore==="all"||r.storeId===+selStore).sort((a,b)=>b.createdAt-a.createdAt).slice(0,10);

  return(
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:13}}>📋 振り返り確認</div>
      <div className="fg">
        <label className="fl">店舗を選択</label>
        <select className="fsel" value={selStore} onChange={e=>setSelStore(e.target.value)}>
          <option value="all">全店舗</option>
          {STORES_INIT.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {targetReflects.length===0&&<div className="empty"><div style={{fontSize:32}}>📝</div><div style={{marginTop:7,fontSize:14}}>振り返りはまだありません</div></div>}
      {targetReflects.map((r,i)=>{
        const store=STORES_INIT.find(s=>s.id===r.storeId);
        const goal=yearlyGoals.find(g=>g.storeId===r.storeId&&g.year===THIS_YEAR);
        const monthTarget=goal?.monthlySalesTargets?.[r.month]||(goal?.annualSalesTarget||0)/12;
        const weekDiag=diagnoseWeek(r.storeId,orders||[],weeklyOrders||[],allItems||[],monthTarget);
        const align=checkReflectAlignment(weekDiag,r.causes);
        const myComments=(adminComments||[]).filter(c=>c.targetType==="weekly"&&c.targetId===r.createdAt);
        const isTarget=commentTarget===r.createdAt;
        return(
          <div key={i} className="card" style={{marginBottom:11}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div><div style={{fontWeight:800,fontSize:15}}>{store?.name}</div><div style={{fontSize:12,color:"var(--tx3)"}}>{r.weekLabel||r.month}</div></div>
              {align&&<span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:700,background:align.level==="一致"?"#D1FAE5":"#FEF3C7",color:align.level==="一致"?"var(--ac)":"#D97706",whiteSpace:"nowrap"}}>{align.level}</span>}
            </div>
            <div style={{fontSize:13,color:"var(--tx2)",marginBottom:4}}>本人の原因：{r.causes?.join("・")||"なし"}</div>
            {weekDiag.topIssue&&<div style={{fontSize:13,color:"var(--tx2)",marginBottom:4}}>数字上の課題：{weekDiag.topIssue.label}</div>}
            {r.nextAction&&<div style={{fontSize:13,color:"var(--ac)",fontWeight:700,marginBottom:6}}>来週やること：{r.nextAction}</div>}
            {r.comment&&<div style={{fontSize:12,color:"var(--tx3)",fontStyle:"italic",marginBottom:6}}>「{r.comment}」</div>}
            {myComments.map((c,ci)=><div key={ci} className="al ao" style={{marginBottom:0,marginTop:5}}><span>👤</span><div><b>管理者：</b>{c.text}</div></div>)}
            {isTarget&&<textarea className="fta" style={{fontSize:13,minHeight:56,marginTop:7}} value={commentText} onChange={e=>setCommentText(e.target.value)}/>}
            <div style={{display:"flex",gap:7,marginTop:7}}>
              {!isTarget&&<button className="btn bsec bxs" onClick={()=>{setCommentTarget(r.createdAt);setCommentText(buildAdminCommentCandidate(r.storeId,weekDiag,r));}}>💬 コメントする</button>}
              {isTarget&&<button className="btn bac bxs" onClick={()=>{setAdminComments(p=>[...(p||[]),{targetType:"weekly",targetId:r.createdAt,storeId:r.storeId,text:commentText,createdAt:Date.now()}]);setCommentTarget(null);}}>送信</button>}
              {isTarget&&<button className="btn bsec bxs" onClick={()=>setCommentTarget(null)}>キャンセル</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// 管理者：発注管理サマリー画面
// ============================================================
function AdminOrderSummary({orders, weeklyOrders, allItems, onNav}) {
  const tod = orders.filter(o=>o.orderDate===TODAY);
  const daily = STORES_INIT.filter(s=>s.type==="daily");
  const submitted = new Set(tod.filter(o=>o.status==="submitted").map(o=>o.storeId));
  const lateStores = STORES_INIT.filter(s=>tod.some(o=>o.storeId===s.id&&o.isLate));
  const unsubStores = daily.filter(s=>!submitted.has(s.id));

  return(
    <div>
      <div style={{fontSize:18,fontWeight:800,marginBottom:13}}>📋 発注管理</div>
      {unsubStores.length>0&&<div className="al ad" style={{marginBottom:11}}><span>🚨</span><b>本日未発注：{unsubStores.map(s=>s.name).join("、")}</b></div>}
      {lateStores.length>0&&<div className="al aw" style={{marginBottom:11}}><span>⚠️</span>締切後発注：{lateStores.map(s=>s.name).join("、")}</div>}

      <div className="card" style={{marginBottom:11}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:9}}>今日の発注状況</div>
        {daily.map(s=>{
          const sub=submitted.has(s.id);
          const late=tod.some(o=>o.storeId===s.id&&o.isLate);
          return(<div key={s.id} className="srow">
            <div><div className="sname">{s.name}</div><div className="sdet">配送 {s.deliveryTime}</div></div>
            <span className={"badge "+(late?"blt":sub?"bok":"bpd")} style={{fontSize:12}}>{late?"⚠️締切後":sub?"✅発注済":"❌未発注"}</span>
          </div>);
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        {[["🥬 仕込みリスト","prepList"],["🚚 配送リスト","deliveryList"],["🥦 キャベツ管理","cabbage"],["📦 則武店管理","weeklyManage"],["📋 全発注一覧","allOrders"]].map(([l,n])=>(
          <button key={n} className="card" style={{cursor:"pointer",textAlign:"center",padding:13}} onClick={()=>onNav(n)}>
            <div style={{fontSize:13,fontWeight:700,color:n==="weeklyManage"?"var(--wk)":"var(--pr)"}}>{l}</div>
          </button>
        ))}
      </div>
    </div>
  );
}



function Monthly() {
  const [sel, setSel] = useState("all");
  const data = sel === "all" ? MONTH_DATA : MONTH_DATA.filter(m => m.storeId === +sel);
  const tot = data.reduce((a,m) => ({
    sales:a.sales+m.sales, laborCost:a.laborCost+m.laborCost,
    itemCost:a.itemCost+m.itemCost, supplyCost:a.supplyCost+m.supplyCost, lossCost:a.lossCost+m.lossCost
  }), {sales:0,laborCost:0,itemCost:0,supplyCost:0,lossCost:0});
  return (
    <div>
      <div className="sect">📊 月次集計（2025年5月）</div>
      <div className="fg">
        <select className="fsel" value={sel} onChange={e => setSel(e.target.value)}>
          <option value="all">全店舗合計</option>
          <optgroup label="通常配送店舗">{STORES_INIT.filter(s=>s.type==="daily").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
          <optgroup label="週まとめ店舗">{STORES_INIT.filter(s=>s.type==="weekly").map(s=><option key={s.id} value={s.id}>{s.name}（週まとめ）</option>)}</optgroup>
        </select>
      </div>
      {STORES_INIT.find(s=>s.id===+sel&&s.type==="weekly") && <div className="al awk"><span>📦</span>週まとめ発注店舗は「費率」で評価します。</div>}
      <div className="card" style={{background:"linear-gradient(135deg,#FFF3E0,#FFE0B2)"}}>
        <div className="ct" style={{color:"var(--pr)"}}>💰 売上・経費サマリー</div>
        {[
          ["月間売上","¥"+fmt(tot.sales),"var(--pr)"],
          ["食材費","¥"+fmt(tot.itemCost)+"（"+pct(tot.itemCost,tot.sales)+"%）","var(--tx)"],
          ["備品費","¥"+fmt(tot.supplyCost)+"（"+pct(tot.supplyCost,tot.sales)+"%）","var(--tx)"],
          ["人件費","¥"+fmt(tot.laborCost)+"（"+pct(tot.laborCost,tot.sales)+"%）","var(--tx)"],
          ["ロス","¥"+fmt(tot.lossCost)+"（"+pct(tot.lossCost,tot.sales)+"%）","var(--dg)"],
          ["利益率",(100-Math.round(pct(tot.itemCost+tot.laborCost+tot.supplyCost+tot.lossCost,tot.sales)))+"%","var(--ac)"],
        ].map(([l,v,c]) => (
          <div key={l} className="fb" style={{padding:"6px 0",borderBottom:"1px solid var(--bd)"}}>
            <div style={{fontSize:12,color:"var(--tx2)"}}>{l}</div>
            <div style={{fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      {sel === "all" && (
        <div className="card">
          <div className="ct">🏪 店舗別明細</div>
          {MONTH_DATA.map(m => {
            const store = STORES_INIT.find(s => s.id===m.storeId);
            const fp = pct(m.itemCost, m.sales);
            return (
              <div key={m.storeId} style={{borderBottom:"1px solid var(--bd)",paddingBottom:9,marginBottom:9}}>
                <div className="fb" style={{marginBottom:3}}>
                  <div className="fw7 fs11">{store?.name}</div>
                  {store?.type==="weekly" && <span style={{fontSize:9,background:"var(--wkbg)",color:"var(--wk)",padding:"1px 5px",borderRadius:9,fontWeight:700}}>週まとめ</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,fontSize:10}}>
                  <div>売上: <b>¥{fmt(m.sales)}</b></div>
                  <div>食材費率: <b style={{color:fp>35?"var(--dg)":"inherit"}}>{fp}%</b></div>
                  <div>人件費率: <b>{pct(m.laborCost,m.sales)}%</b></div>
                  <div>締切後: <b style={{color:m.lateOrders>0?"var(--dg)":"inherit"}}>{m.lateOrders}回</b></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button className="btn bsec">📥 CSVエクスポート</button>
    </div>
  );
}

function Incentive() {
  const calc = m => {
    let s = 0;
    const fp=pct(m.itemCost,m.sales), lp=pct(m.laborCost,m.sales), sp=pct(m.supplyCost,m.sales), ls=pct(m.lossCost,m.sales);
    if(m.sales>=1800000)s+=20; if(lp<=30)s+=15; if(fp<=30)s+=15; if(sp<=5)s+=10; if(ls<=1)s+=15;
    s+=(m.lateOrders===0?15:m.lateOrders<=1?8:0);
    s+=(m.orderErrors===0?10:m.orderErrors<=1?5:0);
    return {score:s, rank:s>=80?"A":s>=60?"B":"C", fp,lp,sp,ls};
  };
  const rk = {
    A:["#065F46","linear-gradient(135deg,#ECFDF5,#D1FAE5)","2px solid #10B981","#10B981"],
    B:["#92400E","linear-gradient(135deg,#FFFBEB,#FEF3C7)","2px solid #F59E0B","#F59E0B"],
    C:["#991B1B","linear-gradient(135deg,#FFF5F5,#FEE2E2)","2px solid #EF4444","#EF4444"],
  };
  return (
    <div>
      <div className="sect">🏆 インセンティブ判定（2025年5月）</div>
      <div className="al ai">A評価（80点以上）：満額 ｜ B評価（60点以上）：一部 ｜ C評価：対象外</div>
      {MONTH_DATA.map(m => {
        const store = STORES_INIT.find(s => s.id===m.storeId);
        const {score,rank,fp,lp,sp,ls} = calc(m);
        const [tc,bg,br,rc] = rk[rank];
        return (
          <div key={m.storeId} style={{borderRadius:13,padding:13,marginBottom:9,border:br,background:bg}}>
            <div className="fb" style={{marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:rc,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15}}>{rank}</div>
                <div style={{fontWeight:800,fontSize:13}}>{store?.name}{store?.type==="weekly"&&<span style={{fontSize:9,color:"var(--wk)",marginLeft:5}}>週まとめ</span>}</div>
              </div>
              <div style={{fontFamily:"'M PLUS Rounded 1c'",fontSize:20,fontWeight:800,color:tc}}>{score}点</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,fontSize:10}}>
              {[["売上目標",m.sales>=1800000],["食材費率 "+fp+"%",fp<=30],["人件費率 "+lp+"%",lp<=30],["備品費率 "+sp+"%",sp<=5],["ロス率 "+ls+"%",ls<=1],["締切遵守",m.lateOrders===0]].map(([l,ok]) => (
                <div key={l} style={{display:"flex",alignItems:"center",gap:2,color:ok?"inherit":"var(--dg)"}}><span>{ok?"✅":"❌"}</span><span>{l}</span></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LateOrders({orders}) {
  const late = orders.filter(o => o.isLate);
  return (
    <div>
      <div className="sect">⚠️ 締切後発注管理</div>
      <div className="card">
        <div className="ct">店舗別回数</div>
        {STORES_INIT.filter(s=>s.type==="daily").map(s => {
          const cnt = late.filter(o=>o.storeId===s.id).length;
          return (<div key={s.id} className="srow"><div className="fw7 fs11">{s.name}</div><div style={{fontWeight:800,color:cnt>0?"var(--dg)":"var(--ac)"}}>{cnt}回</div></div>);
        })}
      </div>
      <div className="card">
        <div className="ct">履歴</div>
        {!late.length && <div className="txm fs10">締切後発注なし</div>}
        {late.map(o => {
          const store = STORES_INIT.find(s=>s.id===o.storeId);
          return (<div key={o.id} className="srow"><div><div className="fw7 fs11">{store?.name}</div><div className="fs10 txm">{o.orderDate} ｜ {o.orderedBy}</div><div style={{fontSize:10,color:"var(--dg)"}}>理由: {o.lateReason}</div></div><span className="badge blt">締切後</span></div>);
        })}
      </div>
    </div>
  );
}

function ItemEdit({item, onSave, onClose}) {
  const [f, setF] = useState({...item});
  const s = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sheet">
        <div style={{fontSize:14,fontWeight:800,marginBottom:13}}>✏️ 商品編集</div>
        {[["商品名","name","text"],["単位","unit","text"],["原価","price","number"],["最小発注数","minQty","number"],["最大発注数","maxQty","number"],["発注単位","orderUnit","number"],["優先度","priority","number"]].map(([l,k,t]) => (
          <div key={k} className="fg"><label className="fl">{l}</label><input type={t} className="fi" value={f[k]} onChange={e => s(k, t==="number" ? +e.target.value : e.target.value)} /></div>
        ))}
        <div className="fg"><label className="fl">カテゴリ</label><select className="fsel" value={f.cat} onChange={e => s("cat",e.target.value)}>{ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="fg"><label className="fl">注意事項</label><input className="fi" value={f.caution} onChange={e => s("caution",e.target.value)} /></div>
        <div className="fg"><label className="fl">備考</label><input className="fi" value={f.note} onChange={e => s("note",e.target.value)} /></div>
        <div className="dv"/>
        <button className="btn bpr" style={{marginBottom:7}} onClick={() => onSave(f)}>保存する</button>
        <button className="btn bsec" onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

function ItemAdd({onSave, onClose}) {
  const [f, setF] = useState({id:Date.now(),cat:"備品",name:"",unit:"",price:0,minQty:1,maxQty:100,orderUnit:1,priority:99,visible:"all",active:true,caution:"",note:""});
  const s = (k,v) => setF(p => ({...p,[k]:v}));
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sheet">
        <div style={{fontSize:14,fontWeight:800,marginBottom:13}}>➕ 新規商品追加</div>
        <div className="fg"><label className="fl">カテゴリ *</label><select className="fsel" value={f.cat} onChange={e => s("cat",e.target.value)}>{ALL_CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        <div className="fg"><label className="fl">商品名 *</label><input className="fi" value={f.name} onChange={e => s("name",e.target.value)} placeholder="例：お漬物シール" /></div>
        <div className="fg"><label className="fl">単位 *</label><input className="fi" value={f.unit} onChange={e => s("unit",e.target.value)} placeholder="例：枚、kg" /></div>
        {[["原価","price"],["発注単位","orderUnit"],["最大発注数","maxQty"]].map(([l,k]) => (
          <div key={k} className="fg"><label className="fl">{l}</label><input type="number" className="fi" value={f[k]} onChange={e => s(k,+e.target.value)} /></div>
        ))}
        <div className="fg"><label className="fl">注意事項</label><input className="fi" value={f.caution} onChange={e => s("caution",e.target.value)} /></div>
        <div className="dv"/>
        <button className="btn bpr" style={{marginBottom:7}} disabled={!f.name||!f.unit} onClick={() => onSave(f)}>追加する</button>
        <button className="btn bsec" onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

function MasterAdmin({allItems, setAllItems, storeVisIds, setStoreVisIds}) {
  const [tab, setTab] = useState("items");
  const [fCat, setFCat] = useState("全て");
  const [fStore, setFStore] = useState("all");
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [quickPrice, setQuickPrice] = useState({});   // {itemId: newPrice}
  const [savedIds, setSavedIds] = useState(new Set()); // 保存済みフラッシュ

  const filtered = useMemo(() => allItems.filter(i => {
    if (fCat !== "全て" && i.cat !== fCat) return false;
    if (fStore !== "all" && !storeVisIds[+fStore]?.includes(i.id)) return false;
    if (search && !i.name.includes(search)) return false;
    return true;
  }), [allItems, fCat, fStore, search, storeVisIds]);

  const togActive = id => setAllItems(p => p.map(i => i.id===id ? {...i,active:!i.active} : i));
  const togVis = (sId, iId) => setStoreVisIds(p => {
    const cur = p[sId]||[];
    return {...p,[sId]: cur.includes(iId) ? cur.filter(x=>x!==iId) : [...cur,iId]};
  });
  const saveEdit = upd => { setAllItems(p => p.map(i => i.id===upd.id?upd:i)); setEditItem(null); };
  const addItem = item => {
    setAllItems(p => [...p, item]);
    setStoreVisIds(p => { const n={...p}; STORES_INIT.forEach(s=>{n[s.id]=[...(n[s.id]||[]),item.id];}); return n; });
    setShowAdd(false);
  };
  const delItem = id => {
    if (!window.confirm("非表示にしますか？（過去の発注履歴には影響しません）")) return;
    setAllItems(p => p.map(i => i.id===id?{...i,active:false}:i));
  };
  const saveQuickPrice = id => {
    const v = +quickPrice[id];
    if (!v || v <= 0) return;
    setAllItems(p => p.map(i => i.id===id ? {...i,price:v} : i));
    setSavedIds(p => new Set([...p, id]));
    setTimeout(()=>setSavedIds(p=>{const n=new Set(p);n.delete(id);return n;}), 1500);
    setQuickPrice(p => { const n={...p}; delete n[id]; return n; });
  };

  return(
    <div>
      <div style={{fontSize:17,fontWeight:800,marginBottom:13}}>⚙️ 商品管理</div>

      {/* タブ */}
      <div className="tabs" style={{marginBottom:11}}>
        {[["items","商品一覧・価格変更"],["store","店舗別表示設定"]].map(([k,l])=>(
          <button key={k} className={"tab "+(tab===k?"on":"")} onClick={()=>setTab(k)} style={{fontSize:12}}>{l}</button>
        ))}
      </div>

      {tab==="items" && (<>
        {/* 絞り込みバー */}
        <div className="card" style={{marginBottom:11,padding:"11px 13px"}}>
          <input className="fi" placeholder="🔍 商品名で検索" value={search} onChange={e=>setSearch(e.target.value)} style={{marginBottom:8,fontSize:13}}/>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <select className="fsel" value={fCat} onChange={e=>setFCat(e.target.value)} style={{fontSize:12,padding:"7px 9px",flex:1}}>
              <option value="全て">全カテゴリ</option>
              <optgroup label="食品系">{FOOD_CATS.map(c=><option key={c} value={c}>{c}</option>)}</optgroup>
              <option value="備品">備品</option>
            </select>
            <select className="fsel" value={fStore} onChange={e=>setFStore(e.target.value)} style={{fontSize:12,padding:"7px 9px",flex:1}}>
              <option value="all">全店舗</option>
              {STORES_INIT.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{fontSize:11,color:"var(--tx3)",marginTop:6}}>{filtered.length}件表示中</div>
        </div>

        <button className="btn bpr bsm" style={{marginBottom:11}} onClick={()=>setShowAdd(true)}>＋ 商品を追加する</button>

        {filtered.map(item=>(
          <div key={item.id} className="card" style={{padding:"12px 13px",opacity:item.active?1:.6,marginBottom:9,borderLeft:"3px solid "+(FOOD_CATS.includes(item.cat)?"var(--pr)":"var(--ac)")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:14}}>{item.name} {!item.active&&<span style={{fontSize:10,color:"#999",fontWeight:400}}>[非表示]</span>}</div>
                <div style={{fontSize:12,color:"var(--tx3)",marginTop:1}}>{item.cat} ｜ {item.unit} ｜ 発注単位:{item.orderUnit}</div>
                {item.caution&&<div style={{fontSize:11,color:"#DC2626",marginTop:2}}>⚠️ {item.caution}</div>}
              </div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <button className="btn bsec bxs" style={{fontSize:11}} onClick={()=>setEditItem({...item})}>編集</button>
                <button className="btn bxs" style={{background:item.active?"#FEF3C7":"#ECFDF5",color:item.active?"#92400E":"#065F46",border:"1px solid",fontSize:11}} onClick={()=>togActive(item.id)}>{item.active?"非表示":"表示"}</button>
              </div>
            </div>

            {/* 価格クイック編集 */}
            <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--sf2)",borderRadius:8,padding:"8px 10px"}}>
              <div style={{fontSize:12,color:"var(--tx3)",flexShrink:0}}>現在価格</div>
              <div style={{fontWeight:800,fontSize:15,color:"var(--pr)",flexShrink:0}}>¥{fmt(item.price)}</div>
              <input type="number" placeholder="新価格を入力" style={{flex:1,padding:"6px 9px",border:"1.5px solid var(--bd)",borderRadius:7,fontSize:13,fontFamily:"Noto Sans JP",background:"#fff"}} value={quickPrice[item.id]||""} onChange={e=>setQuickPrice(p=>({...p,[item.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&saveQuickPrice(item.id)}/>
              <button className="btn bsm" style={{background:savedIds.has(item.id)?"var(--ac)":"var(--pr)",color:"#fff",border:"none",flexShrink:0,minWidth:52,fontSize:12,padding:"7px 12px",borderRadius:7,fontFamily:"'M PLUS Rounded 1c'"}} onClick={()=>saveQuickPrice(item.id)}>
                {savedIds.has(item.id)?"✓ 保存":"保存"}
              </button>
            </div>
          </div>
        ))}
      </>)}

      {tab==="store" && (<>
        <div className="fg">
          <label className="fl">店舗を選択</label>
          <select className="fsel" value={fStore} onChange={e=>setFStore(e.target.value)}>
            <option value="all">店舗を選んでください</option>
            <optgroup label="通常配送店舗">{STORES_INIT.filter(s=>s.type==="daily").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            <optgroup label="週まとめ店舗">{STORES_INIT.filter(s=>s.type==="weekly").map(s=><option key={s.id} value={s.id}>{s.name}（週まとめ）</option>)}</optgroup>
          </select>
        </div>
        {fStore!=="all" && (
          <div className="card">
            <div style={{fontSize:13,fontWeight:800,marginBottom:9}}>{STORES_INIT.find(s=>s.id===+fStore)?.name} の表示商品設定</div>
            <div className="al ai" style={{marginBottom:11}}><span>ℹ️</span>チェックした商品だけ店長の発注画面に表示されます</div>
            {ALL_CATS.map(cat => {
              const catItems = allItems.filter(i => i.cat===cat && i.active);
              if (!catItems.length) return null;
              return(
                <div key={cat} style={{marginBottom:13}}>
                  <div style={{fontSize:12,fontWeight:800,color:"var(--ac)",marginBottom:7,borderBottom:"1px solid var(--bd)",paddingBottom:5}}>── {cat}</div>
                  {catItems.map(item=>{
                    const isVis = storeVisIds[+fStore]?.includes(item.id);
                    return(
                      <div key={item.id} className={"ci "+(isVis?"ck":"")} onClick={()=>togVis(+fStore,item.id)} style={{marginBottom:5}}>
                        <div className="cbox">{isVis?"✓":""}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700}}>{item.name}</div>
                          <div style={{fontSize:11,color:"var(--tx3)"}}>{item.unit} ｜ ¥{fmt(item.price)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </>)}

      {editItem && <ItemEdit item={editItem} onSave={saveEdit} onClose={()=>setEditItem(null)}/>}
      {showAdd && <ItemAdd onSave={addItem} onClose={()=>setShowAdd(false)}/>}
    </div>
  );
}


// ============================================================
// CSV出力画面
// ============================================================
function CsvExportScreen({orders, weeklyOrders, allItems, storeGoals, yearlyGoals=[], monthlyResults=[]}) {
  const exportOrders = () => {
    const header = ["発注ID","店舗名","発注日","使用予定日","発注者","ステータス","締切後","理由","食材（品目数）","備品（品目数）"];
    const rows = orders.map(o => {
      const store = STORES_INIT.find(s=>s.id===o.storeId);
      return [o.id, store?.name||"", o.orderDate, o.useDate, o.orderedBy,
        o.status==="submitted"?"送信済":"下書き",
        o.isLate?"はい":"いいえ", o.lateReason||"",
        o.lines.length, o.supplies.length];
    });
    downloadCSV("発注履歴_"+TODAY+".csv", [header,...rows]);
  };

  const exportOrderDetail = () => {
    const header = ["発注ID","店舗名","発注日","商品名","カテゴリ","数量","単位","締切後"];
    const rows = [];
    orders.forEach(o => {
      const store = STORES_INIT.find(s=>s.id===o.storeId);
      o.lines.forEach(l => {
        const item = allItems.find(i=>i.id===l.itemId);
        rows.push([o.id, store?.name||"", o.orderDate, item?.name||"", item?.cat||"", l.qty, item?.unit||"", o.isLate?"はい":"いいえ"]);
      });
      o.supplies.forEach(s => {
        const item = allItems.find(i=>i.id===s.itemId);
        rows.push([o.id, store?.name||"", o.orderDate, item?.name||"", "備品", s.qty, item?.unit||"", o.isLate?"はい":"いいえ"]);
      });
    });
    downloadCSV("発注明細_"+TODAY+".csv", [header,...rows]);
  };

  const exportWeekly = () => {
    const header = ["発注ID","店舗名","発注日","使用期間","希望納品週","ステータス","配送予定日","配送担当","商品名","発注数","在庫数","週必要数","単位"];
    const rows = [];
    weeklyOrders.forEach(o => {
      const store = STORES_INIT.find(s=>s.id===o.storeId);
      const si = statusInfo(o.status);
      o.lines.forEach(l => {
        const item = allItems.find(i=>i.id===l.itemId);
        rows.push([o.id, store?.name||"", o.orderDate, o.useWeek, o.hopeWeek, si.label,
          o.scheduledDate||"未定", o.deliveryStaff||"未定",
          item?.name||"", l.qty, l.stock||0, l.weeklyNeed||0, item?.unit||""]);
      });
    });
    downloadCSV("週まとめ発注_"+TODAY+".csv", [header,...rows]);
  };

  const exportItems = () => {
    const header = ["ID","カテゴリ","商品名","単位","原価","最小発注数","最大発注数","発注単位","優先度","状態","注意事項","備考"];
    const rows = allItems.map(i => [i.id, i.cat, i.name, i.unit, i.price, i.minQty, i.maxQty, i.orderUnit, i.priority, i.active?"表示":"非表示", i.caution||"", i.note||""]);
    downloadCSV("商品マスタ_"+TODAY+".csv", [header,...rows]);
  };

  const exportGoals = () => {
    const header = ["店舗名","月","売上目標","人件費率目標","食材費率目標","備品費率目標","ロス率目標","メッセージ","やること1","やること2","やること3","公開状態"];
    const rows = storeGoals.map(g => {
      const store = STORES_INIT.find(s=>s.id===g.storeId);
      return [store?.name||"", g.month, g.salesTarget, g.laborRateTarget, g.foodRateTarget,
        g.supplyRateTarget, g.lossRateTarget, g.managerMessage||"",
        g.actionItems?.[0]||"", g.actionItems?.[1]||"", g.actionItems?.[2]||"", g.status];
    });
    downloadCSV("店舗目標設定_"+TODAY+".csv", [header,...rows]);
  };

  const exportMonthly = () => {
    const header = ["店舗名","店舗タイプ","売上","食材費","食材費率","人件費","人件費率","備品費","備品費率","ロス","ロス率","締切後発注回数","発注ミス回数"];
    const rows = MONTH_DATA.map(m => {
      const store = STORES_INIT.find(s=>s.id===m.storeId);
      return [store?.name||"", store?.type==="weekly"?"週まとめ":"通常",
        m.sales, m.itemCost, pct(m.itemCost,m.sales)+"%",
        m.laborCost, pct(m.laborCost,m.sales)+"%",
        m.supplyCost, pct(m.supplyCost,m.sales)+"%",
        m.lossCost, pct(m.lossCost,m.sales)+"%",
        m.lateOrders, m.orderErrors];
    });
    downloadCSV("月次集計_"+TODAY+".csv", [header,...rows]);
  };

  const exportMonthlyResults = () => {
    const header = ["店舗名","月","売上","人件費","人件費率","食材費","食材費率","備品費","備品費率","発注回数","締切後発注","締切遵守率","管理者メモ"];
    const rows = monthlyResults.map(r => {
      const store = STORES_INIT.find(s=>s.id===r.storeId);
      const lr = r.sales>0?pct(r.laborCost,r.sales)+"%":"-";
      const fr = r.sales>0?pct(r.foodOrderCost,r.sales)+"%":"-";
      const sr = r.sales>0?pct(r.supplyOrderCost,r.sales)+"%":"-";
      const dr = r.totalOrders>0?Math.round(r.onTimeOrders/r.totalOrders*100)+"%":"-";
      return [store?.name||"",r.month,r.sales,r.laborCost,lr,r.foodOrderCost,fr,r.supplyOrderCost,sr,r.totalOrders,r.lateOrders,dr,r.adminMemo||""];
    });
    downloadCSV("月次実績_"+TODAY+".csv",[header,...rows]);
  };

  const exportYearlyGoals = () => {
    const header = ["店舗名","年","年間目標","人件費率目標","食材費率目標","備品費率目標","締切遵守率目標","公開状態","方針メッセージ"];
    const rows = yearlyGoals.map(g => {
      const store = STORES_INIT.find(s=>s.id===g.storeId);
      return [store?.name||"",g.year,g.annualSalesTarget,g.laborRateTarget,g.foodRateTarget,g.supplyRateTarget,g.deadlineRateTarget,g.status,g.managerMessage||""];
    });
    downloadCSV("年間目標_"+TODAY+".csv",[header,...rows]);
  };

  const btns = [
    ["📋 発注履歴CSV（サマリー）", exportOrders, "発注日・店舗・品目数"],
    ["📋 発注明細CSV（商品別）",   exportOrderDetail, "商品名・数量・店舗"],
    ["📦 週まとめ発注CSV",        exportWeekly, "則武店の週まとめ発注一覧"],
    ["⚙️ 商品マスタCSV",          exportItems, "全商品の設定情報"],
    ["🎯 店舗目標設定CSV",         exportGoals, "目標値・メッセージ"],
    ["📊 月次集計CSV",             exportMonthly, "全店舗の今月実績（旧形式）"],
    ["📊 月次実績CSV",             exportMonthlyResults, "月別売上・費率・締切遵守率"],
    ["📈 年間目標CSV",             exportYearlyGoals, "各店舗の年間目標・費率目標"],
  ];

  return (
    <div>
      <div className="sect">📥 CSV出力</div>
      <div className="al ai"><span>ℹ️</span>管理者のみ使用できます。Excel等で開いて確認できます。</div>
      {btns.map(([label, fn, desc]) => (
        <div key={label} className="card" style={{padding:"12px 13px"}}>
          <div className="fb">
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{label}</div>
              <div className="fs10 txm">{desc}</div>
            </div>
            <button className="btn bac bsm" style={{flexShrink:0,marginLeft:9}} onClick={fn}>出力</button>
          </div>
        </div>
      ))}
      <div style={{marginTop:16}}>
        <button className="btn" style={{background:"#FEE2E2",color:"#991B1B",border:"2px solid #EF4444",fontSize:12,padding:"11px"}} onClick={resetAllData}>
          🗑️ デモデータに戻す（全データ削除）
        </button>
        <div className="fs10 txm" style={{marginTop:5,textAlign:"center"}}>※ この操作は元に戻せません</div>
      </div>
    </div>
  );
}

function StoreAdmin() {
  const [stores, setStores] = useState([...STORES_INIT]);
  const [nn, setNn] = useState("");
  const [nt, setNt] = useState("");
  const [ntype, setNtype] = useState("daily");
  const add = () => {
    if (!nn.trim()) return;
    setStores(p => [...p, {id:Date.now(),name:nn,type:ntype,routeOrder:p.length+1,deliveryTime:nt,weeklyDeadline:"月曜 12:00",deliveryNote:"不定期配送"}]);
    setNn(""); setNt("");
  };
  return (
    <div>
      <div className="sect">🏪 店舗管理</div>
      <div className="ddv">🚚 通常配送店舗</div>
      {stores.filter(s=>s.type==="daily").map(s => (
        <div key={s.id} className="card">
          <div className="fb">
            <div><div className="fw7 fs11">{s.name}{s.isCabbageBase?" 🥦":""}</div><div className="fs10 txm">{s.deliveryTime} ｜ ルート{s.routeOrder}番</div></div>
            <button className="btn bxs" style={{background:"#FEE2E2",color:"#991B1B",border:"1px solid #EF4444"}} onClick={() => setStores(p=>p.filter(x=>x.id!==s.id))}>削除</button>
          </div>
        </div>
      ))}
      <div className="wdv">📦 週まとめ・不定期配送店舗</div>
      {stores.filter(s=>s.type==="weekly").map(s => (
        <div key={s.id} className="card wc">
          <div className="fb">
            <div><div className="fw7 fs11">{s.name}</div><div className="fs10 txm">{s.weeklyDeadline} ｜ {s.deliveryNote}</div></div>
            <button className="btn bxs" style={{background:"#FEE2E2",color:"#991B1B",border:"1px solid #EF4444"}} onClick={() => setStores(p=>p.filter(x=>x.id!==s.id))}>削除</button>
          </div>
        </div>
      ))}
      <div className="card" style={{marginTop:11}}>
        <div className="ct">➕ 新規店舗追加</div>
        <div className="fg"><label className="fl">店舗タイプ</label><select className="fsel" value={ntype} onChange={e=>setNtype(e.target.value)}><option value="daily">通常配送（毎日）</option><option value="weekly">週まとめ・不定期配送</option></select></div>
        <div className="fg"><label className="fl">店舗名</label><input className="fi" value={nn} onChange={e=>setNn(e.target.value)} /></div>
        {ntype === "daily" && <div className="fg"><label className="fl">配送時刻</label><input className="fi" placeholder="例: 17:10" value={nt} onChange={e=>setNt(e.target.value)} /></div>}
        <button className="btn bpr" onClick={add} disabled={!nn}>店舗を追加する</button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("dashboard");
  const [orders, setOrders] = useState(() =>
    loadStorage(STORAGE_KEYS.orders, MOCK_ORDERS)
  );
  const [weeklyOrders, setWeeklyOrders] = useState(() =>
    loadStorage(STORAGE_KEYS.weeklyOrders, MOCK_WEEKLY)
  );
  const [allItems, setAllItems] = useState(() =>
    loadStorage(STORAGE_KEYS.allItems, ITEMS_INIT)
  );
  const [storeVisIds, setStoreVisIds] = useState(() => {
    // localStorageから読み込み、食品IDが抜けている場合は再構築してマージ
    const saved = loadStorage(STORAGE_KEYS.storeVisIds, null);
    const fresh = buildStoreVisible(loadStorage(STORAGE_KEYS.allItems, ITEMS_INIT));
    if (!saved) return fresh;
    // 保存済みデータに新しいIDをマージ（消えているIDを復元）
    const merged = {};
    STORES_INIT.forEach(store => {
      const savedIds = new Set(saved[store.id] || []);
      const freshIds = fresh[store.id] || [];
      // freshにあるがsavedにないIDを追加（新商品や欠落IDを補完）
      freshIds.forEach(id => savedIds.add(id));
      merged[store.id] = [...savedIds];
    });
    return merged;
  });
  const [storeGoals, setStoreGoals] = useState(() =>
    loadStorage(STORAGE_KEYS.storeGoals, STORE_GOALS_INIT)
  );
  const [yearlyGoals, setYearlyGoals] = useState(() =>
    loadStorage(STORAGE_KEYS.yearlyGoals, YEARLY_GOALS_INIT)
  );
  const [monthlyResults, setMonthlyResults] = useState(() =>
    loadStorage(STORAGE_KEYS.monthlyResults, MONTHLY_RESULTS_INIT)
  );
  const [weeklyReflects, setWeeklyReflects] = useState(() =>
    loadStorage(STORAGE_KEYS.weeklyReflects, [])
  );
  const [monthlyReflects, setMonthlyReflects] = useState(() =>
    loadStorage(STORAGE_KEYS.monthlyReflects, [])
  );
  const [adminComments, setAdminComments] = useState(() =>
    loadStorage(STORAGE_KEYS.adminComments, [])
  );

  useEffect(() => { saveStorage(STORAGE_KEYS.orders,          orders);          }, [orders]);
  useEffect(() => { saveStorage(STORAGE_KEYS.weeklyOrders,    weeklyOrders);    }, [weeklyOrders]);
  useEffect(() => { saveStorage(STORAGE_KEYS.allItems,        allItems);        }, [allItems]);
  useEffect(() => { saveStorage(STORAGE_KEYS.storeVisIds,     storeVisIds);     }, [storeVisIds]);
  useEffect(() => { saveStorage(STORAGE_KEYS.storeGoals,      storeGoals);      }, [storeGoals]);
  useEffect(() => { saveStorage(STORAGE_KEYS.yearlyGoals,     yearlyGoals);     }, [yearlyGoals]);
  useEffect(() => { saveStorage(STORAGE_KEYS.monthlyResults,  monthlyResults);  }, [monthlyResults]);
  useEffect(() => { saveStorage(STORAGE_KEYS.weeklyReflects,  weeklyReflects);  }, [weeklyReflects]);
  useEffect(() => { saveStorage(STORAGE_KEYS.monthlyReflects, monthlyReflects); }, [monthlyReflects]);
  useEffect(() => { saveStorage(STORAGE_KEYS.adminComments,   adminComments);   }, [adminComments]);

  const login = useCallback(u => { setUser(u); setScreen("dashboard"); }, []);
  const logout = useCallback(() => { setUser(null); setScreen("dashboard"); }, []);
  const nav = useCallback(s => setScreen(s), []);

  if (!user) {
    return (
      <>
        <style>{CSS}</style>
        <Login onLogin={login} />
      </>
    );
  }

  const curStore = STORES_INIT.find(s => s.id === user.storeId);
  const isWeekly = curStore?.type === "weekly";
  const roleLabel = user.role==="manager" ? "店長" : user.role==="ck" ? "CK担当" : "管理者";

  const navCfg = {
    mgr_daily:  [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"orderHub",i:"📋",l:"発注"},{k:"weeklyReflect",i:"📝",l:"振り返り"},{k:"incentiveCheck",i:"🏆",l:"評価"}],
    mgr_weekly: [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"orderHub",i:"📋",l:"発注"},{k:"weeklyReflect",i:"📝",l:"振り返り"},{k:"incentiveCheck",i:"🏆",l:"評価"}],
    ck:    [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"allOrders",i:"📋",l:"発注一覧"},{k:"prepList",i:"🥬",l:"仕込み"},{k:"deliveryList",i:"🚚",l:"配送"},{k:"cabbage",i:"🥦",l:"キャベツ"},{k:"weeklyManage",i:"📦",l:"則武店"}],
    admin: [{k:"dashboard",i:"🏠",l:"全店舗"},{k:"adminUrgent",i:"⚠️",l:"要対応"},{k:"adminReflect",i:"📝",l:"振り返り"},{k:"yearlyGoal",i:"🎯",l:"目標設定"},{k:"adminOrders",i:"📋",l:"発注管理"},{k:"masterAdmin",i:"⚙️",l:"商品管理"}],
  };
  const navKey = user.role==="manager" ? (isWeekly?"mgr_weekly":"mgr_daily") : user.role;
  const navItems = navCfg[navKey] || navCfg.mgr_daily;
  const cp = {user,orders,setOrders,allItems,setAllItems,storeVisIds,setStoreVisIds,onNav:nav};

  const renderScreen = () => {
    if (user.role === "manager" && !isWeekly) {
      if (screen==="dashboard")       return <ManagerDB user={user} orders={orders} onNav={nav} storeGoals={storeGoals} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} weeklyReflects={weeklyReflects} monthlyReflects={monthlyReflects} />;
      if (screen==="orderHub")        return <OrderHubScreen user={user} orders={orders} isWeekly={false} onNav={nav} />;
      if (screen==="foodOrder")       return <FoodOrder {...cp} />;
      if (screen==="supplyOrder")     return <SupplyOrder {...cp} />;
      if (screen==="deliveryConfirm") return <DelivConf user={user} orders={orders} setOrders={setOrders} allItems={allItems} />;
      if (screen==="incentiveCheck")  return <IncentiveCheckScreen user={user} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} weeklyReflects={weeklyReflects} monthlyReflects={monthlyReflects} />;
      if (screen==="weeklyReflect")   return <WeeklyReflectScreen user={user} weeklyReflects={weeklyReflects} setWeeklyReflects={setWeeklyReflects} adminComments={adminComments} orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} />;
    }
    if (user.role === "manager" && isWeekly) {
      if (screen==="dashboard")       return <WeeklyDB user={user} weeklyOrders={weeklyOrders} onNav={nav} storeGoals={storeGoals} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} />;
      if (screen==="orderHub")        return <OrderHubScreen user={user} orders={orders} isWeekly={true} onNav={nav} />;
      if (screen==="weeklyOrder")     return <WeeklyOrder user={user} allItems={allItems} storeVisIds={storeVisIds} weeklyOrders={weeklyOrders} setWeeklyOrders={setWeeklyOrders} onNav={nav} />;
      if (screen==="supplyOrder")     return <SupplyOrder {...cp} />;
      if (screen==="deliveryConfirm") return <div><div className="sect">✅ 納品確認</div><div className="al awk"><span>📦</span>則武店の納品確認はCKから配送予定が届いた後に確認できます。</div></div>;
      if (screen==="incentiveCheck")  return <IncentiveCheckScreen user={user} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} weeklyReflects={weeklyReflects} monthlyReflects={monthlyReflects} />;
      if (screen==="weeklyReflect")   return <WeeklyReflectScreen user={user} weeklyReflects={weeklyReflects} setWeeklyReflects={setWeeklyReflects} adminComments={adminComments} orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} />;
    }
    if (user.role === "ck") {
      if (screen==="dashboard")     return <CKDB orders={orders} weeklyOrders={weeklyOrders} onNav={nav} />;
      if (screen==="allOrders")     return <AllOrders orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="prepList")      return <PrepList orders={orders} allItems={allItems} />;
      if (screen==="deliveryList")  return <DelivList orders={orders} setOrders={setOrders} allItems={allItems} />;
      if (screen==="cabbage")       return <Cabbage orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="weeklyManage")  return <WeeklyManage weeklyOrders={weeklyOrders} setWeeklyOrders={setWeeklyOrders} allItems={allItems} />;
    }
    if (user.role === "admin") {
      const adminCommonProps = {orders,weeklyOrders,allItems,yearlyGoals,monthlyResults,weeklyReflects,monthlyReflects,adminComments,setAdminComments};
      if (screen==="dashboard")    return <AdminDB {...adminCommonProps} onNav={nav} />;
      if (screen==="adminUrgent")  return <AdminUrgentScreen {...adminCommonProps} />;
      if (screen==="adminReflect") return <AdminReflectScreen {...adminCommonProps} setAdminComments={setAdminComments} />;
      if (screen==="yearlyGoal")   return <YearlyGoalAdmin yearlyGoals={yearlyGoals} setYearlyGoals={setYearlyGoals} monthlyResults={monthlyResults} setMonthlyResults={setMonthlyResults} orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="adminOrders")  return <AdminOrderSummary orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} onNav={nav} />;
      if (screen==="allIncentive") return <AllStoreIncentiveScreen yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} weeklyReflects={weeklyReflects} monthlyReflects={monthlyReflects} adminComments={adminComments} setAdminComments={setAdminComments} />;
      if (screen==="goalSetting")  return <GoalSettingAdmin storeGoals={storeGoals} setStoreGoals={setStoreGoals} />;
      if (screen==="monthly")      return <Monthly />;
      if (screen==="incentive")    return <Incentive />;
      if (screen==="lateOrders")   return <LateOrders orders={orders} />;
      if (screen==="csvExport")    return <CsvExportScreen orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} storeGoals={storeGoals} yearlyGoals={yearlyGoals} monthlyResults={monthlyResults} />;
      if (screen==="masterAdmin")  return <MasterAdmin allItems={allItems} setAllItems={setAllItems} storeVisIds={storeVisIds} setStoreVisIds={setStoreVisIds} />;
      if (screen==="storeAdmin")   return <StoreAdmin />;
      if (screen==="allOrders")    return <AllOrders orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="prepList")     return <PrepList orders={orders} allItems={allItems} />;
      if (screen==="deliveryList") return <DelivList orders={orders} setOrders={setOrders} allItems={allItems} />;
      if (screen==="cabbage")      return <Cabbage orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="weeklyManage") return <WeeklyManage weeklyOrders={weeklyOrders} setWeeklyOrders={setWeeklyOrders} allItems={allItems} />;
    }
    return <div className="empty"><div style={{fontSize:36}}>🔍</div>画面が見つかりません</div>;
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className={"hdr "+(isWeekly?"wh":"")}>
          <div>
            <div className="hdr-t">🍜 CK発注管理</div>
            <div className="hdr-s">{curStore?.name||"セントラルキッチン"}{isWeekly?" 📦週まとめ":""}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span className="rb">{roleLabel}</span>
            <button className="lb" onClick={logout}>ログアウト</button>
          </div>
        </div>
        <div className="content">{renderScreen()}</div>
        <div className="bnav">
          {navItems.map(item => (
            <button key={item.k} className={"ni "+(screen===item.k?"on":"")+" "+(isWeekly?"wk":"")} onClick={() => nav(item.k)}>
              <span className="ni-i">{item.i}</span>
              <span className="ni-l">{item.l}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

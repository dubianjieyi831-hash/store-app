
import { useState, useCallback, useMemo, useEffect } from "react";

// ============================================================
// localStorage ユーティリティ
// ============================================================
const STORAGE_KEYS = {
  orders:      "ck_orders",
  weeklyOrders:"ck_weekly_orders",
  allItems:    "ck_all_items",
  storeVisIds: "ck_store_visible_ids",
  storeGoals:  "ck_store_goals",
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
  { id:3, name:"ジャパン",     type:"daily",  routeOrder:3, deliveryTime:"16:40" },
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
// 店舗目標データ
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

// 目標メッセージ・やること自動生成
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
  if (diff < 180) return {label:"あと"+Math.floor(diff/60)+"h"+diff%60+"m", color:"warn", isLate:false};
  return {label:"あと"+Math.floor(diff/60)+"h"+diff%60+"m", color:"safe", isLate:false};
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
body{font-family:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;}
.app{max-width:480px;margin:0 auto;min-height:100vh;}
.hdr{background:linear-gradient(135deg,var(--pr),var(--prd));color:#fff;padding:13px 15px 11px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 14px rgba(180,60,10,.25);}
.hdr.wh{background:linear-gradient(135deg,var(--wk),#4C1D95);}
.hdr-t{font-family:'M PLUS Rounded 1c',sans-serif;font-size:16px;font-weight:800;}
.hdr-s{font-size:10px;opacity:.8;margin-top:1px;}
.rb{background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;}
.lb{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;}
.bnav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#fff;border-top:1px solid var(--bd);display:flex;padding:5px 0 9px;box-shadow:0 -3px 16px rgba(180,100,30,.10);z-index:100;}
.ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:3px 0;border:none;background:none;font-family:'Noto Sans JP',sans-serif;}
.ni-i{font-size:19px;} .ni-l{font-size:9px;color:var(--tx3);font-weight:500;}
.ni.on .ni-l{color:var(--pr);font-weight:700;} .ni.wk.on .ni-l{color:var(--wk);} .ni.on .ni-i{transform:scale(1.12);}
.content{padding:14px 13px 90px;}
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
.badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;}
.bok{background:#D1FAE5;color:#065F46;} .bdr{background:#FEF3C7;color:#92400E;}
.blt{background:#FEE2E2;color:#991B1B;} .bpd{background:#F3F4F6;color:#6B7280;}
.fg{margin-bottom:11px;}
.fl{display:block;font-size:11px;font-weight:700;color:var(--tx2);margin-bottom:4px;}
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
.cdc{border-radius:13px;padding:16px;color:#fff;margin-bottom:11px;}
.cd-safe{background:linear-gradient(135deg,var(--ac),#1B4332);}
.cd-warn{background:linear-gradient(135deg,#D97706,#92400E);}
.cd-danger{background:linear-gradient(135deg,#DC2626,#7F1D1D);}
.cd-wk{background:linear-gradient(135deg,var(--wk),#4C1D95);}
.cdtime{font-family:'M PLUS Rounded 1c',sans-serif;font-size:34px;font-weight:800;line-height:1;}
.cdlbl{font-size:10px;opacity:.85;margin-bottom:1px;} .cdsub{font-size:10px;opacity:.8;margin-top:2px;}
.srow{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bd);}
.srow:last-child{border-bottom:none;}
.sname{font-weight:700;font-size:12px;} .sdet{font-size:10px;color:var(--tx3);margin-top:1px;}
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
.spl{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;}
.sect{font-family:'M PLUS Rounded 1c',sans-serif;font-size:16px;font-weight:800;color:var(--tx);margin-bottom:13px;display:flex;align-items:center;gap:6px;}
.sect.wkt{color:var(--wk);}
.dv{height:1px;background:var(--bd);margin:11px 0;}
.fb{display:flex;justify-content:space-between;align-items:center;}
.fw7{font-weight:700;} .fs11{font-size:11px;} .fs10{font-size:10px;}
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

function ManagerDB({user, orders, onNav, storeGoals}) {
  const dl = getDeadline();
  const store = STORES_INIT.find(s => s.id === user.storeId);
  const myO = orders.find(o => o.storeId === user.storeId && o.orderDate === TODAY && o.status === "submitted");
  return (
    <div>
      <div className={"cdc cd-"+dl.color}>
        <div className="cdlbl">📋 発注締切まで</div>
        <div className="cdtime">{dl.isLate ? "締切超過" : dl.label}</div>
        <div className="cdsub">本日22:00締切 ｜ {store?.name}</div>
      </div>
      {dl.isLate && !myO && <div className="al ad"><span>🚨</span>締切を過ぎています。発注すると「締切後発注」として記録されます。</div>}
      <GoalCard storeId={user.storeId} storeGoals={storeGoals} isWeekly={false} />
      <div className="card">
        <div className="ct">📦 本日の発注状況</div>
        <div className="fb">
          <div><div className="fw7" style={{fontSize:14}}>{store?.name}</div><div className="fs10 txm">{TODAY}</div></div>
          <span className={"badge "+(myO ? "bok" : "bdr")}>{myO ? "✅ 発注済み" : "⏳ 未発注"}</span>
        </div>
        {myO?.isLate && <div className="al aw" style={{marginTop:7}}><span>⚠️</span>締切後発注：{myO.lateReason}</div>}
      </div>
      <div className="g2" style={{marginBottom:11}}>
        <button className="card" style={{border:"2px solid var(--pr)",cursor:"pointer",textAlign:"center"}} onClick={() => onNav("foodOrder")}>
          <div style={{fontSize:26,marginBottom:3}}>🥩</div><div className="fw7 fs11" style={{color:"var(--pr)"}}>食材を発注</div>
        </button>
        <button className="card" style={{border:"2px solid var(--ac)",cursor:"pointer",textAlign:"center"}} onClick={() => onNav("supplyOrder")}>
          <div style={{fontSize:26,marginBottom:3}}>📦</div><div className="fw7 fs11" style={{color:"var(--ac)"}}>備品を発注</div>
        </button>
      </div>
      <div className="card">
        <div className="ct">📋 発注履歴</div>
        {orders.filter(o => o.storeId === user.storeId).slice(0,4).map(o => (
          <div key={o.id} className="srow">
            <div><div className="sname">{o.useDate} 使用分</div><div className="sdet">{o.orderDate} ｜ {o.orderedBy}</div></div>
            <span className={"badge "+(o.isLate ? "blt" : o.status==="submitted" ? "bok" : "bdr")}>{o.isLate ? "締切後" : o.status==="submitted" ? "送信済" : "下書き"}</span>
          </div>
        ))}
        {!orders.filter(o => o.storeId === user.storeId).length && <div className="txm fs10">履歴なし</div>}
      </div>
    </div>
  );
}

function WeeklyDB({user, weeklyOrders, onNav, storeGoals}) {
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
              return (
                <div key={id} className="srow">
                  <div><div className="fw7 fs11">{item?.name}</div>{item?.caution && <div style={{fontSize:9,color:"#DC2626"}}>⚠️ {item.caution}</div>}</div>
                  <div className="fw7">{qty} {item?.unit}</div>
                </div>
              );
            })}
            <div className="dv"/>
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
              return (<div key={id} className="srow"><div className="fw7 fs11">{item?.name}</div><div className="fw7">{qty} {item?.unit}</div></div>);
            })}
            <div className="dv"/>
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

function AdminDB({orders, weeklyOrders, onNav}) {
  const tod = orders.filter(o => o.orderDate === TODAY);
  const subCnt = [...new Set(tod.filter(o=>o.status==="submitted").map(o=>o.storeId))].length;
  const lateCnt = tod.filter(o => o.isLate).length;
  const unsub = STORES_INIT.filter(s => s.type==="daily" && !tod.some(o=>o.storeId===s.id&&o.status==="submitted"));
  return (
    <div>
      <div className="sect">👑 管理者ダッシュボード</div>
      <div className="sg" style={{marginBottom:11}}>
        <div className="sc"><div className="sv" style={{color:"var(--ac)"}}>{subCnt}/{STORES_INIT.filter(s=>s.type==="daily").length}</div><div className="sl">通常発注完了</div></div>
        <div className="sc"><div className="sv" style={{color:"var(--dg)"}}>{lateCnt}</div><div className="sl">締切後発注</div></div>
        <div className="sc"><div className="sv" style={{color:"var(--pr)"}}>¥{fmt(MONTH_DATA.reduce((s,m)=>s+m.sales,0))}</div><div className="sl">今月売上合計</div></div>
        <div className="sc"><div className="sv">{STORES_INIT.length}</div><div className="sl">運営店舗数</div></div>
      </div>
      {unsub.length > 0 && <div className="al ad"><span>🚨</span><div><b>要確認：</b>未発注 → {unsub.map(s=>s.name).join("、")}</div></div>}
      <div className="ddv">🚚 通常配送店舗</div>
      <div className="card">
        {STORES_INIT.filter(s => s.type==="daily").map(s => {
          const m = MONTH_DATA.find(d => d.storeId===s.id);
          const fp = pct(m?.itemCost||0, m?.sales||1);
          return (
            <div key={s.id} className="srow">
              <div style={{flex:1}}>
                <div className="fw7 fs11">{s.name}</div>
                <div style={{fontSize:9,color:"var(--tx3)"}}>売上 ¥{fmt(m?.sales)} ｜ 食材費率 {fp}%</div>
                <div className="pb"><div className="pf" style={{width:Math.min(100,fp*2.5)+"%",background:fp>35?"var(--dg)":"linear-gradient(90deg,var(--ac2),var(--ac))"}}/></div>
              </div>
              <div style={{marginLeft:7,fontWeight:700,fontSize:13,color:fp>35?"var(--dg)":"var(--ac)"}}>{fp}%</div>
            </div>
          );
        })}
      </div>
      <div className="wdv">📦 週まとめ店舗（則武店）</div>
      {STORES_INIT.filter(s => s.type==="weekly").map(s => {
        const m = MONTH_DATA.find(d => d.storeId===s.id);
        const fp = pct(m?.itemCost||0, m?.sales||1);
        const lo = weeklyOrders.filter(o=>o.storeId===s.id).slice(-1)[0];
        const si = lo ? statusInfo(lo.status) : null;
        return (
          <div key={s.id} className="card wc">
            <div className="fb">
              <div><div className="fw7 fs11">{s.name}</div><div className="fs10 txm">食材費率: {fp}% ｜ 売上: ¥{fmt(m?.sales)}</div></div>
              {si && <span className="spl" style={{background:si.bg,color:si.color,fontSize:9}}>{si.label}</span>}
            </div>
          </div>
        );
      })}
      <div className="g2" style={{marginTop:11}}>
        {[["📊 月次集計","monthly"],["🏆 インセンティブ","incentive"],["⚠️ 締切後管理","lateOrders"],["⚙️ 商品マスタ","masterAdmin"],["🏪 店舗管理","storeAdmin"],["📦 則武店管理","weeklyManage"],["📥 CSV出力","csvExport"]].map(([l,n]) => (
          <button key={n} className="card" style={{cursor:"pointer",textAlign:"center",padding:11}} onClick={() => onNav(n)}>
            <div style={{fontSize:11,fontWeight:700,color:n==="weeklyManage"?"var(--wk)":n==="csvExport"?"#065F46":"var(--pr)"}}>{l}</div>
          </button>
        ))}
      </div>
      <div style={{marginTop:16}}>
        <button className="btn" style={{background:"#FEE2E2",color:"#991B1B",border:"2px solid #EF4444",fontSize:12,padding:"11px"}} onClick={resetAllData}>
          🗑️ デモデータに戻す（全データ削除）
        </button>
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
  const [editItem, setEditItem] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [fCat, setFCat] = useState("全て");
  const [fStore, setFStore] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => allItems.filter(i => {
    if (fCat!=="全て" && i.cat!==fCat) return false;
    if (fStore!=="all" && !storeVisIds[+fStore]?.includes(i.id)) return false;
    if (search && !i.name.includes(search)) return false;
    return true;
  }), [allItems,fCat,fStore,search,storeVisIds]);
  const togActive = id => setAllItems(p => p.map(i => i.id===id ? {...i,active:!i.active} : i));
  const togVis = (sId,iId) => setStoreVisIds(p => { const cur=p[sId]||[]; return {...p,[sId]:cur.includes(iId)?cur.filter(x=>x!==iId):[...cur,iId]}; });
  const saveEdit = upd => { setAllItems(p => p.map(i => i.id===upd.id?upd:i)); setEditItem(null); };
  const addItem = item => {
    setAllItems(p => [...p,item]);
    setStoreVisIds(p => { const n={...p}; STORES_INIT.forEach(s => { n[s.id]=[...(n[s.id]||[]),item.id]; }); return n; });
    setShowAdd(false);
  };
  const delItem = id => {
    if (!window.confirm("削除しますか？")) return;
    setAllItems(p => p.filter(i => i.id!==id));
  };
  return (
    <div>
      <div className="sect">⚙️ 商品マスタ管理</div>
      <div className="tabs">
        <button className={"tab "+(tab==="items"?"on":"")} onClick={() => setTab("items")}>商品一覧</button>
        <button className={"tab "+(tab==="store"?"on":"")} onClick={() => setTab("store")}>店舗別表示</button>
      </div>
      {tab === "items" && (
        <>
          <div className="card">
            <div style={{display:"flex",gap:5,marginBottom:7}}>
              <input className="fi" placeholder="商品名検索" value={search} onChange={e => setSearch(e.target.value)} style={{flex:1,fontSize:11,padding:"7px 9px"}} />
              <select className="fsel" value={fCat} onChange={e => setFCat(e.target.value)} style={{width:"auto",fontSize:10,padding:"7px"}}>
                <option value="全て">全カテゴリ</option>
                {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fs10 txm">{filtered.length}件</div>
          </div>
          <button className="btn bpr bsm" style={{marginBottom:11}} onClick={() => setShowAdd(true)}>＋ 新規商品追加</button>
          {filtered.map(item => (
            <div key={item.id} className="card" style={{padding:9,opacity:item.active?1:.55}}>
              <div className="fb">
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:12}}>{item.name==="お漬物シール"?"🏷️ ":""}{item.name} {!item.active&&<span style={{fontSize:9,color:"#999"}}>[非表示]</span>}</div>
                  <div style={{fontSize:9,color:"var(--tx3)"}}>{item.cat} ｜ {item.unit} ｜ ¥{item.price} ｜ 発注単位:{item.orderUnit}</div>
                  {item.caution && <div style={{fontSize:9,color:"#DC2626"}}>⚠️ {item.caution}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:3,alignItems:"flex-end"}}>
                  <button className="btn bsec bxs" onClick={() => setEditItem({...item})}>編集</button>
                  <button className="btn bxs" style={{background:item.active?"#FEF3C7":"#ECFDF5",color:item.active?"#92400E":"#065F46",border:"1px solid"}} onClick={() => togActive(item.id)}>{item.active?"非表示":"表示"}</button>
                  <button className="btn bxs" style={{background:"#FEE2E2",color:"#991B1B",border:"1px solid #EF4444"}} onClick={() => delItem(item.id)}>削除</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {tab === "store" && (
        <>
          <div className="fg">
            <label className="fl">店舗を選択</label>
            <select className="fsel" value={fStore} onChange={e => setFStore(e.target.value)}>
              <option value="all">全店舗</option>
              <optgroup label="通常配送店舗">{STORES_INIT.filter(s=>s.type==="daily").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
              <optgroup label="週まとめ店舗">{STORES_INIT.filter(s=>s.type==="weekly").map(s=><option key={s.id} value={s.id}>{s.name}（週まとめ）</option>)}</optgroup>
            </select>
          </div>
          {fStore !== "all" && (
            <div className="card">
              {STORES_INIT.find(s=>s.id===+fStore)?.type==="weekly" && <div className="al awk" style={{marginBottom:10}}><span>📦</span>則武店（週まとめ）の表示商品設定です</div>}
              {ALL_CATS.map(cat => {
                const catItems = allItems.filter(i => i.cat===cat && i.active);
                if (!catItems.length) return null;
                return (
                  <div key={cat} style={{marginBottom:11}}>
                    <div style={{fontSize:10,fontWeight:700,color:"var(--ac)",marginBottom:5}}>── {cat}</div>
                    {catItems.map(item => {
                      const isVis = storeVisIds[+fStore]?.includes(item.id);
                      return (
                        <div key={item.id} className={"ci "+(isVis?"ck":"")} onClick={() => togVis(+fStore,item.id)} style={{marginBottom:3}}>
                          <div className="cbox">{isVis?"✓":""}</div>
                          <div style={{flex:1}}><div style={{fontSize:11,fontWeight:700}}>{item.name}</div><div style={{fontSize:9,color:"var(--tx3)"}}>{item.unit} ｜ ¥{item.price}</div></div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {editItem && <ItemEdit item={editItem} onSave={saveEdit} onClose={() => setEditItem(null)} />}
      {showAdd && <ItemAdd onSave={addItem} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ============================================================
// CSV出力画面
// ============================================================
function CsvExportScreen({orders, weeklyOrders, allItems, storeGoals}) {
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

  const btns = [
    ["📋 発注履歴CSV（サマリー）", exportOrders, "発注日・店舗・品目数"],
    ["📋 発注明細CSV（商品別）",   exportOrderDetail, "商品名・数量・店舗"],
    ["📦 週まとめ発注CSV",        exportWeekly, "則武店の週まとめ発注一覧"],
    ["⚙️ 商品マスタCSV",          exportItems, "全商品の設定情報"],
    ["🎯 店舗目標設定CSV",         exportGoals, "目標値・メッセージ"],
    ["📊 月次集計CSV",             exportMonthly, "全店舗の今月実績"],
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
  const [storeVisIds, setStoreVisIds] = useState(() =>
    loadStorage(STORAGE_KEYS.storeVisIds, buildStoreVisible(ITEMS_INIT))
  );
  const [storeGoals, setStoreGoals] = useState(() =>
    loadStorage(STORAGE_KEYS.storeGoals, STORE_GOALS_INIT)
  );

  useEffect(() => { saveStorage(STORAGE_KEYS.orders,      orders);      }, [orders]);
  useEffect(() => { saveStorage(STORAGE_KEYS.weeklyOrders,weeklyOrders); }, [weeklyOrders]);
  useEffect(() => { saveStorage(STORAGE_KEYS.allItems,    allItems);    }, [allItems]);
  useEffect(() => { saveStorage(STORAGE_KEYS.storeVisIds, storeVisIds); }, [storeVisIds]);
  useEffect(() => { saveStorage(STORAGE_KEYS.storeGoals,  storeGoals);  }, [storeGoals]);

  const login = useCallback(u => { setUser(u); setScreen("dashboard"); }, []);
  const logout = useCallback(() => { setUser(null); setScreen("dashboard"); }, []);
  const nav = useCallback(s => sestScreen(s), []);

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
    mgr_daily:  [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"foodOrder",i:"🥩",l:"食材発注"},{k:"supplyOrder",i:"📦",l:"備品発注"},{k:"deliveryConfirm",i:"✅",l:"納品確認"}],
    mgr_weekly: [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"weeklyOrder",i:"📦",l:"週発注"},{k:"deliveryConfirm",i:"✅",l:"納品確認"}],
    ck:    [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"allOrders",i:"📋",l:"発注一覧"},{k:"prepList",i:"🥬",l:"仕込み"},{k:"deliveryList",i:"🚚",l:"配送"},{k:"cabbage",i:"🥦",l:"キャベツ"},{k:"weeklyManage",i:"📦",l:"則武店"}],
    admin: [{k:"dashboard",i:"🏠",l:"ホーム"},{k:"goalSetting",i:"🎯",l:"目標設定"},{k:"monthly",i:"📊",l:"月次"},{k:"incentive",i:"🏆",l:"評価"},{k:"masterAdmin",i:"⚙️",l:"商品"},{k:"storeAdmin",i:"🏪",l:"店舗"}],
  };
  const navKey = user.role==="manager" ? (isWeekly?"mgr_weekly":"mgr_daily") : user.role;
  const navItems = navCfg[navKey] || navCfg.mgr_daily;
  const cp = {user,orders,setOrders,allItems,setAllItems,storeVisIds,setStoreVisIds,onNav:nav};

  const renderScreen = () => {
    if (user.role === "manager" && !isWeekly) {
      if (screen==="dashboard")      return <ManagerDB user={user} orders={orders} onNav={nav} storeGoals={storeGoals} />;
      if (screen==="foodOrder")      return <FoodOrder {...cp} />;
      if (screen==="supplyOrder")    return <SupplyOrder {...cp} />;
      if (screen==="deliveryConfirm")return <DelivConf user={user} orders={orders} setOrders={setOrders} allItems={allItems} />;
    }
    if (user.role === "manager" && isWeekly) {
      if (screen==="dashboard")      return <WeeklyDB user={user} weeklyOrders={weeklyOrders} onNav={nav} storeGoals={storeGoals} />;
      if (screen==="weeklyOrder")    return <WeeklyOrder user={user} allItems={allItems} storeVisIds={storeVisIds} weeklyOrders={weeklyOrders} setWeeklyOrders={setWeeklyOrders} onNav={nav} />;
      if (screen==="deliveryConfirm")return <div><div className="sect">✅ 納品確認</div><div className="al awk"><span>📦</span>則武店の納品確認はCKから配送予定が届いた後に確認できます。</div></div>;
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
      if (screen==="dashboard")     return <AdminDB orders={orders} weeklyOrders={weeklyOrders} onNav={nav} />;
      if (screen==="goalSetting")   return <GoalSettingAdmin storeGoals={storeGoals} setStoreGoals={setStoreGoals} />;
      if (screen==="monthly")       return <Monthly />;
      if (screen==="incentive")     return <Incentive />;
      if (screen==="lateOrders")    return <LateOrders orders={orders} />;
      if (screen==="csvExport")     return <CsvExportScreen orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} storeGoals={storeGoals} />;
      if (screen==="masterAdmin")   return <MasterAdmin allItems={allItems} setAllItems={setAllItems} storeVisIds={storeVisIds} setStoreVisIds={setStoreVisIds} />;
      if (screen==="storeAdmin")    return <StoreAdmin />;
      if (screen==="allOrders")     return <AllOrders orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="prepList")      return <PrepList orders={orders} allItems={allItems} />;
      if (screen==="deliveryList")  return <DelivList orders={orders} setOrders={setOrders} allItems={allItems} />;
      if (screen==="cabbage")       return <Cabbage orders={orders} weeklyOrders={weeklyOrders} allItems={allItems} />;
      if (screen==="weeklyManage")  return <WeeklyManage weeklyOrders={weeklyOrders} setWeeklyOrders={setWeeklyOrders} allItems={allItems} />;
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
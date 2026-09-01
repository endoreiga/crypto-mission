const $=selector=>document.querySelector(selector);
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const keys=[
  {id:"alice-public",owner:"アリス",kind:"公開鍵",note:"だれでも使える"},
  {id:"alice-private",owner:"アリス",kind:"秘密鍵",note:"アリスだけが持つ"},
  {id:"bob-public",owner:"ボブ",kind:"公開鍵",note:"だれでも使える"},
  {id:"bob-private",owner:"ボブ",kind:"秘密鍵",note:"ボブだけが持つ"}
];
const state={stage:1,completed:new Set(),direction:"forward",slots:{},activeSlot:"encrypt",stage1Phase:"ready",result:null,message:"明日の集合は10時です",signedHash:"",receivedHash:"",tampered:false};
let runToken=0;

function keyById(id){return keys.find(key=>key.id===id)}
function keyName(id){const key=keyById(id);return key?`🔑 ${key.owner}の${key.kind}`:"鍵を置く"}
function sender(){return state.direction==="forward"?"アリス":"ボブ"}
function receiver(){return state.direction==="forward"?"ボブ":"アリス"}
function personId(name){return name==="アリス"?"alice":"bob"}
function setStatus(selector,text,tone=""){$(selector).textContent=text;$(selector).className=`person-result ${selector==="#bob-result"?"bob-result ":""}${tone}`}
function setPacket(text,kind=""){$("#packet").textContent=text;$("#packet").className=`packet ${kind}`}
function setProcess(text){$("#process").textContent=text}

function renderNav(){
  const labels=["共通鍵","公開鍵","デジタル署名"];
  $("#stage-nav").innerHTML=labels.map((label,index)=>{
    const number=index+1,done=state.completed.has(number),current=state.stage===number;
    return `<button class="stage-step ${done?"done":""} ${current?"current":""}" data-stage="${number}" ${number>state.stage&&!done?"disabled":""}><span class="stage-number">${done?"✓":number}</span><span>${label}</span></button>`;
  }).join("");
  document.querySelectorAll("[data-stage]:not([disabled])").forEach(button=>button.addEventListener("click",()=>goStage(Number(button.dataset.stage))));
}
function renderFrame(){
  renderNav();const reverse=state.direction==="reverse";
  $("#alice-role").textContent=reverse?"受信者":"送信者";$("#bob-role").textContent=reverse?"送信者":"受信者";
  $(".route").classList.toggle("reverse",reverse);$("#route-label").textContent=`${sender()} → ${receiver()} の通信経路`;
}
function resetBoard(){setPacket("💬 平文");setProcess("操作を始めよう");setStatus("#eve-result","まだ見ていない");setStatus("#bob-result","まだ受け取っていない")}
function goStage(stage){
  runToken++;state.stage=stage;state.result=null;state.slots={};state.tampered=false;state.direction="forward";
  state.activeSlot=stage===3?"sign":"encrypt";if(stage===1)state.stage1Phase="ready";resetBoard();render();
}
function render(){renderFrame();if(state.stage===1)renderShared();if(state.stage===2)renderPublic();if(state.stage===3)renderSignature();if(state.stage===4)renderFinal()}
function mission(tag,title,sub=""){$("#mission").innerHTML=`<span class="mission-tag">${tag}</span><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:""}</div>`}
function button(label,id,kind=""){return `<button id="${id}" class="button ${kind}" type="button">${label}</button>`}
function bind(id,handler){const element=$("#"+id);if(element)element.addEventListener("click",handler)}

function renderShared(){
  mission("ステージ 1｜共通鍵","同じ共通鍵で，メッセージを送ってみよう","アリスとボブは，すでに同じ鍵を持っています．");
  if(state.stage1Phase==="ready"){
    $("#workspace").innerHTML=`<div class="controls one"><div><h2>操作練習</h2><p class="prompt">暗号文がどこを通り，だれに見えるか観察しよう．</p></div>${button("共通鍵で通信してみる","run-shared")}</div>`;
    bind("run-shared",runShared);return;
  }
  if(state.stage1Phase==="done"){
    $("#workspace").innerHTML=`<div class="challenge"><div><h2>でも，この共通鍵を最初にボブへどうやって安全に渡す？</h2><p class="prompt">通信経路をイブが見ているとき，鍵そのものを送ったらどうなるだろう．</p></div>${button("共通鍵をそのまま送ってみる","send-shared-key","secondary")}</div>`;
    bind("send-shared-key",showSharedProblem);return;
  }
  $("#workspace").innerHTML=`<div class="challenge"><div><h2>イブにも共通鍵を知られてしまった</h2><p>同じ鍵を持てば，イブも暗号文を読めます．次は「秘密鍵を送らずに」通信する方法を考えます．</p><span class="turn-change">🔄 ここで操作する人を交代しよう</span></div>${button("ステージ2へ","next-stage")}</div>`;
  bind("next-stage",()=>{state.completed.add(1);goStage(2)});
}
async function runShared(){
  const token=++runToken;setPacket("💬 明日の集合は10時");setProcess("アリスの平文");
  await wait(450);if(token!==runToken)return;setPacket("🔑 ◆◇■△…","cipher");setProcess("共通鍵で暗号化");
  await wait(600);if(token!==runToken)return;$("#packet").classList.add("travel");setProcess("暗号文を送信中");
  await wait(800);if(token!==runToken)return;setStatus("#eve-result","暗号文は見えた／内容は読めない","good");
  await wait(550);if(token!==runToken)return;setPacket("💬 明日の集合は10時");setProcess("同じ共通鍵で復号");setStatus("#bob-result","同じ鍵で読めた","good");state.stage1Phase="done";renderShared();
}
function showSharedProblem(){state.stage1Phase="leaked";setPacket("🔑 共通鍵","travel");setProcess("鍵そのものを通信経路へ");setStatus("#eve-result","共通鍵を手に入れた","bad");setStatus("#bob-result","共通鍵を受け取った","warn");renderShared()}

function keyCards(){
  return `<div class="keys">${keys.map(key=>`<button class="key" type="button" draggable="true" data-key="${key.id}" aria-label="${key.owner}の${key.kind}，${key.note}"><span class="icon">🔑</span><b>${key.owner}の${key.kind}</b><small>${key.note}</small></button>`).join("")}</div>`;
}
function slots(mode){
  const defs=mode==="public"?[["encrypt","① 暗号化に使う鍵"],["decrypt","② 復号に使う鍵"]]:[["sign","① 署名に使う鍵"],["verify","② 検証に使う鍵"]];
  return `<div class="slots">${defs.map(([id,label])=>`<button class="slot ${state.activeSlot===id?"selected":""}" type="button" data-slot="${id}" aria-pressed="${state.activeSlot===id}"><b>${label}</b><span>${keyName(state.slots[id])}</span></button>`).join("")}</div>`;
}
function bindKeyControls(renderFunction){
  document.querySelectorAll("[data-slot]").forEach(slot=>{
    slot.addEventListener("click",()=>{state.activeSlot=slot.dataset.slot;renderFunction()});
    slot.addEventListener("dragover",event=>event.preventDefault());
    slot.addEventListener("drop",event=>{event.preventDefault();state.slots[slot.dataset.slot]=event.dataTransfer.getData("text/plain");state.activeSlot=slot.dataset.slot;state.result=null;renderFunction()});
  });
  document.querySelectorAll("[data-key]").forEach(card=>{
    card.addEventListener("click",()=>{state.slots[state.activeSlot]=card.dataset.key;state.result=null;renderFunction()});
    card.addEventListener("dragstart",event=>event.dataTransfer.setData("text/plain",card.dataset.key));
  });
}
function publicResultBox(){
  if(!state.result)return '<div class="result-box"><strong>二人で相談：</strong><p>どの鍵を使えば，イブには読めず，受信者だけが読める？</p></div>';
  return `<div class="result-box ${state.result.clear?"clear":""}"><strong>${state.result.title}</strong><p>${state.result.prompt}</p></div>`;
}
function renderPublic(){
  mission("ステージ 2｜公開鍵暗号",`${sender()}から${receiver()}へ，イブには読まれず，${receiver()}だけが読めるように送ろう`);
  $("#workspace").innerHTML=`<div class="workspace-head"><h2>鍵を空欄に置こう</h2><span class="prompt">今選んでいる場所：${state.activeSlot==="encrypt"?"暗号化":"復号"}</span></div><div class="controls">${slots("public")}${keyCards()}</div>${publicResultBox()}<div class="actions">${state.result?.clear?button(state.direction==="forward"?"発展：ボブからアリスへ":"基本問題に戻る","reverse","secondary"):""}${button("選び直す","retry-public","secondary")}${button("通信してみる","run-public")}${state.result?.clear?button("ステージ3へ","next-stage"):""}</div>`;
  bindKeyControls(renderPublic);bind("retry-public",()=>{runToken++;state.slots={};state.result=null;resetBoard();renderPublic()});bind("run-public",runPublic);
  bind("reverse",()=>{state.direction=state.direction==="forward"?"reverse":"forward";state.slots={};state.result=null;resetBoard();render()});
  bind("next-stage",()=>{state.completed.add(2);goStage(3)});
}
async function runPublic(){
  if(!state.slots.encrypt||!state.slots.decrypt){state.result={title:"鍵がまだ足りない",prompt:"二つの空欄に鍵を置こう．"};renderPublic();return}
  const token=++runToken,s=sender(),r=receiver(),rid=personId(r),enc=keyById(state.slots.encrypt),dec=keyById(state.slots.decrypt);
  state.result=null;setPacket("💬 明日の集合は10時");setProcess(`${s}が暗号化を試す`);setStatus("#eve-result","見ている");setStatus("#bob-result","待っている");
  await wait(500);if(token!==runToken)return;
  if(enc.kind==="秘密鍵"&&enc.owner!==s){setProcess(`${s}はその鍵を持っていない`);state.result={title:`${s}はこの鍵を持っていない`,prompt:"秘密鍵はだれが持っている？"};renderPublic();return}
  setPacket("◆◇■△…","cipher");setProcess(`${enc.owner}の${enc.kind}で暗号化`);
  await wait(550);if(token!==runToken)return;$("#packet").classList.add("travel");await wait(800);if(token!==runToken)return;
  const eveReads=enc.kind==="秘密鍵";setStatus("#eve-result",eveReads?"公開鍵で読めた":"暗号文は見えた／読めない",eveReads?"bad":"good");
  if(eveReads){setStatus("#bob-result","受け取った","warn");state.result={title:"イブが読めた",prompt:"この鍵に対応する公開鍵は，だれでも使える．"};renderPublic();return}
  await wait(500);if(token!==runToken)return;
  if(dec.kind==="秘密鍵"&&dec.owner!==r){setStatus("#bob-result",`${r}はその鍵を持っていない`,"bad");state.result={title:`${r}はこの鍵を持っていない`,prompt:`${r}本人が持つ秘密鍵はどれ？`};renderPublic();return}
  const clear=enc.id===`${rid}-public`&&dec.id===`${rid}-private`;
  if(clear){setPacket("💬 明日の集合は10時");setProcess(`${r}の秘密鍵で復号`);setStatus("#bob-result",`${r}だけが読めた`,"good");state.result={clear:true,title:"MISSION CLEAR",prompt:`なぜ${s}の鍵ではなく，${r}の鍵を使ったのだろう？`};state.completed.add(2)}
  else{setStatus("#bob-result","暗号文のまま／読めない","bad");state.result={title:`${r}が読めなかった`,prompt:"暗号化に使った鍵と，どの鍵が組になる？"}}
  renderPublic();
}

async function sha256(text){const data=new TextEncoder().encode(text);const digest=await crypto.subtle.digest("SHA-256",data);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("")}
function signatureResultBox(){
  if(!state.result)return '<div class="result-box"><strong>二人で相談：</strong><p>だれが送ったと確かめたい？ その人だけが持つ鍵はどれ？</p></div>';
  return `<div class="result-box ${state.result.clear?"clear":""}"><strong>${state.result.title}</strong><p>${state.result.prompt}</p></div>`;
}
function renderSignature(){
  mission("ステージ 3｜デジタル署名","ボブは，本当にアリスから届き，途中で書き換えられていないか確かめたい");
  const hasValid=state.result?.verified;
  $("#workspace").innerHTML=`<div class="purpose">今度の目的は，メッセージを秘密にすることではありません</div><div class="controls">${slots("signature")}${keyCards()}</div>${signatureResultBox()}${state.signedHash?`<details class="hash-details"><summary>メッセージから作った指紋（ハッシュ値）を詳しく見る</summary><span class="hash">${state.tampered?state.receivedHash:state.signedHash}</span></details>`:""}<div class="actions">${hasValid&&!state.tampered?button("イブが途中で「10時」を「8時」に書き換える","tamper","secondary"):""}${button("選び直す","retry-signature","secondary")}${button(state.tampered?"もう一度検証する":"署名して送る","run-signature")}${state.result?.tamperFound?button("完了画面へ","finish"):""}</div>`;
  bindKeyControls(renderSignature);bind("retry-signature",()=>{runToken++;state.slots={};state.result=null;state.tampered=false;state.signedHash="";resetBoard();renderSignature()});bind("run-signature",runSignature);bind("tamper",tamperMessage);bind("finish",()=>{state.completed.add(3);state.stage=4;render()});
}
async function runSignature(){
  if(!state.slots.sign||!state.slots.verify){state.result={title:"鍵がまだ足りない",prompt:"二つの空欄に鍵を置こう．"};renderSignature();return}
  const token=++runToken,sign=keyById(state.slots.sign),verify=keyById(state.slots.verify);
  if(!state.signedHash)state.signedHash=await sha256(state.message);
  setPacket(state.tampered?"💬 明日の集合は8時":"💬 明日の集合は10時");setProcess("メッセージから指紋を作る");
  await wait(450);if(token!==runToken)return;
  if(sign.kind==="秘密鍵"&&sign.owner!=="アリス"){setProcess("アリスはその鍵を持っていない");state.result={title:"アリスはこの鍵を持っていない",prompt:"秘密鍵は本人だけが持つ．"};renderSignature();return}
  if(sign.id!=="alice-private"){setProcess("アリス本人だけの署名にならない");setStatus("#eve-result","同じ鍵を使える","warn");state.result={title:"アリス本人だと確かめられない",prompt:"だれでも使える鍵で，本人だけの印を作れる？"};renderSignature();return}
  setPacket("📄 メッセージ＋署名");setProcess("アリスの秘密鍵で署名");await wait(500);if(token!==runToken)return;$("#packet").classList.add("travel");setStatus("#eve-result",state.tampered?"メッセージを書き換えた":"内容は見える","warn");await wait(750);if(token!==runToken)return;
  if(verify.kind==="秘密鍵"&&verify.owner!=="ボブ"){setStatus("#bob-result","その鍵を持っていない","bad");state.result={title:"ボブはこの鍵を持っていない",prompt:"公開してよい鍵なら，ボブも手に入れられる．"};renderSignature();return}
  if(verify.id!=="alice-public"){setStatus("#bob-result","アリスの署名を確認できない","bad");state.result={title:"署名を確認できない",prompt:"だれの署名を確かめたい？"};renderSignature();return}
  state.receivedHash=await sha256(state.tampered?"明日の集合は8時です":state.message);
  if(state.receivedHash===state.signedHash){setStatus("#bob-result","アリスの署名を確認できた","good");setProcess("アリスの公開鍵で検証");state.result={clear:true,verified:true,title:"署名を確認できた",prompt:"今回は受信者ではなく，なぜ送信者アリスの鍵を使った？"}}
  else{setStatus("#bob-result","署名を確認できない","bad");setProcess("二つの指紋が一致しない");state.result={tamperFound:true,title:"途中で内容が変わった可能性がある",prompt:"署名したときと，届いたときの指紋が一致しない．"}}
  renderSignature();
}
function tamperMessage(){state.tampered=true;state.result=null;setPacket("💬 明日の集合は8時","travel");setProcess("イブがメッセージを書き換えた");setStatus("#eve-result","10時を8時に書き換えた","bad");setStatus("#bob-result","もう一度検証する","warn");renderSignature()}
function renderFinal(){
  renderNav();mission("すべて完了","3つのMISSION完了");
  $("#workspace").innerHTML=`<div class="final"><div class="big">🎉🔑</div><h1>おつかれさまでした</h1><p class="final-question">3つの方式では，<br>だれのどの鍵を，何のために使った？</p><p class="next-question">では，その公開鍵が本当にアリスやボブのものだと，どうやって確かめるのでしょう？</p><div class="actions">${button("最初からやり直す","final-reset","secondary")}</div></div>`;
  setPacket("✓ 3つの通信");setProcess("先生の説明で整理しよう");setStatus("#eve-result","観察完了","good");setStatus("#bob-result","確認完了","good");bind("final-reset",resetAll);
}
function resetAll(){runToken++;state.stage=1;state.completed.clear();state.direction="forward";state.slots={};state.result=null;state.stage1Phase="ready";state.signedHash="";state.tampered=false;resetBoard();render()}
$("#reset-all").addEventListener("click",resetAll);render();

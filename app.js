const STORAGE_TOURNAMENTS = "battlehub_tournaments_v2";
const STORAGE_PLAYER = "battlehub_player_v2";
const STORAGE_RESULTS = "battlehub_results_v2";

let tournaments = JSON.parse(
  localStorage.getItem(STORAGE_TOURNAMENTS) || "null"
);

let player = JSON.parse(
  localStorage.getItem(STORAGE_PLAYER) || "null"
);

let results = JSON.parse(
  localStorage.getItem(STORAGE_RESULTS) || "[]"
);

let currentTournament = null;


/* =========================
   INITIAL DATA
========================= */

if(!tournaments){
  tournaments = [
    {
      id: createId(),
      name:"Friday Night Battle",
      game:"Free Fire",
      date:getFutureDate(1),
      time:"20:00",
      maxPlayers:48,
      players:[],
      roomId:"12345678",
      roomPass:"FREE123",
      roomReleased:false,
      createdAt:Date.now()
    },
    {
      id:createId(),
      name:"Weekend Clash",
      game:"Free Fire",
      date:getFutureDate(2),
      time:"21:00",
      maxPlayers:24,
      players:[],
      roomId:"87654321",
      roomPass:"BATTLE99",
      roomReleased:false,
      createdAt:Date.now()
    }
  ];

  saveTournaments();
}

if(!player){
  player = {
    name:"Player",
    uid:""
  };

  savePlayer();
}


/* =========================
   BASIC HELPERS
========================= */

function createId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function getFutureDate(days){
  const d = new Date();
  d.setDate(d.getDate()+days);

  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");

  return `${y}-${m}-${day}`;
}

function saveTournaments(){
  localStorage.setItem(
    STORAGE_TOURNAMENTS,
    JSON.stringify(tournaments)
  );
}

function savePlayer(){
  localStorage.setItem(
    STORAGE_PLAYER,
    JSON.stringify(player)
  );
}

function saveResults(){
  localStorage.setItem(
    STORAGE_RESULTS,
    JSON.stringify(results)
  );
}

function esc(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatDate(date){
  if(!date) return "-";

  const d = new Date(date+"T00:00:00");

  return d.toLocaleDateString("en-IN",{
    day:"2-digit",
    month:"short",
    year:"numeric"
  });
}

function tournamentDateTime(t){
  return new Date(`${t.date}T${t.time}:00`);
}

function getStatus(t){

  const now = new Date();
  const start = tournamentDateTime(t);
  const end = new Date(start.getTime()+90*60000);

  if(now < start) return "upcoming";
  if(now >= start && now <= end) return "live";

  return "finished";
}

function getStatusText(t){
  const status = getStatus(t);

  if(status === "live") return "LIVE";
  if(status === "finished") return "FINISHED";

  return "UPCOMING";
}


/* =========================
   NAVIGATION
========================= */

function showPage(page){

  document.querySelectorAll(".page").forEach(p=>{
    p.classList.remove("active");
  });

  const target = document.getElementById(page);

  if(target){
    target.classList.add("active");
  }

  document.querySelectorAll(".bottom-nav button").forEach(btn=>{
    btn.classList.remove("active");

    if(btn.dataset.page === page){
      btn.classList.add("active");
    }
  });

  if(page === "home"){
    renderHome();
  }

  if(page === "tournaments"){
    renderTournaments();
  }

  if(page === "my"){
    renderMyTournaments();
  }

  if(page === "leaderboard"){
    renderLeaderboard();
  }

  if(page === "profile"){
    renderProfile();
  }

  if(page === "admin"){
    renderAdmin();
  }

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}


/* =========================
   HOME
========================= */

function renderHome(){

  const box = document.getElementById("homeTournaments");

  if(!box) return;

  const list = tournaments
    .filter(t=>getStatus(t)!=="finished")
    .slice(0,3);

  if(!list.length){
    box.innerHTML = `<div class="empty">No upcoming tournaments.</div>`;
    return;
  }

  box.innerHTML = list.map(tournamentCard).join("");
}

function scrollToTournaments(){
  showPage("tournaments");
}


/* =========================
   TOURNAMENT LIST
========================= */

function tournamentCard(t){

  const status = getStatus(t);

  return `
    <div class="tournament-card">

      <div class="card-top">
        <span class="game-tag">🎮 ${esc(t.game)}</span>
        <span class="status ${status}">
          ${getStatusText(t)}
        </span>
      </div>

      <h3>${esc(t.name)}</h3>

      <p>📅 ${formatDate(t.date)} &nbsp; • &nbsp; ⏰ ${esc(t.time)}</p>

      <div class="card-info">

        <div class="info-box">
          <strong>FREE</strong>
          <span>Entry</span>
        </div>

        <div class="info-box">
          <strong>${t.players.length}/${t.maxPlayers}</strong>
          <span>Players</span>
        </div>

        <div class="info-box">
          <strong>${t.roomReleased ? "OPEN" : "LOCKED"}</strong>
          <span>Room</span>
        </div>

      </div>

      <button class="card-btn" onclick="openTournament('${t.id}')">
        View Tournament →
      </button>

    </div>
  `;
}

function renderTournaments(){

  const box = document.getElementById("tournamentList");

  if(!box) return;

  if(!tournaments.length){
    box.innerHTML = `<div class="empty">No tournaments available.</div>`;
    return;
  }

  box.innerHTML = tournaments
    .sort((a,b)=>tournamentDateTime(a)-tournamentDateTime(b))
    .map(tournamentCard)
    .join("");
}


/* =========================
   TOURNAMENT DETAILS
========================= */

function openTournament(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  currentTournament = t;

  showPage("details");

  renderDetails();
}

function renderDetails(){

  const t = currentTournament;

  if(!t) return;

  const box = document.getElementById("detailsContent");

  const joined = t.players.some(
    p=>p.uid===player.uid && player.uid
  );

  const status = getStatus(t);

  box.innerHTML = `

    <div class="detail-card">

      <span class="game-tag">🎮 ${esc(t.game)}</span>

      <h1>${esc(t.name)}</h1>

      <div class="detail-meta">
        📅 ${formatDate(t.date)}<br>
        ⏰ ${esc(t.time)}<br>
        👥 ${t.players.length}/${t.maxPlayers} Players<br>
        🎟️ Entry: FREE
      </div>

      <div class="countdown">
        <span>${status==="live" ? "MATCH STATUS" : "MATCH STARTS IN"}</span>
        <strong id="countdownText">
          ${status==="finished" ? "Match Finished" : "Loading..."}
        </strong>
      </div>

      ${
        joined
        ?
        `<button class="primary-btn" onclick="showToast('You are already joined!')">
          ✓ Joined Tournament
        </button>`
        :
        `<button class="primary-btn" onclick="joinTournament('${t.id}')">
          Join Tournament
        </button>`
      }

      <div class="room-box">

        ${
          t.roomReleased
          ?
          `
          <h3>🔓 Room Details Released</h3>

          <div class="room-row">
            <span>Room ID</span>
            <div>
              <span class="room-value">${esc(t.roomId)}</span>
              <button class="copy-btn"
                onclick="copyText('${safeJs(t.roomId)}')">
                Copy
              </button>
            </div>
          </div>

          <div class="room-row">
            <span>Password</span>
            <div>
              <span class="room-value">${esc(t.roomPass)}</span>
              <button class="copy-btn"
                onclick="copyText('${safeJs(t.roomPass)}')">
                Copy
              </button>
            </div>
          </div>

          <p style="color:var(--muted);font-size:11px">
            Open Free Fire and manually join the Custom Room.
          </p>
          `
          :
          `
          <div class="room-locked">
            <div class="lock">🔒</div>
            <strong>Room ID & Password Locked</strong>
            <p style="color:var(--muted);font-size:12px">
              Admin will release the room details before the match.
            </p>
          </div>
          `
        }

      </div>

      ${
        joined
        ?
        `
        <button class="card-btn"
          style="margin-top:12px"
          onclick="openResult('${t.id}')">
          📝 Submit Match Result
        </button>
        `
        :
        ""
      }

    </div>
  `;

  startCountdown();
}

function safeJs(value){
  return String(value ?? "")
    .replaceAll("\\","\\\\")
    .replaceAll("'","\\'");
}


/* =========================
   JOIN
========================= */

function joinTournament(id){

  if(!player.name || player.name==="Player"){
    showToast("First set your player name in Profile.");
    showPage("profile");
    return;
  }

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  if(t.players.length >= t.maxPlayers){
    showToast("Tournament is full.");
    return;
  }

  if(t.players.some(p=>p.uid===player.uid && player.uid)){
    showToast("Already joined.");
    return;
  }

  const joiner = {
    uid:player.uid || createId(),
    name:player.name,
    joinedAt:Date.now()
  };

  t.players.push(joiner);

  saveTournaments();

  currentTournament = t;

  showToast("Tournament joined successfully!");

  renderDetails();
}


/* =========================
   COUNTDOWN
========================= */

let countdownTimer = null;

function startCountdown(){

  clearInterval(countdownTimer);

  const t = currentTournament;

  if(!t) return;

  const el = document.getElementById("countdownText");

  if(!el) return;

  function update(){

    const status = getStatus(t);

    if(status==="finished"){
      el.textContent = "Match Finished";
      return;
    }

    if(status==="live"){
      el.textContent = "MATCH IS LIVE 🔥";
      return;
    }

    const diff = tournamentDateTime(t).getTime()-Date.now();

    if(diff<=0){
      el.textContent = "MATCH IS LIVE 🔥";
      return;
    }

    const days = Math.floor(diff/86400000);
    const hours = Math.floor((diff%86400000)/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    const secs = Math.floor((diff%60000)/1000);

    el.textContent =
      `${days}d ${hours}h ${mins}m ${secs}s`;
  }

  update();

  countdownTimer = setInterval(update,1000);
}


/* =========================
   COPY
========================= */

function copyText(text){

  if(navigator.clipboard){

    navigator.clipboard.writeText(text)
      .then(()=>{
        showToast("Copied!");
      })
      .catch(()=>{
        fallbackCopy(text);
      });

  }else{
    fallbackCopy(text);
  }
}

function fallbackCopy(text){

  const area = document.createElement("textarea");

  area.value = text;
  document.body.appendChild(area);

  area.select();
  document.execCommand("copy");

  area.remove();

  showToast("Copied!");
}


/* =========================
   MY TOURNAMENTS
========================= */

function renderMyTournaments(){

  const box = document.getElementById("myTournamentList");

  if(!box) return;

  const mine = tournaments.filter(t=>
    t.players.some(p=>p.uid===player.uid && player.uid)
  );

  if(!mine.length){

    box.innerHTML = `
      <div class="empty">
        🎮<br><br>
        You haven't joined any tournament yet.
        <br><br>
        <button class="primary-btn"
          onclick="showPage('tournaments')">
          Find Tournament
        </button>
      </div>
    `;

    return;
  }

  box.innerHTML = mine.map(t=>{

    const hasResult = results.some(r=>
      r.tournamentId===t.id &&
      r.uid===player.uid
    );

    return `
      <div class="my-card">

        <h3>${esc(t.name)}</h3>

        <p>🎮 ${esc(t.game)}</p>
        <p>📅 ${formatDate(t.date)} • ⏰ ${esc(t.time)}</p>

        <div class="my-actions">

          <button onclick="openTournament('${t.id}')">
            View Match
          </button>

          ${
            hasResult
            ?
            `<button onclick="showToast('Result already submitted.')">
              ✓ Result Sent
            </button>`
            :
            `<button onclick="openResult('${t.id}')">
              Submit Result
            </button>`
          }

        </div>

      </div>
    `;

  }).join("");
}


/* =========================
   RESULT
========================= */

function openResult(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  document.getElementById("resultTournamentId").value = id;
  document.getElementById("resultName").value = player.name;

  document.getElementById("resultPlacement").value = "";
  document.getElementById("resultKills").value = "";
  document.getElementById("resultPoints").value = "";
  document.getElementById("resultNote").value = "";

  showPage("result");
}

function submitResult(){

  const tournamentId =
    document.getElementById("resultTournamentId").value;

  const placement =
    Number(document.getElementById("resultPlacement").value);

  const kills =
    Number(document.getElementById("resultKills").value);

  const points =
    Number(document.getElementById("resultPoints").value);

  const note =
    document.getElementById("resultNote").value.trim();

  if(!tournamentId){
    showToast("Tournament not selected.");
    return;
  }

  if(!placement || placement<1){
    showToast("Enter valid placement.");
    return;
  }

  if(kills<0 || points<0){
    showToast("Invalid result.");
    return;
  }

  const already = results.some(r=>
    r.tournamentId===tournamentId &&
    r.uid===player.uid
  );

  if(already){
    showToast("Result already submitted.");
    return;
  }

  results.push({
    id:createId(),
    tournamentId,
    uid:player.uid,
    name:player.name,
    placement,
    kills,
    points,
    note,
    approved:false,
    submittedAt:Date.now()
  });

  saveResults();

  showToast("Result submitted for admin review.");

  setTimeout(()=>{
    showPage("my");
  },700);
}


/* =========================
   LEADERBOARD
========================= */

function renderLeaderboard(){

  const approved = results.filter(r=>r.approved);

  const totals = {};

  approved.forEach(r=>{

    if(!totals[r.uid]){
      totals[r.uid] = {
        uid:r.uid,
        name:r.name,
        points:0
      };
    }

    totals[r.uid].points += Number(r.points)||0;
  });

  let list = Object.values(totals)
    .sort((a,b)=>b.points-a.points);

  document.getElementById("firstName").textContent =
    list[0]?.name || "---";

  document.getElementById("firstPoints").textContent =
    `${list[0]?.points || 0} pts`;

  document.getElementById("secondName").textContent =
    list[1]?.name || "---";

  document.getElementById("secondPoints").textContent =
    `${list[1]?.points || 0} pts`;

  document.getElementById("thirdName").textContent =
    list[2]?.name || "---";

  document.getElementById("thirdPoints").textContent =
    `${list[2]?.points || 0} pts`;

  const box = document.getElementById("leaderboardList");

  if(!list.length){
    box.innerHTML = `
      <div class="empty">
        No approved results yet.
      </div>
    `;
    return;
  }

  box.innerHTML = list.map((p,i)=>`

    <div class="leader-row">

      <div class="leader-rank">
        #${i+1}
      </div>

      <div class="leader-avatar">
        👤
      </div>

      <div class="leader-info">
        <b>${esc(p.name)}</b>
        <small>Player</small>
      </div>

      <div class="leader-points">
        ${p.points} pts
      </div>

    </div>

  `).join("");
}


/* =========================
   PROFILE
========================= */

function renderProfile(){

  document.getElementById("profileName").textContent =
    player.name || "Player";

  document.getElementById("profileUid").textContent =
    `UID: ${player.uid || "Not set"}`;

  document.getElementById("playerNameInput").value =
    player.name==="Player" ? "" : player.name;

  document.getElementById("playerUidInput").value =
    player.uid || "";

  const joined = tournaments.filter(t=>
    t.players.some(p=>p.uid===player.uid && player.uid)
  ).length;

  const resultCount = results.filter(r=>
    r.uid===player.uid
  ).length;

  const total = results
    .filter(r=>r.uid===player.uid && r.approved)
    .reduce((sum,r)=>sum+(Number(r.points)||0),0);

  document.getElementById("joinedCount").textContent = joined;
  document.getElementById("resultCount").textContent = resultCount;
  document.getElementById("totalPoints").textContent = total;
}

function saveProfile(){

  const name =
    document.getElementById("playerNameInput").value.trim();

  const uid =
    document.getElementById("playerUidInput").value.trim();

  if(!name){
    showToast("Enter player name.");
    return;
  }

  player.name = name;
  player.uid = uid || createId();

  savePlayer();

  showToast("Profile saved!");

  renderProfile();
}


/* =========================
   ADMIN
========================= */

function renderAdmin(){

  const box = document.getElementById("adminTournamentList");

  if(!box) return;

  if(!tournaments.length){
    box.innerHTML = `<div class="empty">No tournaments.</div>`;
    return;
  }

  box.innerHTML = tournaments.map(t=>`

    <div class="admin-card">

      <h3>${esc(t.name)}</h3>

      <p>🎮 ${esc(t.game)}</p>
      <p>📅 ${formatDate(t.date)} • ⏰ ${esc(t.time)}</p>
      <p>👥 Players: ${t.players.length}/${t.maxPlayers}</p>

      <p>
        Room:
        <strong>
          ${t.roomReleased ? "RELEASED 🔓" : "LOCKED 🔒"}
        </strong>
      </p>

      <div class="admin-actions">

        <button class="release"
          onclick="toggleRoom('${t.id}')">
          ${t.roomReleased ? "Lock Room" : "Release Room"}
        </button>

        <button onclick="viewPlayers('${t.id}')">
          Players
        </button>

        <button onclick="approveResults('${t.id}')">
          Results
        </button>

        <button class="danger"
          onclick="deleteTournament('${t.id}')">
          Delete
        </button>

      </div>

    </div>

  `).join("");
}


/* =========================
   CREATE TOURNAMENT
========================= */

function createTournament(){

  const name =
    document.getElementById("tName").value.trim();

  const game =
    document.getElementById("tGame").value;

  const date =
    document.getElementById("tDate").value;

  const time =
    document.getElementById("tTime").value;

  const maxPlayers =
    Number(document.getElementById("tMax").value);

  const roomId =
    document.getElementById("tRoomId").value.trim();

  const roomPass =
    document.getElementById("tRoomPass").value.trim();

  if(!name || !date || !time){
    showToast("Fill tournament name, date and time.");
    return;
  }

  if(maxPlayers<2){
    showToast("Players must be at least 2.");
    return;
  }

  if(!roomId || !roomPass){
    showToast("Enter room ID and password.");
    return;
  }

  const tournament = {

    id:createId(),

    name,
    game,
    date,
    time,

    maxPlayers,

    players:[],

    roomId,
    roomPass,

    roomReleased:false,

    createdAt:Date.now()
  };

  tournaments.push(tournament);

  saveTournaments();

  document.getElementById("tName").value="";
  document.getElementById("tDate").value="";
  document.getElementById("tTime").value="";
  document.getElementById("tMax").value="48";
  document.getElementById("tRoomId").value="";
  document.getElementById("tRoomPass").value="";

  showToast("Tournament created!");

  renderAdmin();
  renderHome();
}


/* =========================
   ROOM RELEASE
========================= */

function toggleRoom(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  t.roomReleased = !t.roomReleased;

  saveTournaments();

  showToast(
    t.roomReleased
    ? "Room details released!"
    : "Room locked again."
  );

  renderAdmin();

  if(currentTournament?.id===id){
    currentTournament = t;
  }
}


/* =========================
   VIEW PLAYERS
========================= */

function viewPlayers(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  if(!t.players.length){
    showToast("No players joined yet.");
    return;
  }

  const names = t.players
    .map((p,i)=>`${i+1}. ${p.name}`)
    .join("\n");

  alert(
    `${t.name}\n\nPlayers:\n${names}`
  );
}


/* =========================
   ADMIN RESULTS
========================= */

function approveResults(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  const pending = results.filter(r=>
    r.tournamentId===id &&
    !r.approved
  );

  if(!pending.length){
    showToast("No pending results.");
    return;
  }

  let message =
    `${t.name}\n\nPending Results:\n\n`;

  pending.forEach((r,i)=>{

    message +=
      `${i+1}. ${r.name}\n`+
      `Placement: ${r.placement}\n`+
      `Kills: ${r.kills}\n`+
      `Points: ${r.points}\n\n`;
  });

  const approve = confirm(
    message +
    "Press OK to approve ALL these results."
  );

  if(!approve) return;

  pending.forEach(r=>{
    r.approved = true;
  });

  saveResults();

  showToast("Results approved!");

  renderAdmin();
}


/* =========================
   DELETE
========================= */

function deleteTournament(id){

  const t = tournaments.find(x=>x.id===id);

  if(!t) return;

  const yes = confirm(
    `Delete "${t.name}"?`
  );

  if(!yes) return;

  tournaments =
    tournaments.filter(x=>x.id!==id);

  results =
    results.filter(x=>x.tournamentId!==id);

  saveTournaments();
  saveResults();

  showToast("Tournament deleted.");

  renderAdmin();
  renderHome();
}


/* =========================
   TOAST
========================= */

let toastTimer;

function showToast(message){

  const toast =
    document.getElementById("toast");

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(()=>{
    toast.classList.remove("show");
  },2200);
}


/* =========================
   ADMIN ACCESS
========================= */

/*
  Admin panel open karne ke liye
  browser console ki zarurat nahi.

  Profile page par 5 baar
  "BATTLEHUB" title tap karne se
  admin panel open hoga.
*/

let adminTapCount = 0;
let adminTapTimer = null;

document.querySelector(".brand").addEventListener("click",()=>{

  adminTapCount++;

  clearTimeout(adminTapTimer);

  adminTapTimer = setTimeout(()=>{
    adminTapCount=0;
  },1500);

  if(adminTapCount>=5){

    adminTapCount=0;

    showPage("admin");

    showToast("Admin Panel opened.");
  }
});


/* =========================
   INITIAL LOAD
========================= */

function initialLoad(){

  renderHome();
  renderTournaments();
  renderProfile();

  document
    .querySelector('[data-page="home"]')
    ?.classList.add("active");

}

initialLoad();


/* =========================
   AUTO REFRESH
========================= */

setInterval(()=>{

  if(currentTournament &&
     document.getElementById("details").classList.contains("active")){

    renderDetails();
  }

},1000);
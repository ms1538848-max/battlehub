const SUPABASE_URL = "https://lpcynjvqdfcwfgekexis.supabase.co";
const SUPABASE_KEY = "sb_publishable_vUjrdO7mT_EsG_PooVambw_jpFWd6Ez";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const ADMIN_EMAIL = "Ms1538848@gmail.com";

let tournaments = [];
let currentTournament = null;
let currentAdminPlayersTournament = null;
let adminPlayers = [];
let adminResultsTournament = null;

let playerProfile = JSON.parse(
  localStorage.getItem("battlehub_profile") || "null"
) || {
  name: "",
  uid: ""
};

let playerCache = {};

document.addEventListener("DOMContentLoaded", async () => {
  setupAdminUnlock();
  loadProfileUI();
  await loadTournaments();
  setupRealtime();
});

function $(id){
  return document.getElementById(id);
}

function showPage(id){
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  const page = $(id);
  if(page) page.classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === id
    );
  });

  window.scrollTo({top:0,behavior:"smooth"});

  if(id === "myPage") loadMyTournaments();
  if(id === "leaderboardPage") loadLeaderboard();
}

function goHome(){
  showPage("homePage");
}

function backToAdmin(){
  showPage("adminPage");
  loadAdminTournaments();
}

async function refreshCurrent(){
  const active = document.querySelector(".page.active");

  if(!active){
    await loadTournaments();
    return;
  }

  if(active.id === "homePage") await loadTournaments();
  else if(active.id === "myPage") await loadMyTournaments();
  else if(active.id === "leaderboardPage") await loadLeaderboard();
  else if(active.id === "adminPage") await loadAdminTournaments();
  else if(active.id === "adminPlayersPage") await loadAdminPlayers();
  else if(active.id === "adminResultsPage") await loadAdminResults();
  else if(active.id === "detailsPage" && currentTournament){
    await openTournament(currentTournament.id);
  }
}

function showToast(message){
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHTML(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function formatDate(date){
  if(!date) return "-";

  return new Date(date + "T00:00:00")
    .toLocaleDateString("en-IN",{
      day:"2-digit",
      month:"short",
      year:"numeric"
    });
}

function formatTime(time){
  if(!time) return "-";

  const parts = time.split(":");
  let h = Number(parts[0]);
  const m = parts[1];

  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;

  return `${h}:${m} ${suffix}`;
}

function tournamentStatus(t){
  const now = new Date();

  const match = new Date(
    `${t.match_date}T${t.match_time}`
  );

  return now >= match ? "LIVE" : "UPCOMING";
}

async function loadTournaments(){
  const box = $("tournamentList");

  if(box){
    box.innerHTML = `<div class="loading">Loading tournaments...</div>`;
  }

  const {data,error} = await supabaseClient
    .from("battlehub_tournaments")
    .select("*")
    .order("match_date",{ascending:true})
    .order("match_time",{ascending:true});

  if(error){
    console.error(error);
    if(box) box.innerHTML =
      `<div class="empty">Unable to load tournaments.</div>`;
    return;
  }

  tournaments = data || [];

  await loadPlayerCounts();

  renderTournaments();
}

async function loadPlayerCounts(){
  playerCache = {};

  const {data,error} = await supabaseClient
    .from("battlehub_players")
    .select("tournament_id");

  if(error){
    console.error(error);
    return;
  }

  (data || []).forEach(row => {
    playerCache[row.tournament_id] =
      (playerCache[row.tournament_id] || 0) + 1;
  });
}

function renderTournaments(){
  const box = $("tournamentList");

  if(!box) return;

  if(!tournaments.length){
    box.innerHTML =
      `<div class="empty">No tournaments available right now.</div>`;
    return;
  }

  box.innerHTML = tournaments.map(t => {
    const status = tournamentStatus(t);
    const count = playerCache[t.id] || 0;

    return `
      <div class="tournament-card">
        <div class="card-top">
          <div>
            <h3 class="card-title">${escapeHTML(t.name)}</h3>
            <div class="card-game">${escapeHTML(t.game)}</div>
          </div>

          <span class="status ${status === "LIVE" ? "live" : "upcoming"}">
            ${status}
          </span>
        </div>

        <div class="card-info">
          <div class="info-item">
            <small>DATE</small>
            <strong>${formatDate(t.match_date)}</strong>
          </div>

          <div class="info-item">
            <small>TIME</small>
            <strong>${formatTime(t.match_time)}</strong>
          </div>

          <div class="info-item">
            <small>PLAYERS</small>
            <strong>${count}/${t.max_players}</strong>
          </div>
        </div>

        <button class="primary-btn" onclick="openTournament('${t.id}')">
          View Tournament
        </button>
      </div>
    `;
  }).join("");
}

async function openTournament(id){
  const t = tournaments.find(x => x.id === id);

  if(!t) return;

  currentTournament = t;
  showPage("detailsPage");

  const box = $("detailsContent");

  box.innerHTML = `
    <div class="loading">Loading tournament...</div>
  `;

  const {data:players,error} = await supabaseClient
    .from("battlehub_players")
    .select("*")
    .eq("tournament_id",id)
    .order("joined_at",{ascending:true});

  if(error){
    console.error(error);
  }

  const playerList = players || [];
  const count = playerList.length;

  box.innerHTML = `
    <div class="details-hero">
      <span class="badge">${escapeHTML(t.game)}</span>
      <h1>${escapeHTML(t.name)}</h1>

      <div class="card-info">
        <div class="info-item">
          <small>DATE</small>
          <strong>${formatDate(t.match_date)}</strong>
        </div>

        <div class="info-item">
          <small>TIME</small>
          <strong>${formatTime(t.match_time)}</strong>
        </div>

        <div class="info-item">
          <small>PLAYERS</small>
          <strong>${count}/${t.max_players}</strong>
        </div>
      </div>

      <button
        class="primary-btn"
        onclick="joinTournament('${t.id}')"
        ${count >= t.max_players ? "disabled" : ""}
      >
        ${count >= t.max_players ? "Tournament Full" : "Join Tournament"}
      </button>
    </div>

    <div class="room-box">
      <h3>🔐 Custom Room</h3>

      ${
        t.room_released
        ? `
          <p style="color:#7df6a6">Room details released</p>

          <div class="room-code">
            <span>ID: <b>${escapeHTML(t.room_id || "-")}</b></span>
            <button class="copy-btn"
              onclick="copyText('${escapeHTML(t.room_id || "")}')">
              Copy
            </button>
          </div>

          <div class="room-code">
            <span>Password: <b>${escapeHTML(t.room_password || "-")}</b></span>
            <button class="copy-btn"
              onclick="copyText('${escapeHTML(t.room_password || "")}')">
              Copy
            </button>
          </div>

          <div class="info-box">
            Room ID aur password copy karke Free Fire Custom Room me manually join karein.
          </div>
        `
        :
        `
          <div class="room-hidden">
            🔒
            <h3>Room Details Hidden</h3>
            <p>
              Admin match time ke aas-paas Room ID aur Password release karega.
            </p>
          </div>
        `
      }
    </div>

    <div class="form-card">
      <h3>📊 Submit Result</h3>
      <p style="color:#8992ad;font-size:12px">
        Match ke baad apna result submit karein.
      </p>

      <button class="secondary-btn"
        onclick="submitResult('${t.id}')">
        Submit Result
      </button>
    </div>
  `;
}

async function joinTournament(tournamentId){
  if(!playerProfile.name || !playerProfile.uid){
    showToast("Pehle Profile me Name aur UID save karein.");
    showPage("profilePage");
    return;
  }

  const {data:existing} = await supabaseClient
    .from("battlehub_players")
    .select("id")
    .eq("tournament_id",tournamentId)
    .eq("player_uid",playerProfile.uid)
    .maybeSingle();

  if(existing){
    showToast("You already joined this tournament.");
    return;
  }

  const {data:tournament} = await supabaseClient
    .from("battlehub_tournaments")
    .select("*")
    .eq("id",tournamentId)
    .single();

  if(!tournament){
    showToast("Tournament not found.");
    return;
  }

  const {count} = await supabaseClient
    .from("battlehub_players")
    .select("*",{count:"exact",head:true})
    .eq("tournament_id",tournamentId);

  if((count || 0) >= tournament.max_players){
    showToast("Tournament is full.");
    return;
  }

  const {error} = await supabaseClient
    .from("battlehub_players")
    .insert({
      tournament_id:tournamentId,
      player_name:playerProfile.name,
      player_uid:playerProfile.uid
    });

  if(error){
    console.error(error);
    showToast(error.code === "23505"
      ? "You already joined."
      : "Unable to join tournament.");
    return;
  }

  showToast("Tournament joined successfully!");
  await openTournament(tournamentId);
}

async function loadMyTournaments(){
  const box = $("myTournamentList");

  if(!box) return;

  if(!playerProfile.uid){
    box.innerHTML = `
      <div class="empty">
        Profile me UID save karein, phir joined tournaments yahan dikhenge.
      </div>
    `;
    return;
  }

  const {data,error} = await supabaseClient
    .from("battlehub_players")
    .select("tournament_id")
    .eq("player_uid",playerProfile.uid);

  if(error){
    box.innerHTML =
      `<div class="empty">Unable to load.</div>`;
    return;
  }

  const ids = (data || []).map(x => x.tournament_id);

  const mine = tournaments.filter(t => ids.includes(t.id));

  if(!mine.length){
    box.innerHTML =
      `<div class="empty">You haven't joined any tournament yet.</div>`;
    return;
  }

  box.innerHTML = mine.map(t => `
    <div class="tournament-card">
      <h3 class="card-title">${escapeHTML(t.name)}</h3>
      <p class="card-game">${formatDate(t.match_date)} • ${formatTime(t.match_time)}</p>

      <button class="primary-btn"
        onclick="openTournament('${t.id}')">
        Open
      </button>
    </div>
  `).join("");
}

async function submitResult(tournamentId){
  if(!playerProfile.uid || !playerProfile.name){
    showToast("Profile complete karein.");
    return;
  }

  const placement = Number(
    prompt("Your placement? Example: 1")
  );

  const kills = Number(
    prompt("Your kills? Example: 5")
  );

  if(!Number.isInteger(placement) || placement < 1){
    showToast("Invalid placement.");
    return;
  }

  if(!Number.isInteger(kills) || kills < 0){
    showToast("Invalid kills.");
    return;
  }

  const points = Math.max(
    0,
    (101 - placement) + (kills * 2)
  );

  const {error} = await supabaseClient
    .from("battlehub_results")
    .upsert({
      tournament_id:tournamentId,
      player_uid:playerProfile.uid,
      player_name:playerProfile.name,
      placement,
      kills,
      points,
      approved:false
    },{
      onConflict:"tournament_id,player_uid"
    });

  if(error){
    console.error(error);
    showToast("Result submit nahi hua.");
    return;
  }

  showToast("Result submitted for review.");
}

async function loadLeaderboard(){
  const box = $("leaderboardList");

  if(!box) return;

  box.innerHTML =
    `<div class="loading">Loading leaderboard...</div>`;

  const {data,error} = await supabaseClient
    .from("battlehub_results")
    .select("*")
    .eq("approved",true)
    .order("points",{ascending:false});

  if(error){
    console.error(error);
    box.innerHTML =
      `<div class="empty">Unable to load leaderboard.</div>`;
    return;
  }

  if(!data || !data.length){
    box.innerHTML =
      `<div class="empty">No approved results yet.</div>`;
    return;
  }

  const totals = {};

  data.forEach(r => {
    const key = r.player_uid;

    if(!totals[key]){
      totals[key] = {
        name:r.player_name,
        uid:r.player_uid,
        points:0,
        kills:0,
        matches:0
      };
    }

    totals[key].points += Number(r.points || 0);
    totals[key].kills += Number(r.kills || 0);
    totals[key].matches++;
  });

  const rows = Object.values(totals)
    .sort((a,b) => b.points - a.points);

  box.innerHTML = rows.map((r,index) => `
    <div class="result-card">
      <div class="result-top">
        <strong>#${index + 1} ${escapeHTML(r.name)}</strong>
        <strong>${r.points} pts</strong>
      </div>

      <div class="result-meta">
        UID: ${escapeHTML(r.uid)}
        • Matches: ${r.matches}
        • Kills: ${r.kills}
      </div>
    </div>
  `).join("");
}

/* PROFILE */

function loadProfileUI(){
  $("profileNameInput").value = playerProfile.name || "";
  $("profileUIDInput").value = playerProfile.uid || "";

  $("profileName").textContent =
    playerProfile.name || "Player";

  $("profileUID").textContent =
    playerProfile.uid
      ? `UID: ${playerProfile.uid}`
      : "UID not set";

  $("profileAvatar").textContent =
    (playerProfile.name || "P").charAt(0).toUpperCase();
}

function saveProfile(){
  const name = $("profileNameInput").value.trim();
  const uid = $("profileUIDInput").value.trim();

  if(!name || !uid){
    showToast("Name aur UID dono enter karein.");
    return;
  }

  playerProfile = {name,uid};

  localStorage.setItem(
    "battlehub_profile",
    JSON.stringify(playerProfile)
  );

  loadProfileUI();
  showToast("Profile saved!");
}

/* ADMIN UNLOCK */

function setupAdminUnlock(){
  let taps = 0;
  let timer;

  $("adminLogo").addEventListener("click",() => {
    taps++;

    clearTimeout(timer);

    timer = setTimeout(() => {
      taps = 0;
    },1500);

    if(taps >= 5){
      taps = 0;
      openAdminLogin();
    }
  });
}

async function openAdminLogin(){
  const {data:{session}} =
    await supabaseClient.auth.getSession();

  if(
    session &&
    session.user &&
    String(session.user.email).toLowerCase() ===
    ADMIN_EMAIL.toLowerCase()
  ){
    showPage("adminPage");
    loadAdminTournaments();
  }else{
    showPage("adminLoginPage");
  }
}

async function adminLogin(){
  const email = $("adminEmail").value.trim();
  const password = $("adminPassword").value;

  const status = $("adminLoginStatus");

  status.innerHTML =
    `<p style="color:#8992ad">Logging in...</p>`;

  const {data,error} =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if(error){
    status.innerHTML =
      `<p style="color:#ff7777">${escapeHTML(error.message)}</p>`;
    return;
  }

  if(
    !data.user ||
    String(data.user.email).toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ){
    await supabaseClient.auth.signOut();

    status.innerHTML =
      `<p style="color:#ff7777">Admin access denied.</p>`;
    return;
  }

  status.innerHTML =
    `<p style="color:#7df6a6">Login successful.</p>`;

  showToast("Admin login successful.");

  showPage("adminPage");
  await loadAdminTournaments();
}

async function adminResetPassword(){
  const email = $("adminEmail").value.trim();

  if(!email){
    showToast("Admin email enter karein.");
    return;
  }

  const {error} =
    await supabaseClient.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin
    });

  if(error){
    showToast(error.message);
    return;
  }

  showToast("Password reset email sent.");
}

async function adminLogout(){
  await supabaseClient.auth.signOut();
  showToast("Logged out.");
  showPage("homePage");
}

/* ADMIN TABS */

function showAdminTab(tab){
  const create =
    $("adminCreateTab");

  const manage =
    $("adminManageTab");

  document.querySelectorAll(".admin-tab")
    .forEach(x => x.classList.remove("active"));

  if(tab === "create"){
    create.classList.remove("hidden");
    manage.classList.add("hidden");
    document.querySelectorAll(".admin-tab")[0]
      .classList.add("active");
  }else{
    create.classList.add("hidden");
    manage.classList.remove("hidden");
    document.querySelectorAll(".admin-tab")[1]
      .classList.add("active");
    loadAdminTournaments();
  }
}

/* CREATE TOURNAMENT */

async function createTournament(){
  const name = $("tName").value.trim();
  const game = $("tGame").value.trim() || "Free Fire";
  const date = $("tDate").value;
  const time = $("tTime").value;
  const maxPlayers = Number($("tMax").value);

  const roomId =
    $("tRoomId").value.trim() || null;

  const roomPassword =
    $("tRoomPassword").value.trim() || null;

  const status = $("createStatus");

  if(!name || !date || !time){
    status.innerHTML =
      `<p style="color:#ff7777">Name, date aur time required hai.</p>`;
    return;
  }

  if(!Number.isInteger(maxPlayers) || maxPlayers < 2){
    status.innerHTML =
      `<p style="color:#ff7777">Maximum players valid rakhein.</p>`;
    return;
  }

  status.innerHTML =
    `<p style="color:#8992ad">Creating...</p>`;

  const {error} = await supabaseClient
    .from("battlehub_tournaments")
    .insert({
      name,
      game,
      match_date:date,
      match_time:time,
      max_players:maxPlayers,
      room_id:roomId,
      room_password:roomPassword,
      room_released:false
    });

  if(error){
    console.error(error);

    status.innerHTML =
      `<p style="color:#ff7777">${escapeHTML(error.message)}</p>`;

    return;
  }

  status.innerHTML =
    `<p style="color:#7df6a6">Tournament created successfully.</p>`;

  $("tName").value = "";
  $("tRoomId").value = "";
  $("tRoomPassword").value = "";

  showToast("Tournament created.");

  await loadTournaments();
  await loadAdminTournaments();
}

/* ADMIN TOURNAMENTS */

async function loadAdminTournaments(){
  const box = $("adminTournamentList");

  if(!box) return;

  box.innerHTML =
    `<div class="loading">Loading...</div>`;

  const {data,error} = await supabaseClient
    .from("battlehub_tournaments")
    .select("*")
    .order("match_date",{ascending:false})
    .order("match_time",{ascending:false});

  if(error){
    console.error(error);
    box.innerHTML =
      `<div class="empty">Unable to load tournaments.</div>`;
    return;
  }

  if(!data || !data.length){
    box.innerHTML =
      `<div class="empty">No tournaments created.</div>`;
    return;
  }

  box.innerHTML = data.map(t => {
    const count = playerCache[t.id] || 0;

    return `
      <div class="admin-tournament">

        <div class="card-top">
          <div>
            <h3 class="card-title">${escapeHTML(t.name)}</h3>
            <div class="card-game">
              ${formatDate(t.match_date)}
              • ${formatTime(t.match_time)}
            </div>
          </div>

          <span class="status ${
            t.room_released ? "live" : "upcoming"
          }">
            ${t.room_released ? "RELEASED" : "HIDDEN"}
          </span>
        </div>

        <div class="card-info">
          <div class="info-item">
            <small>GAME</small>
            <strong>${escapeHTML(t.game)}</strong>
          </div>

          <div class="info-item">
            <small>PLAYERS</small>
            <strong>${count}/${t.max_players}</strong>
          </div>

          <div class="info-item">
            <small>ROOM</small>
            <strong>${t.room_released ? "ON" : "OFF"}</strong>
          </div>
        </div>

        <div class="room-status ${
          t.room_released ? "released" : "hidden"
        }">
          ${
            t.room_released
            ? "🟢 Room ID & Password visible to players"
            : "🔒 Room ID & Password hidden"
          }
        </div>

        <div class="admin-actions">
          <button class="secondary-btn"
            onclick="openAdminPlayers('${t.id}')">
            👥 Players
          </button>

          <button class="secondary-btn"
            onclick="openAdminResults('${t.id}')">
            📊 Results
          </button>

          ${
            t.room_released
            ?
            `<button class="secondary-btn"
              onclick="hideRoom('${t.id}')">
              🔒 Hide Room
            </button>`
            :
            `<button class="primary-btn"
              onclick="releaseRoom('${t.id}')">
              🔓 Release Room
            </button>`
          }

          <button class="secondary-btn"
            onclick="editRoom('${t.id}')">
            ✏️ Edit Room
          </button>
        </div>

      </div>
    `;
  }).join("");
}

/* PLAYER MANAGEMENT
   IMPORTANT:
   There is NO delete/remove button here.
*/

async function openAdminPlayers(tournamentId){
  const t = tournaments.find(x => x.id === tournamentId);

  let tournament = t;

  if(!tournament){
    const {data} = await supabaseClient
      .from("battlehub_tournaments")
      .select("*")
      .eq("id",tournamentId)
      .single();

    tournament = data;
  }

  if(!tournament){
    showToast("Tournament not found.");
    return;
  }

  currentAdminPlayersTournament = tournament;

  showPage("adminPlayersPage");

  $("adminPlayersTitle").textContent =
    tournament.name;

  $("adminPlayerMax").textContent =
    tournament.max_players;

  $("playerSearch").value = "";

  await loadAdminPlayers();
}

async function loadAdminPlayers(){
  if(!currentAdminPlayersTournament) return;

  const tournamentId =
    currentAdminPlayersTournament.id;

  const box = $("adminPlayersList");

  box.innerHTML =
    `<div class="loading">Loading players...</div>`;

  const {data,error} = await supabaseClient
    .from("battlehub_players")
    .select("*")
    .eq("tournament_id",tournamentId)
    .order("joined_at",{ascending:true});

  if(error){
    console.error(error);

    box.innerHTML =
      `<div class="empty">Unable to load players.</div>`;

    return;
  }

  adminPlayers = data || [];

  $("adminPlayerCount").textContent =
    adminPlayers.length;

  filterAdminPlayers();
}

function filterAdminPlayers(){
  const box = $("adminPlayersList");

  if(!box) return;

  const query =
    ($("playerSearch")?.value || "")
      .trim()
      .toLowerCase();

  const filtered = adminPlayers.filter(p => {
    return (
      String(p.player_name || "")
        .toLowerCase()
        .includes(query)
      ||
      String(p.player_uid || "")
        .toLowerCase()
        .includes(query)
    );
  });

  if(!filtered.length){
    box.innerHTML = `
      <div class="empty">
        ${
          query
          ? "No player found."
          : "No players have joined yet."
        }
      </div>
    `;
    return;
  }

  box.innerHTML = filtered.map((p,index) => `
    <div class="player-card">

      <div class="player-main">

        <div class="player-avatar">
          ${(p.player_name || "P")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div class="player-info">
          <div class="player-name">
            ${escapeHTML(p.player_name)}
          </div>

          <div class="player-uid">
            UID: ${escapeHTML(p.player_uid)}
          </div>

          <div class="player-uid">
            Joined: ${new Date(p.joined_at)
              .toLocaleString("en-IN")}
          </div>
        </div>

        <div class="player-actions">
          <button
            class="copy-btn"
            onclick="copyText(${JSON.stringify(
              String(p.player_uid || "")
            )})">
            📋 Copy UID
          </button>
        </div>

      </div>

    </div>
  `).join("");
}

/* ROOM MANAGEMENT */

async function editRoom(id){
  const t = tournaments.find(x => x.id === id);

  if(!t) return;

  const roomId =
    prompt(
      "Room ID:",
      t.room_id || ""
    );

  if(roomId === null) return;

  const password =
    prompt(
      "Room Password:",
      t.room_password || ""
    );

  if(password === null) return;

  const {error} = await supabaseClient
    .from("battlehub_tournaments")
    .update({
      room_id:roomId.trim() || null,
      room_password:password.trim() || null
    })
    .eq("id",id);

  if(error){
    console.error(error);
    showToast("Room update failed.");
    return;
  }

  showToast("Room details updated.");

  await loadTournaments();
  await loadAdminTournaments();
}

async function releaseRoom(id){
  const t = tournaments.find(x => x.id === id);

  if(!t) return;

  let roomId =
    (t.room_id || "").trim();

  let password =
    (t.room_password || "").trim();

  if(!roomId){
    roomId =
      prompt("Enter Room ID:");

    if(roomId === null) return;

    roomId = roomId.trim();
  }

  if(!password){
    password =
      prompt("Enter Room Password:");

    if(password === null) return;

    password = password.trim();
  }

  if(!roomId || !password){
    showToast("Room ID aur password required.");
    return;
  }

  const {error} = await supabaseClient
    .from("battlehub_tournaments")
    .update({
      room_id:roomId,
      room_password:password,
      room_released:true
    })
    .eq("id",id);

  if(error){
    console.error(error);
    showToast("Room release failed.");
    return;
  }

  showToast("Room released.");

  await loadTournaments();
  await loadAdminTournaments();
}

async function hideRoom(id){
  const {error} = await supabaseClient
    .from("battlehub_tournaments")
    .update({
      room_released:false
    })
    .eq("id",id);

  if(error){
    console.error(error);
    showToast("Unable to hide room.");
    return;
  }

  showToast("Room hidden.");

  await loadTournaments();
  await loadAdminTournaments();
}

/* ADMIN RESULTS */

async function openAdminResults(tournamentId){
  const t = tournaments.find(x => x.id === tournamentId);

  adminResultsTournament = t;

  showPage("adminResultsPage");

  await loadAdminResults();
}

async function loadAdminResults(){
  if(!adminResultsTournament) return;

  const box = $("adminResultsList");

  box.innerHTML =
    `<div class="loading">Loading results...</div>`;

  const {data,error} = await supabaseClient
    .from("battlehub_results")
    .select("*")
    .eq("tournament_id",adminResultsTournament.id)
    .order("submitted_at",{ascending:false});

  if(error){
    console.error(error);

    box.innerHTML =
      `<div class="empty">Unable to load results.</div>`;

    return;
  }

  if(!data || !data.length){
    box.innerHTML =
      `<div class="empty">No results submitted yet.</div>`;
    return;
  }

  box.innerHTML = data.map(r => `
    <div class="result-card">

      <div class="result-top">
        <strong>${escapeHTML(r.player_name)}</strong>

        <span class="${
          r.approved ? "approved" : "pending"
        }">
          ${r.approved ? "✓ Approved" : "⏳ Pending"}
        </span>
      </div>

      <div class="result-meta">
        UID: ${escapeHTML(r.player_uid)}
        <br>
        Placement: ${r.placement}
        • Kills: ${r.kills}
        • Points: ${r.points}
      </div>

      <div class="admin-actions">

        ${
          r.approved
          ?
          `<button class="secondary-btn"
            onclick="setResultApproval('${r.id}',false)">
            ↩ Unapprove
          </button>`
          :
          `<button class="primary-btn"
            onclick="setResultApproval('${r.id}',true)">
            ✓ Approve
          </button>`
        }

      </div>

    </div>
  `).join("");
}

async function setResultApproval(id,approved){
  const {error} = await supabaseClient
    .from("battlehub_results")
    .update({approved})
    .eq("id",id);

  if(error){
    console.error(error);
    showToast("Result update failed.");
    return;
  }

  showToast(
    approved
    ? "Result approved."
    : "Result unapproved."
  );

  await loadAdminResults();
}

/* COPY */

async function copyText(text){
  try{
    await navigator.clipboard.writeText(String(text));
    showToast("Copied!");
  }catch(e){
    const area = document.createElement("textarea");
    area.value = String(text);
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    showToast("Copied!");
  }
}

/* REALTIME */

function setupRealtime(){

  supabaseClient
    .channel("battlehub-tournaments")
    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"battlehub_tournaments"
      },
      async () => {
        await loadTournaments();

        if(
          document.querySelector("#adminPage.active")
        ){
          await loadAdminTournaments();
        }

        if(
          document.querySelector("#detailsPage.active") &&
          currentTournament
        ){
          const updated =
            tournaments.find(
              t => t.id === currentTournament.id
            );

          if(updated){
            currentTournament = updated;
            await openTournament(updated.id);
          }
        }
      }
    )
    .subscribe();

  supabaseClient
    .channel("battlehub-players")
    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"battlehub_players"
      },
      async () => {

        await loadPlayerCounts();

        renderTournaments();

        if(
          document.querySelector("#adminPage.active")
        ){
          await loadAdminTournaments();
        }

        if(
          document.querySelector("#adminPlayersPage.active") &&
          currentAdminPlayersTournament
        ){
          await loadAdminPlayers();
        }

        if(
          document.querySelector("#detailsPage.active") &&
          currentTournament
        ){
          await openTournament(currentTournament.id);
        }
      }
    )
    .subscribe();

  supabaseClient
    .channel("battlehub-results")
    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"battlehub_results"
      },
      async () => {

        if(
          document.querySelector("#leaderboardPage.active")
        ){
          await loadLeaderboard();
        }

        if(
          document.querySelector("#adminResultsPage.active") &&
          adminResultsTournament
        ){
          await loadAdminResults();
        }
      }
    )
    .subscribe();
}

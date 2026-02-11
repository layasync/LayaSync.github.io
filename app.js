document.addEventListener("DOMContentLoaded", function(){

  console.log("APP READY");

  const WORKER_PROXY = "https://layasync-proxy.layasync.workers.dev";

  /* ================= STATUS ================= */

  const status = document.getElementById("xtream-status");
  const savedLogin = localStorage.getItem("xtream");

  if(savedLogin && status){
    status.textContent = "Connected";
    status.classList.add("connected");
  }

  /* ================= NAVIGATION ================= */

  const navItems = document.querySelectorAll('.nav');

  const pages = {
    Home:'home',
    Search:'search',
    Movies:'movies',
    Shows:'shows',
    Playlists:'playlists',
    Collections:'collections',
    Live:'live'
  };

  function showPage(name){
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');

    if(pages[name]){
      document.getElementById(pages[name]).style.display='block';
    }

    navItems.forEach(n=>n.classList.remove('active'));

    const activeNav = [...navItems].find(n=>n.textContent.trim()===name);
    if(activeNav) activeNav.classList.add('active');
  }

  navItems.forEach(item=>{
    item.addEventListener('click', ()=>{
      const page = item.textContent.trim();
      showPage(page);

      if(page === "Movies") loadMovies();
      if(page === "Shows") loadShows();
    });
  });

  /* ================= TV SAFE ================= */

  function tvActivate(element, callback){
    if(!element) return;
    element.setAttribute("tabindex", "0");
    element.addEventListener("click", callback);
    element.addEventListener("keydown", e=>{
      if(e.key === "Enter") callback();
    });
  }

  /* ================= XTREAM POPUP ================= */

  const xtreamBtn = document.querySelector(".xtream-btn");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  tvActivate(xtreamBtn, ()=> xtreamPopup.style.display="flex");
  tvActivate(xtreamClose, ()=> xtreamPopup.style.display="none");

  /* ================= XTREAM CONNECT ================= */

  tvActivate(xtreamConnect, async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try {

      const cleanServer = server.replace(/\/+$/, "");

      const targetUrl =
        `${cleanServer}/player_api.php?username=${username}&password=${password}`;

      const response = await fetch(
        `${WORKER_PROXY}?url=${encodeURIComponent(targetUrl)}`
      );

      const data = await response.json();

      if(data.user_info && data.user_info.auth === 1){

        if(status){
          status.textContent="Connected";
          status.classList.remove("failed");
          status.classList.add("connected");
        }

        localStorage.setItem("xtream", JSON.stringify({
          server: cleanServer,
          username,
          password
        }));

        xtreamPopup.style.display="none";

      } else {
        if(status){
          status.textContent="Failed";
          status.classList.remove("connected");
          status.classList.add("failed");
        }
      }

    } catch(err){
      alert("Connection Failed");
      console.error(err);
    }

  });

  /* ================= HELPER DELAY ================= */

  function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ================= LOAD MOVIES ================= */

  async function loadMovies(){

    const saved = JSON.parse(localStorage.getItem("xtream"));
    if(!saved) return;

    const {server, username, password} = saved;
    const container = document.getElementById("movies-container");
    container.innerHTML = "Loading...";

    const catUrl =
      `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`;

    const response = await fetch(
      `${WORKER_PROXY}?url=${encodeURIComponent(catUrl)}`
    );

    const categories = await response.json();
    container.innerHTML = "";

    const batchSize = 5;

    for(let i=0; i<categories.length; i+=batchSize){

      const batch = categories.slice(i, i+batchSize);

      for(const cat of batch){

        const streamsUrl =
          `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${cat.category_id}`;

        const streamRes = await fetch(
          `${WORKER_PROXY}?url=${encodeURIComponent(streamsUrl)}`
        );

        const streams = await streamRes.json();

        const section = document.createElement("div");
        section.className = "section";

        const title = document.createElement("h3");
        title.textContent = cat.category_name;

        const row = document.createElement("div");
        row.className = "row";

        streams.slice(0,10).forEach(movie=>{
          const card = document.createElement("div");
          card.className = "card small";

          if(movie.stream_icon){
            card.style.backgroundImage = `url(${movie.stream_icon})`;
            card.style.backgroundSize="cover";
            card.style.backgroundPosition="center";
          }

          row.appendChild(card);
        });

        section.appendChild(title);
        section.appendChild(row);
        container.appendChild(section);
      }

      await delay(2000); // 2 second pause between batches
    }
  }

  /* ================= LOAD SHOWS ================= */

  async function loadShows(){

    const saved = JSON.parse(localStorage.getItem("xtream"));
    if(!saved) return;

    const {server, username, password} = saved;
    const container = document.getElementById("shows-container");
    container.innerHTML = "Loading...";

    const catUrl =
      `${server}/player_api.php?username=${username}&password=${password}&action=get_series_categories`;

    const response = await fetch(
      `${WORKER_PROXY}?url=${encodeURIComponent(catUrl)}`
    );

    const categories = await response.json();
    container.innerHTML = "";

    const batchSize = 5;

    for(let i=0; i<categories.length; i+=batchSize){

      const batch = categories.slice(i, i+batchSize);

      for(const cat of batch){

        const streamsUrl =
          `${server}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${cat.category_id}`;

        const streamRes = await fetch(
          `${WORKER_PROXY}?url=${encodeURIComponent(streamsUrl)}`
        );

        const streams = await streamRes.json();

        const section = document.createElement("div");
        section.className = "section";

        const title = document.createElement("h3");
        title.textContent = cat.category_name;

        const row = document.createElement("div");
        row.className = "row";

        streams.slice(0,10).forEach(show=>{
          const card = document.createElement("div");
          card.className = "card small";

          if(show.cover){
            card.style.backgroundImage = `url(${show.cover})`;
            card.style.backgroundSize="cover";
            card.style.backgroundPosition="center";
          }

          row.appendChild(card);
        });

        section.appendChild(title);
        section.appendChild(row);
        container.appendChild(section);
      }

      await delay(2000); // 2 second pause
    }
  }

});
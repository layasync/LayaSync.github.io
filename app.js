document.addEventListener("DOMContentLoaded", function(){

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
    element.setAttribute("tabindex","0");
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

  /* ================= XTREAM CONNECT (STABLE) ================= */

  tvActivate(xtreamConnect, async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try {

      // Clear previous session
      localStorage.removeItem("xtream");

      const cleanServer = server.replace(/\/+$/, "");

      const targetUrl =
        `${cleanServer}/player_api.php?username=${username}&password=${password}`;

      const response = await fetch(
        `${WORKER_PROXY}?url=${encodeURIComponent(targetUrl)}`
      );

      if(!response.ok){
        throw new Error("Server blocked request");
      }

      const data = await response.json();

      if(data.user_info && data.user_info.auth === 1){

        localStorage.setItem("xtream", JSON.stringify({
          server: cleanServer,
          username,
          password
        }));

        if(status){
          status.textContent="Connected";
          status.classList.remove("failed");
          status.classList.add("connected");
        }

        // Reset containers so reload works
        document.getElementById("movies-container").dataset.loaded="";
        document.getElementById("shows-container").dataset.loaded="";

        xtreamPopup.style.display="none";

      } else {
        throw new Error("Invalid credentials");
      }

    } catch(err){
      console.error("Connect error:", err);
      alert("Connection Failed. Wait 5 seconds and try again.");
    }

  });

  /* ================= HELPER ================= */

  function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchJSON(url){
    const res = await fetch(`${WORKER_PROXY}?url=${encodeURIComponent(url)}`);
    if(!res.ok) throw new Error("Fetch blocked");
    return res.json();
  }

  /* ================= LOAD MOVIES ================= */

  async function loadMovies(){

    const saved = JSON.parse(localStorage.getItem("xtream"));
    if(!saved) return;

    const {server, username, password} = saved;
    const container = document.getElementById("movies-container");

    if(container.dataset.loaded === "true") return;
    container.dataset.loaded = "true";

    container.innerHTML = "";

    try{

      const catUrl =
        `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`;

      const categories = await fetchJSON(catUrl);

      const firstTen = categories.slice(0,10);
      const rest = categories.slice(10);

      // Load first 10 instantly
      for(const cat of firstTen){
        renderMovieCategory(cat);
      }

      // Load remaining progressively
      for(const cat of rest){
        await delay(350);
        renderMovieCategory(cat);
      }

    } catch(e){
      console.error("Movies load error:", e);
    }

    async function renderMovieCategory(cat){

      const section = document.createElement("div");
      section.className="section";

      const title = document.createElement("h3");
      title.textContent=cat.category_name;

      const row = document.createElement("div");
      row.className="row";

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);

      try{
        const streamsUrl =
          `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${cat.category_id}`;

        const streams = await fetchJSON(streamsUrl);

        streams.slice(0,10).forEach(movie=>{
          const card = document.createElement("div");
          card.className="card small";
          card.setAttribute("tabindex","0");

          if(movie.stream_icon){
            const img=document.createElement("img");
            img.src=movie.stream_icon;
            img.loading="lazy";
            img.style.width="100%";
            img.style.height="100%";
            img.style.objectFit="cover";
            card.appendChild(img);
          }

          row.appendChild(card);
        });

      } catch(e){}
    }
  }

  /* ================= LOAD SHOWS ================= */

  async function loadShows(){

    const saved = JSON.parse(localStorage.getItem("xtream"));
    if(!saved) return;

    const {server, username, password} = saved;
    const container = document.getElementById("shows-container");

    if(container.dataset.loaded === "true") return;
    container.dataset.loaded = "true";

    container.innerHTML = "";

    try{

      const catUrl =
        `${server}/player_api.php?username=${username}&password=${password}&action=get_series_categories`;

      const categories = await fetchJSON(catUrl);

      const firstTen = categories.slice(0,10);
      const rest = categories.slice(10);

      for(const cat of firstTen){
        renderShowCategory(cat);
      }

      for(const cat of rest){
        await delay(350);
        renderShowCategory(cat);
      }

    } catch(e){
      console.error("Shows load error:", e);
    }

    async function renderShowCategory(cat){

      const section=document.createElement("div");
      section.className="section";

      const title=document.createElement("h3");
      title.textContent=cat.category_name;

      const row=document.createElement("div");
      row.className="row";

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);

      try{
        const streamsUrl =
          `${server}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${cat.category_id}`;

        const streams=await fetchJSON(streamsUrl);

        streams.slice(0,10).forEach(show=>{
          const card=document.createElement("div");
          card.className="card small";
          card.setAttribute("tabindex","0");

          if(show.cover){
            const img=document.createElement("img");
            img.src=show.cover;
            img.loading="lazy";
            img.style.width="100%";
            img.style.height="100%";
            img.style.objectFit="cover";
            card.appendChild(img);
          }

          row.appendChild(card);
        });

      } catch(e){}
    }
  }

});
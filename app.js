document.addEventListener("DOMContentLoaded", function(){

  const WORKER_PROXY = "https://layasync-proxy.layasync.workers.dev";

  const status = document.getElementById("xtream-status");

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

      if(page === "Movies") renderMovies();
      if(page === "Shows") renderShows();
    });
  });

  function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchJSON(url){
    const res = await fetch(`${WORKER_PROXY}?url=${encodeURIComponent(url)}`);
    if(!res.ok) throw new Error("Blocked");
    return res.json();
  }

  /* ================= XTREAM CONNECT ================= */

  document.getElementById("xtream-connect").addEventListener("click", async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try{

      localStorage.removeItem("xtream");
      localStorage.removeItem("xtream_cache");

      const cleanServer = server.replace(/\/+$/, "");

      const loginData = await fetchJSON(
        `${cleanServer}/player_api.php?username=${username}&password=${password}`
      );

      if(!loginData.user_info || loginData.user_info.auth !== 1){
        throw new Error("Invalid");
      }

      localStorage.setItem("xtream", JSON.stringify({
        server: cleanServer,
        username,
        password
      }));

      status.textContent="Syncing...";

      await fullSync(cleanServer, username, password);

      status.textContent="Connected";
      status.classList.add("connected");

      document.getElementById("xtream-popup").style.display="none";

    }catch(e){
      console.error(e);
      alert("Connection Failed. Wait 10 seconds and retry.");
    }

  });

  /* ================= FULL SYNC ================= */

  async function fullSync(server, username, password){

    const cache = {
      movies: {},
      shows: {}
    };

    // MOVIES
    const movieCats = await fetchJSON(
      `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`
    );

    for(const cat of movieCats){

      const streams = await fetchJSON(
        `${server}/player_api.php?username=${username}&password=${password}&action=get_vod_streams&category_id=${cat.category_id}`
      );

      // Store only needed fields
      cache.movies[cat.category_name] = streams.map(m => ({
        name: m.name,
        icon: m.stream_icon,
        id: m.stream_id
      }));

      localStorage.setItem("xtream_cache", JSON.stringify(cache));

      await delay(500);
    }

    // SHOWS
    const showCats = await fetchJSON(
      `${server}/player_api.php?username=${username}&password=${password}&action=get_series_categories`
    );

    for(const cat of showCats){

      const streams = await fetchJSON(
        `${server}/player_api.php?username=${username}&password=${password}&action=get_series&category_id=${cat.category_id}`
      );

      cache.shows[cat.category_name] = streams.map(s => ({
        name: s.name,
        cover: s.cover,
        id: s.series_id
      }));

      localStorage.setItem("xtream_cache", JSON.stringify(cache));

      await delay(500);
    }
  }

  /* ================= RENDER MOVIES ================= */

  function renderMovies(){

    const container = document.getElementById("movies-container");
    container.innerHTML="";

    const cache = JSON.parse(localStorage.getItem("xtream_cache"));
    if(!cache || !cache.movies) return;

    for(const category in cache.movies){

      const section=document.createElement("div");
      section.className="section";

      const title=document.createElement("h3");
      title.textContent=category;

      const row=document.createElement("div");
      row.className="row";

      cache.movies[category].forEach(movie=>{
        const card=document.createElement("div");
        card.className="card small";
        card.setAttribute("tabindex","0");

        if(movie.icon){
          const img=document.createElement("img");
          img.src=movie.icon;
          img.loading="lazy";
          img.style.width="100%";
          img.style.height="100%";
          img.style.objectFit="cover";
          card.appendChild(img);
        }

        row.appendChild(card);
      });

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    }
  }

  /* ================= RENDER SHOWS ================= */

  function renderShows(){

    const container = document.getElementById("shows-container");
    container.innerHTML="";

    const cache = JSON.parse(localStorage.getItem("xtream_cache"));
    if(!cache || !cache.shows) return;

    for(const category in cache.shows){

      const section=document.createElement("div");
      section.className="section";

      const title=document.createElement("h3");
      title.textContent=category;

      const row=document.createElement("div");
      row.className="row";

      cache.shows[category].forEach(show=>{
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

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    }
  }

});
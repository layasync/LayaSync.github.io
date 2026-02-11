document.addEventListener("DOMContentLoaded", function(){

  const WORKER = "https://layasync-proxy.layasync.workers.dev";
  let credentials = null;

  const status = document.getElementById("xtream-status");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  /* ================= RESTORE LOGIN ================= */

  const saved = localStorage.getItem("xtream_login");
  if(saved){
    credentials = JSON.parse(saved);
    status.textContent = "Connected";
    status.classList.add("connected");
  }

  /* ================= NAV HIGHLIGHT ================= */

  const navItems = document.querySelectorAll(".nav");

  function activateNav(clicked){
    navItems.forEach(n=>n.classList.remove("active"));
    clicked.classList.add("active");
  }

  /* ================= POPUP ================= */

  document.querySelector(".xtream-btn").onclick = ()=>{
    xtreamPopup.style.display="flex";
  };

  xtreamClose.onclick = ()=>{
    xtreamPopup.style.display="none";
  };

  /* ================= LOGIN ================= */

  xtreamConnect.onclick = async function(){

    const server = document.getElementById("xtream-server").value.trim();
    const username = document.getElementById("xtream-username").value.trim();
    const password = document.getElementById("xtream-password").value.trim();

    if(!server || !username || !password){
      alert("Fill all fields");
      return;
    }

    try{

      const res = await fetch(
        `${WORKER}/login?server=${encodeURIComponent(server)}&username=${username}&password=${password}`
      );

      const data = await res.json();

      if(!data.user_info || data.user_info.auth !== 1){
        throw new Error("Invalid");
      }

      credentials = { server, username, password };
      localStorage.setItem("xtream_login", JSON.stringify(credentials));

      status.textContent="Connected";
      status.classList.remove("failed");
      status.classList.add("connected");

      xtreamPopup.style.display="none";

    }catch(e){
      status.textContent="Failed";
      status.classList.remove("connected");
      status.classList.add("failed");
      alert("Login Failed");
    }
  };

  /* ================= MOVIE CATEGORIES ================= */

  async function loadMovieCategories(){

    if(!credentials) return alert("Please login first");

    const container = document.getElementById("movies-container");
    container.innerHTML="";

    const res = await fetch(
      `${WORKER}/vod-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();

    const pillRow = document.createElement("div");
    pillRow.className="row";
    pillRow.style.marginBottom="30px";

    const streamContainer = document.createElement("div");
    streamContainer.id="movie-streams";

    categories.forEach(cat=>{

      const pill=document.createElement("div");
      pill.className="nav";
      pill.textContent=cat.category_name;
      pill.style.fontSize="16px";

      pill.onclick=()=>{
        document.querySelectorAll("#movies-container .nav")
          .forEach(p=>p.classList.remove("active"));
        pill.classList.add("active");

        loadMovies(cat.category_id, streamContainer);
      };

      pillRow.appendChild(pill);
    });

    container.appendChild(pillRow);
    container.appendChild(streamContainer);
  }

  async function loadMovies(category_id, container){

    container.innerHTML="Loading...";

    const res = await fetch(
      `${WORKER}/vod-streams?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${category_id}`
    );

    const movies = await res.json();
    container.innerHTML="";

    const row=document.createElement("div");
    row.className="row";

    movies.forEach(movie=>{

      const card=document.createElement("div");
      card.className="card small";

      const poster =
        movie.stream_icon ||
        movie.movie_icon ||
        movie.cover ||
        movie.icon;

      if(poster){
        const img=document.createElement("img");
        img.src=`${WORKER}/image?url=${encodeURIComponent(poster)}`;
        img.loading="lazy";
        img.style.width="100%";
        img.style.height="100%";
        img.style.objectFit="cover";
        img.style.borderRadius="18px";
        card.appendChild(img);
      }

      card.onclick=()=>{
        const ext = movie.container_extension || "mkv";
        const streamUrl =
          `${credentials.server}/movie/${credentials.username}/${credentials.password}/${movie.stream_id}.${ext}`;
        openPlayer(streamUrl, movie.name);
      };

      row.appendChild(card);
    });

    container.appendChild(row);
  }

  /* ================= SHOW CATEGORIES ================= */

  async function loadShowCategories(){

    if(!credentials) return alert("Please login first");

    const container = document.getElementById("shows-container");
    container.innerHTML="";

    const res = await fetch(
      `${WORKER}/series-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();

    const pillRow=document.createElement("div");
    pillRow.className="row";
    pillRow.style.marginBottom="30px";

    const streamContainer=document.createElement("div");
    streamContainer.id="show-streams";

    categories.forEach(cat=>{

      const pill=document.createElement("div");
      pill.className="nav";
      pill.textContent=cat.category_name;
      pill.style.fontSize="16px";

      pill.onclick=()=>{
        document.querySelectorAll("#shows-container .nav")
          .forEach(p=>p.classList.remove("active"));
        pill.classList.add("active");

        loadShows(cat.category_id, streamContainer);
      };

      pillRow.appendChild(pill);
    });

    container.appendChild(pillRow);
    container.appendChild(streamContainer);
  }

  async function loadShows(category_id, container){

    container.innerHTML="Loading...";

    const res = await fetch(
      `${WORKER}/series?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${category_id}`
    );

    const shows = await res.json();
    container.innerHTML="";

    const row=document.createElement("div");
    row.className="row";

    shows.forEach(show=>{

      const card=document.createElement("div");
      card.className="card small";

      const poster =
        show.cover ||
        show.stream_icon ||
        show.icon;

      if(poster){
        const img=document.createElement("img");
        img.src=`${WORKER}/image?url=${encodeURIComponent(poster)}`;
        img.loading="lazy";
        img.style.width="100%";
        img.style.height="100%";
        img.style.objectFit="cover";
        img.style.borderRadius="18px";
        card.appendChild(img);
      }

      card.onclick=()=>{
        const streamUrl =
          `${credentials.server}/series/${credentials.username}/${credentials.password}/${show.series_id}.mp4`;
        openPlayer(streamUrl, show.name);
      };

      row.appendChild(card);
    });

    container.appendChild(row);
  }

  /* ================= NAVIGATION ================= */

  navItems.forEach(nav=>{
    nav.onclick=()=>{
      const name = nav.textContent.trim();
      activateNav(nav);

      document.querySelectorAll(".page")
        .forEach(p=>p.style.display="none");

      const page=document.getElementById(name.toLowerCase());
      if(page) page.style.display="block";

      if(name==="Movies") loadMovieCategories();
      if(name==="Shows") loadShowCategories();
    };
  });

});
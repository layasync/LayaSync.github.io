document.addEventListener("DOMContentLoaded", function(){

  const WORKER = "https://layasync-proxy.layasync.workers.dev";

  const status = document.getElementById("xtream-status");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  let credentials = null;

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

      credentials = {server, username, password};

      localStorage.setItem("xtream_login", JSON.stringify(credentials));

      status.textContent = "Connected";
      status.classList.add("connected");

      xtreamPopup.style.display = "none";

    }catch(e){
      status.textContent = "Failed";
      status.classList.add("failed");
      alert("Login Failed");
    }
  };

  xtreamClose.onclick = ()=> xtreamPopup.style.display="none";

  document.querySelector(".xtream-btn").onclick = ()=>{
    xtreamPopup.style.display="flex";
  };

  /* ================= LOAD MOVIE CATEGORIES ================= */

  async function loadMovieCategories(){

    const container = document.getElementById("movies-container");
    container.innerHTML = "Loading...";

    const res = await fetch(
      `${WORKER}/vod-categories?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}`
    );

    const categories = await res.json();

    container.innerHTML = "";

    categories.forEach(cat=>{

      const section = document.createElement("div");
      section.className="section";

      const title = document.createElement("h3");
      title.textContent = cat.category_name;

      const row = document.createElement("div");
      row.className="row";

      row.onclick = ()=> loadMovies(cat.category_id, row);

      section.appendChild(title);
      section.appendChild(row);
      container.appendChild(section);
    });
  }

  /* ================= LOAD MOVIES ================= */

  async function loadMovies(category_id, row){

    if(row.dataset.loaded) return;

    row.innerHTML="Loading...";

    const res = await fetch(
      `${WORKER}/vod-streams?server=${encodeURIComponent(credentials.server)}&username=${credentials.username}&password=${credentials.password}&category_id=${category_id}`
    );

    const movies = await res.json();

    row.innerHTML="";
    row.dataset.loaded="true";

    movies.forEach(movie=>{

      const card = document.createElement("div");
      card.className="card small";

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
  }

  /* ================= NAV ================= */

  document.querySelectorAll(".nav").forEach(nav=>{
    nav.onclick = ()=>{
      const name = nav.textContent.trim();

      document.querySelectorAll(".page").forEach(p=>p.style.display="none");
      document.getElementById(name.toLowerCase()).style.display="block";

      if(name==="Movies") loadMovieCategories();
    };
  });

});
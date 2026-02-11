/* ===================================================== */
/* ================= NAVIGATION LOGIC =================== */
/* ===================================================== */

document.addEventListener("DOMContentLoaded", function(){

  /* ===== NAVIGATION ===== */

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
    document.querySelectorAll('.page').forEach(p=>{
      p.style.display='none';
    });

    if(pages[name]){
      document.getElementById(pages[name]).style.display='block';
    }

    navItems.forEach(n=>n.classList.remove('active'));

    const activeNav = [...navItems].find(n=>n.textContent.trim()===name);
    if(activeNav){
      activeNav.classList.add('active');
    }
  }

  navItems.forEach(item=>{
    item.addEventListener('click',()=>{
      showPage(item.textContent.trim());
    });
  });


  /* ===================================================== */
  /* ================= XTREAM POPUP LOGIC ================= */
  /* ===================================================== */

  const xtreamBtn = document.querySelector(".xtream-btn");
  const xtreamPopup = document.getElementById("xtream-popup");
  const xtreamClose = document.getElementById("xtream-close");
  const xtreamConnect = document.getElementById("xtream-connect");

  // Open popup
  if(xtreamBtn && xtreamPopup){
    xtreamBtn.addEventListener("click", () => {
      xtreamPopup.style.display = "flex";
    });
  }

  // Close popup
  if(xtreamClose && xtreamPopup){
    xtreamClose.addEventListener("click", () => {
      xtreamPopup.style.display = "none";
    });
  }

  // Connect to Xtream
  if(xtreamConnect){

    xtreamConnect.addEventListener("click", async () => {

      const server = document.getElementById("xtream-server")?.value.trim();
      const username = document.getElementById("xtream-username")?.value.trim();
      const password = document.getElementById("xtream-password")?.value.trim();

      if(!server || !username || !password){
        alert("Fill all fields");
        return;
      }

      try {

        const cleanServer = server.replace(/\/+$/, "");

        const response = await fetch(
          `${cleanServer}/player_api.php?username=${username}&password=${password}`
        );

        const data = await response.json();

        if(data.user_info && data.user_info.auth === 1){

          alert("Xtream Connected Successfully");

          localStorage.setItem("xtream", JSON.stringify({
            server: cleanServer,
            username,
            password
          }));

          if(xtreamPopup){
            xtreamPopup.style.display = "none";
          }

        } else {
          alert("Invalid Credentials");
        }

      } catch(err){
        alert("Connection Error (CORS or Invalid Server)");
        console.error(err);
      }

    });

  }

});
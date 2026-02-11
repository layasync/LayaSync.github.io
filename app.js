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
  document.getElementById(pages[name]).style.display='block';

  navItems.forEach(n=>n.classList.remove('active'));
  [...navItems].find(n=>n.textContent.trim()===name).classList.add('active');
}

navItems.forEach(item=>{
  item.addEventListener('click',()=>{
    showPage(item.textContent.trim());
  });
});

/* ===================================================== */
/* ================= XTREAM LOGIN LOGIC ================= */
/* ===================================================== */

/* ===== Get Connect Button ===== */
const connectBtn = document.getElementById("xtream-connect");

/* ===== When Connect Button Clicked ===== */
connectBtn.addEventListener("click", async () => {

  /* ===== Get Input Values ===== */
  const server = document.getElementById("xtream-server").value.trim();
  const username = document.getElementById("xtream-username").value.trim();
  const password = document.getElementById("xtream-password").value.trim();

  /* ===== Validate Inputs ===== */
  if(!server || !username || !password){
    alert("Please fill all fields");
    return;
  }

  try {

    /* ===== Call Xtream API ===== */
    const response = await fetch(
      `${server}/player_api.php?username=${username}&password=${password}`
    );

    const data = await response.json();

    /* ===== Check Authentication ===== */
    if(data.user_info && data.user_info.auth === 1){

      alert("Login Successful");

      /* ===== Hide Login Overlay ===== */
      document.getElementById("xtream-login").style.display = "none";

      /* ===== Save Credentials Locally ===== */
      localStorage.setItem("xtream", JSON.stringify({
        server,
        username,
        password
      }));

    } else {
      alert("Login Failed");
    }

  } catch (error){

    /* ===== Connection or CORS Error ===== */
    alert("Connection Error (CORS or Invalid Server)");
    console.error(error);

  }

});
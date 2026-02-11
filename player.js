document.addEventListener("DOMContentLoaded", function(){

  const overlay = document.getElementById("player-overlay");
  const video = document.getElementById("video-player");

  const playBtn = document.getElementById("play-btn");
  const closeBtn = document.getElementById("close-btn");
  const progressBar = document.getElementById("progress-bar");
  const timeDisplay = document.getElementById("time-display");
  const aspectBtn = document.getElementById("aspect-btn");

  let aspectMode = 0; // 0 contain, 1 cover, 2 fill

  /* ================= OPEN PLAYER ================= */

  window.openPlayer = function(streamUrl){

    overlay.style.display = "flex";

    video.src = streamUrl;
    video.play().catch(()=>{});
  };

  /* ================= CLOSE ================= */

  function closePlayer(){
    video.pause();
    video.src = "";
    overlay.style.display = "none";
  }

  closeBtn.onclick = closePlayer;

  /* ================= PLAY / PAUSE ================= */

  playBtn.onclick = function(){
    if(video.paused){
      video.play();
    } else {
      video.pause();
    }
  };

  video.addEventListener("play", ()=> playBtn.textContent="⏸");
  video.addEventListener("pause", ()=> playBtn.textContent="▶");

  /* ================= PROGRESS ================= */

  video.addEventListener("timeupdate", function(){

    if(!video.duration) return;

    const percent = (video.currentTime / video.duration) * 100;
    progressBar.style.width = percent + "%";

    timeDisplay.textContent =
      format(video.currentTime) + " / " + format(video.duration);
  });

  function format(sec){
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  }

  /* ================= ASPECT MODE ================= */

  aspectBtn.onclick = function(){

    aspectMode++;

    if(aspectMode > 2) aspectMode = 0;

    if(aspectMode === 0){
      video.style.objectFit = "contain";
      aspectBtn.textContent = "Fit";
    }
    else if(aspectMode === 1){
      video.style.objectFit = "cover";
      aspectBtn.textContent = "Zoom";
    }
    else{
      video.style.objectFit = "fill";
      aspectBtn.textContent = "Stretch";
    }
  };

  /* ================= KEYBOARD SUPPORT ================= */

  document.addEventListener("keydown", function(e){

    if(overlay.style.display !== "flex") return;

    if(e.key === "Escape" || e.key === "Backspace"){
      closePlayer();
    }

    if(e.key === " "){
      playBtn.click();
    }

    if(e.key === "ArrowLeft"){
      video.currentTime -= 10;
    }

    if(e.key === "ArrowRight"){
      video.currentTime += 10;
    }

  });

  /* ================= ERROR ================= */

  video.addEventListener("error", function(){
    alert("Stream cannot be played.");
    closePlayer();
  });

});
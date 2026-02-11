document.addEventListener("DOMContentLoaded", function(){

  const overlay = document.getElementById("player-overlay");
  const video = document.getElementById("video-player");

  const playBtn = document.getElementById("play-btn");
  const closeBtn = document.getElementById("close-btn");
  const progressBar = document.getElementById("progress-bar");
  const timeDisplay = document.getElementById("time-display");
  const aspectBtn = document.getElementById("aspect-btn");

  let hls = null;
  let aspectMode = 0;

  window.openPlayer = function(streamUrl){

    overlay.style.display = "flex";

    if(hls){
      hls.destroy();
      hls = null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    tryNative(streamUrl);
  };

  function tryNative(url){

    video.src = url;

    video.play().then(()=>{
      console.log("Native playback started");
    }).catch(()=>{
      tryHLS(url);
    });
  }

  function tryHLS(url){

    if(typeof Hls !== "undefined" && Hls.isSupported()){

      hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(){
        video.play();
      });

      hls.on(Hls.Events.ERROR, function(){
        showError();
      });

    } else {
      showError();
    }
  }

  function showError(){
    alert("Format not supported by device.");
    closePlayer();
  }

  function closePlayer(){
    video.pause();
    video.src = "";
    if(hls){
      hls.destroy();
      hls = null;
    }
    overlay.style.display = "none";
  }

  closeBtn.onclick = closePlayer;

  playBtn.onclick = function(){
    if(video.paused) video.play();
    else video.pause();
  };

  video.addEventListener("play", ()=> playBtn.textContent="⏸");
  video.addEventListener("pause", ()=> playBtn.textContent="▶");

  video.addEventListener("timeupdate", function(){
    if(!video.duration) return;
    progressBar.style.width =
      (video.currentTime / video.duration) * 100 + "%";

    timeDisplay.textContent =
      format(video.currentTime) + " / " + format(video.duration);
  });

  function format(sec){
    if(!sec) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  }

  aspectBtn.onclick = function(){
    aspectMode++;
    if(aspectMode > 2) aspectMode = 0;

    if(aspectMode === 0){
      video.style.objectFit="contain";
      aspectBtn.textContent="Fit";
    }
    else if(aspectMode === 1){
      video.style.objectFit="cover";
      aspectBtn.textContent="Zoom";
    }
    else{
      video.style.objectFit="fill";
      aspectBtn.textContent="Stretch";
    }
  };

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

});
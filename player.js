const overlay = document.getElementById("video-player-overlay");
const video = document.getElementById("video-element");
const titleEl = document.getElementById("video-title");

const playPause = document.getElementById("play-pause");
const seekBack = document.getElementById("seek-back");
const seekForward = document.getElementById("seek-forward");
const exitBtn = document.getElementById("video-exit");

const progressBar = document.getElementById("progress-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");

const aspectSelect = document.getElementById("aspect-select");
const audioSelect = document.getElementById("audio-select");
const subtitleSelect = document.getElementById("subtitle-select");

let hideTimer = null;

/* ================= OPEN PLAYER ================= */

function openPlayer(url, title){

  overlay.style.display = "flex";
  titleEl.textContent = title || "Now Playing";

  video.src = url;
  video.play();

  setupTracks();
  resetHideTimer();
}

/* ================= EXIT ================= */

exitBtn.onclick = function(){
  video.pause();
  video.src = "";
  overlay.style.display = "none";
};

/* ================= PLAY / PAUSE ================= */

playPause.onclick = function(){
  if(video.paused){
    video.play();
  } else {
    video.pause();
  }
};

/* ================= SEEK ================= */

seekBack.onclick = ()=> video.currentTime -= 10;
seekForward.onclick = ()=> video.currentTime += 10;

/* ================= PROGRESS ================= */

video.addEventListener("timeupdate", ()=>{
  const percent = (video.currentTime / video.duration) * 100;
  progressBar.value = percent || 0;

  currentTimeEl.textContent = formatTime(video.currentTime);
  durationEl.textContent = formatTime(video.duration);
});

progressBar.oninput = function(){
  video.currentTime = (progressBar.value / 100) * video.duration;
};

function formatTime(seconds){
  if(!seconds) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0"+s : s}`;
}

/* ================= ASPECT ================= */

aspectSelect.onchange = function(){

  const val = this.value;

  if(val === "16:9"){
    video.style.aspectRatio = "16 / 9";
    video.style.objectFit = "contain";
  } else {
    video.style.aspectRatio = "";
    video.style.objectFit = val;
  }
};

/* ================= AUDIO TRACKS ================= */

function setupTracks(){

  audioSelect.innerHTML = "";
  subtitleSelect.innerHTML = "";

  const audioTracks = video.audioTracks;
  if(audioTracks){
    for(let i=0;i<audioTracks.length;i++){
      const option = document.createElement("option");
      option.value = i;
      option.textContent = audioTracks[i].label || "Audio "+(i+1);
      audioSelect.appendChild(option);
    }

    audioSelect.onchange = function(){
      for(let i=0;i<audioTracks.length;i++){
        audioTracks[i].enabled = (i == this.value);
      }
    };
  }

  const textTracks = video.textTracks;
  for(let i=0;i<textTracks.length;i++){
    const option = document.createElement("option");
    option.value = i;
    option.textContent = textTracks[i].label || "Subtitle "+(i+1);
    subtitleSelect.appendChild(option);
  }

  subtitleSelect.onchange = function(){
    for(let i=0;i<textTracks.length;i++){
      textTracks[i].mode = (i == this.value) ? "showing" : "disabled";
    }
  };
}

/* ================= AUTO HIDE ================= */

function resetHideTimer(){
  clearTimeout(hideTimer);
  overlay.querySelector(".video-ui").style.opacity = "1";

  hideTimer = setTimeout(()=>{
    overlay.querySelector(".video-ui").style.opacity = "0";
  }, 4000);
}

overlay.addEventListener("mousemove", resetHideTimer);
overlay.addEventListener("click", resetHideTimer);
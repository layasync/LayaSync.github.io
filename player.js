document.addEventListener("DOMContentLoaded", function(){

  const overlay = document.getElementById("player-overlay");
  const video = document.getElementById("video-player");

  const btnPlay = document.getElementById("btn-play");
  const btnBack = document.getElementById("btn-back");
  const btnForward = document.getElementById("btn-forward");
  const btnAspect = document.getElementById("btn-aspect");
  const btnClose = document.getElementById("btn-close");
  const btnExit = document.getElementById("btn-exit");

  const audioSelect = document.getElementById("audio-select");
  const subtitleSelect = document.getElementById("subtitle-select");

  let hls = null;
  let aspectIndex = 0;

  const aspectModes = [
    { name:"Fit", apply:()=> video.style.objectFit="contain" },
    { name:"Zoom", apply:()=> video.style.objectFit="cover" },
    { name:"Stretch", apply:()=> video.style.objectFit="fill" },
    { name:"16:9", apply:()=>{
        video.style.objectFit="contain";
        video.style.aspectRatio="16/9";
      }
    },
    { name:"20:9", apply:()=>{
        video.style.objectFit="contain";
        video.style.aspectRatio="20/9";
      }
    }
  ];

  /* ================= OPEN ================= */

  window.openPlayer = function(url){

    overlay.style.display="flex";

    if(hls){
      hls.destroy();
      hls=null;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    if(url.includes(".m3u8") && typeof Hls !== "undefined" && Hls.isSupported()){

      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, function(){
        video.play();
        populateTracks();
      });

    } else {
      video.src=url;
      video.play().then(()=> populateTracks());
    }
  };

  /* ================= CLOSE ================= */

  function closePlayer(){
    video.pause();
    video.src="";
    if(hls){ hls.destroy(); hls=null; }
    overlay.style.display="none";
  }

  btnClose.onclick = closePlayer;
  btnExit.onclick = closePlayer;

  /* ================= PLAY ================= */

  btnPlay.onclick = ()=>{
    if(video.paused) video.play();
    else video.pause();
  };

  video.addEventListener("play", ()=> btnPlay.textContent="⏸");
  video.addEventListener("pause", ()=> btnPlay.textContent="▶");

  /* ================= SEEK ================= */

  btnBack.onclick = ()=> video.currentTime -= 10;
  btnForward.onclick = ()=> video.currentTime += 10;

  /* ================= ASPECT ================= */

  btnAspect.onclick = ()=>{
    aspectIndex++;
    if(aspectIndex >= aspectModes.length) aspectIndex=0;

    aspectModes[aspectIndex].apply();
    btnAspect.textContent = aspectModes[aspectIndex].name;
  };

  /* ================= AUDIO TRACKS ================= */

  function populateTracks(){

    audioSelect.innerHTML="";
    subtitleSelect.innerHTML="";

    // Audio
    if(video.audioTracks){
      for(let i=0;i<video.audioTracks.length;i++){
        const option=document.createElement("option");
        option.value=i;
        option.text=video.audioTracks[i].label || "Track "+(i+1);
        audioSelect.appendChild(option);
      }

      audioSelect.onchange=function(){
        for(let i=0;i<video.audioTracks.length;i++){
          video.audioTracks[i].enabled = (i==this.value);
        }
      };
    }

    // Subtitles
    for(let i=0;i<video.textTracks.length;i++){
      const option=document.createElement("option");
      option.value=i;
      option.text=video.textTracks[i].label || "Subtitle "+(i+1);
      subtitleSelect.appendChild(option);
    }

    subtitleSelect.onchange=function(){
      for(let i=0;i<video.textTracks.length;i++){
        video.textTracks[i].mode="disabled";
      }
      if(video.textTracks[this.value])
        video.textTracks[this.value].mode="showing";
    };
  }

  /* ================= KEYBOARD ================= */

  document.addEventListener("keydown", function(e){

    if(overlay.style.display!=="flex") return;

    if(e.key==="Escape" || e.key==="Backspace") closePlayer();
    if(e.key===" ") btnPlay.click();
    if(e.key==="ArrowLeft") video.currentTime -=10;
    if(e.key==="ArrowRight") video.currentTime +=10;
  });

});
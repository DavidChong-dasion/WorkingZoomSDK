import ZoomVideo, { VideoPlayer, VideoQuality } from "@zoom/videosdk";
import { generateSignature, useWorkAroundForSafari, } from "./utils";
import "./style.css";

const sdkKey = import.meta.env.VITE_SDK_KEY as string;
const sdkSecret = import.meta.env.VITE_SDK_SECRET as string;
const videoContainer = document.querySelector('video-player-container') as HTMLElement;
console.log(videoContainer); // Debugging line

const topic = "TestOne";
const role = 1;
const username = `User-${String(new Date().getTime()).slice(6)}`;
const client = ZoomVideo.createClient();
await client.init("en-US", "Global", { patchJsMedia: true });

let recordingInProgress = false;

const startCall = async () => {
  // generate a token to join the session - in production this will be done by your backend
  const token = generateSignature(topic, role, sdkKey, sdkSecret);
  // call the renderVideo function whenever a user joins or leaves
  client.on("peer-video-state-change", renderVideo);
  await client.join(topic, token, username);
  const mediaStream = client.getMediaStream();
  // @ts-expect-error https://stackoverflow.com/questions/7944460/detect-safari-browser/42189492#42189492
  window.safari ? await useWorkAroundForSafari(client) : await mediaStream.startAudio();
  await mediaStream.startVideo();
  // render the video of the current user
  await renderVideo({ action: 'Start', userId: client.getCurrentUserInfo().userId });

  await startRecording(
    cloudRecording.startCloudRecording()
  );
  recordingInProgress = true;

 };



const renderVideo = async (event: { action: "Start" | "Stop"; userId: number; }) => {
  const mediaStream = client.getMediaStream();
  if (event.action === 'Stop') {
    const element = await mediaStream.detachVideo(event.userId);
    Array.isArray(element) ? element.forEach((el) => el.remove()) : element.remove();
  } else {
    const userVideo = await mediaStream.attachVideo(event.userId, VideoQuality.Video_360P);
    videoContainer.appendChild(userVideo as VideoPlayer);
    renderMp4Video('Part1.mp4');
  }
};

const renderMp4Video = (mp4Src: string) => {
  // const mp4Video = document.createElement('video');
  // mp4Video.src = mp4Src;

  const existingMp4Video = document.getElementById('mp4Video');
  if (existingMp4Video) {
    existingMp4Video.remove();
  }

  // Create a new MP4 video element
  const mp4Video = document.createElement('video');
  mp4Video.id = 'mp4Video'; // Assign an ID to the video element
  mp4Video.src = mp4Src;

  mp4Video.addEventListener('click', () => {
    if (mp4Video.paused) {
      mp4Video.play();
    } else {
      mp4Video.pause();
    }
  });

  mp4Video.controls = false;  // Add controls if needed
  videoContainer.appendChild(mp4Video);
};

const leaveCall = async () => {
  const mediaStream = client.getMediaStream();
  for (const user of client.getAllUser()) {
    const element = await mediaStream.detachVideo(user.userId);
    Array.isArray(element) ? element.forEach((el) => el.remove()) : element.remove();
  }
  client.off("peer-video-state-change", renderVideo);
  await client.leave();

  if (recordingInProgress) {
    await stopRecording(); // Call your backend endpoint to stop recording
    recordingInProgress = false;
  }
}

// Backend functions (replace with your actual backend integration)
const startRecording = async () => {
    cloudRecording.startCloudRecording()
  // Implement a function to call your backend API to start recording
  // Example: fetch('/startRecording', { method: 'POST', ... })
};

const stopRecording = async () => {
  cloudRecording.stopCloudRecording()
  // Implement a function to call your backend API to stop recording
  // Example: fetch('/stopRecording', { method: 'POST', ... })
};


const toggleVideo = async () => {
  const mediaStream = client.getMediaStream();
  if (mediaStream.isCapturingVideo()) {
    await mediaStream.stopVideo();
    // update the canvas when the video is stopped
    await renderVideo({ action: 'Stop', userId: client.getCurrentUserInfo().userId });
  } else {
    await mediaStream.startVideo();
    // update the canvas when the video is started
    await renderVideo({ action: 'Start', userId: client.getCurrentUserInfo().userId });
  }
};

// UI Logic
const startBtn = document.querySelector("#start-btn") as HTMLButtonElement;
const stopBtn = document.querySelector("#stop-btn") as HTMLButtonElement;
const toggleVideoBtn = document.querySelector("#toggle-video-btn") as HTMLButtonElement;

startBtn.addEventListener("click", async () => {
  if (!sdkKey || !sdkSecret) {
    alert("Please enter SDK Key and SDK Secret in the .env file");
    return;
  }
  startBtn.innerHTML = "Connecting...";
  startBtn.disabled = true;
  await startCall();
  startBtn.innerHTML = "Connected";
  startBtn.style.display = "none";
  stopBtn.style.display = "block";
  toggleVideoBtn.style.display = "block";
});

stopBtn.addEventListener("click", async () => {
  toggleVideoBtn.style.display = "none";
  await leaveCall();
  stopBtn.style.display = "none";
  startBtn.style.display = "block";
  startBtn.innerHTML = "Join";
  startBtn.disabled = false;
});

toggleVideoBtn.addEventListener("click", async () => {
  await toggleVideo();
});
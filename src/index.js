import "./styles.css";
import * as posenet from "@tensorflow-models/posenet";

const VIDEO_WIDTH = 1280; //1280
const VIDEO_HEIGHT = 960; //720

let CANVAS_WIDTH = 1280;
let CANVAS_HEIGHT = 960;

let video_size = {
  w: null,
  h: null
};

const PIXELRATIO = window.devicePixelRatio;

const isSP = () => {
  if (
    (navigator.userAgent.indexOf("iPhone") > 0 &&
      navigator.userAgent.indexOf("iPad") == -1) ||
    navigator.userAgent.indexOf("iPod") > 0 ||
    navigator.userAgent.indexOf("Android") > 0
  ) {
    return true;
  }
  return false;
};

//ビデオ縦比
const getVideoRate = () => {
  return video.videoHeight / video.videoWidth;
};

//画面縦比
const getScreenRate = () => {
  return window.innerHeight / window.innerWidth;
};

let video_window_rate = 1;

// alert(PIXELRATIO);

document.getElementById("app").innerHTML =
  "<div class='frame'><video playsInline muted autoPlay id='video' ></video><canvas id='canvas'></canvas><canvas id='canvas2'></canvas><canvas id='canvas3'></canvas></div>";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const canvas2 = document.getElementById("canvas2");
const canvas3 = document.getElementById("canvas3");

const adjustCanvasSize = () => {
  video_window_rate = window.innerHeight / video_size.h;

  //ビデオを画面サイズに合わせる
  const size = {
    w: video_size.w * video_window_rate,
    h: window.innerHeight
  };
  const left = (size.w - window.innerWidth) / 2;
  const top = (size.h - window.innerHeight) / 2;
  console.log("size ", video_size, size.w, size.h, left, top);

  video.width = size.w;
  video.height = size.h;
  video.style.width = size.w + "px";
  video.style.height = size.h + "px";
  video.style.left = -left + "px";
  video.style.top = -top + "px";

  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.width = size.w + "px";
  canvas.style.height = size.h + "px";
  canvas.style.left = -left + "px";
  canvas.style.top = -top + "px";
};

const mediaVideoSize = () => {
  if (isSP()) {
    console.log("sp");
    return {
      facingMode: "user"
      // width: 640,
      // height: 480
    };
  } else {
    console.log("pc");
    return {
      facingMode: "user"
      // width: 480,
      // height: 640
    };
  }
};

const initVideo = async () => {
  return new Promise(resolved => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const webCamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: mediaVideoSize()
        })
        .then(stream => {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video_size = {
              w: video.videoWidth,
              h: video.videoHeight
            };
            video.play();
            resolved(true);
          };
        });
    }
  });
};

const initPosenet = async () => {
  const PosenetSetting = {
    flipHorizontal: true, //画像はウェブカメラから供給されているため
    imageScaleFactor: 0.4, //画像を一定の倍率に縮小する。 画像が大きすぎると遅くなります
    outputStride: 8, // down the GPU
    maxPoseDetections: 1,
    minPoseConfidence: 0.4,
    minPartConfidence: 0.8,
    nmsRadius: 10.0
  };

  const pnet = await posenet.load(0.75);

  const drawPosenet = async () => {
    let poses = [];
    poses = await pnet.estimateSinglePose(
      canvas2,
      PosenetSetting.imageScaleFactor,
      PosenetSetting.flipHorizontal,
      PosenetSetting.outputStride,
      PosenetSetting.maxPoseDetections,
      PosenetSetting.minPartConfidence,
      PosenetSetting.nmsRadius
    );

    //console.log("pose", poses);
    // ctxView(canvas2.getContext("2d"), video);

    const drawPoint = (ctx, y, x, r, color) => {
      //console.log("point", y, x, r, color);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawKeypoints = (ctx, keypoints) => {
      const scale = 1;
      for (let i = 0; i < 3; i++) {
        const keypoint = keypoints[i];
        if (keypoint.score < PosenetSetting.minPartConfidence) {
          continue;
        }
        const { y, x } = keypoint.position;
        drawPoint(ctx, y * scale, x * scale, 10, "#0ff");
      }
    };
    drawKeypoints(canvas3.getContext("2d"), poses.keypoints);
  };

  const drawCanvas = () => {
    ctxView(canvas.getContext("2d"), video);
    requestAnimationFrame(drawCanvas);
  };

  setInterval(() => {
    ctxViewTrimed();
    drawPosenet();
  }, 100);

  drawCanvas();
};

const ctxView = (ctx, video) => {
  //ビデオを画面サイズに合わせる
  const size = {
    w: video_size.w * video_window_rate,
    h: window.innerHeight
  };

  ctx.clearRect(0, 0, size.w, size.h);
  ctx.save(); // 現在の状態をスタックの最後に加えます。
  ctx.translate(0, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, -size.w, size.h); // カメラ情報を反映
  ctx.restore(); // スタックの最後の状態を抜き出し、その状態をコンテキストに復元します。
};

const ctxViewTrimed = () => {
  // console.log("ctxViewTrimed");

  video_window_rate = window.innerHeight / video_size.h;

  const window_video_scale = video_size.h / window.innerHeight;

  //ビデオを画面サイズに合わせる
  const size = {
    w: video_size.w * video_window_rate,
    h: window.innerHeight
  };

  const pick_left = (size.w - window.innerWidth) / 2;
  const pick_top = (size.h - window.innerHeight) / 2;

  const rects = {
    sx: pick_left,
    sy: pick_top,
    sw: size.w - pick_left * 2,
    sh: size.h - pick_top * 2,
    dx: -pick_left,
    dy: -pick_top,
    dw: window.innerWidth,
    dh: window.innerHeight
  };

  // console.log("size:", rects.sx, rects.sy, rects.dw, rects.dh);

  canvas2.width = window.innerWidth;
  canvas2.height = window.innerHeight;

  canvas3.width = window.innerWidth;
  canvas3.height = window.innerHeight;

  const ctx = canvas2.getContext("2d");
  ctx.clearRect(0, 0, rects.sw, rects.sh);
  ctx.save(); // 現在の状態をスタックの最後に加えます。
  ctx.translate(0, 0);
  // ctx.scale(-1, 1);
  ctx.drawImage(
    canvas,
    rects.sx,
    rects.sy,
    rects.sw,
    rects.sh,
    0,
    0,
    rects.dw,
    rects.dh
  ); // カメラ情報を反映
  ctx.restore(); // スタックの最後の状態を抜き出し、その状態をコンテキストに復元します。
};

Promise.all([initVideo()]).then(() => {
  adjustCanvasSize();
  initPosenet();
});

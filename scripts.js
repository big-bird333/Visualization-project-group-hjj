// 系统参数
const WIDTH = 700;
const HEIGHT = 700;
const DURATION = 6000; // 测试写快一点

// 异步加载 timelineData 并初始化
(async function () {
  // 从 JSON 文件加载数据
  const response = await fetch("./src/eventData.json");
  const timelineData = await response.json();
  [svg, clock] = drawClock(timelineData);

  // ======== 播放相关操作 ========
  const eventsContainer = d3.select("#events-container");

  // 指针
  const pointer = clock
    .append("path")
    .attr("class", "pointer")
    .attr("d", "M-7.5,-230 L0,-250 L7.5,-230 Z");

  // 设置指针的拖拽操作
  // 拖拽状态下只更新视觉指针
  let pendingProgress = null;

  // 节流操作，我发现不节流的话渲染 rotate 的时候非常卡顿
  function throttle(fn, delay) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  // 拖拽处理函数
  const throttledDragHandler = throttle((event) => {
    const [mx, my] = d3.pointer(event, svg.node());
    const dx = mx - WIDTH / 2;
    const dy = my - HEIGHT / 2;
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const t = angle / 360;

    pointer.attr("transform", `rotate(${angle})`);
    pendingProgress = t;
  }, 50); // 每 50ms 最多执行一次

  pointer.call(
    d3
      .drag()
      .on("start", () => {
        if (isPlaying) pause();
      })
      .on("drag", throttledDragHandler)
      .on("end", () => {
        if (pendingProgress !== null) {
          seekTo(pendingProgress);
          pendingProgress = null;
        }
      })
  );

  // 播放控制参数
  let isPlaying = false;
  let currentProgress = 0;
  let timer;

  const playIcon = d3.select(".lucide-step-forward");
  const pauseIcon = d3.select(".lucide-pause");
  pauseIcon.style("display", "none");

  // 根据 timelineData 注册阈值回调，只执行一次
  const thresholdCallbacks = timelineData.map((event) => ({
    threshold: event.time,
    executed: false,
    callback: () => {
      const eventDiv = eventsContainer
        .append("div")
        .attr("class", "timeline-event")
        .style("opacity", 0);
      eventDiv.append("h4").text(`${event.year}年：${event.title}`);
      eventDiv.append("p").text(event.description);
      eventDiv.transition().duration(500).style("opacity", 1);
    },
  }));
  console.log(thresholdCallbacks);

  // 重置所有已执行状态及清空展示
  function resetEvents() {
    eventsContainer.selectAll(".timeline-event").remove();
    thresholdCallbacks.forEach((item) => {
      item.executed = false;
    });
  }

  function startTimer() {
    const baseTime = Date.now() - currentProgress * DURATION;
    timer = d3.timer(() => {
      const elapsedReal = Date.now() - baseTime;
      currentProgress = elapsedReal / DURATION;

      thresholdCallbacks.forEach((item) => {
        if (!item.executed && currentProgress >= item.threshold) {
          item.executed = true;
          item.callback();
        }
      });

      if (currentProgress >= 1) {
        pointer.attr("transform", `rotate(360)`);
        timer.stop();
        isPlaying = false;
        pauseIcon.style("display", "none");
        playIcon.style("display", "inline");
        return;
      }

      updatePointer(currentProgress);
    });
  }

  function updatePointer(time) {
    pointer.attr("transform", `rotate(${time * 360})`);
  }

  // 跳转到某一个时间点，清空再执行
  function seekTo(time) {
    currentProgress = time;
    // 清空
    resetEvents();
    // 加载需要展示的东西
    thresholdCallbacks.forEach((cb) => {
      if (currentProgress > cb.threshold) {
        cb.callback();
        cb.executed = true;
      }
    });
    updatePointer(time);
  }

  // 播放
  function play() {
    isPlaying = true;
    playIcon.style("display", "none");
    pauseIcon.style("display", "inline");
    startTimer();
  }

  // 暂停
  function pause() {
    isPlaying = false;
    pauseIcon.style("display", "none");
    playIcon.style("display", "inline");
    if (timer) timer.stop();
  }

  function togglePlayPause() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function goNext() {
    const upcoming = thresholdCallbacks
      .filter((cb) => currentProgress < cb.threshold)
      .map((cb) => cb.threshold);
    if (!upcoming.length) return;
    pause();
    seekTo(upcoming[0]);
  }

  function goPrev() {
    const passed = thresholdCallbacks
      .filter((cb) => cb.executed)
      .map((cb) => cb.threshold)
      .filter((t) => t < currentProgress);
    console.log("passed", passed);
    if (!passed.length) return;
    pause();
    seekTo(passed[passed.length - 1]);
  }

  function resetAll() {
    pause();
    seekTo(0);
  }

  // 绑定按钮事件
  d3.select("#togglePlayPause").on("click", togglePlayPause);
  d3.select("#toggleNext").on("click", goNext);
  d3.select("#togglePrev").on("click", goPrev);
  d3.select("#toggleReplay").on("click", resetAll);
})();

// 坐标转换工具
function getPosition(angle, radius) {
  return {
    x: WIDTH / 2 + radius * Math.sin((angle * Math.PI) / 180),
    y: HEIGHT / 2 - radius * Math.cos((angle * Math.PI) / 180),
  };
}

// ======== 画钟 ========
function drawClock(timelineData) {
  const svg = d3
    .select("#timeline")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT);
  const clock = svg
    .append("g")
    .attr("transform", `translate(${WIDTH / 2},${HEIGHT / 2})`);
  clock
    .append("circle")
    .attr("class", "clock-face")
    .attr("r", 300)
    .attr("stroke-width", 4)
    .attr("fill", "none");
  clock
    .append("circle")
    .attr("class", "clock-face")
    .attr("r", 200)
    .attr("stroke-width", 2);

  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 * Math.PI) / 180;
    const startRadius = 280;
    const endRadius = 300;
    clock
      .append("line")
      .attr("x1", Math.sin(angle) * startRadius)
      .attr("y1", -Math.cos(angle) * startRadius)
      .attr("x2", Math.sin(angle) * endRadius)
      .attr("y2", -Math.cos(angle) * endRadius)
      .attr("stroke", "#781e1e")
      .attr("stroke-width", 2);
    if (i % 3 === 0) {
      const year = 1881 + Math.floor(i * 5.5);
      clock
        .append("text")
        .attr("class", "annotation-text")
        .attr("x", Math.sin(angle) * 260)
        .attr("y", -Math.cos(angle) * 260 + 5)
        .text(year)
        .attr("font-weight", "bold")
        .attr("fill", "#781e1e");
    }
  }
  const eventLayer = svg.append("g");

  timelineData.forEach((event) => {
    const angle = event.time * 360;
    const pos = getPosition(angle, 300);
    eventLayer
      .append("circle")
      .attr("class", "event-dot")
      .attr("cx", pos.x)
      .attr("cy", pos.y)
      .attr("r", 8)
      .attr("data-time", event.time);
  });

  return [svg, clock];
}

// 视频播放功能
function showVideo() {
  const container = document.getElementById("video-area");
  const video = document.getElementById("myVideo");
  container.style.display = "block";
  video.play();
}

function closeVideo() {
  const container = document.getElementById("video-area");
  const video = document.getElementById("myVideo");
  video.pause();
  video.currentTime = 0;
  container.style.display = "none";
}

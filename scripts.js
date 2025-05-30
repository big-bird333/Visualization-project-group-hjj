// 数据接口定义
const timelineData = [
  {
    time: 0,
    duration: 5,
    type: "event",
    title: "诞生",
    year: 1881,
    media: {
      type: "video",
      url: "video_test1.mp4",
    },
    //description: "绍兴周家诞生了一个将用文字撼动时代的婴儿"
  },
  {
    time: 0.15,
    duration: 8,
    type: "event",
    title: "南京求学",
    year: 1898,
    description: "入江南水师学堂，后转入矿务铁路学堂",
  },
  {
    time: 0.25,
    duration: 8,
    type: "event",
    title: "日本留学",
    year: 1902,
    description: "赴日本留学，入东京弘文学院",
  },
  {
    time: 0.35,
    duration: 8,
    type: "work",
    title: "狂人日记",
    year: 1918,
    media: {
      type: "image",
      url: "狂人日记.jpeg",
    },
    //description: "中国第一部现代白话文小说"
  },
  {
    time: 0.45,
    duration: 8,
    type: "work",
    title: "阿Q正传",
    year: 1921,
    media: {
      type: "image",
      url: "media/aq.jpg",
    },
    description: "鲁迅最著名的中篇小说",
  },
  {
    time: 0.55,
    duration: 10,
    type: "relation",
    title: "重要人物",
    persons: [
      { name: "许广平", relation: "伴侣" },
      { name: "瞿秋白", relation: "战友" },
      { name: "胡适", relation: "同仁" },
    ],
    description: "与重要人物的交往",
  },
  {
    time: 0.75,
    duration: 8,
    type: "event",
    title: "左联成立",
    year: 1930,
    description: "参与发起中国左翼作家联盟",
  },
  {
    time: 0.9,
    duration: 8,
    type: "event",
    title: "逝世",
    year: 1936,
    description: "在上海病逝，享年55岁",
  },
];

// 系统参数
const WIDTH = 700;
const HEIGHT = 700;
const DURATION = 300000; // 5分钟总时长
let isPlaying = false;
let currentProgress = 0;
let timer;

// 初始化可视化容器
const svg = d3
  .select("#timeline")
  .append("svg")
  .attr("width", WIDTH)
  .attr("height", HEIGHT);

// 添加背景层
const backgroundLayer = svg.append("g");

// 添加鲁迅圆形背景图
backgroundLayer
  .append("defs")
  .append("pattern")
  .attr("id", "innerCirclePattern")
  .attr("patternUnits", "objectBoundingBox")
  .attr("width", 1)
  .attr("height", 1)
  .append("image")
  .attr(
    "xlink:href",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Lu_Xun.jpg/800px-Lu_Xun.jpg"
  )
  .attr("width", 400)
  .attr("height", 400)
  .attr("x", 0)
  .attr("y", 0);

// 绘制时钟结构
const clock = svg
  .append("g")
  .attr("transform", `translate(${WIDTH / 2},${HEIGHT / 2})`);

// 绘制外层圆环
clock
  .append("circle")
  .attr("class", "clock-face")
  .attr("r", 300)
  .attr("stroke-width", 4)
  .attr("fill", "none");

// 绘制内层圆环（带鲁迅图片）
clock
  .append("circle")
  .attr("class", "clock-face")
  .attr("r", 200)
  .attr("stroke-width", 2)
  .attr("fill", "url(#innerCirclePattern)");

// 添加时间刻度
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

  // 添加年份标签
  if (i % 3 === 0) {
    const year = 1881 + Math.floor(i * 5.5);
    const labelRadius = 260;

    clock
      .append("text")
      .attr("class", "annotation-text")
      .attr("x", Math.sin(angle) * labelRadius)
      .attr("y", -Math.cos(angle) * labelRadius + 5)
      .text(year)
      .attr("font-weight", "bold")
      .attr("fill", "#781e1e");
  }
}

// 三角形指针
const pointer = clock
  .append("path")
  .attr("class", "pointer")
  .attr("d", "M-15,-220 L0,-260 L15,-220 Z") // 三角形路径
  .attr("transform", "rotate(0)");

// 事件标记容器
const eventLayer = svg.append("g");
const mediaLayer = svg.append("g");

// 添加初始事件点
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

// 时间轴控制器
function updateTimeline() {
  if (timer) timer.stop();

  const startTime = Date.now() - currentProgress * DURATION;

  timer = d3.timer(function () {
    const elapsed = Date.now() - startTime;
    currentProgress = elapsed / DURATION;

    if (currentProgress >= 1) {
      currentProgress = 1;
      isPlaying = false;
      updatePointer(360);
      d3.select("#playPause").text("播放");
      return true;
    }

    updatePointer(currentProgress * 360);

    // 事件触发逻辑
    timelineData.forEach((d) => {
      const triggerTime = d.time * DURATION;
      if (elapsed >= triggerTime && elapsed < triggerTime + d.duration * 1000) {
        handleEvent(d, elapsed - triggerTime);
      }
    });

    return !isPlaying;
  });
}

function updatePointer(angle) {
  pointer.attr("transform", `rotate(${angle})`);
}

// 播放控制函数
function togglePlayback() {
  isPlaying = !isPlaying;
  d3.select("#playPause").text(isPlaying ? "暂停" : "播放");
  if (isPlaying) {
    updateTimeline();
  } else {
    if (timer) timer.stop();
  }
}

// 事件处理系统
function handleEvent(event, elapsed) {
  switch (event.type) {
    case "event":
      if (event.media?.type === "video") {
        showVideo(event); // 视频类型事件
      } else {
        showEventAnnotation(event, elapsed); // 普通事件
      }
      break;
    case "work":
      showWorkAnnotation(event, elapsed);
      break;
    case "relation":
      showRelationAnnotation(event, elapsed);
      break;
  }
}
// 新增视频播放功能
let currentVideo = null;

function showVideo(event) {
  // 暂停时间轴
  isPlaying = false;
  if (timer) timer.stop();
  d3.select("#playPause").text("播放");

  // 显示视频容器
  const container = d3.select("#videoContainer");
  const video = document.getElementById("mainVideo");

  // 设置视频源
  video.src = event.media.url;
  video.muted = false; // 开启声音
  video.controls = true; // 显示控制条

  // 开始播放
  video.play().catch((error) => {
    console.error("视频播放失败:", error);
  });

  // 启动入场动画
  container.classed("active", true);

  // 监听播放结束
  video.onended = () => {
    closeVideo();
    // 自动继续时间轴
    if (currentProgress < 1) {
      isPlaying = true;
      updateTimeline();
      d3.select("#playPause").text("暂停");
    }
  };
}

// 事件标注显示
function showEventAnnotation(event, elapsed) {
  const angle = event.time * 360;
  const pos = getPosition(angle, 300);

  const annotation = mediaLayer
    .selectAll(`.event-${event.time}`)
    .data([event])
    .join((enter) =>
      enter
        .append("g")
        .attr("class", `event-annotation event-${event.time}`)
        .attr("transform", `translate(${pos.x},${pos.y})`)
    );

  annotation
    .selectAll("text")
    .data([event])
    .join("text")
    .attr("class", "annotation-text")
    .attr("y", -20)
    .attr("font-weight", "bold")
    .text(`${event.year}年：${event.title}`);

  annotation
    .selectAll("text.desc")
    .data([event])
    .join("text")
    .attr("class", "annotation-text desc")
    .attr("y", 5)
    .text(event.description);

  if (elapsed > event.duration * 1000) annotation.remove();
}

// 作品标注显示
function showWorkAnnotation(event, elapsed) {
  const angle = event.time * 360;
  const pos = getPosition(angle, 300);

  const annotation = mediaLayer
    .selectAll(`.work-${event.time}`)
    .data([event])
    .join((enter) =>
      enter
        .append("g")
        .attr("class", `work-annotation work-${event.time}`)
        .attr("transform", `translate(${pos.x},${pos.y})`)
    );

  // 作品图片
  annotation
    .append("rect")
    .attr("x", -80)
    .attr("y", -80)
    .attr("width", 160)
    .attr("height", 160)
    .attr("fill", "#f5f2e0")
    .attr("stroke", "#781e1e")
    .attr("stroke-width", 2)
    .attr("rx", 5);

  annotation
    .append("image")
    .attr(
      "xlink:href",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Lu_Xun%27s_Madman%27s_Diary.jpg/800px-Lu_Xun%27s_Madman%27s_Diary.jpg"
    )
    .attr("x", -75)
    .attr("y", -75)
    .attr("width", 150)
    .attr("height", 150);

  annotation
    .append("text")
    .attr("class", "annotation-text")
    .attr("y", 100)
    .attr("font-weight", "bold")
    .text(`${event.title} (${event.year})`);

  if (elapsed > event.duration * 1000) annotation.remove();
}

// 人物关系标注
function showRelationAnnotation(event, elapsed) {
  const angle = event.time * 360;
  const center = getPosition(angle, 200);

  const relationGroup = mediaLayer
    .selectAll(`.relation-${event.time}`)
    .data([event])
    .join((enter) =>
      enter
        .append("g")
        .attr("class", `relation-annotation relation-${event.time}`)
        .attr("transform", `translate(${center.x},${center.y})`)
    );

  // 中心点
  relationGroup.append("circle").attr("r", 10).attr("fill", "#9c2a2a");

  relationGroup
    .append("text")
    .attr("class", "annotation-text")
    .attr("y", -20)
    .attr("font-weight", "bold")
    .text("人物关系");

  // 绘制人物节点
  const persons = relationGroup
    .selectAll(".person")
    .data(event.persons)
    .join("g")
    .attr("class", "person")
    .attr("transform", (d, i) => {
      const angle = (i / event.persons.length) * Math.PI * 2;
      const radius = 100;
      return `translate(${Math.cos(angle) * radius},${
        Math.sin(angle) * radius
      })`;
    });

  persons.append("circle").attr("r", 8).attr("fill", "#f90");

  persons
    .append("text")
    .attr("class", "annotation-text")
    .attr("y", -15)
    .text((d) => d.name);

  persons
    .append("text")
    .attr("class", "annotation-text")
    .attr("y", 5)
    .attr("font-size", "14px")
    .text((d) => d.relation);

  if (elapsed > event.duration * 1000) relationGroup.remove();
}

// 坐标转换工具
function getPosition(angle, radius) {
  return {
    x: WIDTH / 2 + radius * Math.sin((angle * Math.PI) / 180),
    y: HEIGHT / 2 - radius * Math.cos((angle * Math.PI) / 180),
  };
}

// 初始化交互
pointer.on("click", togglePlayback);
d3.select("#playPause").on("click", togglePlayback);

d3.select("#reset").on("click", function () {
  currentProgress = 0;
  isPlaying = false;
  updatePointer(0);
  mediaLayer.selectAll("*").remove();
  d3.select("#playPause").text("播放");
});

d3.select("#skip").on("click", function () {
  currentProgress = 0.99;
  updatePointer(356);
  if (!isPlaying) togglePlayback();
});

// 初始显示第一个事件
setTimeout(() => {
  showEventAnnotation(timelineData[0], 0);
}, 500);

(() => {
    "use strict";

    const canvas = document.getElementById("space");
    const context = canvas.getContext("2d");
    const resetButton = document.getElementById("reset");
    const pointer = { x: 0, y: 0, downX: 0, downY: 0, dragging: null, hover: null };
    const stars = [];
    const services = [
        { name: "Emby", host: "media.dropped.lat", radius: 220, size: 5, hue: 198 },
        { name: "Seerr", host: "req.dropped.lat", radius: 275, size: 4.3, hue: 277 },
        { name: "Radarr", host: "radarr.dropped.lat", radius: 330, size: 3.8, hue: 43 },
        { name: "Sonarr", host: "sonarr.dropped.lat", radius: 375, size: 3.5, hue: 112 },
        { name: "Music", host: "music.dropped.lat", radius: 415, size: 3.1, hue: 330 },
        { name: "Help", email: "ChavezAngel@pm.me", radius: 455, size: 2.9, hue: 190 }
    ];
    let width = 0;
    let height = 0;
    let scale = 1;
    let center = { x: 0, y: 0 };
    let sceneCenter = { x: 0, y: 0 };
    let lastTime = 0;
    let focused = null;
    let cameraZoom = 1;

    function random(min, max) {
        return min + Math.random() * (max - min);
    }

    function makeStars() {
        stars.length = 0;
        services.forEach((service, i) => {
            const angle = (i / services.length) * Math.PI * 2 + .45;
            stars.push({
                ...service,
                angle,
                speed: 0.00012 + i * 0.000025,
                media: true,
                x: 0,
                y: 0,
                grabbed: false
            });
        });
        for (let i = 0; i < 8; i += 1) {
            const angle = (i / 13) * Math.PI * 2 + random(-0.12, 0.12);
            const radius = random(155, Math.min(width, height) * 0.38);
            stars.push({
                angle,
                radius,
                speed: random(0.00012, 0.0003) * (radius < 230 ? 1.4 : 1),
                size: random(1.4, 3.2),
                hue: random(32, 52),
                media: false,
                x: 0,
                y: 0,
                grabbed: false
            });
        }
    }

    function resize() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        center = { x: width * 0.59, y: height * 0.53 };
        sceneCenter = { ...center };
        if (!stars.length) makeStars();
    }

    function glowCircle(x, y, radius, color, blur) {
        context.save();
        context.shadowBlur = blur;
        context.shadowColor = color;
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }

    function drawBackground() {
        const background = context.createRadialGradient(sceneCenter.x, sceneCenter.y, 5, sceneCenter.x, sceneCenter.y, Math.max(width, height) * .75);
        background.addColorStop(0, "#171016");
        background.addColorStop(.25, "#0d0b12");
        background.addColorStop(1, "#020205");
        context.fillStyle = background;
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 170; i += 1) {
            const x = (i * 97.37) % width;
            const y = (i * 47.13) % height;
            const alpha = ((i * 17) % 10) / 35 + .08;
            glowCircle(x, y, i % 11 === 0 ? 1 : .45, `rgba(221, 219, 240, ${alpha})`, 3);
        }
    }

    function drawDisk(time) {
        context.save();
        context.translate(sceneCenter.x, sceneCenter.y);
        context.rotate(-.12);
        context.scale(1, .27);
        const disk = context.createRadialGradient(0, 0, 27, 0, 0, 250);
        disk.addColorStop(0, "rgba(255,239,185,.95)");
        disk.addColorStop(.12, "rgba(255,158,61,.9)");
        disk.addColorStop(.38, "rgba(208,57,22,.62)");
        disk.addColorStop(.66, "rgba(91,17,24,.25)");
        disk.addColorStop(1, "rgba(12,6,16,0)");
        context.fillStyle = disk;
        context.beginPath();
        context.arc(0, 0, 255, 0, Math.PI * 2);
        context.fill();
        for (let i = 0; i < 25; i += 1) {
            context.rotate(.02 + Math.sin(time / 1600 + i) * .003);
            context.strokeStyle = `rgba(255, ${120 + i * 4}, ${40 + i * 4}, ${.2 - i * .005})`;
            context.lineWidth = 2 + (i % 3);
            context.beginPath();
            context.arc(0, 0, 57 + i * 6, .2, 2.55);
            context.stroke();
        }
        context.restore();
    }

    function drawBlackHole() {
        glowCircle(sceneCenter.x, sceneCenter.y, 43, "rgba(255, 116, 29, .85)", 36);
        const shadow = context.createRadialGradient(
            sceneCenter.x - 15, sceneCenter.y - 18, 1,
            sceneCenter.x, sceneCenter.y, 58
        );
        shadow.addColorStop(0, "#08060a");
        shadow.addColorStop(.72, "#010104");
        shadow.addColorStop(1, "rgba(1, 1, 4, .08)");
        context.fillStyle = shadow;
        context.beginPath();
        context.arc(sceneCenter.x, sceneCenter.y, 44, 0, Math.PI * 2);
        context.fill();
        if (!pointer.hover && hitBlackHole(pointer.x, pointer.y)) {
            context.fillStyle = "#fff1cf";
            context.font = "600 10px Segoe UI, sans-serif";
            context.fillText("HOME", sceneCenter.x + 60, sceneCenter.y - 48);
        }
        context.strokeStyle = "rgba(255, 241, 192, .92)";
        context.lineWidth = 2.5;
        context.beginPath();
        context.arc(sceneCenter.x, sceneCenter.y, 50, 0, Math.PI * 2);
        context.stroke();
        const highlight = context.createRadialGradient(
            sceneCenter.x - 30, sceneCenter.y - 24, 0,
            sceneCenter.x - 30, sceneCenter.y - 24, 90
        );
        highlight.addColorStop(0, "rgba(255, 244, 200, .32)");
        highlight.addColorStop(1, "rgba(255, 130, 34, 0)");
        context.fillStyle = highlight;
        context.beginPath();
        context.arc(sceneCenter.x, sceneCenter.y, 68, 0, Math.PI * 2);
        context.fill();
    }

    function drawStars(time) {
        stars.forEach((star) => {
            if (!star.grabbed) star.angle += star.speed * (time - lastTime);
            const orbitScale = scale * cameraZoom;
            star.x = sceneCenter.x + Math.cos(star.angle) * star.radius * orbitScale;
            star.y = sceneCenter.y + Math.sin(star.angle) * star.radius * orbitScale * .63;
            if (star.media) {
                glowCircle(star.x, star.y, star.size * 1.8, `hsla(${star.hue}, 100%, 76%, .78)`, 18);
                context.strokeStyle = "rgba(155, 220, 255, .65)";
                context.lineWidth = 1;
                context.beginPath();
                context.arc(star.x, star.y, star.size * 3.5, 0, Math.PI * 2);
                context.stroke();
            } else {
                glowCircle(star.x, star.y, star.size, `hsla(${star.hue}, 100%, 82%, .95)`, 12);
            }
            context.fillStyle = "#fff8e8";
            context.beginPath();
            context.arc(star.x, star.y, star.size * .52, 0, Math.PI * 2);
            context.fill();
            if (star.media && (focused === star || pointer.hover === star || scale * cameraZoom > 1.08)) {
                context.fillStyle = "#d9e9f5";
                context.font = "600 10px Segoe UI, sans-serif";
                context.letterSpacing = "1px";
                context.fillText(star.name, star.x + star.size + 10, star.y - star.size - 6);
            }
        });
    }

    function render(time) {
        if (focused) {
            const targetX = center.x + Math.cos(focused.angle) * focused.radius * scale * cameraZoom;
            const targetY = center.y + Math.sin(focused.angle) * focused.radius * scale * cameraZoom * .63;
            sceneCenter.x += (center.x - targetX - (sceneCenter.x - center.x)) * .12;
            sceneCenter.y += (center.y - targetY - (sceneCenter.y - center.y)) * .12;
        } else {
            sceneCenter.x += (center.x - sceneCenter.x) * .08;
            sceneCenter.y += (center.y - sceneCenter.y) * .08;
        }
        drawBackground();
        drawDisk(time);
        drawStars(time);
        drawBlackHole();
        if (focused) {
            cameraZoom += (1.6 - cameraZoom) * .035;
        } else {
            cameraZoom += (1 - cameraZoom) * .06;
        }
        lastTime = time;
        requestAnimationFrame(render);
    }

    function findStar(x, y) {
        return stars.find((star) => Math.hypot(star.x - x, star.y - y) < Math.max(20, star.size * 3));
    }

    function hitBlackHole(x, y) {
        return Math.hypot(sceneCenter.x - x, sceneCenter.y - y) < 65;
    }

    function openService(star) {
        if (star.email) {
            window.location.href = `mailto:${star.email}?subject=ATG%20help`;
            return;
        }
        window.open(`//${star.host}`, "_blank", "noopener,noreferrer");
    }

    canvas.addEventListener("pointerdown", (event) => {
        const star = findStar(event.clientX, event.clientY);
        if (star) {
            pointer.downX = event.clientX;
            pointer.downY = event.clientY;
            pointer.dragging = star;
            star.grabbed = true;
            canvas.setPointerCapture(event.pointerId);
        } else if (hitBlackHole(event.clientX, event.clientY)) {
            focused = null;
            cameraZoom = 1;
            makeStars();
        }
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!pointer.dragging) return;
        const dx = event.clientX - center.x;
        const dy = event.clientY - center.y;
        pointer.dragging.angle = Math.atan2(dy / .63, dx);
        pointer.dragging.radius = Math.max(72, Math.min(470, Math.hypot(dx, dy / .63) / (scale * cameraZoom)));
    });

    canvas.addEventListener("pointerup", () => {
        if (pointer.dragging) pointer.dragging.grabbed = false;
        pointer.dragging = null;
    });

    canvas.addEventListener("click", (event) => {
        const star = findStar(event.clientX, event.clientY);
        const distance = Math.hypot(event.clientX - pointer.downX, event.clientY - pointer.downY);
        if (star && star.media && distance < 10) {
            focused = star;
            openService(star);
        }
    });

    canvas.addEventListener("pointermove", (event) => {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        if (!pointer.dragging) {
            pointer.hover = findStar(event.clientX, event.clientY);
            canvas.style.cursor = pointer.hover || hitBlackHole(event.clientX, event.clientY) ? "pointer" : "grab";
        }
    });

    canvas.addEventListener("pointerleave", () => {
        pointer.hover = null;
        pointer.x = -1000;
        pointer.y = -1000;
    });

    canvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        scale = Math.max(.72, Math.min(1.35, scale - event.deltaY * .0008));
    }, { passive: false });

    resetButton.addEventListener("click", makeStars);
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(render);
})();

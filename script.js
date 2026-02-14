document.addEventListener('DOMContentLoaded', () => {
    // ==================== KEYBOARD DETECTION ====================
    const keys = document.querySelectorAll('.key');
    const keyDisplay = document.getElementById('key-display');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');

    // Create key map for quick lookup
    const keyMap = new Map();
    keys.forEach(key => {
        const code = key.getAttribute('data-code');
        if (code) {
            keyMap.set(code, key);
        }
    });

    // Handle keydown - prevent ALL default actions
    document.addEventListener('keydown', (e) => {
        e.preventDefault(); // Block all default behaviors
        e.stopPropagation();

        let code = e.code;

        // 修复：某些键盘的右Shift返回空code（location可能为0或2，都要支持）
        if (code === '' && e.keyCode === 16) {
            code = 'ShiftRight';
        }

        const keyElement = keyMap.get(code);

        // 调试：输出键码信息
        console.log(`Key pressed: code="${code}", key="${e.key}", keyCode=${e.keyCode}, location=${e.location}`);

        // Update display
        keyDisplay.textContent = `${code} (${e.key})`;

        // Visual feedback
        if (keyElement) {
            keyElement.classList.add('active');
        } else {
            console.warn(`⚠️ Key not found in map: ${code}`);
        }

        // Add to history
        addToHistory(code, e.key);
    });

    // Handle keyup - 保持高亮，不移除active
    document.addEventListener('keyup', (e) => {
        // 按键弹起时不移除高亮，保持标记状态
        // 用户可以通过"清除"按钮清除所有高亮
    });

    // Clear history and key highlights
    clearHistoryBtn.addEventListener('click', () => {
        historyList.innerHTML = '';
        keyDisplay.textContent = '就绪';

        // 清除所有按键高亮
        keys.forEach(key => key.classList.remove('active'));
    });

    function addToHistory(code, key) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = key === ' ' ? 'Space' : (key.length === 1 ? key : code);
        item.title = `Code: ${code}, Key: ${key}`;

        historyList.insertBefore(item, historyList.firstChild);

        // Limit history to 50 items
        while (historyList.children.length > 50) {
            historyList.removeChild(historyList.lastChild);
        }

        // Auto scroll to show new item
        historyList.scrollLeft = 0;
    }

    // ==================== MOUSE DETECTION ====================
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnWheel = document.getElementById('btn-wheel');
    const btnBack = document.getElementById('btn-back');
    const btnFwd = document.getElementById('btn-fwd');
    const mouseBtnInfo = document.getElementById('mouse-btn-info');
    const mouseScrollInfo = document.getElementById('mouse-scroll-info');
    const mousePosInfo = document.getElementById('mouse-pos-info');
    const dblclickArea = document.getElementById('dblclick-area');

    let scrollTotal = 0;
    const buttonNames = {
        0: '左键',
        1: '中键',
        2: '右键',
        3: '后退',
        4: '前进',
        5: '按键5',
        6: '按键6',
        7: '按键7'
    };

    // Prevent context menu globally
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });

    // Mouse button down
    document.addEventListener('mousedown', (e) => {
        const btn = e.button;

        // Activate visual elements
        if (btn === 0) btnLeft?.classList.add('active');
        if (btn === 1) btnWheel?.classList.add('active');
        if (btn === 2) btnRight?.classList.add('active');
        if (btn === 3) btnBack?.classList.add('active');
        if (btn === 4) btnFwd?.classList.add('active');

        // Update info
        const btnName = buttonNames[btn] || `未知(${btn})`;
        mouseBtnInfo.textContent = btnName;
    });

    // Mouse button up
    document.addEventListener('mouseup', (e) => {
        const btn = e.button;

        if (btn === 0) btnLeft?.classList.remove('active');
        if (btn === 1) btnWheel?.classList.remove('active');
        if (btn === 2) btnRight?.classList.remove('active');
        if (btn === 3) btnBack?.classList.remove('active');
        if (btn === 4) btnFwd?.classList.remove('active');
    });

    // Mouse wheel
    document.addEventListener('wheel', (e) => {
        scrollTotal += Math.sign(e.deltaY);
        const direction = e.deltaY > 0 ? '↓' : '↑';
        mouseScrollInfo.textContent = `${scrollTotal} ${direction}`;

        // Visual feedback
        btnWheel?.classList.add('active');
        setTimeout(() => btnWheel?.classList.remove('active'), 100);
    }, { passive: true });

    // Mouse position (track within window)
    document.addEventListener('mousemove', (e) => {
        mousePosInfo.textContent = `${e.clientX}, ${e.clientY}`;
    });

    // Double click test
    dblclickArea.addEventListener('dblclick', () => {
        dblclickArea.classList.add('active');
        setTimeout(() => dblclickArea.classList.remove('active'), 500);
    });

    // ==================== MICROPHONE DETECTION ====================
    const micSelect = document.getElementById('mic-select');
    const micStartBtn = document.getElementById('mic-start-btn');
    const micCanvas = document.getElementById('mic-canvas');
    const levelFill = document.getElementById('level-fill');
    const levelText = document.getElementById('level-text');

    const canvasCtx = micCanvas.getContext('2d');
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationId = null;
    let currentStream = null;

    // Enumerate audio input devices
    async function enumerateDevices() {
        try {
            // 检查是否支持
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                throw new Error('不支持媒体设备API');
            }

            // 先请求一次权限，这样才能获取设备标签
            let permissionGranted = false;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // 立即停止
                permissionGranted = true;
            } catch (err) {
                console.warn('麦克风权限请求失败:', err);
            }

            // 枚举设备
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');

            micSelect.innerHTML = '<option value="">选择麦克风...</option>';

            if (audioInputs.length === 0) {
                micSelect.innerHTML = '<option value="">未找到麦克风设备</option>';
                micStartBtn.disabled = true;
                return;
            }

            audioInputs.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                // 如果有权限，显示真实标签；否则显示通用名称
                option.textContent = device.label || `麦克风 ${index + 1}`;
                micSelect.appendChild(option);
            });

            // 自动选择第一个设备
            micSelect.selectedIndex = 1; // 选择第一个设备（索引0是"选择麦克风..."）
            micStartBtn.disabled = false;
            console.log(`✅ 找到 ${audioInputs.length} 个麦克风设备`);

            // 自动启动麦克风
            const firstDeviceId = audioInputs[0].deviceId;
            try {
                await startMicrophone(firstDeviceId);
                micStartBtn.textContent = '停止';
                micStartBtn.style.background = '#ff4444';
                console.log('✅ 麦克风已自动启动');
            } catch (err) {
                console.error('自动启动麦克风失败:', err);
                // 不弹出alert，静默失败
            }

        } catch (err) {
            console.error('获取设备失败:', err);

            // 检查是否是file://协议
            if (window.location.protocol === 'file:') {
                micSelect.innerHTML = '<option value="">⚠️ file://协议不支持麦克风，请部署到HTTPS服务器</option>';
            } else {
                micSelect.innerHTML = `<option value="">❌ 设备访问失败: ${err.message}</option>`;
            }
            micStartBtn.disabled = true;
        }
    }

    // Enable start button when device selected
    micSelect.addEventListener('change', () => {
        micStartBtn.disabled = !micSelect.value;
    });

    // Start/Stop microphone
    micStartBtn.addEventListener('click', async () => {
        if (animationId) {
            // Stop
            stopMicrophone();
            micStartBtn.textContent = '开始';
            micStartBtn.style.background = '';
        } else {
            // Start
            const deviceId = micSelect.value;
            if (!deviceId) return;

            try {
                await startMicrophone(deviceId);
                micStartBtn.textContent = '停止';
                micStartBtn.style.background = '#ff4444';
            } catch (err) {
                console.error('启动麦克风失败:', err);
                let errorMsg = '无法启动麦克风';

                if (err.name === 'NotAllowedError') {
                    errorMsg = '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问';
                } else if (err.name === 'NotFoundError') {
                    errorMsg = '未找到指定的麦克风设备';
                } else if (err.name === 'NotReadableError') {
                    errorMsg = '麦克风被其他应用占用';
                } else if (window.location.protocol === 'file:') {
                    errorMsg = 'file://协议不支持麦克风，请部署到HTTPS服务器（如GitHub Pages）';
                }

                alert(`❌ ${errorMsg}\n\n错误详情: ${err.message}`);
            }
        }
    });

    async function startMicrophone(deviceId) {
        // Get audio stream
        const constraints = {
            audio: {
                deviceId: deviceId ? { exact: deviceId } : undefined,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);

        // Setup audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(currentStream);

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        microphone.connect(analyser);

        // Start visualization
        visualize();
    }

    function stopMicrophone() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }

        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        // Clear canvas
        canvasCtx.clearRect(0, 0, micCanvas.width, micCanvas.height);
        levelFill.style.width = '0%';
        levelText.textContent = '0%';
    }

    function visualize() {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDomainArray = new Uint8Array(bufferLength);

        const WIDTH = micCanvas.width;
        const HEIGHT = micCanvas.height;

        function draw() {
            animationId = requestAnimationFrame(draw);

            // Get frequency and time domain data
            analyser.getByteFrequencyData(dataArray);
            analyser.getByteTimeDomainData(timeDomainArray);

            // Calculate volume (RMS)
            let sum = 0;
            for (let i = 0; i < timeDomainArray.length; i++) {
                const normalized = (timeDomainArray[i] - 128) / 128;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / timeDomainArray.length);
            const volume = Math.min(100, Math.round(rms * 200));

            // Update level bar
            levelFill.style.width = `${volume}%`;
            levelText.textContent = `${volume}%`;

            // Clear canvas
            canvasCtx.fillStyle = '#000';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

            // Draw waveform
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#00e5ff';
            canvasCtx.beginPath();

            const sliceWidth = WIDTH / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = timeDomainArray[i] / 128.0;
                const y = (v * HEIGHT) / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(WIDTH, HEIGHT / 2);
            canvasCtx.stroke();

            // Draw frequency bars
            const barWidth = (WIDTH / bufferLength) * 2.5;
            const usefulBins = Math.floor(bufferLength / 4); // Show only lower frequencies

            canvasCtx.fillStyle = 'rgba(0, 229, 255, 0.5)';
            for (let i = 0; i < usefulBins; i++) {
                const barHeight = (dataArray[i] / 255) * HEIGHT * 0.8;
                const x = i * barWidth;
                const y = HEIGHT - barHeight;
                canvasCtx.fillRect(x, y, barWidth - 1, barHeight);
            }
        }

        draw();
    }

    // Initialize device list
    enumerateDevices();

    // Re-enumerate when devices change
    navigator.mediaDevices.addEventListener('devicechange', () => {
        enumerateDevices();
    });
});

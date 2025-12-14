import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- 1. Firebase 配置 (请确认这些信息正确) ---
const firebaseConfig = {
  apiKey: "AIzaSyBNrV_pjFPSkJJgJENKS521WR0MZQed1co",
  authDomain: "christmas-tree-ffa47.firebaseapp.com",
  databaseURL: "https://christmas-tree-ffa47-default-rtdb.firebaseio.com",
  projectId: "christmas-tree-ffa47",
  storageBucket: "christmas-tree-ffa47.firebasestorage.app",
  messagingSenderId: "887565257758",
  appId: "1:887565257758:web:088b675411967246a5320f",
  measurementId: "G-SN6V7GGV8V"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================
// 2. 角色数据配置区 (想加角色就在这里复制一行)
// ============================================
const characters = [
    { 
        id: 'santa', 
        name: "圣诞老人", 
        text: "Ho Ho Ho... 孩子，愿你的冬天温暖如春，明年好运连连！", 
        audio: "assets/santa.mp3", // 如果没有文件，会静音
        icon: "fa-sleigh"         // FontAwesome 图标
    },
    { 
        id: 'deer', 
        name: "鲁道夫", 
        text: "别怕黑夜，因为你的心里有光。我会为你照亮前行的路。", 
        audio: "assets/deer.mp3",
        icon: "fa-horse-head"
    },
    { 
        id: 'snowman', 
        name: "雪人先生", 
        text: "慢慢来，美好的事情都在路上。给我一个大大的拥抱吧！", 
        audio: "assets/snow.mp3",
        icon: "fa-snowman"
    },
    // 👇 示例：你想加新角色，就复制下面这段，改改内容即可
    // { 
    //     id: 'gingerbread', 
    //     name: "姜饼人", 
    //     text: "生活要像我一样甜！跑快点，把烦恼甩在身后！", 
    //     audio: "",
    //     icon: "fa-cookie-bite" 
    // }
];

// 用户装饰类型
const ornamentTypes = [
    { icon: 'fa-star', color: '#FFD700' },
    { icon: 'fa-star', color: '#E0E0E0' },
    { icon: 'fa-heart', color: '#e91e63' },
    { icon: 'fa-gift', color: '#ff6b6b' },
    { icon: 'fa-bell', color: '#f39c12' }
];

const MAX_USER_ORNAMENTS = 35; // 树大了，可以挂多点
let allUserWishes = [];
let occupiedPositions = [];

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 雪花 ---
    function createSnowflakes() {
        const snowCount = 60;
        for (let i = 0; i < snowCount; i++) {
            const snow = document.createElement('div');
            snow.className = 'snowflake';
            const size = Math.random() * 3 + 2; 
            snow.style.width = `${size}px`; snow.style.height = `${size}px`;
            snow.style.left = `${Math.random() * 100}vw`;
            snow.style.animationDuration = `${Math.random() * 10 + 5}s`;
            snow.style.animationDelay = `${Math.random() * 5}s`;
            document.body.appendChild(snow);
        }
    }
    createSnowflakes();

    // --- 开场打字机 ---
    const introText = "在这个温暖的冬夜，愿所有美好如期而至...";
    const introElement = document.getElementById('intro-text');
    const startBtn = document.getElementById('start-btn');
    
    typeWriter(introElement, introText, 200, () => {
        startBtn.style.opacity = '1';
    });

    // --- 启动逻辑 ---
    const overlay = document.getElementById('start-overlay');
    const bgm = document.getElementById('bgm');

    startBtn.addEventListener('click', () => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 800);
        
        // 播放背景音乐 (循环已在HTML loop属性中设置)
        if(bgm) { 
            bgm.volume = 0.3; // 背景音稍微小一点
            bgm.play().catch((e) => console.log("需交互播放")); 
        }
        
        initCharacterBubbles();
        listenToWishes();
    });

    // --- 角色泡泡生成逻辑 (自动排版) ---
    function initCharacterBubbles() {
        const container = document.getElementById('character-bubbles-layer');
        // 根据角色数量动态计算位置，左右交替
        characters.forEach((char, index) => {
            const bubble = document.createElement('div');
            bubble.className = 'char-bubble';
            bubble.innerText = char.name;
            
            // 简单的左右交替算法
            // 奇数在左(10%-20%)，偶数在右(70%-80%)
            // 高度均匀分布 (从 30% 到 70%)
            const isLeft = index % 2 === 0;
            const leftPos = isLeft ? (10 + Math.random() * 10) : (70 + Math.random() * 10);
            const topStep = 40 / characters.length; 
            const topPos = 30 + (index * topStep) + (Math.random() * 5);

            bubble.style.left = `${leftPos}%`;
            bubble.style.top = `${topPos}%`;
            bubble.style.animationDelay = `${index * 0.5}s`; // 错开浮动时间

            bubble.addEventListener('click', () => {
                showCharacterModal(char, bubble);
            });
            container.appendChild(bubble);
        });
    }

    // --- 展示角色祝福 (精美弹窗) ---
    const viewModal = document.getElementById('view-modal');
    const modalText = document.getElementById('modal-text');
    const modalAuthor = document.getElementById('modal-author');
    const modalIcon = document.getElementById('modal-icon');
    const charVoice = document.getElementById('char-voice');
    
    function showCharacterModal(char, bubbleElement) {
        modalAuthor.innerText = char.name;
        // 切换图标
        modalIcon.className = `fas ${char.icon || 'fa-gift'}`;
        
        viewModal.style.display = 'flex';
        
        // 播放语音
        if(charVoice && char.audio) {
            charVoice.src = char.audio; 
            charVoice.play().catch(()=>{});
        }

        // 打字机播放祝福
        typeWriter(modalText, char.text, 100, () => {});

        // 绑定一次性关闭
        const closeHandler = () => {
            viewModal.style.display = 'none';
            if(charVoice) charVoice.pause(); // 关闭弹窗停止语音
            flyStarToTree(bubbleElement, char);
            viewModal.querySelector('.close-btn').removeEventListener('click', closeHandler);
        };
        viewModal.querySelector('.close-btn').addEventListener('click', closeHandler);
    }

    // --- 挂饰创建 (针对 PNG 树的三角形算法) ---
    function createOrnament(data, category) {
        const ornament = document.createElement('div');
        const layer = document.getElementById('ornaments-layer');
        const seed = category === 'role' ? stringToSeed(data.id) : data.timestamp;

        let iconHtml = '';
        if (category === 'role') {
            ornament.className = 'ornament role-star';
            iconHtml = '<i class="fas fa-star"></i>';
        } else {
            const typeIndex = Math.floor(seededRandom(seed) * ornamentTypes.length);
            const type = ornamentTypes[typeIndex];
            ornament.className = `ornament user-item user-wrapper`;
            iconHtml = `<i class="fas ${type.icon}" style="color:${type.color}"></i>`;
        }
        ornament.innerHTML = iconHtml;

        // 获取坐标 (使用适配 PNG 的参数)
        let pos = getSafePosition(category === 'role', seed);
        ornament.style.top = `${pos.y}%`;
        ornament.style.left = `${pos.x}%`;
        occupiedPositions.push(pos);

        // 点击事件
        ornament.addEventListener('click', (e) => {
            e.stopPropagation();
            modalAuthor.innerText = category === 'role' ? data.name : `👤 ${data.name}`;
            modalIcon.className = category === 'role' ? `fas ${data.icon || 'fa-star'}` : 'fas fa-user-circle';
            modalText.innerText = data.text;
            viewModal.style.display = 'flex';
            
            const simpleClose = () => {
                viewModal.style.display = 'none';
                viewModal.querySelector('.close-btn').removeEventListener('click', simpleClose);
            };
            viewModal.querySelector('.close-btn').addEventListener('click', simpleClose);
        });

        layer.appendChild(ornament);
    }

    // --- 核心算法：针对这棵水彩树的形状 ---
    function getSafePosition(isRole, seed) {
        let maxAttempts = 20; 
        let safeDistance = 6; // 稍微密集一点没关系
        
        for (let i = 0; i < maxAttempts; i++) {
            let currentSeed = seed + i * 100; 
            let r1 = seededRandom(currentSeed);
            let r2 = seededRandom(currentSeed + 1);
            
            // 调整 Y 轴范围：针对这棵树，绿色部分大概从 15% 到 85%
            let y = r1 * 70 + 15; // 15% ~ 85%
            
            // 如果是角色星星，尽量往上放 (15% ~ 45%)
            if(isRole) y = r1 * 30 + 15; 

            // 调整 X 轴宽度 (Spread)
            // 这棵树上面窄，下面宽，典型的三角形
            // 系数 0.7 是根据图片胖瘦估算的
            let spread = (y - 5) * 0.7; 
            // 确保不会超出 90% 宽度
            if(spread > 90) spread = 90;

            let x = 50 + (r2 - 0.5) * spread;

            // 碰撞检测
            let collision = false;
            for (let p of occupiedPositions) {
                let dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                if (dist < safeDistance) { collision = true; break; }
            }
            if (!collision) return { x, y };
        }
        
        // 兜底
        let finalY = seededRandom(seed+9) * 60 + 20;
        return { x: 50, y: finalY };
    }

    // --- 工具函数 ---
    function typeWriter(element, text, speed, callback) {
        let i = 0; element.innerHTML = "";
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i); i++;
                setTimeout(type, speed);
            } else if (callback) callback();
        }
        type();
    }
    function flyStarToTree(startElement, charData) {
        const rect = startElement.getBoundingClientRect();
        const flyStar = document.createElement('div');
        flyStar.className = 'flying-star';
        flyStar.innerHTML = '<i class="fas fa-star"></i>';
        flyStar.style.left = rect.left + 'px'; flyStar.style.top = rect.top + 'px';
        document.body.appendChild(flyStar);
        startElement.style.opacity = '0';
        const treeRect = document.querySelector('.tree-wrapper').getBoundingClientRect();
        const targetX = treeRect.left + treeRect.width / 2;
        const targetY = treeRect.top + treeRect.height / 3;
        requestAnimationFrame(() => {
            flyStar.style.transform = `translate(${targetX - rect.left}px, ${targetY - rect.top}px) scale(1.5)`;
            flyStar.style.opacity = '0'; 
        });
        setTimeout(() => {
            flyStar.remove(); startElement.remove(); 
            createOrnament(charData, 'role'); 
        }, 1000);
    }
    function seededRandom(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }
    function stringToSeed(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
        return hash;
    }

    // --- Firebase 监听 & 提交 ---
    function listenToWishes() {
        const wishesRef = ref(db, 'wishes');
        onValue(wishesRef, (snapshot) => {
            const data = snapshot.val();
            document.querySelectorAll('.user-wrapper').forEach(el => el.remove());
            occupiedPositions = [];
            allUserWishes = [];
            if (data) {
                allUserWishes = Object.values(data);
                const recentWishes = allUserWishes.slice(-MAX_USER_ORNAMENTS);
                recentWishes.forEach(wish => createOrnament(wish, 'user'));
            }
        });
    }
    const submitBtn = document.getElementById('submit-wish');
    const writeModal = document.getElementById('write-modal');
    submitBtn.onclick = () => {
        const name = document.getElementById('user-name').value.trim();
        const text = document.getElementById('user-wish').value.trim();
        if(name && text) {
            push(ref(db, 'wishes'), { name, text, timestamp: Date.now() })
                .then(() => {
                    showToast("✨ 祝福已挂上树梢！"); writeModal.style.display = 'none';
                    document.getElementById('user-name').value = ''; document.getElementById('user-wish').value = '';
                }).catch(err => showToast("失败: " + err.message));
        } else showToast("请完整填写哦~");
    };
    function showToast(msg) {
        const toast = document.getElementById('custom-toast'); toast.innerText = msg;
        toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    // 按钮绑定
    document.getElementById('add-wish-btn').onclick = () => writeModal.style.display = 'flex';
    document.getElementById('top-star-container').addEventListener('click', () => {
        const list = document.getElementById('wishes-list'); list.innerHTML = '';
        characters.forEach(c => {
            const li = document.createElement('li'); li.style.color = "#c0392b";
            li.innerHTML = `<strong>🎅 ${c.name}</strong>: ${c.text}`; list.appendChild(li);
        });
        allUserWishes.forEach(u => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>👤 ${u.name}</strong>: ${u.text}`; list.appendChild(li);
        });
        document.getElementById('all-wishes-modal').style.display = 'flex';
    });
    // 关闭逻辑
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = (e) => {
           e.target.closest('.modal').style.display = 'none';
           if(charVoice) charVoice.pause();
        }
    });
});
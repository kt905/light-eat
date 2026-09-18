/* ============ DATA LAYER ============ */
// 食物数据（来源：中国食物成分表第6版、国家卫健委《成人高尿酸血症与痛风食养指南（2024）》、USDA FoodData Central）
const FOODS = [
  // ── 主食类（谷薯） ──
  {name:'米饭（煮）', category:'主食', kcal:116, protein:2.6, fat:0.3, carbs:25.9, k:30, na:2, p:62, purine:11},
  {name:'馒头', category:'主食', kcal:223, protein:7.0, fat:1.1, carbs:47.0, k:138, na:165, p:107, purine:24},
  {name:'面条（煮）', category:'主食', kcal:110, protein:3.4, fat:0.4, carbs:24.3, k:30, na:20, p:58, purine:11},
  {name:'燕麦片', category:'主食', kcal:377, protein:15.0, fat:6.7, carbs:61.6, k:214, na:3, p:293, purine:59},
  {name:'全麦面包', category:'主食', kcal:250, protein:9.0, fat:3.5, carbs:46.0, k:166, na:400, p:120, purine:30},
  {name:'红薯', category:'主食', kcal:99, protein:1.1, fat:0.2, carbs:23.1, k:130, na:29, p:39, purine:6},
  {name:'玉米（鲜）', category:'主食', kcal:112, protein:4.0, fat:1.2, carbs:22.8, k:238, na:1, p:117, purine:9},
  {name:'小米粥', category:'主食', kcal:46, protein:1.4, fat:0.7, carbs:8.4, k:38, na:4, p:33, purine:7},
  {name:'荞麦面', category:'主食', kcal:330, protein:11.0, fat:2.3, carbs:70.0, k:401, na:2, p:260, purine:34},
  {name:'糙米饭', category:'主食', kcal:123, protein:2.6, fat:0.3, carbs:25.6, k:79, na:3, p:103, purine:15},

  // ── 水果类 ──
  {name:'苹果', category:'水果', kcal:52, protein:0.3, fat:0.2, carbs:13.8, k:83, na:1, p:12, purine:1},
  {name:'香蕉', category:'水果', kcal:91, protein:1.4, fat:0.2, carbs:22.0, k:256, na:1, p:22, purine:1},
  {name:'橙子', category:'水果', kcal:47, protein:0.9, fat:0.1, carbs:11.8, k:159, na:1, p:23, purine:3},
  {name:'葡萄', category:'水果', kcal:44, protein:0.5, fat:0.2, carbs:10.3, k:104, na:1, p:13, purine:1},
  {name:'西瓜', category:'水果', kcal:25, protein:0.6, fat:0.1, carbs:5.5, k:87, na:3, p:9, purine:1},
  {name:'蓝莓', category:'水果', kcal:57, protein:0.7, fat:0.3, carbs:14.5, k:77, na:1, p:12, purine:2},
  {name:'猕猴桃', category:'水果', kcal:56, protein:0.8, fat:0.6, carbs:11.9, k:144, na:3, p:26, purine:2},
  {name:'梨', category:'水果', kcal:44, protein:0.4, fat:0.2, carbs:11.0, k:92, na:2, p:9, purine:1},
  {name:'草莓', category:'水果', kcal:32, protein:1.0, fat:0.2, carbs:7.1, k:131, na:4, p:27, purine:2},
  {name:'柚子', category:'水果', kcal:41, protein:0.8, fat:0.2, carbs:9.1, k:119, na:3, p:18, purine:4},

  // ── 蔬菜类 ──
  {name:'土豆', category:'蔬菜', kcal:77, protein:2.0, fat:0.2, carbs:17.2, k:342, na:3, p:40, purine:13},
  {name:'菠菜', category:'蔬菜', kcal:24, protein:2.6, fat:0.3, carbs:2.8, k:311, na:86, p:47, purine:13},
  {name:'西兰花', category:'蔬菜', kcal:33, protein:4.1, fat:0.6, carbs:4.3, k:179, na:19, p:72, purine:25},
  {name:'番茄', category:'蔬菜', kcal:15, protein:0.9, fat:0.2, carbs:3.3, k:163, na:5, p:23, purine:4},
  {name:'胡萝卜', category:'蔬菜', kcal:37, protein:1.0, fat:0.2, carbs:8.1, k:193, na:26, p:29, purine:9},
  {name:'黄瓜', category:'蔬菜', kcal:15, protein:0.8, fat:0.2, carbs:2.9, k:102, na:5, p:24, purine:15},
  {name:'冬瓜', category:'蔬菜', kcal:11, protein:0.4, fat:0.2, carbs:2.4, k:78, na:2, p:12, purine:3},
  {name:'白菜', category:'蔬菜', kcal:17, protein:1.5, fat:0.1, carbs:2.8, k:200, na:58, p:30, purine:13},
  {name:'生菜', category:'蔬菜', kcal:13, protein:1.3, fat:0.3, carbs:1.3, k:170, na:32, p:27, purine:13},
  {name:'芹菜', category:'蔬菜', kcal:14, protein:0.8, fat:0.1, carbs:2.6, k:154, na:74, p:26, purine:12},
  {name:'茄子', category:'蔬菜', kcal:21, protein:1.1, fat:0.2, carbs:4.2, k:142, na:5, p:20, purine:14},
  {name:'青椒', category:'蔬菜', kcal:22, protein:1.0, fat:0.2, carbs:4.6, k:142, na:3, p:20, purine:9},
  {name:'南瓜', category:'蔬菜', kcal:22, protein:0.7, fat:0.1, carbs:5.3, k:145, na:1, p:24, purine:3},
  {name:'香菇（鲜）', category:'蔬菜', kcal:26, protein:2.2, fat:0.3, carbs:5.2, k:20, na:11, p:53, purine:28},
  {name:'木耳（水发）', category:'蔬菜', kcal:27, protein:1.5, fat:0.2, carbs:6.0, k:52, na:49, p:13, purine:9},

  // ── 豆制品 ──
  {name:'紫菜（干）', category:'豆制品', kcal:250, protein:26.7, fat:1.1, carbs:44.1, k:1796, na:710, p:350, purine:415},
  {name:'黄豆', category:'豆制品', kcal:359, protein:35.0, fat:16.0, carbs:34.2, k:1503, na:2, p:465, purine:218},
  {name:'豆腐（北）', category:'豆制品', kcal:98, protein:7.9, fat:4.2, carbs:1.7, k:139, na:3, p:113, purine:56},
  {name:'豆腐（南）', category:'豆制品', kcal:70, protein:5.7, fat:5.8, carbs:1.9, k:118, na:6, p:82, purine:56},
  {name:'豆浆', category:'饮品', kcal:31, protein:3.0, fat:1.6, carbs:1.2, k:48, na:3, p:35, purine:28},
  {name:'豆腐干', category:'豆制品', kcal:140, protein:16.2, fat:6.7, carbs:3.6, k:180, na:70, p:185, purine:67},

  // ── 肉蛋类 ──
  {name:'鸡蛋', category:'蛋类', kcal:144, protein:13.3, fat:8.8, carbs:2.8, k:154, na:132, p:130, purine:3},
  {name:'鸡蛋白', category:'蛋类', kcal:60, protein:11.6, fat:0.1, carbs:3.1, k:132, na:80, p:13, purine:4},
  {name:'鸡胸肉', category:'肉类', kcal:133, protein:19.4, fat:5.0, carbs:2.5, k:338, na:34, p:214, purine:137},
  {name:'鸡腿肉', category:'肉类', kcal:181, protein:16.0, fat:13.0, carbs:0, k:242, na:64, p:172, purine:140},
  {name:'猪肉（瘦）', category:'肉类', kcal:143, protein:20.3, fat:6.2, carbs:1.5, k:305, na:58, p:189, purine:123},
  {name:'牛肉（瘦）', category:'肉类', kcal:106, protein:22.2, fat:1.5, carbs:0.2, k:270, na:49, p:182, purine:84},
  {name:'羊肉（瘦）', category:'肉类', kcal:118, protein:20.5, fat:3.9, carbs:0, k:403, na:69, p:196, purine:112},
  {name:'鸭肉', category:'肉类', kcal:240, protein:15.5, fat:19.7, carbs:0.2, k:191, na:69, p:122, purine:138},
  {name:'虾仁', category:'肉类', kcal:48, protein:10.4, fat:0.5, carbs:0.7, k:187, na:119, p:197, purine:138},

  // ── 鱼类 ──
  {name:'草鱼', category:'鱼类', kcal:113, protein:16.6, fat:5.2, carbs:0, k:312, na:46, p:203, purine:140},
  {name:'鲫鱼', category:'鱼类', kcal:108, protein:17.1, fat:2.7, carbs:3.8, k:290, na:41, p:193, purine:137},
  {name:'带鱼', category:'鱼类', kcal:127, protein:17.7, fat:4.9, carbs:3.1, k:280, na:150, p:191, purine:391},
  {name:'三文鱼', category:'鱼类', kcal:139, protein:17.2, fat:7.8, carbs:0, k:390, na:63, p:200, purine:170},
  {name:'鲈鱼', category:'鱼类', kcal:105, protein:18.6, fat:3.4, carbs:0, k:205, na:144, p:242, purine:70},

  // ── 奶类 ──
  {name:'牛奶', category:'奶类', kcal:54, protein:3.0, fat:3.2, carbs:3.4, k:109, na:38, p:73, purine:1},
  {name:'酸奶（无糖）', category:'奶类', kcal:72, protein:3.5, fat:2.7, carbs:10.0, k:150, na:60, p:85, purine:1},
  {name:'酸奶（含糖）', category:'奶类', kcal:102, protein:3.1, fat:2.7, carbs:18.0, k:150, na:60, p:85, purine:1, note:'含糖酸奶添加糖较多，糖尿病和减肥人群需注意'},

  // ── 坚果类 ──
  {name:'核桃', category:'坚果', kcal:627, protein:14.9, fat:58.8, carbs:19.1, k:385, na:6, p:294, purine:25},
  {name:'杏仁', category:'坚果', kcal:578, protein:21.2, fat:50.6, carbs:19.7, k:728, na:1, p:504, purine:32},
  {name:'花生', category:'坚果', kcal:574, protein:24.8, fat:44.3, carbs:16.1, k:587, na:2, p:326, purine:96},

  // ── 饮品 ──
  {name:'可乐', category:'饮品', kcal:42, protein:0, fat:0, carbs:10.6, k:2, na:4, p:0, purine:0, note:'含糖碳酸饮料，空腹饮用刺激胃酸、升高血糖，不推荐作为常规饮品，早餐尤其避免'},
  {name:'绿茶', category:'饮品', kcal:1, protein:0, fat:0, carbs:0, k:7, na:1, p:0, purine:0},
  {name:'橙汁（鲜榨）', category:'饮品', kcal:45, protein:0.7, fat:0.2, carbs:10.4, k:180, na:2, p:17, purine:2, note:'果汁含糖量较高，建议直接吃水果而非榨汁'},
  {name:'白开水', category:'饮品', kcal:0, protein:0, fat:0, carbs:0, k:0, na:0, p:0, purine:0},
  {name:'黑咖啡', category:'饮品', kcal:2, protein:0, fat:0, carbs:0, k:92, na:2, p:3, purine:0},

  // ── 加工食品（高风险） ──
  {name:'咸菜', category:'加工食品', kcal:25, protein:1.5, fat:0.2, carbs:4.0, k:30, na:4250, p:40, purine:25},
  {name:'腊肉', category:'加工食品', kcal:498, protein:14.4, fat:48.3, carbs:3.3, k:120, na:2300, p:200, purine:180},
  {name:'火腿肠', category:'加工食品', kcal:212, protein:14.0, fat:10.4, carbs:15.6, k:150, na:771, p:150, purine:100},
  {name:'方便面', category:'加工食品', kcal:473, protein:9.5, fat:21.1, carbs:60.9, k:130, na:1080, p:120, purine:60},
  {name:'酱油（15ml）', category:'调味品', kcal:15, protein:1.3, fat:0, carbs:1.5, k:30, na:1200, p:30, purine:25},
  {name:'油条', category:'加工食品', kcal:386, protein:6.9, fat:17.6, carbs:50.1, k:227, na:585, p:78, purine:19},
];

// 本地免费AI识别：中文食物名 → 英文标签（CLIP 文本端对英文效果最佳，中文名用于匹配营养库回显）
const FOOD_EN_LABELS = {
  // 主食
  '米饭（煮）': 'cooked white rice',
  '馒头': 'plain steamed bun',
  '面条（煮）': 'boiled wheat noodles',
  '燕麦片': 'oatmeal',
  '全麦面包': 'whole wheat bread slice',
  '红薯': 'baked sweet potato',
  '玉米（鲜）': 'fresh corn cob',
  '小米粥': 'millet porridge',
  '荞麦面': 'buckwheat noodles',
  '糙米饭': 'brown rice',
  // 水果
  '苹果': 'red apple fruit',
  '香蕉': 'banana fruit',
  '橙子': 'orange fruit',
  '葡萄': 'grapes',
  '西瓜': 'watermelon slices',
  '蓝莓': 'blueberries',
  '猕猴桃': 'kiwi fruit',
  '梨': 'pear fruit',
  '草莓': 'strawberries',
  '柚子': 'pomelo fruit',
  // 蔬菜
  '土豆': 'potato',
  '菠菜': 'spinach leaves',
  '西兰花': 'broccoli',
  '番茄': 'tomato',
  '胡萝卜': 'carrot',
  '黄瓜': 'cucumber',
  '冬瓜': 'winter melon',
  '白菜': 'napa cabbage',
  '生菜': 'lettuce leaves',
  '芹菜': 'celery stalks',
  '茄子': 'eggplant',
  '青椒': 'green bell pepper',
  '南瓜': 'pumpkin',
  '香菇（鲜）': 'fresh shiitake mushroom',
  '木耳（水发）': 'wood ear mushroom',
  // 豆制品
  '紫菜（干）': 'dried seaweed',
  '黄豆': 'soybeans',
  '豆腐（北）': 'firm tofu block',
  '豆腐（南）': 'soft tofu',
  '豆浆': 'soy milk in glass',
  '豆腐干': 'dried tofu snack',
  // 肉蛋
  '鸡蛋': 'boiled egg',
  '鸡蛋白': 'egg white',
  '鸡胸肉': 'grilled chicken breast',
  '鸡腿肉': 'chicken leg',
  '猪肉（瘦）': 'lean pork meat',
  '牛肉（瘦）': 'lean beef steak',
  '羊肉（瘦）': 'lean lamb chops',
  '鸭肉': 'roast duck meat',
  '虾仁': 'shrimp',
  // 鱼
  '草鱼': 'grass carp fish',
  '鲫鱼': 'crucian carp fish',
  '带鱼': 'hairtail fish',
  '三文鱼': 'salmon fillet',
  '鲈鱼': 'sea bass fish',
  // 奶
  '牛奶': 'glass of milk',
  '酸奶（无糖）': 'plain yogurt',
  '酸奶（含糖）': 'sweetened yogurt',
  // 坚果
  '核桃': 'walnuts',
  '杏仁': 'almonds',
  '花生': 'peanuts',
  // 饮品
  '可乐': 'cola soda can',
  '绿茶': 'green tea cup',
  '橙汁（鲜榨）': 'fresh orange juice glass',
  '白开水': 'glass of plain water',
  '黑咖啡': 'black coffee cup',
  // 加工食品
  '咸菜': 'pickled vegetables',
  '腊肉': 'cured bacon',
  '火腿肠': 'ham sausage',
  '方便面': 'instant noodles',
  '酱油（15ml）': 'soy sauce bowl',
  '油条': 'fried dough stick',
};

// 食谱配图（使用渐变背景+图标代替外部图片）
const IMAGES = {
  breakfast: null,  // 使用渐变背景
  lunch: null,
  dinner: null,
};

// 食物图标配置（仅使用 Lucide 稳定存在的图标）
const FOOD_STYLES = {
  // 主食
  '米饭（煮）': { icon: 'utensils', from: '#FFF8E7', to: '#FFE4B5', text: '#C9A86C' },
  '馒头': { icon: 'circle', from: '#FDF2E9', to: '#FAD7A0', text: '#D68910' },
  '面条（煮）': { icon: 'utensils', from: '#FCF3CF', to: '#F9E79F', text: '#B7950B' },
  '燕麦片': { icon: 'leaf', from: '#E8DAEF', to: '#D2B4DE', text: '#8E44AD' },
  '全麦面包': { icon: 'sandwich', from: '#D7CCC8', to: '#BCAAA4', text: '#5D4037' },
  '红薯': { icon: 'circle', from: '#FFCC80', to: '#FFA726', text: '#E65100' },
  '玉米（鲜）': { icon: 'leaf', from: '#FFF9C4', to: '#FFE082', text: '#F57F17' },
  '小米粥': { icon: 'utensils', from: '#FFE0B2', to: '#FFCC80', text: '#F57F17' },
  '荞麦面': { icon: 'utensils', from: '#D7CCC8', to: '#A1887F', text: '#4E342E' },
  '糙米饭': { icon: 'utensils', from: '#EFEBE9', to: '#D7CCC8', text: '#5D4037' },
  // 水果
  '苹果': { icon: 'apple', from: '#FFEEEE', to: '#FFCCCC', text: '#C0392B' },
  '香蕉': { icon: 'circle', from: '#FFF9C4', to: '#FFF176', text: '#F9A825' },
  '橙子': { icon: 'circle', from: '#FFF3E0', to: '#FFE0B2', text: '#EF6C00' },
  '葡萄': { icon: 'cherry', from: '#E8DAEF', to: '#C39BD3', text: '#7D3C98' },
  '西瓜': { icon: 'cherry', from: '#FFEBEE', to: '#FFCDD2', text: '#E53935' },
  '蓝莓': { icon: 'cherry', from: '#E8EAF6', to: '#C5CAE9', text: '#283593' },
  '猕猴桃': { icon: 'circle', from: '#E8F5E9', to: '#A5D6A7', text: '#33691E' },
  '梨': { icon: 'apple', from: '#F1F8E9', to: '#DCEDC8', text: '#558B2F' },
  '草莓': { icon: 'cherry', from: '#FCE4EC', to: '#F8BBD9', text: '#C2185B' },
  '柚子': { icon: 'circle', from: '#FFF3E0', to: '#FFE0B2', text: '#F57C00' },
  // 蔬菜
  '土豆': { icon: 'circle', from: '#FFF8E1', to: '#FFECB3', text: '#FF8F00' },
  '菠菜': { icon: 'leaf', from: '#E8F5E9', to: '#C8E6C9', text: '#388E3C' },
  '西兰花': { icon: 'leaf', from: '#E8F5E9', to: '#A5D6A7', text: '#2E7D32' },
  '番茄': { icon: 'circle', from: '#FFEBEE', to: '#EF9A9A', text: '#C62828' },
  '胡萝卜': { icon: 'carrot', from: '#FFF8E1', to: '#FFE082', text: '#FF6F00' },
  '黄瓜': { icon: 'circle', from: '#E0F2F1', to: '#B2DFDB', text: '#00796B' },
  '冬瓜': { icon: 'circle', from: '#F1F8E9', to: '#DCEDC8', text: '#689F38' },
  '白菜': { icon: 'leaf', from: '#F1F8E9', to: '#C8E6C9', text: '#33691E' },
  '生菜': { icon: 'leaf', from: '#E8F5E9', to: '#C8E6C9', text: '#558B2F' },
  '芹菜': { icon: 'carrot', from: '#E8F5E9', to: '#A5D6A7', text: '#2E7D32' },
  '茄子': { icon: 'circle', from: '#EDE7F6', to: '#D1C4E9', text: '#4527A0' },
  '青椒': { icon: 'circle', from: '#E8F5E9', to: '#C8E6C9', text: '#2E7D32' },
  '南瓜': { icon: 'circle', from: '#FFF3E0', to: '#FFB74D', text: '#E65100' },
  '香菇（鲜）': { icon: 'circle', from: '#EFEBE9', to: '#BCAAA4', text: '#4E342E' },
  '木耳（水发）': { icon: 'circle', from: '#263238', to: '#37474F', text: '#90A4AE' },
  // 豆制品
  '紫菜（干）': { icon: 'waves', from: '#1A237E', to: '#3949AB', text: '#7986CB' },
  '黄豆': { icon: 'circle', from: '#FFF59D', to: '#FFEE58', text: '#F9A825' },
  '豆腐（北）': { icon: 'square', from: '#FFF9C4', to: '#FFF176', text: '#F57F17' },
  '豆腐（南）': { icon: 'square', from: '#FFFDE7', to: '#FFF9C4', text: '#FBC02D' },
  '豆浆': { icon: 'cup-soda', from: '#FFFDE7', to: '#FFF9C4', text: '#FBC02D' },
  '豆腐干': { icon: 'square', from: '#FFE082', to: '#FFD54F', text: '#F57F17' },
  // 肉蛋
  '鸡蛋': { icon: 'egg', from: '#FFF8E1', to: '#FFECB3', text: '#FF8F00' },
  '鸡蛋白': { icon: 'circle', from: '#FAFAFA', to: '#F5F5F5', text: '#9E9E9E' },
  '鸡胸肉': { icon: 'drumstick', from: '#FFCCBC', to: '#FFAB91', text: '#D84315' },
  '鸡腿肉': { icon: 'drumstick', from: '#FFAB91', to: '#FF8A65', text: '#BF360C' },
  '猪肉（瘦）': { icon: 'drumstick', from: '#FFCDD2', to: '#EF9A9A', text: '#C62828' },
  '牛肉（瘦）': { icon: 'drumstick', from: '#D7CCC8', to: '#BCAAA4', text: '#5D4037' },
  '羊肉（瘦）': { icon: 'drumstick', from: '#BCAAA4', to: '#A1887F', text: '#3E2723' },
  '鸭肉': { icon: 'drumstick', from: '#CC8899', to: '#B57B87', text: '#880E4F' },
  '虾仁': { icon: 'circle', from: '#FFCCBC', to: '#FFAB91', text: '#E64A19' },
  // 鱼类
  '草鱼': { icon: 'fish', from: '#B3E5FC', to: '#81D4FA', text: '#0288D1' },
  '鲫鱼': { icon: 'fish', from: '#B3E5FC', to: '#4FC3F7', text: '#0277BD' },
  '带鱼': { icon: 'fish', from: '#B0BEC5', to: '#90A4AE', text: '#37474F' },
  '三文鱼': { icon: 'fish', from: '#FFAB91', to: '#FF8A65', text: '#BF360C' },
  '鲈鱼': { icon: 'fish', from: '#B3E5FC', to: '#81D4FA', text: '#01579B' },
  // 奶类
  '牛奶': { icon: 'milk', from: '#FAFAFA', to: '#EEEEEE', text: '#757575' },
  '酸奶（无糖）': { icon: 'milk', from: '#FAFAFA', to: '#F5F5F5', text: '#9E9E9E' },
  '酸奶（含糖）': { icon: 'milk', from: '#FFF9C4', to: '#FFF176', text: '#F9A825' },
  // 坚果
  '核桃': { icon: 'circle', from: '#BCAAA4', to: '#8D6E63', text: '#3E2723' },
  '杏仁': { icon: 'circle', from: '#FFE0B2', to: '#FFCC80', text: '#E65100' },
  '花生': { icon: 'circle', from: '#FFE082', to: '#FFD54F', text: '#F57F17' },
  // 饮品
  '可乐': { icon: 'cup-soda', from: '#3E2723', to: '#4E342E', text: '#8D6E63' },
  '绿茶': { icon: 'coffee', from: '#E8F5E9', to: '#C8E6C9', text: '#2E7D32' },
  '橙汁（鲜榨）': { icon: 'cup-soda', from: '#FFF3E0', to: '#FFB74D', text: '#E65100' },
  '白开水': { icon: 'droplet', from: '#E1F5FE', to: '#B3E5FC', text: '#0277BD' },
  '黑咖啡': { icon: 'coffee', from: '#3E2723', to: '#4E342E', text: '#8D6E63' },
  // 加工食品
  '咸菜': { icon: 'flame', from: '#C8E6C9', to: '#A5D6A7', text: '#558B2F' },
  '腊肉': { icon: 'flame', from: '#FFCCBC', to: '#FF8A65', text: '#BF360C' },
  '火腿肠': { icon: 'flame', from: '#FFCCBC', to: '#FFAB91', text: '#E64A19' },
  '方便面': { icon: 'utensils', from: '#FFE0B2', to: '#FFCC80', text: '#E65100' },
  '酱油（15ml）': { icon: 'droplet', from: '#3E2723', to: '#4E342E', text: '#8D6E63' },
  '油条': { icon: 'flame', from: '#FFE0B2', to: '#FFCC80', text: '#E65100' },
};

function foodStyle(food) {
  return FOOD_STYLES[food.name] || { icon: 'help-circle', from: '#E0E0E0', to: '#BDBDBD', text: '#757575' };
}

function foodIconHtml(food, size = 'w-10 h-10') {
  const s = foodStyle(food);
  const iconSize = size === 'w-10 h-10' ? 'w-5 h-5' : 
                   size === 'w-11 h-11' ? 'w-5 h-5' : 
                   size === 'w-14 h-14' ? 'w-7 h-7' : (size === 'w-16 h-16' ? 'w-8 h-8' : 'w-6 h-6');
  return `<div class="${size} rounded-xl flex items-center justify-center shrink-0" style="background:linear-gradient(135deg, ${s.from} 0%, ${s.to} 100%);box-shadow:0 2px 6px rgba(15,41,33,0.08);">
    <i data-lucide="${s.icon}" class="${iconSize}" style="color:${s.text};"></i>
  </div>`;
}

const ACTIVITY_LEVELS = {
  sedentary:  { label:'久坐少动', factor:1.2,  desc:'办公室工作，很少运动' },
  light:      { label:'轻度活动', factor:1.375,desc:'每周1-3次轻度运动' },
  moderate:   { label:'中度活动', factor:1.55, desc:'每周3-5次中等运动' },
  active:     { label:'重度活动', factor:1.725,desc:'每周6-7次剧烈运动' },
  veryActive: { label:'极重活动', factor:1.9,  desc:'重体力劳动或专业运动员' },
};

const MODES = {
  loseWeight:{label:'减肥模式', desc:'控制热量与脂肪（TDEE-500kcal）', cal:null, k:null, na:null, p:null, fat:50, carbs:null, purine:null, autoCal:true},
  kidney:{label:'肾病模式', desc:'严控钾钠磷', cal:1800, k:2000, na:1500, p:800, fat:null, carbs:null, purine:null, autoCal:false},
  diabetes:{label:'糖尿病模式', desc:'控糖控碳水', cal:null, k:null, na:null, p:null, fat:null, carbs:200, purine:null, autoCal:true},
  hypertension:{label:'高血压模式', desc:'低钠饮食', cal:null, k:null, na:1200, p:null, fat:null, carbs:null, purine:null, autoCal:true},
  gout:{label:'痛风模式', desc:'低嘌呤饮食（<300mg/日）', cal:null, k:null, na:null, p:null, fat:null, carbs:null, purine:300, autoCal:true},
  healthy:{label:'健康模式', desc:'均衡营养（维持TDEE）', cal:null, k:null, na:null, p:null, fat:null, carbs:null, purine:null, autoCal:true},
};

const TARGET_FIELDS = [
  {key:'cal', label:'热量', unit:'kcal'},
  {key:'k', label:'钾', unit:'mg'},
  {key:'na', label:'钠', unit:'mg'},
  {key:'p', label:'磷', unit:'mg'},
  {key:'fat', label:'脂肪', unit:'g'},
  {key:'carbs', label:'碳水', unit:'g'},
  {key:'purine', label:'嘌呤', unit:'mg'},
];

// 食量单位：每单位≈克数（food 未配置时按「份」=100g 等通用默认值）
const PORTION_UNITS = {
  bowl: '碗',
  cup: '杯',
  piece: '个',
  slice: '片',
  stick: '根',
  spoon: '匙',
  portion: '份',
};

// 全部食物可利用的通用单位默认克数（每食物可被 FOOD_SERVINGS 覆盖）
const DEFAULT_SERVING_MATRIX = {
  portion: 100,
  bowl: 150,
  cup: 200,
  piece: 100,
  slice: 40,
  stick: 100,
  spoon: 20,
};

// 常见食物每「1 单位」的克数（依据常见市售份量估算）
const FOOD_SERVINGS = {
  '米饭（煮）': { bowl: 150 },
  '糙米饭': { bowl: 150 },
  '面条（煮）': { bowl: 150 },
  '荞麦面': { bowl: 150 },
  '馒头': { piece: 100 },
  '全麦面包': { slice: 40 },
  '燕麦片': { portion: 40 },
  '小米粥': { bowl: 200 },
  '红薯': { piece: 150 },
  '玉米（鲜）': { stick: 200 },
  '苹果': { piece: 200 },
  '香蕉': { stick: 120 },
  '橙子': { piece: 180 },
  '猕猴桃': { piece: 100 },
  '梨': { piece: 200 },
  '西瓜': { slice: 200 },
  '草莓': { portion: 100 },
  '蓝莓': { portion: 125 },
  '葡萄': { portion: 100 },
  '柚子': { slice: 100 },
  '鸡蛋': { piece: 50 },
  '鸡蛋白': { piece: 30 },
  '牛奶': { cup: 250 },
  '绿茶': { cup: 250 },
  '酸奶（无糖）': { cup: 150 },
  '酸奶（含糖）': { cup: 150 },
  '豆浆': { cup: 250 },
  '橙汁（鲜榨）': { cup: 250 },
  '可乐': { cup: 330 },
  '核桃': { portion: 20 },
  '杏仁': { portion: 20 },
  '花生': { portion: 25 },
};

function foodUnits(food) {
  const s = FOOD_SERVINGS[food?.name];
  const order = ['portion', 'bowl', 'cup', 'piece', 'slice', 'stick', 'spoon'];
  return order.map(k => ({ key: k, label: PORTION_UNITS[k], grams: s?.[k] || DEFAULT_SERVING_MATRIX[k] }));
}

function gramsFromPortion(food, unitKey, count = 1) {
  const grams = FOOD_SERVINGS[food?.name]?.[unitKey] || DEFAULT_SERVING_MATRIX[unitKey] || 100;
  return Math.round(grams * count);
}

// 运动消耗估算（MET，体重相关：kcal/min = MET×3.5×体重kg/200）
const EXERCISES = {
  walk:   { label: '快走', met: 3.5 },
  jog:    { label: '慢跑', met: 8.0 },
  cycle:  { label: '骑车', met: 6.0 },
  jump:   { label: '跳绳', met: 11.0 },
  swim:   { label: '游泳', met: 7.0 },
  stairs: { label: '爬楼梯', met: 7.5 },
};

const STORAGE_KEY = 'lightEatState_v2';

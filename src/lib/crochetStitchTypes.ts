/**
 * Comprehensive JIS Standard Crochet Stitch Types
 * Based on Japanese crochet pattern conventions (編み目記号)
 * Reference: 钩针编织技法大全
 */

// ===== Basic Stitches (基础针法) =====
export type BasicStitch = 
  | 'chain'      // 鎖編み (ch) - Chain
  | 'slip'       // 引き抜き編み (sl st) - Slip stitch
  | 'sc'         // 細編み (sc) - Single crochet
  | 'hdc'        // 中長編み (hdc) - Half double crochet
  | 'dc'         // 長編み (dc) - Double crochet
  | 'tr'         // 長々編み (tr) - Treble crochet
  | 'dtr'        // 三つ巻き長編み (dtr) - Double treble
  | 'trtr'       // 四つ巻き長編み (trtr) - Triple treble
  | 'qtr';       // 五つ巻き長編み (qtr) - Quadruple treble

// ===== Increase Stitches (増し目) =====
export type IncreaseStitch =
  | 'inc'        // V形増し目 - 2-stitch increase
  | 'inc3'       // W形増し目 - 3-stitch increase (shell base)
  | 'inc4'       // 4目増し目 - 4-stitch increase
  | 'inc5';      // 5目増し目 - 5-stitch increase (fan base)

// ===== Decrease Stitches (減らし目) =====
export type DecreaseStitch =
  | 'dec'        // A形減らし目 - 2-stitch decrease
  | 'dec3'       // M形減らし目 - 3-stitch decrease
  | 'sc2tog'     // 細編み2目一度 - SC2together
  | 'dc2tog'     // 長編み2目一度 - DC2together
  | 'dc3tog'     // 長編み3目一度 - DC3together
  | 'dc4tog'     // 長編み4目一度 - DC4together
  | 'dc5tog';    // 長編み5目一度 - DC5together

// ===== Loop Variations (ループ変形) =====
export type LoopStitch =
  | 'blo'        // 後ろ半目拾い - Back loop only
  | 'flo'        // 前半目拾い - Front loop only
  | 'bpsc'       // 後ろ側細編み - Back post single crochet
  | 'fpsc'       // 前側細編み - Front post single crochet
  | 'bpdc'       // 後ろ側長編み - Back post double crochet
  | 'fpdc'       // 前側長編み - Front post double crochet
  | 'bptr'       // 後ろ側長々編み - Back post treble
  | 'fptr';      // 前側長々編み - Front post treble

// ===== Texture Stitches (立体針法) =====
export type TextureStitch =
  | 'popcorn'    // ポップコーン編み - Popcorn stitch
  | 'bobble'     // 玉編み - Bobble stitch
  | 'puff'       // パフ編み - Puff stitch
  | 'bullion'    // 巻き編み - Bullion stitch
  | 'cluster'    // クラスター編み - Cluster stitch
  | 'shell'      // シェル編み - Shell stitch
  | 'fan'        // 扇編み - Fan stitch
  | 'picot'      // ピコット - Picot
  | 'spike'      // スパイク編み - Spike stitch
  | 'loop'       // ループ編み - Loop stitch
  | 'crocodile'; // クロコダイル編み - Crocodile stitch

// ===== Special Stitches (特殊針法) =====
export type SpecialStitch =
  | 'magic'      // 輪の作り目 - Magic ring
  | 'standing'   // 立ち上がり目 - Standing stitch
  | 'join'       // 接続 - Join
  | 'skip'       // 飛ばし目 - Skip stitch
  | 'space'      // 空間 - Chain space
  | 'linked'     // 連結編み - Linked stitch
  | 'extended'   // 延長編み - Extended stitch
  | 'crossed';   // 交差編み - Crossed stitch

// ===== Decorative Stitches (装飾針法) =====
export type DecorativeStitch =
  | 'vst'        // Vステッチ - V-stitch
  | 'granny'     // グラニースクエア - Granny stitch
  | 'bead'       // ビーズ編み込み - Bead stitch
  | 'solomon'    // ソロモンズノット - Solomon's knot
  | 'broomstick' // ブルームスティック - Broomstick lace
  | 'hairpin';   // ヘアピン編み - Hairpin lace

// Combined type for all stitches
export type CrochetStitchType = 
  | BasicStitch 
  | IncreaseStitch 
  | DecreaseStitch 
  | LoopStitch 
  | TextureStitch 
  | SpecialStitch 
  | DecorativeStitch;

// Stitch metadata
export interface StitchInfo {
  id: CrochetStitchType;
  name: string;
  nameJP: string;
  abbreviation: string;
  category: 'basic' | 'increase' | 'decrease' | 'loop' | 'texture' | 'special' | 'decorative';
  height: number;  // Relative height (chain = 1)
  description: string;
}

// Complete stitch database
export const STITCH_DATABASE: Record<CrochetStitchType, StitchInfo> = {
  // Basic Stitches
  chain: { id: 'chain', name: 'Chain', nameJP: '鎖編み', abbreviation: 'ch', category: 'basic', height: 1, description: 'Foundation stitch' },
  slip: { id: 'slip', name: 'Slip Stitch', nameJP: '引き抜き編み', abbreviation: 'sl', category: 'basic', height: 0, description: 'Joining stitch' },
  sc: { id: 'sc', name: 'Single Crochet', nameJP: '細編み', abbreviation: 'sc', category: 'basic', height: 1, description: 'Basic compact stitch' },
  hdc: { id: 'hdc', name: 'Half Double Crochet', nameJP: '中長編み', abbreviation: 'hdc', category: 'basic', height: 2, description: 'Medium height stitch' },
  dc: { id: 'dc', name: 'Double Crochet', nameJP: '長編み', abbreviation: 'dc', category: 'basic', height: 3, description: 'Common tall stitch' },
  tr: { id: 'tr', name: 'Treble Crochet', nameJP: '長々編み', abbreviation: 'tr', category: 'basic', height: 4, description: 'Tall open stitch' },
  dtr: { id: 'dtr', name: 'Double Treble', nameJP: '三つ巻き長編み', abbreviation: 'dtr', category: 'basic', height: 5, description: 'Very tall stitch' },
  trtr: { id: 'trtr', name: 'Triple Treble', nameJP: '四つ巻き長編み', abbreviation: 'trtr', category: 'basic', height: 6, description: 'Extra tall stitch' },
  qtr: { id: 'qtr', name: 'Quadruple Treble', nameJP: '五つ巻き長編み', abbreviation: 'qtr', category: 'basic', height: 7, description: 'Maximum height basic stitch' },
  
  // Increase Stitches
  inc: { id: 'inc', name: 'Increase (V)', nameJP: '増し目', abbreviation: 'inc', category: 'increase', height: 1, description: '2 stitches in one' },
  inc3: { id: 'inc3', name: '3-Stitch Increase (W)', nameJP: '3目増し目', abbreviation: 'inc3', category: 'increase', height: 1, description: '3 stitches in one' },
  inc4: { id: 'inc4', name: '4-Stitch Increase', nameJP: '4目増し目', abbreviation: 'inc4', category: 'increase', height: 1, description: '4 stitches in one' },
  inc5: { id: 'inc5', name: '5-Stitch Increase', nameJP: '5目増し目', abbreviation: 'inc5', category: 'increase', height: 1, description: '5 stitches in one (fan)' },

  // Decrease Stitches
  dec: { id: 'dec', name: 'Decrease (A)', nameJP: '減らし目', abbreviation: 'dec', category: 'decrease', height: 1, description: '2 stitches together' },
  dec3: { id: 'dec3', name: '3-Stitch Decrease (M)', nameJP: '3目減らし目', abbreviation: 'dec3', category: 'decrease', height: 1, description: '3 stitches together' },
  sc2tog: { id: 'sc2tog', name: 'SC 2 Together', nameJP: '細編み2目一度', abbreviation: 'sc2tog', category: 'decrease', height: 1, description: 'Single crochet decrease' },
  dc2tog: { id: 'dc2tog', name: 'DC 2 Together', nameJP: '長編み2目一度', abbreviation: 'dc2tog', category: 'decrease', height: 3, description: 'Double crochet decrease' },
  dc3tog: { id: 'dc3tog', name: 'DC 3 Together', nameJP: '長編み3目一度', abbreviation: 'dc3tog', category: 'decrease', height: 3, description: '3 DC joined at top' },
  dc4tog: { id: 'dc4tog', name: 'DC 4 Together', nameJP: '長編み4目一度', abbreviation: 'dc4tog', category: 'decrease', height: 3, description: '4 DC joined at top' },
  dc5tog: { id: 'dc5tog', name: 'DC 5 Together', nameJP: '長編み5目一度', abbreviation: 'dc5tog', category: 'decrease', height: 3, description: '5 DC joined at top' },

  // Loop Variations
  blo: { id: 'blo', name: 'Back Loop Only', nameJP: '後ろ半目拾い', abbreviation: 'blo', category: 'loop', height: 1, description: 'Work in back loop' },
  flo: { id: 'flo', name: 'Front Loop Only', nameJP: '前半目拾い', abbreviation: 'flo', category: 'loop', height: 1, description: 'Work in front loop' },
  bpsc: { id: 'bpsc', name: 'Back Post SC', nameJP: '後ろ側細編み', abbreviation: 'bpsc', category: 'loop', height: 1, description: 'SC around back post' },
  fpsc: { id: 'fpsc', name: 'Front Post SC', nameJP: '前側細編み', abbreviation: 'fpsc', category: 'loop', height: 1, description: 'SC around front post' },
  bpdc: { id: 'bpdc', name: 'Back Post DC', nameJP: '後ろ側長編み', abbreviation: 'bpdc', category: 'loop', height: 3, description: 'DC around back post' },
  fpdc: { id: 'fpdc', name: 'Front Post DC', nameJP: '前側長編み', abbreviation: 'fpdc', category: 'loop', height: 3, description: 'DC around front post' },
  bptr: { id: 'bptr', name: 'Back Post TR', nameJP: '後ろ側長々編み', abbreviation: 'bptr', category: 'loop', height: 4, description: 'TR around back post' },
  fptr: { id: 'fptr', name: 'Front Post TR', nameJP: '前側長々編み', abbreviation: 'fptr', category: 'loop', height: 4, description: 'TR around front post' },

  // Texture Stitches
  popcorn: { id: 'popcorn', name: 'Popcorn', nameJP: 'ポップコーン編み', abbreviation: 'pc', category: 'texture', height: 3, description: 'Puffy raised stitch' },
  bobble: { id: 'bobble', name: 'Bobble', nameJP: '玉編み', abbreviation: 'bob', category: 'texture', height: 3, description: 'Round textured ball' },
  puff: { id: 'puff', name: 'Puff Stitch', nameJP: 'パフ編み', abbreviation: 'pf', category: 'texture', height: 2, description: 'Soft puffy texture' },
  bullion: { id: 'bullion', name: 'Bullion', nameJP: '巻き編み', abbreviation: 'bull', category: 'texture', height: 4, description: 'Coiled wrapped stitch' },
  cluster: { id: 'cluster', name: 'Cluster', nameJP: 'クラスター編み', abbreviation: 'cl', category: 'texture', height: 3, description: 'Multiple stitches joined' },
  shell: { id: 'shell', name: 'Shell', nameJP: 'シェル編み', abbreviation: 'sh', category: 'texture', height: 3, description: 'Fan-shaped stitch group' },
  fan: { id: 'fan', name: 'Fan', nameJP: '扇編み', abbreviation: 'fan', category: 'texture', height: 3, description: 'Decorative fan shape' },
  picot: { id: 'picot', name: 'Picot', nameJP: 'ピコット', abbreviation: 'pic', category: 'texture', height: 1, description: 'Small decorative loop' },
  spike: { id: 'spike', name: 'Spike Stitch', nameJP: 'スパイク編み', abbreviation: 'sp', category: 'texture', height: 2, description: 'Stitch into row below' },
  loop: { id: 'loop', name: 'Loop Stitch', nameJP: 'ループ編み', abbreviation: 'lp', category: 'texture', height: 1, description: 'Loopy texture' },
  crocodile: { id: 'crocodile', name: 'Crocodile Stitch', nameJP: 'クロコダイル編み', abbreviation: 'croc', category: 'texture', height: 4, description: 'Scale-like pattern' },

  // Special Stitches
  magic: { id: 'magic', name: 'Magic Ring', nameJP: '輪の作り目', abbreviation: 'mr', category: 'special', height: 0, description: 'Adjustable starting ring' },
  standing: { id: 'standing', name: 'Standing Stitch', nameJP: '立ち上がり目', abbreviation: 'stand', category: 'special', height: 1, description: 'Starting stitch without chain' },
  join: { id: 'join', name: 'Join', nameJP: '接続', abbreviation: 'join', category: 'special', height: 0, description: 'Connect rounds/pieces' },
  skip: { id: 'skip', name: 'Skip', nameJP: '飛ばし目', abbreviation: 'sk', category: 'special', height: 0, description: 'Skip a stitch' },
  space: { id: 'space', name: 'Chain Space', nameJP: '空間', abbreviation: 'sp', category: 'special', height: 1, description: 'Work into chain space' },
  linked: { id: 'linked', name: 'Linked Stitch', nameJP: '連結編み', abbreviation: 'link', category: 'special', height: 3, description: 'DC through previous stitch loops' },
  extended: { id: 'extended', name: 'Extended Stitch', nameJP: '延長編み', abbreviation: 'ext', category: 'special', height: 2, description: 'Extra chain in middle' },
  crossed: { id: 'crossed', name: 'Crossed Stitch', nameJP: '交差編み', abbreviation: 'cr', category: 'special', height: 3, description: 'Crossing stitch pattern' },

  // Decorative Stitches
  vst: { id: 'vst', name: 'V-Stitch', nameJP: 'Vステッチ', abbreviation: 'vst', category: 'decorative', height: 3, description: 'DC-ch-DC in same stitch' },
  granny: { id: 'granny', name: 'Granny Stitch', nameJP: 'グラニースクエア', abbreviation: 'gr', category: 'decorative', height: 3, description: 'Classic 3-DC cluster' },
  bead: { id: 'bead', name: 'Bead Stitch', nameJP: 'ビーズ編み込み', abbreviation: 'bead', category: 'decorative', height: 1, description: 'Bead incorporated' },
  solomon: { id: 'solomon', name: "Solomon's Knot", nameJP: 'ソロモンズノット', abbreviation: 'sol', category: 'decorative', height: 2, description: 'Long chain locked stitch' },
  broomstick: { id: 'broomstick', name: 'Broomstick Lace', nameJP: 'ブルームスティック', abbreviation: 'broom', category: 'decorative', height: 3, description: 'Large loop lace' },
  hairpin: { id: 'hairpin', name: 'Hairpin Lace', nameJP: 'ヘアピン編み', abbreviation: 'hp', category: 'decorative', height: 2, description: 'Loom-made lace strips' },
};

// Get all stitches by category
export function getStitchesByCategory(category: StitchInfo['category']): StitchInfo[] {
  return Object.values(STITCH_DATABASE).filter(s => s.category === category);
}

// Get stitch info by ID
export function getStitchInfo(id: CrochetStitchType): StitchInfo | undefined {
  return STITCH_DATABASE[id];
}

/**
 * UI translations for OtogiDB
 * Machine-translated content is marked for user awareness
 */

import type { SupportedLocale } from './i18n';

export interface UITranslations {
  // Common
  blog: string;
  updates: string;
  backToBlog: string;
  filter: string;
  all: string;
  noPostsYet: string;
  noPostsMatch: string;
  contributePost: string;
  by: string;

  // Updates page
  patchNotes: string;
  patchNotesDescription: string;
  noPatchNotes: string;
  version: string;
  newCards: string;
  changed: string;
  balanceChanges: string;

  // Card details
  skill: string;
  abilities: string;
  stats: string;
  bonds: string;
  availability: string;
  availableNow: string;
  notAvailable: string;
  gacha: string;
  standardPool: string;
  auction: string;
  exchange: string;
  event: string;
  info: string;
  firstSeen: string;
  lastModified: string;
  illustrator: string;
  similarCards: string;
  goodReplacements: string;
  description: string;

  // Machine translation notice
  machineTranslated: string;
  machineTranslatedNote: string;
}

const translations: Record<SupportedLocale, UITranslations> = {
  en: {
    blog: 'Blog',
    updates: 'Updates',
    backToBlog: 'Back to Blog',
    filter: 'Filter:',
    all: 'All',
    noPostsYet: 'No blog posts yet. Check back soon!',
    noPostsMatch: 'No posts match the selected tag.',
    contributePost: 'Contribute a Post',
    by: 'by',

    patchNotes: 'Patch Notes',
    patchNotesDescription: 'Card updates, new releases, and balance changes.',
    noPatchNotes: 'No patch notes available yet.',
    version: 'Version',
    newCards: 'New Cards',
    changed: 'Changed',
    balanceChanges: 'Balance Changes',

    skill: 'Skill',
    abilities: 'Abilities',
    stats: 'Stats',
    bonds: 'Bonds',
    availability: 'Availability',
    availableNow: 'Available Now',
    notAvailable: 'Not Available',
    gacha: 'Gacha',
    standardPool: 'Standard Pool',
    auction: 'Auction',
    exchange: 'Exchange',
    event: 'Event',
    info: 'Info',
    firstSeen: 'First Seen',
    lastModified: 'Last Modified',
    illustrator: 'Illustrator',
    similarCards: 'Similar Cards',
    goodReplacements: 'Good options for team replacements',
    description: 'Description',

    machineTranslated: '',
    machineTranslatedNote: '',
  },

  ja: {
    blog: 'ブログ',
    updates: 'アップデート',
    backToBlog: 'ブログに戻る',
    filter: 'フィルター:',
    all: 'すべて',
    noPostsYet: 'まだブログ記事がありません。後でまた確認してください！',
    noPostsMatch: '選択したタグに一致する記事がありません。',
    contributePost: '記事を投稿する',
    by: '著者:',

    patchNotes: 'パッチノート',
    patchNotesDescription: 'カードの更新、新リリース、バランス調整。',
    noPatchNotes: 'パッチノートはまだありません。',
    version: 'バージョン',
    newCards: '新カード',
    changed: '変更',
    balanceChanges: 'バランス調整',

    skill: 'スキル',
    abilities: 'アビリティ',
    stats: 'ステータス',
    bonds: '絆',
    availability: '入手方法',
    availableNow: '入手可能',
    notAvailable: '入手不可',
    gacha: 'ガチャ',
    standardPool: '常設ガチャ',
    auction: 'オークション',
    exchange: '交換',
    event: 'イベント',
    info: '情報',
    firstSeen: '初登場',
    lastModified: '最終更新',
    illustrator: 'イラストレーター',
    similarCards: '類似カード',
    goodReplacements: 'チーム編成の代替候補',
    description: '説明',

    machineTranslated: '機械翻訳',
    machineTranslatedNote: 'この記事はAIによって翻訳されました。原文は英語です。',
  },

  ko: {
    blog: '블로그',
    updates: '업데이트',
    backToBlog: '블로그로 돌아가기',
    filter: '필터:',
    all: '전체',
    noPostsYet: '아직 블로그 게시물이 없습니다. 나중에 다시 확인해주세요!',
    noPostsMatch: '선택한 태그와 일치하는 게시물이 없습니다.',
    contributePost: '게시물 기여하기',
    by: '작성자:',

    patchNotes: '패치 노트',
    patchNotesDescription: '카드 업데이트, 신규 출시, 밸런스 조정.',
    noPatchNotes: '아직 패치 노트가 없습니다.',
    version: '버전',
    newCards: '신규 카드',
    changed: '변경됨',
    balanceChanges: '밸런스 조정',

    skill: '스킬',
    abilities: '어빌리티',
    stats: '스탯',
    bonds: '인연',
    availability: '획득 방법',
    availableNow: '획득 가능',
    notAvailable: '획득 불가',
    gacha: '가챠',
    standardPool: '상시 가챠',
    auction: '경매',
    exchange: '교환',
    event: '이벤트',
    info: '정보',
    firstSeen: '첫 등장',
    lastModified: '최종 수정',
    illustrator: '일러스트레이터',
    similarCards: '유사 카드',
    goodReplacements: '팀 교체용 좋은 옵션',
    description: '설명',

    machineTranslated: '기계 번역',
    machineTranslatedNote: '이 글은 AI에 의해 번역되었습니다. 원문은 영어입니다.',
  },

  'zh-cn': {
    blog: '博客',
    updates: '更新',
    backToBlog: '返回博客',
    filter: '筛选:',
    all: '全部',
    noPostsYet: '暂无博客文章，请稍后再来！',
    noPostsMatch: '没有匹配所选标签的文章。',
    contributePost: '投稿',
    by: '作者:',

    patchNotes: '更新日志',
    patchNotesDescription: '卡牌更新、新卡发布、平衡性调整。',
    noPatchNotes: '暂无更新日志。',
    version: '版本',
    newCards: '新卡',
    changed: '已更改',
    balanceChanges: '平衡性调整',

    skill: '技能',
    abilities: '能力',
    stats: '属性',
    bonds: '羁绊',
    availability: '获取方式',
    availableNow: '可获取',
    notAvailable: '无法获取',
    gacha: '抽卡',
    standardPool: '常驻池',
    auction: '拍卖',
    exchange: '兑换',
    event: '活动',
    info: '信息',
    firstSeen: '首次出现',
    lastModified: '最后更新',
    illustrator: '画师',
    similarCards: '相似卡牌',
    goodReplacements: '队伍替换的好选择',
    description: '描述',

    machineTranslated: '机器翻译',
    machineTranslatedNote: '本文由AI翻译，原文为英语。',
  },

  'zh-tw': {
    blog: '部落格',
    updates: '更新',
    backToBlog: '返回部落格',
    filter: '篩選:',
    all: '全部',
    noPostsYet: '暫無部落格文章，請稍後再來！',
    noPostsMatch: '沒有符合所選標籤的文章。',
    contributePost: '投稿',
    by: '作者:',

    patchNotes: '更新日誌',
    patchNotesDescription: '卡牌更新、新卡發布、平衡性調整。',
    noPatchNotes: '暫無更新日誌。',
    version: '版本',
    newCards: '新卡',
    changed: '已更改',
    balanceChanges: '平衡性調整',

    skill: '技能',
    abilities: '能力',
    stats: '屬性',
    bonds: '羈絆',
    availability: '取得方式',
    availableNow: '可取得',
    notAvailable: '無法取得',
    gacha: '抽卡',
    standardPool: '常駐池',
    auction: '拍賣',
    exchange: '兌換',
    event: '活動',
    info: '資訊',
    firstSeen: '首次出現',
    lastModified: '最後更新',
    illustrator: '繪師',
    similarCards: '相似卡牌',
    goodReplacements: '隊伍替換的好選擇',
    description: '描述',

    machineTranslated: '機器翻譯',
    machineTranslatedNote: '本文由AI翻譯，原文為英語。',
  },

  es: {
    blog: 'Blog',
    updates: 'Actualizaciones',
    backToBlog: 'Volver al Blog',
    filter: 'Filtrar:',
    all: 'Todos',
    noPostsYet: 'Aún no hay publicaciones. ¡Vuelve pronto!',
    noPostsMatch: 'No hay publicaciones que coincidan con la etiqueta seleccionada.',
    contributePost: 'Contribuir una Publicación',
    by: 'por',

    patchNotes: 'Notas del Parche',
    patchNotesDescription: 'Actualizaciones de cartas, nuevos lanzamientos y cambios de balance.',
    noPatchNotes: 'Aún no hay notas del parche disponibles.',
    version: 'Versión',
    newCards: 'Nuevas Cartas',
    changed: 'Cambiado',
    balanceChanges: 'Cambios de Balance',

    skill: 'Habilidad',
    abilities: 'Habilidades',
    stats: 'Estadísticas',
    bonds: 'Vínculos',
    availability: 'Disponibilidad',
    availableNow: 'Disponible Ahora',
    notAvailable: 'No Disponible',
    gacha: 'Gacha',
    standardPool: 'Pool Estándar',
    auction: 'Subasta',
    exchange: 'Intercambio',
    event: 'Evento',
    info: 'Información',
    firstSeen: 'Primera Aparición',
    lastModified: 'Última Modificación',
    illustrator: 'Ilustrador',
    similarCards: 'Cartas Similares',
    goodReplacements: 'Buenas opciones para reemplazos de equipo',
    description: 'Descripción',

    machineTranslated: 'Traducción Automática',
    machineTranslatedNote: 'Este artículo fue traducido por IA. El original está en inglés.',
  },
};

export function getTranslations(locale: SupportedLocale): UITranslations {
  return translations[locale] || translations.en;
}

export function t(locale: SupportedLocale, key: keyof UITranslations): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

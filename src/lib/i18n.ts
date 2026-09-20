import { create } from 'zustand';

export const LANGUAGES = [
  { code: 'auto', name: 'Otomatik Algıla' },
  { code: 'tr', name: 'Türkçe 🇹🇷' },
  { code: 'en', name: 'English 🇬🇧' },
  { code: 'de', name: 'Deutsch 🇩🇪' },
  { code: 'fr', name: 'Français 🇫🇷' },
  { code: 'es', name: 'Español 🇪🇸' },
  { code: 'it', name: 'Italiano 🇮🇹' },
  { code: 'ru', name: 'Русский 🇷🇺' },
  { code: 'ar', name: 'العربية 🇸🇦' },
  { code: 'ja', name: '日本語 🇯🇵' },
  { code: 'ko', name: '한국어 🇰🇷' },
  { code: 'th', name: 'Tayca 🇹🇭' },
  { code: 'tk', name: 'Türkmence 🇹🇲' }
];

export const getBrowserLanguage = () => {
  const lang = navigator.language.split('-')[0];
  return LANGUAGES.find(l => l.code === lang) ? lang : 'en';
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    // UI strings
    'home.title': 'LiveTranslate',
    'home.subtitle': 'Farklı diller, tek bir sohbet.',
    'home.start': 'Başla',
    'home.create_room': 'Oda Kur',
    'home.create_desc': 'Yeni bir sohbet başlat ve davet et',
    'home.join_room': 'Odaya Gir',
    'home.join_desc': 'Davet kodunu kullanarak sohbete katıl',
    
    'profile.title': 'Profilini Oluştur',
    'profile.subtitle': 'Seni nasıl çağıralım?',
    'profile.name_label': 'Adın',
    'profile.gender_label': 'Cinsiyet (İsteğe bağlı)',
    'profile.male': 'Erkek',
    'profile.female': 'Kadın',
    'profile.language_label': 'Konuştuğun Dil',
    'profile.save': 'Devam Et',

    'create.title': 'Odan hazır',
    'create.subtitle': 'Arkadaşını davet et ve sohbete başla.',
    'create.room_code': 'ODA KODU',
    'create.copy_code': 'Kodu Kopyala',
    'create.copy_link': 'Linki Kopyala',
    'create.copied': 'Kopyalandı!',
    'create.whatsapp': 'WhatsApp',
    'create.share': 'Paylaş...',
    'create.go_room': 'Odaya Giriş Yap',

    'join.title': 'Odaya Katıl',
    'join.subtitle': 'Arkadaşının gönderdiği kodu aşağıya gir.',
    'join.code_label': 'Oda Kodu',
    'join.code_placeholder': 'Örn: a1b2c',
    'join.button': 'Katıl',
    'join.joining': 'Katılınıyor...',

    'room.waiting': 'Arkadaşınızın odaya katılması bekleniyor...',
    'room.your_code': 'Oda Kodunuz:',
    'room.type_message': 'Bir mesaj yazın...',
    'room.settings': 'Ayarlar',
    'room.my_language': 'Benim Dilim',
    'room.partner_language': 'Partnerimin Dili',
    'room.auto_detect': 'Otomatik Algıla',
    'room.auto_desc': 'Eğer \'Otomatik Algıla\' seçerseniz, partnerinizin kendi ayarladığı dil kullanılır (şu an: {lang}).',
    'room.waiting_partner': 'Bekleniyor...',
    'room.appearance': 'Görünüm',
    'room.show_original': 'Orijinal Mesajları Göster',
    'room.leave': 'Odayı Terk Et',
    'room.copy': 'Kodu Kopyala',
    'room.share': 'Linki Paylaş',
    'room.share_whatsapp': 'WhatsApp ile Gönder',
    'room.share_whatsapp_sub': 'WhatsApp ile davet et',
    'room.share_link': 'Oda Linkini Gönder',
    'room.share_link_sub': 'Bağlantıyı kopyala veya paylaş',
    'room.link_copied': 'Oda linki kopyalandı!',
    'room.online': 'Çevrimiçi',
    'room.no_connection': 'Bağlantı Yok',
    'room.connecting': 'Bağlantı kuruluyor...',
    
    'msg.translated': 'Çevrildi',
    'msg.error': 'Çevrilemedi',
    'msg.translating': 'Çevriliyor...',
    'msg.retry': 'Tekrar Çevir',
    'msg.copy': 'Kopyala',
    'msg.copied': 'Kopyalandı'
  },
  en: {
    'home.title': 'LiveTranslate',
    'home.subtitle': 'Different languages, one chat.',
    'home.start': 'Start',
    'home.create_room': 'Create Room',
    'home.create_desc': 'Start a new chat and invite',
    'home.join_room': 'Join Room',
    'home.join_desc': 'Join a chat using invite code',
    
    'profile.title': 'Create Profile',
    'profile.subtitle': 'How should we call you?',
    'profile.name_label': 'Your Name',
    'profile.gender_label': 'Gender (Optional)',
    'profile.male': 'Male',
    'profile.female': 'Female',
    'profile.language_label': 'Your Language',
    'profile.save': 'Continue',

    'create.title': 'Room is ready',
    'create.subtitle': 'Invite a friend and start chatting.',
    'create.room_code': 'ROOM CODE',
    'create.copy_code': 'Copy Code',
    'create.copy_link': 'Copy Link',
    'create.copied': 'Copied!',
    'create.whatsapp': 'WhatsApp',
    'create.share': 'Share...',
    'create.go_room': 'Enter Room',

    'join.title': 'Join Room',
    'join.subtitle': 'Enter the code sent by your friend.',
    'join.code_label': 'Room Code',
    'join.code_placeholder': 'E.g.: a1b2c',
    'join.button': 'Join',
    'join.joining': 'Joining...',

    'room.waiting': 'Waiting for your friend to join...',
    'room.your_code': 'Your Room Code:',
    'room.type_message': 'Type a message...',
    'room.settings': 'Settings',
    'room.my_language': 'My Language',
    'room.partner_language': 'Partner\'s Language',
    'room.auto_detect': 'Auto Detect',
    'room.auto_desc': 'If you choose \'Auto Detect\', the language your partner set will be used (current: {lang}).',
    'room.waiting_partner': 'Waiting...',
    'room.appearance': 'Appearance',
    'room.show_original': 'Show Original Messages',
    'room.leave': 'Leave Room',
    'room.copy': 'Copy Code',
    'room.share': 'Share Link',
    'room.share_whatsapp': 'Send via WhatsApp',
    'room.share_whatsapp_sub': 'Invite via WhatsApp',
    'room.share_link': 'Send Room Link',
    'room.share_link_sub': 'Copy or share link',
    'room.link_copied': 'Room link copied!',
    'room.online': 'Online',
    'room.no_connection': 'No Connection',
    'room.connecting': 'Connecting...',
    
    'msg.translated': 'Translated',
    'msg.error': 'Translation failed',
    'msg.translating': 'Translating...',
    'msg.retry': 'Retry',
    'msg.copy': 'Copy',
    'msg.copied': 'Copied'
  }
};

// Fallback logic for keys missing in other languages
export const t = (key: string, lang: string, params?: Record<string, string>): string => {
  let str = (translations[lang] || translations.en)[key] || translations.en[key] || key;
  if (params) {
    Object.keys(params).forEach(k => {
      str = str.replace(`{${k}}`, params[k]);
    });
  }
  return str;
};
